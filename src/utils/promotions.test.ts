import { beforeEach, describe, expect, it, vi } from 'vitest'
import { isActiveEventPromotion, isActiveTopPick, listingPromotionPackages, startEventPromotionCheckout, startListingPromotionCheckout } from './promotions'

const mocks = vi.hoisted(() => ({
  apiPost: vi.fn(),
  navigateTo: vi.fn(),
  openPaystackInline: vi.fn(),
}))

vi.mock('../lib/api', () => ({ apiPost: mocks.apiPost }))
vi.mock('./navigation', () => ({ navigateTo: mocks.navigateTo }))
vi.mock('./paystackInline', () => ({ openPaystackInline: mocks.openPaystackInline }))

const response = {
  payment: {
    accessCode: 'access-code',
    amount: 3000,
    amountGhs: 10,
    durationHours: 168,
    promotionOrderId: 'promotion-order-1',
    provider: 'paystack' as const,
    reference: 'promotion-ref',
    status: 'pending' as const,
    targetIds: ['event-1'],
    targetType: 'event' as const,
    tier: 'homepage_feature' as const,
    unitAmount: 3000,
  },
}

describe('inline promotion payments', () => {
  beforeEach(() => {
    mocks.apiPost.mockReset().mockResolvedValue(response)
    mocks.navigateTo.mockReset()
    mocks.openPaystackInline.mockReset()
  })

  it('uses the approved listing offers and exact expiry checks', () => {
    expect(listingPromotionPackages.map(({ days, priceGhs, value }) => ({ days, priceGhs, value }))).toEqual([
      { days: 1, priceGhs: 10, value: 'quick_boost' },
      { days: 3, priceGhs: 30, value: 'weekend_push' },
      { days: 7, priceGhs: 50, value: 'top_pick' },
    ])
    expect(isActiveTopPick(['top-pick'], new Date(Date.now() + 1000).toISOString())).toBe(true)
    expect(isActiveTopPick(['top-pick'], new Date(Date.now() - 1).toISOString())).toBe(false)
    expect(isActiveEventPromotion(['home-banner'], new Date(Date.now() + 1000).toISOString(), 'upcoming')).toBe(true)
    expect(isActiveEventPromotion(['home-banner'], new Date(Date.now() + 1000).toISOString(), 'past')).toBe(false)
  })

  it('stays on the originating page when payment is cancelled', async () => {
    mocks.openPaystackInline.mockResolvedValue({ status: 'cancelled' })

    await expect(startEventPromotionCheckout('event-1')).resolves.toEqual({ status: 'cancelled' })
    expect(mocks.apiPost).toHaveBeenCalledWith('/payments/promotions/initialize', {
      targetIds: ['event-1'],
      targetType: 'event',
      tier: 'homepage_feature',
    })
    expect(mocks.openPaystackInline).toHaveBeenCalledWith('access-code')
    expect(mocks.navigateTo).not.toHaveBeenCalled()
  })

  it('opens listing bundles inline and navigates internally after success', async () => {
    mocks.apiPost.mockResolvedValue({
      payment: { ...response.payment, targetIds: ['listing-1'], targetType: 'listing', tier: 'weekend_push' },
    })
    mocks.openPaystackInline.mockResolvedValue({ reference: 'promotion-ref', status: 'success' })

    await startListingPromotionCheckout(['listing-1'], 'weekend_push')

    expect(mocks.apiPost).toHaveBeenCalledWith('/payments/promotions/initialize', {
      targetIds: ['listing-1'],
      targetType: 'listing',
      tier: 'weekend_push',
    })
    expect(mocks.navigateTo).toHaveBeenCalledWith('/promotions/confirm?reference=promotion-ref')
  })
})
