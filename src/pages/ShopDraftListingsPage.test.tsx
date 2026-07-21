import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ToastProvider } from '../components/feedback/ToastProvider'
import { ShopDraftListingsPage } from './ShopDraftListingsPage'

const mocks = vi.hoisted(() => ({
  resource: {
    data: {
      listings: [
        {
          _id: 'draft-1',
          category: 'outerwear',
          color: 'navy',
          currency: 'GHS',
          gender: 'unisex',
          images: ['draft.jpg'],
          price: 9500,
          size: 'L',
          status: 'draft',
          title: 'Unpublished workwear jacket',
          type: 'retail',
        },
        {
          _id: 'active-1',
          category: 'shirts',
          color: 'white',
          currency: 'GHS',
          gender: 'men',
          images: ['active.jpg'],
          price: 7000,
          size: 'M',
          status: 'active',
          title: 'Live shop shirt',
          type: 'retail',
        },
      ],
    } as { listings: Array<Record<string, unknown>> } | null,
    error: '',
    errorMeta: null,
    initialLoading: false,
    loading: false,
    refetch: vi.fn(),
    refreshing: false,
  },
}))

vi.mock('../components/layout/AppShell', () => ({
  AppShell: ({ children }: { children: ReactNode }) => <main>{children}</main>,
}))

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    status: 'authenticated',
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
  useApiResource: () => mocks.resource,
}))

function renderPage() {
  return render(<ToastProvider><ShopDraftListingsPage /></ToastProvider>)
}

describe('ShopDraftListingsPage', () => {
  beforeEach(() => {
    mocks.resource.data = {
      listings: [
        {
          _id: 'draft-1', category: 'outerwear', color: 'navy', currency: 'GHS', gender: 'unisex', images: ['draft.jpg'], price: 9500, size: 'L', status: 'draft', title: 'Unpublished workwear jacket', type: 'retail',
        },
        {
          _id: 'active-1', category: 'shirts', color: 'white', currency: 'GHS', gender: 'men', images: ['active.jpg'], price: 7000, size: 'M', status: 'active', title: 'Live shop shirt', type: 'retail',
        },
      ],
    }
    mocks.resource.error = ''
    mocks.resource.initialLoading = false
    mocks.resource.refetch.mockReset()
  })

  it('keeps active products out and exposes complete draft details without a status filter', () => {
    renderPage()

    expect(screen.getByRole('heading', { name: 'Draft listings' })).toBeVisible()
    expect(screen.getByText('Unpublished workwear jacket')).toBeVisible()
    expect(screen.queryByText('Live shop shirt')).not.toBeInTheDocument()
    for (const value of ['GHS 95.00', 'Outerwear', 'L', 'Unisex', 'Navy']) {
      expect(screen.getByText(value)).toBeVisible()
    }
    expect(screen.getByRole('textbox', { name: 'Search draft listings' })).toBeVisible()
    expect(screen.getByRole('textbox', { name: 'Search draft listings' }).closest('div.mb-5')).toHaveClass('grid-cols-1', 'sm:grid-cols-2')
    expect(screen.queryByRole('combobox', { name: /status/i })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Continue editing/i })).toHaveAttribute('href', '/listings/draft-1/edit')
    expect(screen.queryByRole('link', { name: /Open listing/i })).not.toBeInTheDocument()
  })

  it('uses a draft-specific empty state without duplicating the floating creation action', () => {
    mocks.resource.data = { listings: [] }
    renderPage()

    expect(screen.getByRole('heading', { name: 'No saved drafts' })).toBeVisible()
    expect(screen.getByText(/round \+ button/i)).toBeVisible()
    expect(screen.getAllByRole('link', { name: 'Add listing' })).toHaveLength(1)
  })

  it('uses a retryable draft-specific error state', () => {
    mocks.resource.data = null
    mocks.resource.error = 'Network unavailable'
    renderPage()

    expect(screen.getByRole('alert')).toHaveTextContent('Draft listings unavailable')
    expect(screen.getByRole('button', { name: 'Retry' })).toBeVisible()
  })
})
