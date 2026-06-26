import { apiPost } from '../lib/api'
import { withBasePath } from './navigation'

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
  payment: {
    amountGhs: number
    authorizationUrl?: string
    reference?: string
    targetId: string
    targetType: PromotionTargetType
  }
}

export function isActiveTopPick(promotionTags?: string[], promotionExpiresAt?: string) {
  if (!promotionTags?.includes('top-pick')) return false
  if (!promotionExpiresAt) return false
  return new Date(promotionExpiresAt).getTime() > Date.now()
}

export async function startPromotionCheckout(targetType: PromotionTargetType, targetId: string, packageName: PromotionPackageName = 'basic') {
  const data = await apiPost<PromotionInitializeResponse>('/payments/promotions/initialize', {
    callbackUrl: `${window.location.origin}${withBasePath('/promotions/confirm')}`,
    packageName,
    targetId,
    targetType,
  })

  if (!data.payment.authorizationUrl) {
    throw new Error('Paystack did not return a checkout link')
  }

  window.location.assign(data.payment.authorizationUrl)
}

export async function startListingBundlePromotionCheckout(listingIds: string[], packageName: PromotionPackageName = 'basic') {
  const data = await apiPost<PromotionInitializeResponse>('/payments/promotions/initialize', {
    callbackUrl: `${window.location.origin}${withBasePath('/promotions/confirm')}`,
    packageName,
    targetIds: listingIds,
    targetType: 'listing',
  })

  if (!data.payment.authorizationUrl) {
    throw new Error('Paystack did not return a checkout link')
  }

  window.location.assign(data.payment.authorizationUrl)
}
