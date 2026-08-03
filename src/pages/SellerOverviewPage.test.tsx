import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useApiResource } from '../hooks/useApiResource'
import { SellerOverviewPage } from './SellerOverviewPage'

vi.mock('../components/layout/AppShell', () => ({
  AppShell: ({ children }: { children: ReactNode }) => <main>{children}</main>,
}))

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    user: {
      _id: 'seller-1',
      hasShop: true,
      isKycVerified: true,
      location: { city: 'Accra', region: 'Greater Accra' },
      name: 'Seller',
      username: 'seller',
    },
  }),
}))

vi.mock('../hooks/useApiResource', () => ({
  useApiResource: vi.fn((path: string) => {
    const base = {
      error: '', errorMeta: null, initialLoading: false, loading: false, refetch: vi.fn(), refreshing: false,
    }
    if (path === '/digishops/me') return { ...base, data: { shop: { _id: 'shop-1', shopName: 'Seller Shop', slug: 'seller-shop' } } }
    if (path === '/orders/me/selling?bucket=active&limit=3&sort=urgency') return { ...base, data: { orders: [] } }
    if (path === '/orders/me/selling/summary') return { ...base, data: { activeOrderCount: 7, releasedRevenue: 45678 } }
    return { ...base, data: null }
  }),
}))

describe('SellerOverviewPage', () => {
  beforeEach(() => {
    vi.mocked(useApiResource).mockClear()
  })

  it('loads an urgency-sorted active preview and exact seller summary on overview', () => {
    render(<SellerOverviewPage />)

    expect(useApiResource).toHaveBeenCalledWith(
      '/orders/me/selling?bucket=active&limit=3&sort=urgency',
    )
    expect(useApiResource).toHaveBeenCalledWith('/orders/me/selling/summary')
    expect(screen.getByText('GHS 456.78')).toBeVisible()
    expect(screen.getByText('7')).toBeVisible()
  })
})
