import { useCallback, useEffect, useRef, useState } from 'react'
import { apiGet } from '../lib/api'
import { getErrorMessage } from '../utils/errorMessage'

type InfiniteState<T> = {
  error: string
  hasMore: boolean
  items: T[]
  loading: boolean
  loadingMore: boolean
  refetch: () => Promise<void>
  sentinelRef: (node: HTMLElement | null) => void
  total: number
}

type PageMeta = {
  page?: number
  pages?: number
  total?: number
}

function inferPages(data: PageMeta, page: number, itemCount: number) {
  if (typeof data.pages === 'number') return data.pages
  if (typeof data.total === 'number') return Math.max(1, Math.ceil(data.total / Math.max(itemCount, 1)))
  return page
}

export function useInfiniteApiResource<T, R extends PageMeta>(
  buildPath: (page: number) => string | null,
  extractItems: (data: R) => T[],
  deps: readonly unknown[] = [],
): InfiniteState<T> {
  const [items, setItems] = useState<T[]>([])
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(Boolean(buildPath(1)))
  const [loadingMore, setLoadingMore] = useState(false)
  const observerRef = useRef<IntersectionObserver | null>(null)
  const loadingRef = useRef(false)

  const loadPage = useCallback(
    async (nextPage: number, append: boolean) => {
      const path = buildPath(nextPage)
      if (!path || loadingRef.current) return

      loadingRef.current = true
      if (append) setLoadingMore(true)
      else setLoading(true)
      setError('')

      try {
        const data = await apiGet<R>(path)
        const nextItems = extractItems(data)
        setItems((current) => (append ? [...current, ...nextItems] : nextItems))
        setPage(data.page || nextPage)
        setPages(inferPages(data, nextPage, nextItems.length))
        setTotal(data.total ?? (append ? items.length + nextItems.length : nextItems.length))
      } catch (requestError) {
        setError(getErrorMessage(requestError, 'Unable to load data'))
        if (!append) setItems([])
      } finally {
        loadingRef.current = false
        setLoading(false)
        setLoadingMore(false)
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [buildPath, extractItems, ...deps],
  )

  const refetch = useCallback(async () => {
    setPage(1)
    setPages(1)
    await loadPage(1, false)
  }, [loadPage])

  useEffect(() => {
    setItems([])
    setPage(1)
    setPages(1)
    void loadPage(1, false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  const sentinelRef = useCallback(
    (node: HTMLElement | null) => {
      observerRef.current?.disconnect()
      if (!node) return

      observerRef.current = new IntersectionObserver(
        (entries) => {
          if (!entries[0]?.isIntersecting || loadingRef.current || page >= pages) return
          void loadPage(page + 1, true)
        },
        { rootMargin: '360px 0px' },
      )
      observerRef.current.observe(node)
    },
    [loadPage, page, pages],
  )

  return {
    error,
    hasMore: page < pages,
    items,
    loading,
    loadingMore,
    refetch,
    sentinelRef,
    total,
  }
}
