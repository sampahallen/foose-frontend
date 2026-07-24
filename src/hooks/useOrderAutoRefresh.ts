import { useEffect, useRef } from 'react'

/**
 * Keeps deadline-driven order screens current without making reads mutate data.
 * The server remains authoritative; this only refreshes on focus and at a
 * conservative interval while the tab is visible.
 */
export function useOrderAutoRefresh(
  refetch: () => Promise<void>,
  enabled = true,
  intervalMs = 30_000,
) {
  const refetchRef = useRef(refetch)

  useEffect(() => {
    refetchRef.current = refetch
  }, [refetch])

  useEffect(() => {
    if (!enabled) return undefined
    let lastRefresh = Date.now()

    function refreshIfVisible() {
      if (document.visibilityState === 'hidden') return
      lastRefresh = Date.now()
      void refetchRef.current()
    }

    function handleFocus() {
      if (Date.now() - lastRefresh >= 5_000) refreshIfVisible()
    }

    const timer = window.setInterval(refreshIfVisible, intervalMs)
    window.addEventListener('focus', handleFocus)
    document.addEventListener('visibilitychange', handleFocus)
    return () => {
      window.clearInterval(timer)
      window.removeEventListener('focus', handleFocus)
      document.removeEventListener('visibilitychange', handleFocus)
    }
  }, [enabled, intervalMs])
}
