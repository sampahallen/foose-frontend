import { apiPost } from '../lib/api'
import type { PaystackPaymentSession } from '../types/api'
import { navigateTo } from './navigation'
import { openPaystackInline, type PaystackInlineResult } from './paystackInline'

export type PromotionTargetType = 'event' | 'listing'
export type PromotionPackageName = 'basic' | 'lite' | 'premium'

export const listingPromotionPackages = [
  { days: 3, itemLimit: 10, label: 'Basic - GHS 10 / 3 days / 10 items', priceGhs: 10, value: 'basic' },
  { days: 7, itemLimit: 15, label: 'Lite - GHS 30 / 7 days / 15 items', priceGhs: 30, value: 'lite' },
  { days: 30, itemLimit: 30, label: 'Premium - GHS 50 / 30 days / 30 items', priceGhs: 50, value: 'premium' },
] as const

export const eventPromotionPackages = [
  { label: 'Basic - GHS 10 / 7 days', value: 'basic' },
  { label: 'Lite - GHS 30 / 1 month', value: 'lite' },
  { label: 'Premium - GHS 70 / 3 months', value: 'premium' },
] as const

type PromotionInitializeResponse = {
  payment: PaystackPaymentSession & {
    amountGhs: number
    targetId?: string
    targetIds?: string[]
    targetType: PromotionTargetType
  }
}

async function completePromotionPayment(data: PromotionInitializeResponse): Promise<PaystackInlineResult> {
  const result = await openPaystackInline(data.payment.accessCode)
  if (result.status === 'success') {
    if (result.reference !== data.payment.reference) {
      throw new Error('Paystack returned an unexpected transaction reference')
    }
    navigateTo(`/promotions/confirm?reference=${encodeURIComponent(result.reference)}`)
  }
  return result
}

export function isActiveTopPick(promotionTags?: string[], promotionExpiresAt?: string) {
  if (!promotionTags?.includes('top-pick')) return false
  if (!promotionExpiresAt) return false
  return new Date(promotionExpiresAt).getTime() > Date.now()
}

export async function startPromotionCheckout(targetType: PromotionTargetType, targetId: string, packageName: PromotionPackageName = 'basic') {
  const data = await apiPost<PromotionInitializeResponse>('/payments/promotions/initialize', {
    packageName,
    targetId,
    targetType,
  })

  return completePromotionPayment(data)
}

export async function startListingBundlePromotionCheckout(listingIds: string[], packageName: PromotionPackageName = 'basic') {
  const data = await apiPost<PromotionInitializeResponse>('/payments/promotions/initialize', {
    packageName,
    targetIds: listingIds,
    targetType: 'listing',
  })

  return completePromotionPayment(data)
}
