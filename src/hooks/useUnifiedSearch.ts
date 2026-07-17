import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { apiGet } from '../lib/api'
import type {
  UnifiedSearchCounts,
  UnifiedSearchResponse,
  UnifiedSearchResult,
  UnifiedSearchScope,
} from '../types/api'
import { getErrorMessage } from '../utils/errorMessage'
import { preloadImageUrls } from '../utils/imageLoading'

const emptyCounts: UnifiedSearchCounts = {
  all: 0,
  events: 0,
  finspo: 0,
  items: 0,
  users: 0,
}

function resultKey(result: UnifiedSearchResult) {
  return `${result.type}:${result.entity._id}`
}

function appendUnique(current: UnifiedSearchResult[], incoming: UnifiedSearchResult[]) {
  const seen = new Set(current.map(resultKey))
  return incoming.reduce((results, result) => {
    const key = resultKey(result)
    if (seen.has(key)) return results
    seen.add(key)
    results.push(result)
    return results
  }, [...current])
}

function refreshWithoutReordering(current: UnifiedSearchResult[], incoming: UnifiedSearchResult[]) {
  const refreshed = new Map(incoming.map((result) => [resultKey(result), result]))
  const known = new Set(current.map(resultKey))
  return [
    ...current.map((result) => refreshed.get(resultKey(result)) || result),
    ...incoming.filter((result) => !known.has(resultKey(result))),
  ]
}

function resultImage(result: UnifiedSearchResult) {
  switch (result.type) {
    case 'item':
      return result.entity.images?.find(Boolean) || ''
    case 'finspo':
      return result.entity.imageUrl || ''
    case 'event':
      return result.entity.coverImage || ''
    case 'user':
      return result.entity.profilePhoto || result.entity.shop?.logoUrl || ''
  }
}

type UnifiedSearchInput = {
  initialSnapshot?: UnifiedSearchSnapshot | null
  navigationKey?: string
  onSnapshotChange?: (snapshot: UnifiedSearchSnapshot) => void
  query?: string
  scope: UnifiedSearchScope
  tag?: string
  trackInitial?: boolean
}

export type UnifiedSearchSnapshot = {
  counts: UnifiedSearchCounts
  failedImages: string[]
  hasMore: boolean
  nextCursor: string | null
  query: string
  results: UnifiedSearchResult[]
  scope: UnifiedSearchScope
  tag: string
  total: number
  version: 1
}

