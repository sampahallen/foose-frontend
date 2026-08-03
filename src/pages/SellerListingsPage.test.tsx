import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ToastProvider } from '../components/feedback/ToastProvider'
import { useApiResource } from '../hooks/useApiResource'
import { SellerListingsPage } from './SellerListingsPage'

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

vi.mock('../lib/api', () => ({
  apiDelete: vi.fn(),
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
      name: 'Seller',
      username: 'seller',
    },
  }),
}))

vi.mock('../hooks/useApiResource', () => ({
  useApiResource: vi.fn(() => ({
    data: { listings: [mocks.activeListing], page: 1, pages: 1, total: 1 },
    error: '',
    errorMeta: null,
    initialLoading: false,
    loading: false,
    refetch: vi.fn(),
    refreshing: false,
  })),
}))

describe('SellerListingsPage', () => {
  beforeEach(() => {
    vi.mocked(useApiResource).mockClear()
  })

  it('loads only active inventory server-side with no client status filter, and shows compact row details', () => {
    render(<ToastProvider><SellerListingsPage /></ToastProvider>)

    expect(useApiResource).toHaveBeenCalledWith('/listings/me?page=1&status=active')
    expect(screen.queryByRole('combobox', { name: /status/i })).not.toBeInTheDocument()
    expect(screen.getByText('Active denim jacket')).toBeVisible()
    expect(screen.getByText('GHS 120.00')).toBeVisible()
    expect(screen.getByText('Denim · M · Blue')).toBeVisible()
    expect(screen.getAllByRole('link', { name: 'Drafts' })).not.toHaveLength(0)
    screen.getAllByRole('link', { name: 'Drafts' }).forEach((link) => {
      expect(link).toHaveAttribute('href', '/manage-shop/drafts')
    })
  })

  it('feeds the search box into a server-side search query param and resets to page 1', async () => {
    const user = userEvent.setup()
    render(<ToastProvider><SellerListingsPage /></ToastProvider>)

    await user.type(screen.getByRole('textbox', { name: 'Search active listings' }), 'puma')

    await waitFor(() => {
      expect(useApiResource).toHaveBeenCalledWith('/listings/me?page=1&status=active&search=puma')
    })
  })
})
