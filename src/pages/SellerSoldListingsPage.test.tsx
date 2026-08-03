import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useApiResource } from '../hooks/useApiResource'
import { SellerSoldListingsPage } from './SellerSoldListingsPage'

vi.mock('../components/layout/AppShell', () => ({
  AppShell: ({ children }: { children: ReactNode }) => <main>{children}</main>,
}))

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    user: {
      _id: 'seller-1',
      hasShop: true,
      isKycVerified: true,
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
    if (path === '/listings/me?page=1&status=sold') return { ...base, data: { listings: [], page: 1, pages: 1, total: 0 } }
    return { ...base, data: { orders: [] } }
  }),
}))

describe('SellerSoldListingsPage', () => {
  beforeEach(() => {
    vi.mocked(useApiResource).mockClear()
  })

  it('keeps a broader order query for matching sold listings to their orders', () => {
    render(<SellerSoldListingsPage />)

    expect(useApiResource).toHaveBeenCalledWith('/listings/me?page=1&status=sold')
    expect(useApiResource).toHaveBeenCalledWith('/orders/me/selling?limit=100&sort=newest')
    expect(screen.getByRole('heading', { name: 'Sold items' })).toBeVisible()
  })
})
