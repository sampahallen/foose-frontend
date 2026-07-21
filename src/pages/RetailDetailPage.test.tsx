import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ToastProvider } from '../components/feedback/ToastProvider'
import { RetailDetailPage } from './RetailDetailPage'

const mocks = vi.hoisted(() => ({
  addListing: vi.fn(),
  currentUser: null as null | { _id: string },
  navigateTo: vi.fn(),
}))

const listing = {
  _id: 'listing-1',
  category: 'Shoes',
  currency: 'GHS',
  description: 'A clean pair of everyday trainers.',
  images: ['trainer.jpg'],
  price: 25000,
  shopId: { _id: 'shop-1', ownerId: 'seller-1', shopName: 'Sole Archive', slug: 'sole-archive' },
  status: 'active',
  title: 'Everyday trainers',
  type: 'retail',
} as const

vi.mock('../components/layout/AppShell', () => ({
  AppShell: ({ children }: { children: ReactNode }) => <main>{children}</main>,
}))

vi.mock('../components/navigation', () => ({
  NavigationBackButton: () => null,
}))

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({ user: mocks.currentUser }),
}))

vi.mock('../hooks/useApiResource', () => ({
  useApiResource: (path: string | null) => ({
    data: path === '/listings/listing-1'
      ? { listing }
      : path === '/listings/shop/shop-1'
        ? { listings: [{ ...listing, _id: 'listing-2', title: 'Second pair' }] }
        : null,
    error: '',
    errorMeta: null,
    initialLoading: false,
    loading: false,
    refetch: vi.fn(),
    refreshing: false,
  }),
}))

vi.mock('../hooks/useCart', () => ({
  useCart: () => ({ addListing: mocks.addListing }),
}))

vi.mock('../hooks/useListingRecommendationSignals', () => ({
  useListingRecommendationSignals: vi.fn(),
}))

vi.mock('../stores/navigationMemoryStore', () => ({
  useNavigationStore: (selector: (state: { currentEntryId: string; entries: never[] }) => unknown) => selector({ currentEntryId: '', entries: [] }),
}))

vi.mock('../utils/navigation', () => ({
  getCurrentAppPathname: () => '/listing/listing-1',
  navigateBack: vi.fn(),
  navigateTo: mocks.navigateTo,
  subscribeToNavigation: () => () => undefined,
  withBasePath: (path: string) => path,
}))

describe('RetailDetailPage cart actions', () => {
  beforeEach(() => {
    mocks.addListing.mockReset()
    mocks.addListing.mockReturnValue(true)
    mocks.currentUser = null
    mocks.navigateTo.mockReset()
  })

  it('adds an item without leaving the listing page', async () => {
    const user = userEvent.setup()
    render(<ToastProvider><RetailDetailPage /></ToastProvider>)

    await user.click(screen.getByRole('button', { name: 'Add to cart' }))

    expect(mocks.addListing).toHaveBeenCalledWith(listing)
    expect(mocks.navigateTo).not.toHaveBeenCalled()
    expect(screen.getByRole('status')).toHaveTextContent('Added to cart')
    expect(screen.getByRole('status')).toHaveTextContent('Everyday trainers was added to your cart.')
  })

  it('still sends Buy now directly to checkout', async () => {
    const user = userEvent.setup()
    render(<ToastProvider><RetailDetailPage /></ToastProvider>)

    await user.click(screen.getByRole('button', { name: 'Buy now' }))

    expect(mocks.addListing).toHaveBeenCalledWith(listing)
    expect(mocks.navigateTo).toHaveBeenCalledWith('/checkout')
  })

  it('removes buyer actions and seller inventory recommendations for the listing owner', () => {
    mocks.currentUser = { _id: 'seller-1' }
    render(<ToastProvider><RetailDetailPage /></ToastProvider>)

    expect(screen.queryByRole('button', { name: 'Add to cart' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Buy now' })).not.toBeInTheDocument()
    expect(screen.queryByText('More from this seller')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Manage listing' })).toHaveAttribute('href', '/listings/listing-1/edit')
  })
})
