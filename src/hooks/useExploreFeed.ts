import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { apiGet } from '../lib/api'
import type { UnifiedSearchResult } from '../types/api'
import { getErrorMessage } from '../utils/errorMessage'
import { preloadImageUrls } from '../utils/imageLoading'

export type ExploreFeedMeta = {
  allocations: { events: number; finspo: number; items: number; users: number }
  discoveryCount: number
  pageSize: number
  personalized: boolean
  personalizedCount: number
  quotas: { events: number; finspo: number; items: number; users: number }
  signalCount: number
  signalThreshold: number
}

type ExploreResponse = {
  feed: ExploreFeedMeta
  feedSeed: string
  hasMore: boolean
  nextCursor: string | null
  results: UnifiedSearchResult[]
  seed?: string
  snapshot: string
  total: number
}

export type ExploreFeedSnapshot = ExploreResponse & {
  failedImages: string[]
  version: 1
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
  if (result.type === 'item') return result.entity.images?.find(Boolean) || ''
  if (result.type === 'finspo') return result.entity.imageUrl || ''
  if (result.type === 'event') return result.entity.coverImage || ''
  return result.entity.profilePhoto || result.entity.shop?.logoUrl || ''
}

export function useExploreFeed({
  enabled = true,
  initialSnapshot = null,
  limit = 50,
  onSnapshotChange,
  seed,
}: {
  enabled?: boolean
  initialSnapshot?: ExploreFeedSnapshot | null
  limit?: number
  onSnapshotChange?: (snapshot: ExploreFeedSnapshot) => void
  seed: string
}) {
  const [restoredSnapshot] = useState<ExploreFeedSnapshot | null>(() => initialSnapshot?.version === 1
    && (initialSnapshot.seed === seed || initialSnapshot.feedSeed === seed)
    ? initialSnapshot
    : null)
  const [results, setResults] = useState<UnifiedSearchResult[]>(restoredSnapshot?.results || [])
  const resultsRef = useRef<UnifiedSearchResult[]>(restoredSnapshot?.results || [])
  const [feed, setFeed] = useState<ExploreFeedMeta | null>(restoredSnapshot?.feed || null)
  const feedRef = useRef<ExploreFeedMeta | null>(restoredSnapshot?.feed || null)
  const [feedSeed, setFeedSeed] = useState(restoredSnapshot?.feedSeed || seed)
  const feedSeedRef = useRef(restoredSnapshot?.feedSeed || seed)
  const [total, setTotal] = useState(restoredSnapshot?.total || 0)
  const totalRef = useRef(restoredSnapshot?.total || 0)
  const [snapshot, setSnapshot] = useState(restoredSnapshot?.snapshot || '')
  const snapshotRef = useRef(restoredSnapshot?.snapshot || '')
  const [nextCursor, setNextCursor] = useState<string | null>(restoredSnapshot?.nextCursor || null)
  const cursorRef = useRef<string | null>(restoredSnapshot?.nextCursor || null)
  const [hasMore, setHasMore] = useState(Boolean(restoredSnapshot?.hasMore && restoredSnapshot?.nextCursor))
  const hasMoreRef = useRef(Boolean(restoredSnapshot?.hasMore && restoredSnapshot?.nextCursor))
  const [loading, setLoading] = useState(enabled && !restoredSnapshot?.results.length)
  const [refreshing, setRefreshing] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState('')
  const [loadMoreError, setLoadMoreError] = useState('')
  const [failedImages, setFailedImages] = useState<string[]>(restoredSnapshot?.failedImages || [])
  const failedImagesRef = useRef<string[]>(restoredSnapshot?.failedImages || [])
  const requestRef = useRef<AbortController | null>(null)
  const loadingRef = useRef(false)
  const observerRef = useRef<IntersectionObserver | null>(null)
  const generationRef = useRef(0)
  const snapshotCallbackRef = useRef(onSnapshotChange)

  useEffect(() => {
    snapshotCallbackRef.current = onSnapshotChange
  }, [onSnapshotChange])

  const load = useCallback(async (cursor: string | null, append: boolean, generation: number, preserve = false) => {
    if (!enabled || loadingRef.current) return
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

    const params = new URLSearchParams({ limit: String(Math.min(Math.max(limit, 1), 50)) })
    if (cursor) params.set('cursor', cursor)
    else if (seed) params.set('seed', seed)

    try {
      const response = await apiGet<ExploreResponse>(`/recommendations/explore?${params.toString()}`, { signal: controller.signal })
      const media = await preloadImageUrls(response.results.map(resultImage).filter(Boolean), controller.signal)
      if (controller.signal.aborted || generation !== generationRef.current) return

      const nextResults = append
        ? appendUnique(resultsRef.current, response.results)
        : preserve && resultsRef.current.length
          ? refreshWithoutReordering(resultsRef.current, response.results)
          : response.results
      const nextFailed = append || preserve
        ? Array.from(new Set([...failedImagesRef.current, ...media.failed]))
        : media.failed
      resultsRef.current = nextResults
      feedRef.current = response.feed
      feedSeedRef.current = response.feedSeed || seed
      totalRef.current = response.total ?? nextResults.length
      snapshotRef.current = response.snapshot || ''
      if (!preserve || !cursorRef.current) {
        cursorRef.current = response.nextCursor || null
        hasMoreRef.current = Boolean(response.hasMore && response.nextCursor)
      }
      failedImagesRef.current = nextFailed
      setResults(nextResults)
      setFeed(response.feed)
      setFeedSeed(feedSeedRef.current)
      setTotal(totalRef.current)
      setSnapshot(snapshotRef.current)
      setNextCursor(cursorRef.current)
      setHasMore(hasMoreRef.current)
      setFailedImages(nextFailed)
    } catch (requestError) {
      if (controller.signal.aborted || generation !== generationRef.current) return
      const message = getErrorMessage(requestError, 'Unable to load Explore right now')
      if (append) {
        setLoadMoreError(message)
      } else {
        setError(message)
        if (!preserve) {
          resultsRef.current = []
          setResults([])
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
  }, [enabled, limit, seed])

  useEffect(() => {
    generationRef.current += 1
    const generation = generationRef.current
    requestRef.current?.abort()
    loadingRef.current = false
    const restored = enabled ? restoredSnapshot : null
    let cancelled = false
    queueMicrotask(() => {
      if (cancelled || generation !== generationRef.current) return
      setError('')
      setLoadMoreError('')
      setRefreshing(false)
      if (restored?.results.length) {
        resultsRef.current = restored.results
        feedRef.current = restored.feed
        feedSeedRef.current = restored.feedSeed || seed
        totalRef.current = restored.total
        snapshotRef.current = restored.snapshot
        cursorRef.current = restored.nextCursor
        hasMoreRef.current = Boolean(restored.hasMore && restored.nextCursor)
        failedImagesRef.current = restored.failedImages || []
        setResults(restored.results)
        setFeed(restored.feed)
        setFeedSeed(feedSeedRef.current)
        setTotal(restored.total)
        setSnapshot(restored.snapshot)
        setNextCursor(restored.nextCursor)
        setHasMore(hasMoreRef.current)
        setFailedImages(restored.failedImages || [])
        setLoading(false)
        void load(null, false, generation, true)
      } else if (enabled) {
        resultsRef.current = []
        cursorRef.current = null
        hasMoreRef.current = false
        setResults([])
        setLoading(true)
        void load(null, false, generation)
      }
    })

    return () => {
      cancelled = true
      requestRef.current?.abort()
    }
  }, [enabled, load, restoredSnapshot, seed])

  useEffect(() => {
    if (!enabled || (!results.length && loading) || !feed) return
    snapshotCallbackRef.current?.({
      failedImages,
      feed,
      feedSeed,
      hasMore,
      nextCursor,
      results,
      seed,
      snapshot,
      total,
      version: 1,
    })
  }, [enabled, failedImages, feed, feedSeed, hasMore, loading, nextCursor, results, seed, snapshot, total])

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

  return {
    error,
    failedImageSet: useMemo(() => new Set(failedImages), [failedImages]),
    feed,
    feedSeed,
    hasMore,
    loading,
    loadingMore,
    loadMoreError,
    navigationSnapshot: feed ? {
      failedImages,
      feed,
      feedSeed,
      hasMore,
      nextCursor,
      results,
      seed,
      snapshot,
      total,
      version: 1 as const,
    } : null,
    nextCursor,
    refetch,
    refreshing,
    retryLoadMore,
    results,
    sentinelRef,
    snapshot,
    total,
  }
}
