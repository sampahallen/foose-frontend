import { useCallback, useEffect, useRef, useState } from 'react'
import { apiGet } from '../lib/api'
import { toResourceErrorMeta, type ResourceErrorMeta } from './useApiResource'

export type InfiniteState<T, R extends PageMeta> = {
  data: R | null
  error: string
  errorMeta: ResourceErrorMeta | null
  hasMore: boolean
  initialLoading: boolean
  items: T[]
  loading: boolean
  loadingMore: boolean
  loadMoreError: string
  loadMoreErrorMeta: ResourceErrorMeta | null
  refetch: () => Promise<void>
  refreshing: boolean
  retryLoadMore: () => Promise<void>
  sentinelRef: (node: HTMLElement | null) => void
  total: number
}

export type PageMeta = {
  page?: number
  pages?: number
  total?: number
}

function inferPages(data: PageMeta, page: number, itemCount: number) {
  if (typeof data.pages === 'number') return data.pages
  if (typeof data.total === 'number') return Math.max(1, Math.ceil(data.total / Math.max(itemCount, 1)))
  return page
}

function resourceId(value: unknown) {
  if (!value || typeof value !== 'object' || !('_id' in value)) return ''
  return String(value._id || '')
}

function appendUnique<T>(current: T[], next: T[]) {
  const seen = new Set(current.map(resourceId).filter(Boolean))

  return next.reduce((results, item) => {
    const id = resourceId(item)
    if (id && seen.has(id)) return results
    if (id) seen.add(id)
    results.push(item)
    return results
  }, [...current])
}

type LoadMode = 'initial' | 'refresh' | 'append'

const objectDependencyIds = new WeakMap<object, number>()
const symbolDependencyIds = new Map<symbol, number>()
let nextDependencyId = 1

function dependencyValueKey(value: unknown) {
  if ((typeof value === 'object' && value !== null) || typeof value === 'function') {
    const objectValue = value as object
    let id = objectDependencyIds.get(objectValue)
    if (!id) {
      id = nextDependencyId
      nextDependencyId += 1
      objectDependencyIds.set(objectValue, id)
    }
    return `object:${id}`
  }
  if (typeof value === 'symbol') {
    let id = symbolDependencyIds.get(value)
    if (!id) {
      id = nextDependencyId
      nextDependencyId += 1
      symbolDependencyIds.set(value, id)
    }
    return `symbol:${id}`
  }
  return `${typeof value}:${String(value)}`
}

function dependencyListKey(dependencies: readonly unknown[]) {
  return JSON.stringify(dependencies.map(dependencyValueKey))
}

export function useInfiniteApiResource<T, R extends PageMeta>(
  buildPath: (page: number) => string | null,
  extractItems: (data: R) => T[],
  deps: readonly unknown[] = [],
): InfiniteState<T, R> {
  const [items, setItems] = useState<T[]>([])
  const [data, setData] = useState<R | null>(null)
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [errorMeta, setErrorMeta] = useState<ResourceErrorMeta | null>(null)
  const [loadMoreErrorMeta, setLoadMoreErrorMeta] = useState<ResourceErrorMeta | null>(null)
  const [loading, setLoading] = useState(Boolean(buildPath(1)))
  const [initialLoading, setInitialLoading] = useState(Boolean(buildPath(1)))
  const [refreshing, setRefreshing] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const observerRef = useRef<IntersectionObserver | null>(null)
  const loadingRef = useRef(false)
  const itemsRef = useRef<T[]>([])
  const dataRef = useRef<R | null>(null)
  const generationRef = useRef(0)
  const dependencyKey = dependencyListKey(deps)

  const loadPage = useCallback(
    async (nextPage: number, mode: LoadMode) => {
      const path = buildPath(nextPage)
      if (!path || loadingRef.current) return

      const generation = generationRef.current
      loadingRef.current = true
      if (mode === 'append') {
        setLoadingMore(true)
        setLoadMoreErrorMeta(null)
      } else {
        setLoading(true)
        setInitialLoading(mode === 'initial')
        setRefreshing(mode === 'refresh')
        setErrorMeta(null)
      }

      try {
        const pageData = await apiGet<R>(path)
        if (generationRef.current !== generation) return
        const nextItems = extractItems(pageData)
        const mergedItems = mode === 'append' ? appendUnique(itemsRef.current, nextItems) : nextItems
        itemsRef.current = mergedItems
        dataRef.current = pageData
        setData(pageData)
        setItems(mergedItems)
        setPage(pageData.page || nextPage)
        setPages(inferPages(pageData, nextPage, nextItems.length))
        setTotal(pageData.total ?? mergedItems.length)
      } catch (requestError) {
        if (generationRef.current !== generation) return
        const requestErrorMeta = toResourceErrorMeta(requestError)
        if (mode === 'append') {
          setLoadMoreErrorMeta(requestErrorMeta)
        } else {
          setErrorMeta(requestErrorMeta)
          if (mode === 'initial') {
            dataRef.current = null
            itemsRef.current = []
            setData(null)
            setItems([])
            setTotal(0)
          }
        }
      } finally {
        if (generationRef.current === generation) {
          loadingRef.current = false
          setLoading(false)
          setInitialLoading(false)
          setRefreshing(false)
          setLoadingMore(false)
        }
      }
    },
    [buildPath, extractItems],
  )

  const refetch = useCallback(async () => {
    const mode: LoadMode = dataRef.current !== null ? 'refresh' : 'initial'
    await loadPage(1, mode)
  }, [loadPage])

  const retryLoadMore = useCallback(async () => {
    if (page >= pages) return
    await loadPage(page + 1, 'append')
  }, [loadPage, page, pages])

  useEffect(() => {
    generationRef.current += 1
    const generation = generationRef.current
    loadingRef.current = false
    observerRef.current?.disconnect()

    queueMicrotask(() => {
      if (generationRef.current !== generation) return
      itemsRef.current = []
      dataRef.current = null
      setItems([])
      setData(null)
      setPage(1)
      setPages(1)
      setTotal(0)
      setErrorMeta(null)
      setLoadMoreErrorMeta(null)
      setRefreshing(false)
      setLoadingMore(false)
      const hasInitialPath = Boolean(buildPath(1))
      setLoading(hasInitialPath)
      setInitialLoading(hasInitialPath)
      if (hasInitialPath) void loadPage(1, 'initial')
    })

    return () => {
      if (generationRef.current === generation) generationRef.current += 1
      loadingRef.current = false
      observerRef.current?.disconnect()
    }
  }, [buildPath, dependencyKey, loadPage])

  const sentinelRef = useCallback(
    (node: HTMLElement | null) => {
      observerRef.current?.disconnect()
      if (!node) return

      observerRef.current = new IntersectionObserver(
        (entries) => {
          if (!entries[0]?.isIntersecting || loadingRef.current || loadMoreErrorMeta || page >= pages) return
          void loadPage(page + 1, 'append')
        },
        { rootMargin: '360px 0px' },
      )
      observerRef.current.observe(node)
    },
    [loadMoreErrorMeta, loadPage, page, pages],
  )

  return {
    data,
    error: errorMeta?.message || '',
    errorMeta,
    hasMore: page < pages,
    initialLoading,
    items,
    loading,
    loadingMore,
    loadMoreError: loadMoreErrorMeta?.message || '',
    loadMoreErrorMeta,
    refetch,
    refreshing,
    retryLoadMore,
    sentinelRef,
    total,
  }
}
