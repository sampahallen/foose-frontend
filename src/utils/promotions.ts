import { apiPost } from '../lib/api'
import { withBasePath } from './navigation'

export type PromotionTargetType = 'event' | 'listing'
export type PromotionPackageName = 'basic' | 'lite' | 'premium'

export const listingPromotionPackages = [
  { label: 'Basic - GHS 1 / 2 days', value: 'basic' },
  { label: 'Lite - GHS 5 / 7 days', value: 'lite' },
  { label: 'Premium - GHS 15 / 1 month', value: 'premium' },
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
