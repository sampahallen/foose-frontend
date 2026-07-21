import { beforeEach, describe, expect, it, vi } from 'vitest'
import { startListingBundlePromotionCheckout, startPromotionCheckout } from './promotions'

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
    amountGhs: 10,
    provider: 'paystack' as const,
    reference: 'promotion-ref',
    status: 'pending' as const,
    targetId: 'event-1',
    targetType: 'event' as const,
  },
}

describe('inline promotion payments', () => {
  beforeEach(() => {
    mocks.apiPost.mockReset().mockResolvedValue(response)
    mocks.navigateTo.mockReset()
    mocks.openPaystackInline.mockReset()
  })

  it('stays on the originating page when payment is cancelled', async () => {
    mocks.openPaystackInline.mockResolvedValue({ status: 'cancelled' })

    await expect(startPromotionCheckout('event', 'event-1')).resolves.toEqual({ status: 'cancelled' })
    expect(mocks.apiPost).toHaveBeenCalledWith('/payments/promotions/initialize', {
      packageName: 'basic',
      targetId: 'event-1',
      targetType: 'event',
    })
    expect(mocks.openPaystackInline).toHaveBeenCalledWith('access-code')
    expect(mocks.navigateTo).not.toHaveBeenCalled()
  })

  it('opens listing bundles inline and navigates internally after success', async () => {
    mocks.apiPost.mockResolvedValue({
      payment: { ...response.payment, targetId: undefined, targetIds: ['listing-1'], targetType: 'listing' },
    })
    mocks.openPaystackInline.mockResolvedValue({ reference: 'promotion-ref', status: 'success' })

    await startListingBundlePromotionCheckout(['listing-1'], 'lite')

    expect(mocks.apiPost).toHaveBeenCalledWith('/payments/promotions/initialize', {
      packageName: 'lite',
      targetIds: ['listing-1'],
      targetType: 'listing',
    })
    expect(mocks.navigateTo).toHaveBeenCalledWith('/promotions/confirm?reference=promotion-ref')
  })
})
