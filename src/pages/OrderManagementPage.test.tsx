import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { ToastProvider } from '../components/feedback/ToastProvider'
import { OrderManagementPage } from './OrderManagementPage'

const orderApiMocks = vi.hoisted(() => ({
  apiGet: vi.fn(),
}))

const orderResourceMocks = vi.hoisted(() => ({
  useApiResource: vi.fn(),
}))

const sellerOrderListResource = {
  data: {
    nextCursor: 'cursor-token',
    orders: [{
      _id: 'order-12345678',
      buyerId: { _id: 'buyer-1', email: 'buyer-with-a-long-address@example.com', name: 'Buyer Name' },
      createdAt: '2026-07-17T08:00:00.000Z',
      currency: 'GHS',
      delivery: { address: { city: 'Accra', region: 'Greater Accra', street: 'A long delivery street' }, method: 'station_pickup' },
      escrowStatus: 'held',
      items: [{ price: 12000, quantity: 1, title: 'Vintage denim jacket' }],
      paymentStatus: 'paid',
      sellerActionDeadline: '2026-07-20T08:00:00.000Z',
      status: 'paid',
      totalAmount: 12000,
    }],
  },
  error: '',
  initialLoading: false,
  loading: false,
  refetch: vi.fn(),
  refreshing: false,
}

const emptyOrderListResource = {
  data: { nextCursor: null, orders: [] },
  error: '',
  initialLoading: false,
  loading: false,
  refetch: vi.fn(),
  refreshing: false,
}

vi.mock('../components/layout/AppShell', () => ({
  AppShell: ({ children }: { children: ReactNode }) => <main>{children}</main>,
}))

vi.mock('../lib/api', async (importOriginal) => ({
  ...await importOriginal<typeof import('../lib/api')>(),
  apiGet: orderApiMocks.apiGet,
}))

vi.mock('../hooks/useApiResource', () => ({
  useApiResource: (path: string | null, enabled?: boolean) => orderResourceMocks.useApiResource(path, enabled),
}))

describe('OrderManagementPage seller shell', () => {
  beforeEach(() => {
    orderApiMocks.apiGet.mockReset()
    orderApiMocks.apiGet.mockResolvedValue({ nextCursor: null, orders: [] })
    orderResourceMocks.useApiResource.mockReset()
    // The seller view never requests the buyer summary (enabled is false), but
    // stub every path the same way so it doesn't matter which one is hit.
    orderResourceMocks.useApiResource.mockReturnValue(sellerOrderListResource)
    window.history.replaceState({}, '', '/manage-shop/orders')
  })

  it('keeps seller orders inside the shop navigation with one compact page action', () => {
    render(<ToastProvider><OrderManagementPage /></ToastProvider>)

    const orderLinks = screen.getAllByRole('link', { name: 'Orders' })
    expect(orderLinks).toHaveLength(2)
    orderLinks.forEach((link) => expect(link).toHaveAttribute('aria-current', 'page'))

    expect(screen.getByRole('link', { name: 'Order history' })).toHaveAttribute('href', '/manage-shop/orders/history')
    expect(screen.queryByRole('link', { name: 'Back to shop' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Add listing' })).toHaveAttribute('href', '/listings/new')
    expect(screen.getByText('Vintage denim jacket')).toBeVisible()
  })

  it('adds only the cursor when loading the next server-filtered page', async () => {
    const user = userEvent.setup()
    render(<ToastProvider><OrderManagementPage /></ToastProvider>)

    await user.click(screen.getByRole('button', { name: 'Load more orders' }))

    expect(orderApiMocks.apiGet).toHaveBeenCalledOnce()
    const requestedUrl = orderApiMocks.apiGet.mock.calls[0]?.[0] as string
    const parsed = new URL(requestedUrl, 'https://foose.test')
    expect(parsed.searchParams.getAll('limit')).toEqual(['30'])
    expect(parsed.searchParams.get('cursor')).toBe('cursor-token')
  })
})

describe('OrderManagementPage buyer bucket badges', () => {
  beforeEach(() => {
    orderApiMocks.apiGet.mockReset()
    orderApiMocks.apiGet.mockResolvedValue({ nextCursor: null, orders: [] })
    orderResourceMocks.useApiResource.mockReset()
    orderResourceMocks.useApiResource.mockImplementation((path: string | null) =>
      path === '/orders/me/buying/summary'
        ? {
            data: { inProgressCount: 4, needsActionCount: 2, underReviewCount: 0 },
            error: '',
            initialLoading: false,
            loading: false,
            refetch: vi.fn(),
            refreshing: false,
          }
        : emptyOrderListResource,
    )
  })

  it('badges each actionable bucket with its count, hides a zero count, and never badges history', () => {
    window.history.replaceState({}, '', '/orders')
    render(<ToastProvider><OrderManagementPage /></ToastProvider>)

    // Needs action starts as the active tab, so its count travels through the
    // accessible name rather than a separate visible node.
    const needsActionTab = screen.getByRole('button', { name: 'Needs action, 2 to complete' })
    expect(needsActionTab).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('button', { name: 'In progress, 4 to complete' })).toBeVisible()

    // Under review has a real (zero) count from the summary, but zero is not
    // shown - a badge would just be noise.
    expect(screen.getByRole('button', { name: 'Under review' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'History' })).toBeVisible()
  })

  it('never shows a bucket badge in seller mode, even if the resource layer returns counts', () => {
    window.history.replaceState({}, '', '/manage-shop/orders')
    render(<ToastProvider><OrderManagementPage /></ToastProvider>)

    expect(screen.getByRole('button', { name: 'Needs action' })).toBeVisible()
    expect(screen.queryByRole('button', { name: /to complete/ })).not.toBeInTheDocument()
  })
})
