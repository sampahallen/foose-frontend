import { useEffect } from 'react'
import { recordListingSignal } from '../utils/recommendations'

type PendingDwell = {
  startedAt: number
  timeoutId: number
}

const pendingDwell = new Map<string, PendingDwell>()
const recentViews = new Map<string, number>()

export function useListingRecommendationSignals(listingId?: string, enabled = true) {
  useEffect(() => {
    if (!enabled || !listingId) return undefined

    const key = listingId
    const pending = pendingDwell.get(key)
    let startedAt = Date.now()

    if (pending) {
      window.clearTimeout(pending.timeoutId)
      pendingDwell.delete(key)
      startedAt = pending.startedAt
    }

    const lastViewAt = recentViews.get(key) || 0
    if (Date.now() - lastViewAt > 1000) {
      recentViews.set(key, Date.now())
      void recordListingSignal(listingId, 'view')
    }

    return () => {
      const dwellMs = Date.now() - startedAt
      const timeoutId = window.setTimeout(() => {
        pendingDwell.delete(key)
        void recordListingSignal(listingId, 'dwell', { dwellMs })
      }, 250)

      pendingDwell.set(key, { startedAt, timeoutId })
    }
  }, [enabled, listingId])
}
