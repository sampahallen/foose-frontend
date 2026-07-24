import { describe, expect, it } from 'vitest'
import { resolveRoute, routeStateRegistry, type AppRoute } from './routes'

const allRoutes: AppRoute[] = [
  'login', 'authCallback', 'register', 'resetPassword', 'verifyEmail', 'adminKyc', 'adminKycDetail',
  'adminDisputes', 'adminOverview', 'newListing', 'editListing', 'browse', 'search',
  'suggestedForYou', 'freshDrops', 'digishops', 'bales', 'topPicks', 'shop', 'retailDetail',
  'community', 'eventDetail', 'eventManage', 'communityEventForm', 'communityFinspoArchived',
  'communityFinspoDetail', 'communityFinspoForm', 'saved', 'accountSettings', 'profileSettings',
  'profile', 'inbox', 'cart', 'checkout', 'orderConfirmed', 'orderReport', 'orderDetail', 'orderHistory',
  'orderManagement', 'promotionReturn', 'listingPromotions', 'kyc', 'openShop', 'wallet',
  'manageShop', 'shopDrafts', 'home', 'notFound',
]

describe('route feedback registry', () => {
  it('contains a complete explicit definition for every AppRoute', () => {
    expect(Object.keys(routeStateRegistry).sort()).toEqual([...allRoutes].sort())
    for (const route of allRoutes) {
      expect(routeStateRegistry[route].family).toBeTruthy()
      expect(routeStateRegistry[route].defaultScene).toBeTruthy()
      expect(routeStateRegistry[route].supportedLayouts.length).toBeGreaterThan(0)
    }
  })

  it('resolves the home route explicitly and unknown locations as not found', () => {
    expect(resolveRoute('/', '')).toBe('home')
    expect(resolveRoute('/definitely-not-a-route', '')).toBe('notFound')
  })

  it('resolves frontend email verification links', () => {
    expect(resolveRoute('/verify-email/secure-token', '')).toBe('verifyEmail')
  })

  it('resolves listing drafts to their dedicated management page', () => {
    expect(resolveRoute('/manage-shop/drafts', '')).toBe('shopDrafts')
  })

  it('resolves the guided order report before the generic order detail route', () => {
    expect(resolveRoute('/orders/order-123/report', '')).toBe('orderReport')
  })
})
