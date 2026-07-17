import { useEffect, useMemo, useState } from 'react'
import { preloadImageUrls } from '../utils/imageLoading'

type ImageBatchState = {
  failed: string[]
  key: string
}

export function useImageBatchReady(urls: string[], enabled = true) {
  const key = useMemo(
    () => Array.from(new Set(urls.map((url) => url.trim()).filter(Boolean))).sort().join('\u0000'),
    [urls],
  )
  const [state, setState] = useState<ImageBatchState>({ failed: [], key: '' })

  useEffect(() => {
    if (!enabled || !key) return

    let cancelled = false
    const batchUrls = key.split('\u0000')
    void preloadImageUrls(batchUrls).then((result) => {
      if (!cancelled) setState({ failed: result.failed, key })
    })

    return () => {
      cancelled = true
    }
  }, [enabled, key])

  return {
    failed: state.key === key ? state.failed : [],
    ready: !enabled || !key || state.key === key,
  }
}
