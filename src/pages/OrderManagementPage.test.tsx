import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ToastProvider } from '../components/feedback/ToastProvider'
import { OrderManagementPage } from './OrderManagementPage'

vi.mock('../components/layout/AppShell', () => ({
  AppShell: ({ children }: { children: ReactNode }) => <main>{children}</main>,
}))

vi.mock('../hooks/useApiResource', () => ({
  useApiResource: () => ({
    data: {
      orders: [{
        _id: 'order-12345678',
        buyerId: { _id: 'buyer-1', email: 'buyer-with-a-long-address@example.com', name: 'Buyer Name' },
        createdAt: '2026-07-17T08:00:00.000Z',
        currency: 'GHS',
        delivery: { address: { city: 'Accra', region: 'Greater Accra', street: 'A long delivery street' }, method: 'delivery' },
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
  }),
}))

describe('OrderManagementPage seller shell', () => {
  beforeEach(() => {
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
})
