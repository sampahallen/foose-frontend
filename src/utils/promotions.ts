import { apiPost } from '../lib/api'
import type { PaystackPaymentSession, PromotionTier } from '../types/api'
import { navigateTo } from './navigation'
import { openPaystackInline, type PaystackInlineResult } from './paystackInline'

export type PromotionTargetType = 'event' | 'listing'

export const listingPromotionPackages = [
  { days: 1, durationLabel: '24 hours', itemLimit: 30, label: 'Quick Boost', priceGhs: 10, value: 'quick_boost' },
  { days: 3, durationLabel: '3 days', itemLimit: 30, label: 'Weekend Push', priceGhs: 30, value: 'weekend_push' },
  { days: 7, durationLabel: '7 days', itemLimit: 30, label: 'Top Pick', priceGhs: 50, value: 'top_pick' },
] as const satisfies ReadonlyArray<{ days: number; durationLabel: string; itemLimit: number; label: string; priceGhs: number; value: PromotionTier }>

export const eventPromotionPackage = { days: 7, label: 'Homepage Feature', priceGhs: 30, value: 'homepage_feature' } as const

type PromotionInitializeResponse = {
  payment: PaystackPaymentSession & {
    amount: number
    amountGhs: number
    durationHours: number
    promotionOrderId: string
    targetIds: string[]
    targetType: PromotionTargetType
    tier: PromotionTier
    unitAmount: number
  }
}

async function completePromotionPayment(data: PromotionInitializeResponse): Promise<PaystackInlineResult> {
  const result = await openPaystackInline(data.payment.accessCode)
  if (result.status === 'success') {
    if (result.reference !== data.payment.reference) throw new Error('Paystack returned an unexpected transaction reference')
    navigateTo(`/promotions/confirm?reference=${encodeURIComponent(result.reference)}`)
  }
  return result
}

export function isActiveTopPick(promotionTags?: string[], promotionExpiresAt?: string) {
  return Boolean(promotionTags?.includes('top-pick') && promotionExpiresAt && new Date(promotionExpiresAt).getTime() > Date.now())
}

export function isActiveEventPromotion(promotionTags?: string[], promotionExpiresAt?: string, status?: string) {
  if (status === 'past' || !promotionExpiresAt || new Date(promotionExpiresAt).getTime() <= Date.now()) return false
  return Boolean(promotionTags?.some((tag) => ['featured', 'home-featured', 'home-banner'].includes(tag)))
}

export async function startEventPromotionCheckout(eventId: string) {
  const data = await apiPost<PromotionInitializeResponse>('/payments/promotions/initialize', {
    targetIds: [eventId],
    targetType: 'event',
    tier: 'homepage_feature',
  })
  return completePromotionPayment(data)
}

export async function startListingPromotionCheckout(listingIds: string[], tier: Exclude<PromotionTier, 'homepage_feature'> = 'quick_boost') {
  const data = await apiPost<PromotionInitializeResponse>('/payments/promotions/initialize', {
    targetIds: listingIds,
    targetType: 'listing',
    tier,
  })
  return completePromotionPayment(data)
}

export function promotionMetricSessionId() {
  const key = 'foose-promotion-metric-session'
  const existing = window.sessionStorage.getItem(key)
  if (existing) return existing
  const value = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`
  window.sessionStorage.setItem(key, value)
  return value
}

export function recordPromotionMetric(listingId: string, metric: 'impression' | 'click') {
  const sessionId = promotionMetricSessionId()
  const dedupeKey = `foose-promotion-${metric}:${listingId}:${sessionId}`
  if (window.sessionStorage.getItem(dedupeKey)) return
  window.sessionStorage.setItem(dedupeKey, '1')
  void apiPost(`/promotions/listings/${listingId}/metrics`, { metric, sessionId }).catch(() => {
    window.sessionStorage.removeItem(dedupeKey)
  })
}
