import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { apiGet } from '../lib/api'
import type { GalleryPost, PaginatedFinspoFeed } from '../types/api'
import { getErrorMessage } from '../utils/errorMessage'
import { preloadImageUrls } from '../utils/imageLoading'

type FinspoFeedOptions = {
  enabled?: boolean
  excludePostId?: string
  initialSnapshot?: FinspoFeedSnapshot | null
  onSnapshotChange?: (snapshot: FinspoFeedSnapshot) => void
}

export type FinspoFeedSnapshot = {
  failedImages: string[]
  feed: PaginatedFinspoFeed['feed'] | null
  items: GalleryPost[]
  page: number
  pages: number
  seed: string
  total: number
  version: 1
}

function createFeedSeed() {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function appendUnique(current: GalleryPost[], next: GalleryPost[]) {
  const seen = new Set(current.map((post) => post._id))
  return [...current, ...next.filter((post) => !seen.has(post._id) && seen.add(post._id))]
}

function refreshWithoutReordering(current: GalleryPost[], incoming: GalleryPost[]) {
  const refreshed = new Map(incoming.map((post) => [post._id, post]))
  const known = new Set(current.map((post) => post._id))
  return [
    ...current.map((post) => refreshed.get(post._id) || post),
    ...incoming.filter((post) => !known.has(post._id)),
  ]
}

export function useFinspoFeed({ enabled = true, excludePostId = '', initialSnapshot = null, onSnapshotChange }: FinspoFeedOptions = {}) {
  const [restoredSnapshot] = useState<FinspoFeedSnapshot | null>(() => initialSnapshot?.version === 1 ? initialSnapshot : null)
  const [seed] = useState(() => restoredSnapshot?.seed || createFeedSeed())
  const [items, setItems] = useState<GalleryPost[]>(restoredSnapshot?.items || [])
  const [data, setData] = useState<PaginatedFinspoFeed | null>(() => restoredSnapshot?.feed ? {
    feed: restoredSnapshot.feed,
    page: restoredSnapshot.page,
    pages: restoredSnapshot.pages,
    posts: restoredSnapshot.items,
    total: restoredSnapshot.total,
  } : null)
  const [page, setPage] = useState(restoredSnapshot?.page || 1)
  const [pages, setPages] = useState(restoredSnapshot?.pages || 1)
  const [total, setTotal] = useState(restoredSnapshot?.total || 0)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(enabled && !restoredSnapshot?.items.length)
  const [refreshing, setRefreshing] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [loadMoreError, setLoadMoreError] = useState('')
  const [failedImages, setFailedImages] = useState<string[]>(restoredSnapshot?.failedImages || [])
  const observerRef = useRef<IntersectionObserver | null>(null)
  const loadingRef = useRef(false)
  const itemsRef = useRef<GalleryPost[]>(restoredSnapshot?.items || [])
  const snapshotCallbackRef = useRef(onSnapshotChange)

  useEffect(() => {
    snapshotCallbackRef.current = onSnapshotChange
  }, [onSnapshotChange])

  const loadPage = useCallback(async (nextPage: number, append: boolean, signal?: AbortSignal, preserve = false) => {
    if (!enabled || loadingRef.current) return

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
      const params = new URLSearchParams({ page: String(nextPage), seed })
      const pageData = await apiGet<PaginatedFinspoFeed>(`/recommendations/finspo?${params.toString()}`, { signal })
      const requestedPosts = pageData.posts.filter((post) => post._id !== excludePostId)
      const preloaded = await preloadImageUrls(requestedPosts.map((post) => post.imageUrl), signal)
      if (signal?.aborted) return

      const mergedItems = append
        ? appendUnique(itemsRef.current, requestedPosts)
        : preserve && itemsRef.current.length
          ? refreshWithoutReordering(itemsRef.current, requestedPosts)
          : requestedPosts
      itemsRef.current = mergedItems
      setData({ ...pageData, posts: mergedItems })
      setItems(mergedItems)
      if (!preserve || append) setPage(pageData.page)
      setPages(pageData.pages)
      setTotal(pageData.total)
      setFailedImages((current) => append || preserve
        ? Array.from(new Set([...current, ...preloaded.failed]))
        : preloaded.failed)
    } catch (requestError) {
      if (requestError instanceof Error && requestError.name === 'AbortError') return
      const message = getErrorMessage(requestError, 'Unable to load Finspo')
      if (append) {
        setLoadMoreError(message)
      } else {
        setError(message)
        if (!preserve) {
          itemsRef.current = []
          setItems([])
          setData(null)
          setFailedImages([])
        }
      }
    } finally {
      loadingRef.current = false
      if (!signal?.aborted) {
        setLoading(false)
        setRefreshing(false)
        setLoadingMore(false)
      }
    }
  }, [enabled, excludePostId, seed])

  const refetch = useCallback(async () => {
    await loadPage(1, false, undefined, true)
  }, [loadPage])

  useEffect(() => {
    if (!enabled) {
      queueMicrotask(() => setLoading(false))
      return
    }

    const controller = new AbortController()
    const hasRestoredItems = Boolean(restoredSnapshot?.items.length)
    if (!hasRestoredItems) itemsRef.current = []
    queueMicrotask(() => {
      if (!controller.signal.aborted) void loadPage(1, false, controller.signal, hasRestoredItems)
    })

    return () => controller.abort()
  }, [enabled, loadPage, restoredSnapshot])

  useEffect(() => {
    if (!enabled || (!items.length && loading)) return
    snapshotCallbackRef.current?.({
      failedImages,
      feed: data?.feed || restoredSnapshot?.feed || null,
      items,
      page,
      pages,
      seed,
      total,
      version: 1,
    })
  }, [data?.feed, enabled, failedImages, items, loading, page, pages, restoredSnapshot?.feed, seed, total])

  const sentinelRef = useCallback((node: HTMLElement | null) => {
    observerRef.current?.disconnect()
    if (!node || !enabled) return

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting || loadingRef.current || page >= pages) return
        void loadPage(page + 1, true)
      },
      { rootMargin: '480px 0px' },
    )
    observerRef.current.observe(node)
  }, [enabled, loadPage, page, pages])

  const retryLoadMore = useCallback(async () => {
    if (page >= pages) return
    await loadPage(page + 1, true)
  }, [loadPage, page, pages])

  useEffect(() => () => observerRef.current?.disconnect(), [])

  return {
    data,
    error,
    failedImageSet: useMemo(() => new Set(failedImages), [failedImages]),
    hasMore: page < pages,
    items,
    loading,
    loadingMore,
    loadMoreError,
    refetch,
    refreshing,
    retryLoadMore,
    seed,
    sentinelRef,
    snapshot: {
      failedImages,
      feed: data?.feed || restoredSnapshot?.feed || null,
      items,
      page,
      pages,
      seed,
      total,
      version: 1 as const,
    },
    total,
  }
}
