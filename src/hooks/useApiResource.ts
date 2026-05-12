import { useCallback, useEffect, useState } from 'react'
import { apiGet } from '../lib/api'

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
    if (!path || !enabled) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError('')

    try {
      setData(await apiGet<T>(path))
    } catch (requestError) {
      setData(null)
      setError(requestError instanceof Error ? requestError.message : 'Unable to load data')
    } finally {
      setLoading(false)
    }
  }, [enabled, path])

  useEffect(() => {
    const timer = window.setTimeout(() => void refetch(), 0)
    return () => window.clearTimeout(timer)
  }, [refetch])

  return { data, error, loading, refetch }
}