export function useUnifiedSearch({ initialSnapshot = null, navigationKey = '', onSnapshotChange, query = '', scope, tag = '', trackInitial = false }: UnifiedSearchInput) {
  const normalizedQuery = query.trim()
  const normalizedTag = tag.trim().replace(/^#+/, '')
  const enabled = Boolean(normalizedQuery || normalizedTag)
  const searchKey = `${scope}\u0000${normalizedTag ? `tag:${normalizedTag}` : `q:${normalizedQuery}`}\u0000${navigationKey}`
  const [restoredSnapshot] = useState<UnifiedSearchSnapshot | null>(() => initialSnapshot?.version === 1
    && initialSnapshot.scope === scope
    && initialSnapshot.query === normalizedQuery
    && initialSnapshot.tag === normalizedTag
    ? initialSnapshot
    : null)
  const [results, setResults] = useState<UnifiedSearchResult[]>(restoredSnapshot?.results || [])
  const resultsRef = useRef<UnifiedSearchResult[]>(restoredSnapshot?.results || [])
  const [counts, setCounts] = useState<UnifiedSearchCounts>(restoredSnapshot?.counts || emptyCounts)
  const [total, setTotal] = useState(restoredSnapshot?.total || 0)
  const [nextCursor, setNextCursor] = useState<string | null>(restoredSnapshot?.nextCursor || null)
  const cursorRef = useRef<string | null>(restoredSnapshot?.nextCursor || null)
  const [hasMore, setHasMore] = useState(Boolean(restoredSnapshot?.hasMore && restoredSnapshot.nextCursor))
  const hasMoreRef = useRef(Boolean(restoredSnapshot?.hasMore && restoredSnapshot.nextCursor))
  const [loading, setLoading] = useState(enabled && !restoredSnapshot?.results.length)
  const [refreshing, setRefreshing] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState('')
  const [loadMoreError, setLoadMoreError] = useState('')
  const [failedImages, setFailedImages] = useState<string[]>(restoredSnapshot?.failedImages || [])
  const observerRef = useRef<IntersectionObserver | null>(null)
  const requestRef = useRef<AbortController | null>(null)
  const loadingRef = useRef(false)
  const generationRef = useRef(0)
  const trackPendingRef = useRef(trackInitial && !restoredSnapshot)
  const snapshotCallbackRef = useRef(onSnapshotChange)

  useEffect(() => {
    snapshotCallbackRef.current = onSnapshotChange
  }, [onSnapshotChange])

  const buildPath = useCallback((cursor?: string | null, track = false) => {
    if (!enabled) return null
    const params = new URLSearchParams({ limit: '50', scope })
    if (normalizedTag) params.set('tag', normalizedTag)
    else params.set('q', normalizedQuery)
    if (cursor) params.set('cursor', cursor)
    if (track && scope === 'all') params.set('track', '1')
    return `/search?${params.toString()}`
  }, [enabled, normalizedQuery, normalizedTag, scope])

  const load = useCallback(async (cursor: string | null, append: boolean, generation: number, preserve = false) => {
    const shouldTrack = !append && !cursor && trackPendingRef.current && scope === 'all'
    const path = buildPath(cursor, shouldTrack)
    if (!path || loadingRef.current) return
    if (shouldTrack) trackPendingRef.current = false

    requestRef.current?.abort()
    const controller = new AbortController()
    requestRef.current = controller
    loadingRef.current = true
    if (append) {
      setLoadMoreError('')
      setLoadingMore(true)
    } else if (preserve) {
      setError('')
      setLoadMoreError('')
      setRefreshing(true)
    } else {
      setError('')
      setLoadMoreError('')
      setLoading(true)
    }

    try {
      const response = await apiGet<UnifiedSearchResponse>(path, { signal: controller.signal })
      const imageResult = await preloadImageUrls(response.results.map(resultImage).filter(Boolean), controller.signal)
      if (controller.signal.aborted || generation !== generationRef.current) return

      const merged = append
        ? appendUnique(resultsRef.current, response.results)
        : preserve && resultsRef.current.length
          ? refreshWithoutReordering(resultsRef.current, response.results)
          : response.results
      resultsRef.current = merged
      if (!preserve || !cursorRef.current) {
        cursorRef.current = response.nextCursor || null
        hasMoreRef.current = Boolean(response.hasMore && response.nextCursor)
      }
      setResults(merged)
      setCounts({ ...emptyCounts, ...response.counts })
      setTotal(response.total ?? merged.length)
      setNextCursor(cursorRef.current)
      setHasMore(hasMoreRef.current)
      setFailedImages((current) => append || preserve
        ? Array.from(new Set([...current, ...imageResult.failed]))
        : imageResult.failed)
    } catch (requestError) {
      if (controller.signal.aborted || generation !== generationRef.current) return
      const message = getErrorMessage(requestError, 'Unable to search Foose right now')
      if (append) {
        setLoadMoreError(message)
      } else {
        setError(message)
        if (!preserve) {
          resultsRef.current = []
          setResults([])
          setCounts(emptyCounts)
          setTotal(0)
        }
      }
    } finally {
      if (generation === generationRef.current) {
        loadingRef.current = false
        setLoading(false)
        setRefreshing(false)
        setLoadingMore(false)
      }
    }
  }, [buildPath, scope])

  useEffect(() => {
    generationRef.current += 1
    const generation = generationRef.current
    requestRef.current?.abort()
    loadingRef.current = false
    const hasRestoredResults = Boolean(restoredSnapshot?.results.length)
    resultsRef.current = restoredSnapshot?.results || []
    cursorRef.current = restoredSnapshot?.nextCursor || null
    hasMoreRef.current = Boolean(restoredSnapshot?.hasMore && restoredSnapshot.nextCursor)
    trackPendingRef.current = trackInitial && !hasRestoredResults
    let cancelled = false
    queueMicrotask(() => {
      if (cancelled || generation !== generationRef.current) return
      setResults(restoredSnapshot?.results || [])
      setCounts(restoredSnapshot?.counts || emptyCounts)
      setTotal(restoredSnapshot?.total || 0)
      setNextCursor(restoredSnapshot?.nextCursor || null)
      setHasMore(Boolean(restoredSnapshot?.hasMore && restoredSnapshot.nextCursor))
      setFailedImages(restoredSnapshot?.failedImages || [])
      setError('')
      setLoadMoreError('')
      setLoading(enabled && !hasRestoredResults)
      if (enabled) void load(null, false, generation, hasRestoredResults)
    })

    return () => {
      cancelled = true
      requestRef.current?.abort()
    }
  }, [enabled, load, restoredSnapshot, searchKey, trackInitial])

  useEffect(() => {
    if (!enabled || (!results.length && loading)) return
    snapshotCallbackRef.current?.({
      counts,
      failedImages,
      hasMore,
      nextCursor,
      query: normalizedQuery,
      results,
      scope,
      tag: normalizedTag,
      total,
      version: 1,
    })
  }, [counts, enabled, failedImages, hasMore, loading, nextCursor, normalizedQuery, normalizedTag, results, scope, total])

  const refetch = useCallback(async () => {
    generationRef.current += 1
    const generation = generationRef.current
    loadingRef.current = false
    await load(null, false, generation, true)
  }, [load])

  const sentinelRef = useCallback((node: HTMLElement | null) => {
    observerRef.current?.disconnect()
    if (!node) return

    observerRef.current = new IntersectionObserver((entries) => {
      if (!entries[0]?.isIntersecting || loadingRef.current || !hasMoreRef.current || !cursorRef.current) return
      void load(cursorRef.current, true, generationRef.current)
    }, { rootMargin: '480px 0px' })
    observerRef.current.observe(node)
  }, [load])

  const retryLoadMore = useCallback(async () => {
    if (!cursorRef.current || !hasMoreRef.current) return
    await load(cursorRef.current, true, generationRef.current)
  }, [load])

  const failedImageSet = useMemo(() => new Set(failedImages), [failedImages])

  return {
    counts,
    enabled,
    error,
    failedImageSet,
    hasMore,
    loading,
    loadingMore,
    loadMoreError,
    navigationSnapshot: {
      counts,
      failedImages,
      hasMore,
      nextCursor,
      query: normalizedQuery,
      results,
      scope,
      tag: normalizedTag,
      total,
      version: 1 as const,
    },
    nextCursor,
    refetch,
    refreshing,
    retryLoadMore,
    results,
    sentinelRef,
    total,
  }
}
