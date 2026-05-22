import { useEffect, useState } from 'react'
import { apiGet } from '../lib/api'
import { getErrorMessage } from '../utils/errorMessage'

type State = {
  error: string
  fee: number | null
  loading: boolean
}

const initial: State = { error: '', fee: null, loading: false }

/**
 * Loads `/delivery/estimate` to match backend fee calculation at checkout.
 */
export function useDeliveryEstimate(region: string, method: 'pickup' | 'delivery') {
  const [state, setState] = useState<State>(initial)

  useEffect(() => {
    if (method === 'pickup') {
      queueMicrotask(() => setState({ error: '', fee: 0, loading: false }))
      return
    }

    const trimmed = region.trim()
    if (!trimmed) {
      queueMicrotask(() => setState({ error: '', fee: null, loading: false }))
      return
    }

    const ac = new AbortController()
    const timer = window.setTimeout(() => {
      queueMicrotask(() => setState({ error: '', fee: null, loading: true }))
      void apiGet<{ fee: number }>(
        `/delivery/estimate?region=${encodeURIComponent(trimmed)}&method=delivery`,
        { signal: ac.signal },
      )
        .then((data) => {
          if (!ac.signal.aborted) setState({ error: '', fee: data.fee, loading: false })
        })
        .catch((err: unknown) => {
          if (err instanceof Error && err.name === 'AbortError') return
          if (!ac.signal.aborted) setState({ error: getErrorMessage(err), fee: null, loading: false })
        })
    }, 350)

    return () => {
      ac.abort()
      window.clearTimeout(timer)
    }
  }, [region, method])

  return state
}
