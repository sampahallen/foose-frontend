import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ToastProvider } from '../components/feedback/ToastProvider'
import { useApiResource } from '../hooks/useApiResource'
import { ShopDraftListingsPage } from './ShopDraftListingsPage'

const mocks = vi.hoisted(() => ({
  draftListing: {
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
}))

const resourceState = {
  data: null as { listings: Array<Record<string, unknown>>; page: number; pages: number; total: number } | null,
  error: '',
  errorMeta: null,
  initialLoading: false,
  loading: false,
  refetch: vi.fn(),
  refreshing: false,
}

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
  useApiResource: vi.fn(() => resourceState),
}))

function renderPage() {
  return render(<ToastProvider><ShopDraftListingsPage /></ToastProvider>)
}

describe('ShopDraftListingsPage', () => {
  beforeEach(() => {
    resourceState.data = { listings: [mocks.draftListing], page: 1, pages: 1, total: 1 }
    resourceState.error = ''
    resourceState.initialLoading = false
    resourceState.refetch.mockReset()
    vi.mocked(useApiResource).mockClear()
  })

  it('requests the draft collection server-side and exposes complete draft details without a client status filter', () => {
    renderPage()

    expect(useApiResource).toHaveBeenCalledWith('/listings/me?page=1&status=draft')
    expect(screen.getByRole('heading', { name: 'Draft listings' })).toBeVisible()
    expect(screen.getByText('Unpublished workwear jacket')).toBeVisible()
    expect(screen.getByText('GHS 95.00')).toBeVisible()
    expect(screen.getByText('Outerwear · L · Navy')).toBeVisible()
    expect(screen.getByRole('textbox', { name: 'Search draft listings' })).toBeVisible()
    expect(screen.getByRole('textbox', { name: 'Search draft listings' }).closest('div.mb-5')).toHaveClass('grid-cols-1', 'sm:grid-cols-2')
    expect(screen.queryByRole('combobox', { name: /status/i })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Unpublished workwear jacket/i })).toHaveAttribute('href', '/listings/draft-1/edit')
    expect(screen.queryByRole('link', { name: /Open listing/i })).not.toBeInTheDocument()
  })

  it('uses a draft-specific empty state without duplicating the floating creation action', () => {
    resourceState.data = { listings: [], page: 1, pages: 1, total: 0 }
    renderPage()

    expect(screen.getByRole('heading', { name: 'No saved drafts' })).toBeVisible()
    expect(screen.getByText(/round \+ button/i)).toBeVisible()
    expect(screen.getAllByRole('link', { name: 'Add listing' })).toHaveLength(1)
  })

  it('uses a retryable draft-specific error state', () => {
    resourceState.data = null
    resourceState.error = 'Network unavailable'
    renderPage()

    expect(screen.getByRole('alert')).toHaveTextContent('Draft listings unavailable')
    expect(screen.getByRole('button', { name: 'Retry' })).toBeVisible()
  })
})
