import { useCallback, useEffect, useState } from 'react'
import { apiGet } from '../lib/api'
import { getErrorMessage } from '../utils/errorMessage'

type ResourceState<T> = {
  data: T | null
  error: string
  loading: boolean
  refetch: () => Promise<void>
}

export function useApiResource<T>(path: string | null, enabled = true): ResourceState<T> {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(Boolean(path && enabled))

  const refetch = useCallback(async () => {
    if (!path || !enabled) return
    setLoading(true)
    setError('')
    try {
      setData(await apiGet<T>(path))
    } catch (requestError) {
      setData(null)
      setError(getErrorMessage(requestError, 'Unable to load data'))
    } finally {
      setLoading(false)
    }
  }, [enabled, path])

  useEffect(() => {
    if (!path || !enabled) {
      queueMicrotask(() => {
        setLoading(false)
      })
      return
    }

    const ac = new AbortController()
    queueMicrotask(() => {
      setLoading(true)
      setError('')
    })

    void apiGet<T>(path, { signal: ac.signal })
      .then((result) => setData(result))
      .catch((requestError: unknown) => {
        if (requestError instanceof Error && requestError.name === 'AbortError') return
        setData(null)
        setError(getErrorMessage(requestError, 'Unable to load data'))
      })
      .finally(() => {
        if (!ac.signal.aborted) setLoading(false)
      })

    return () => ac.abort()
  }, [path, enabled])

  return { data, error, loading, refetch }
}
