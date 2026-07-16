import { apiPost, getStoredTokens } from '../lib/api'

export type ListingRecommendationSignal = 'add_to_cart' | 'dwell' | 'view'

export function recordListingSignal(
  listingId: string,
  type: ListingRecommendationSignal,
  details: { dwellMs?: number } = {},
) {
  if (!listingId || !getStoredTokens()?.accessToken) return Promise.resolve(undefined)

  return apiPost<{ recorded: boolean; type: ListingRecommendationSignal }>('/recommendations/signals', {
    ...details,
    listingId,
    type,
  }, { keepalive: true }).catch(() => undefined)
}
