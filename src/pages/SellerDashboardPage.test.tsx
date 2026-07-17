import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ToastProvider } from '../components/feedback/ToastProvider'
import { useApiResource } from '../hooks/useApiResource'
import { SellerDashboardPage } from './SellerDashboardPage'

const mocks = vi.hoisted(() => ({
  activeListing: {
    _id: 'active-1',
    category: 'denim',
    color: 'blue',
    currency: 'GHS',
    gender: 'women',
    images: ['active.jpg'],
    price: 12000,
    size: 'M',
    status: 'active',
    title: 'Active denim jacket',
    type: 'retail',
  },
}))

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
    if (path === '/orders/me/selling') return { ...base, data: { orders: [] } }
    if (path === '/listings/me?status=active') return { ...base, data: { listings: [mocks.activeListing] } }
    return { ...base, data: { listings: [] } }
  }),
}))

describe('SellerDashboardPage listing separation', () => {
  beforeEach(() => {
    vi.mocked(useApiResource).mockClear()
    window.history.replaceState({}, '', '/manage-shop/listings')
  })

  it('loads only active inventory, has no status filter, and shows full card details', () => {
    render(<ToastProvider><SellerDashboardPage /></ToastProvider>)

    expect(useApiResource).toHaveBeenCalledWith('/listings/me?status=active', true)
    expect(screen.queryByRole('combobox', { name: /status/i })).not.toBeInTheDocument()
    expect(screen.getByText('Active denim jacket')).toBeVisible()
    for (const value of ['GHS 120.00', 'Denim', 'M', 'Women', 'Blue']) {
      expect(screen.getByText(value)).toBeVisible()
    }
    expect(screen.getAllByRole('link', { name: 'Drafts' })).not.toHaveLength(0)
    screen.getAllByRole('link', { name: 'Drafts' }).forEach((link) => {
      expect(link).toHaveAttribute('href', '/manage-shop/drafts')
    })
  })
})
