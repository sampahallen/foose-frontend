import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiError, apiGet } from '../lib/api'
import { getErrorMessage } from '../utils/errorMessage'

export type ResourceErrorKind =
  | 'offline'
  | 'network'
  | 'permission'
  | 'not-found'
  | 'validation'
  | 'server'
  | 'unknown'

export type ResourceErrorMeta = {
  kind: ResourceErrorKind
  message: string
  retryable: boolean
  status: number | null
}

export type ResourceState<T> = {
  data: T | null
  error: string
  errorMeta: ResourceErrorMeta | null
  initialLoading: boolean
  loading: boolean
  refetch: () => Promise<void>
  refreshing: boolean
}

function navigatorIsOffline() {
  return typeof navigator !== 'undefined' && navigator.onLine === false
}

export function toResourceErrorMeta(error: unknown, fallback = 'Unable to load data'): ResourceErrorMeta {
  const message = getErrorMessage(error, fallback)

  if (navigatorIsOffline()) {
    return { kind: 'offline', message, retryable: true, status: null }
  }

  if (error instanceof ApiError) {
    if (error.status === 401 || error.status === 403) {
      return { kind: 'permission', message, retryable: false, status: error.status }
    }
    if (error.status === 404 || error.status === 410) {
      return { kind: 'not-found', message, retryable: false, status: error.status }
    }
    if ([400, 409, 422].includes(error.status)) {
      return { kind: 'validation', message, retryable: false, status: error.status }
    }
    if (error.status >= 500) {
      return { kind: 'server', message, retryable: true, status: error.status }
    }
    return { kind: 'unknown', message, retryable: error.status === 408 || error.status === 429, status: error.status }
  }

  if (
    error instanceof TypeError
    || (error instanceof Error && /fetch|network|connection/i.test(error.message))
  ) {
    return { kind: 'network', message, retryable: true, status: null }
  }

  return { kind: 'unknown', message, retryable: false, status: null }
}

export function useApiResource<T>(path: string | null, enabled = true): ResourceState<T> {
  const shouldLoad = Boolean(path && enabled)
  const [data, setData] = useState<T | null>(null)
  const [errorMeta, setErrorMeta] = useState<ResourceErrorMeta | null>(null)
  const [loading, setLoading] = useState(shouldLoad)
  const [initialLoading, setInitialLoading] = useState(shouldLoad)
  const [refreshing, setRefreshing] = useState(false)
  const dataRef = useRef<T | null>(null)
  const identityRef = useRef(path)
  const requestRef = useRef(0)

  const refetch = useCallback(async () => {
    if (!path || !enabled) return
    const hasData = dataRef.current !== null
    requestRef.current += 1
    const requestId = requestRef.current
    setLoading(true)
    setInitialLoading(!hasData)
    setRefreshing(hasData)
    setErrorMeta(null)

    try {
      const result = await apiGet<T>(path)
      if (requestRef.current !== requestId) return
      dataRef.current = result
      setData(result)
    } catch (requestError) {
      if (requestRef.current !== requestId) return
      setErrorMeta(toResourceErrorMeta(requestError))
    } finally {
      if (requestRef.current === requestId) {
        setLoading(false)
        setInitialLoading(false)
        setRefreshing(false)
      }
    }
  }, [enabled, path])

  useEffect(() => {
    requestRef.current += 1
    const requestId = requestRef.current
    const identityChanged = identityRef.current !== path
    identityRef.current = path

    if (!path || !enabled) {
      queueMicrotask(() => {
        if (requestRef.current !== requestId) return
        dataRef.current = null
        setData(null)
        setErrorMeta(null)
        setInitialLoading(false)
        setLoading(false)
        setRefreshing(false)
      })
      return
    }

    const ac = new AbortController()
    const hasData = !identityChanged && dataRef.current !== null
    if (identityChanged) dataRef.current = null

    queueMicrotask(() => {
      if (requestRef.current !== requestId) return
      if (identityChanged) setData(null)
      setErrorMeta(null)
      setInitialLoading(!hasData)
      setLoading(true)
      setRefreshing(hasData)
    })

    void apiGet<T>(path, { signal: ac.signal })
      .then((result) => {
        if (requestRef.current !== requestId) return
        dataRef.current = result
        setData(result)
      })
      .catch((requestError: unknown) => {
        if (requestError instanceof Error && requestError.name === 'AbortError') return
        if (requestRef.current !== requestId) return
        setErrorMeta(toResourceErrorMeta(requestError))
      })
      .finally(() => {
        if (requestRef.current !== requestId || ac.signal.aborted) return
        setLoading(false)
        setInitialLoading(false)
        setRefreshing(false)
      })

    return () => ac.abort()
  }, [path, enabled])

  return {
    data,
    error: errorMeta?.message || '',
    errorMeta,
    initialLoading,
    loading,
    refetch,
    refreshing,
  }
}
