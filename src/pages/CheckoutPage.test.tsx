import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CheckoutPage } from './CheckoutPage'

const cartMocks = vi.hoisted(() => ({
  clearCart: vi.fn(),
  items: [{
    currency: 'GHS',
    listingId: 'listing-1',
    price: 120,
    quantity: 1,
    shopName: 'Archive Shop',
    title: 'Vintage jacket',
    type: 'retail' as const,
  }],
}))

const paymentMocks = vi.hoisted(() => ({
  apiDelete: vi.fn(),
  apiPost: vi.fn(),
  navigateTo: vi.fn(),
  openPaystackInline: vi.fn(),
}))

vi.mock('../components/layout/AppShell', () => ({
  AppShell: ({ children }: { children: ReactNode }) => <main>{children}</main>,
}))

vi.mock('../hooks/useCart', () => ({
  useCart: () => ({
    clearCart: cartMocks.clearCart,
    items: cartMocks.items,
  }),
}))
vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    user: {
      _id: 'buyer-1',
      location: { region: 'Greater Accra' },
      name: 'Ama Buyer',
      phone: '0240000000',
    },
  }),
}))
vi.mock('../hooks/useDeliveryEstimate', () => ({
  useDeliveryEstimate: (_region: string, method: 'pickup' | 'delivery') => ({
    error: '',
    fee: method === 'pickup' ? 0 : 1500,
    loading: false,
  }),
}))

vi.mock('../lib/api', async (importOriginal) => ({
  ...await importOriginal<typeof import('../lib/api')>(),
  apiDelete: paymentMocks.apiDelete,
  apiPost: paymentMocks.apiPost,
}))
vi.mock('../utils/paystackInline', () => ({ openPaystackInline: paymentMocks.openPaystackInline }))
vi.mock('../utils/navigation', async (importOriginal) => ({
  ...await importOriginal<typeof import('../utils/navigation')>(),
  navigateTo: paymentMocks.navigateTo,
}))

describe('guided checkout form', () => {
  beforeEach(() => {
    cartMocks.clearCart.mockReset()
    paymentMocks.apiDelete.mockReset()
    paymentMocks.apiPost.mockReset()
    paymentMocks.navigateTo.mockReset()
    paymentMocks.openPaystackInline.mockReset()
    vi.stubGlobal('matchMedia', vi.fn(() => ({
      addEventListener: vi.fn(),
      addListener: vi.fn(),
      dispatchEvent: vi.fn(),
      matches: false,
      media: '',
      onchange: null,
      removeEventListener: vi.fn(),
      removeListener: vi.fn(),
    })))
  })

  it('summarizes, associates, and links to the first invalid delivery field', async () => {
    const user = userEvent.setup()
    render(<CheckoutPage />)

    const region = screen.getByRole('textbox', { name: 'Region' })
    await user.clear(region)
    await user.click(screen.getByRole('button', { name: 'Continue to payment' }))

    const summary = screen.getByRole('alert')
    await waitFor(() => expect(summary).toHaveFocus())
    expect(region).toHaveAttribute('aria-invalid', 'true')
    expect(region).toHaveAccessibleDescription('Enter a delivery region.')
    expect(screen.getByRole('textbox', { name: 'Destination town' })).toHaveAccessibleDescription('Enter the destination town.')
    await user.click(screen.getByRole('link', { name: 'Enter a delivery region.' }))
    expect(region).toHaveFocus()
  })

  it('preserves entered delivery values while moving forward and back', async () => {
    const user = userEvent.setup()
    render(<CheckoutPage />)

    const region = screen.getByRole('textbox', { name: 'Region' })
    const town = screen.getByRole('textbox', { name: 'Destination town' })
    const terminal = screen.getByRole('textbox', { name: /Preferred terminal/ })
    await user.clear(region)
    await user.type(region, 'Ashanti')
    await user.type(town, 'Kumasi')
    await user.type(terminal, 'Asafo station')
    await user.click(screen.getByRole('button', { name: 'Continue to payment' }))

    expect(screen.getByRole('heading', { name: 'Payment' })).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Delivery, completed' }))

    expect(screen.getByRole('textbox', { name: 'Region' })).toHaveValue('Ashanti')
    expect(screen.getByRole('textbox', { name: 'Destination town' })).toHaveValue('Kumasi')
    expect(screen.getByRole('textbox', { name: /Preferred terminal/ })).toHaveValue('Asafo station')
  }, 15_000)

  it('treats pickup as collection from the seller shop and keeps meet up unavailable', async () => {
    const user = userEvent.setup()
    paymentMocks.apiPost.mockResolvedValue({
      order: { _id: 'pickup-order' },
      orders: [{ _id: 'pickup-order' }],
      payment: { mode: 'pickup', provider: 'cash', status: 'pending' },
    })
    render(<CheckoutPage />)

    expect(screen.getByRole('radio', { name: /Meet up/ })).toBeDisabled()
    await user.click(screen.getByRole('radio', { name: /Pickup/ }))

    expect(screen.queryByRole('textbox', { name: 'Destination town' })).not.toBeInTheDocument()
    expect(screen.queryByRole('textbox', { name: /Pickup note/i })).not.toBeInTheDocument()
    expect(screen.getByText(/collecting from the seller's physical shop/i)).toBeVisible()

    await user.click(screen.getByRole('button', { name: 'Continue to payment' }))
    expect(screen.getByRole('heading', { name: 'Payment' })).toBeVisible()

    await user.click(screen.getByRole('radio', { name: /Cash on pickup/ }))
    await user.click(screen.getByRole('button', { name: 'Review order' }))
    await user.click(screen.getByRole('button', { name: 'Place pickup order' }))

    expect(paymentMocks.apiPost).toHaveBeenCalledWith(
      '/orders',
      expect.objectContaining({
        delivery: { method: 'pickup' },
      }),
      expect.any(Object),
    )
  })

  it('releases inventory after cancellation and creates a fresh transaction on retry', async () => {
    const user = userEvent.setup()
    const placeOrder = {
      order: { _id: 'order-1' },
      orders: [{ _id: 'order-1' }],
      payment: {
        accessCode: 'access-code',
        provider: 'paystack',
        reference: 'payment-reference',
        status: 'pending',
      },
    }
    paymentMocks.apiPost.mockImplementation((path: string) => Promise.resolve(
      path === '/orders'
        ? placeOrder
        : { order: { _id: 'order-1' }, orders: [{ _id: 'order-1' }] },
    ))
    paymentMocks.openPaystackInline
      .mockResolvedValueOnce({ status: 'cancelled' })
      .mockResolvedValueOnce({ reference: 'payment-reference', status: 'success' })
    paymentMocks.apiDelete.mockResolvedValue({ cancelled: true, paid: false, releasedItemCount: 1 })

    render(<CheckoutPage />)
    await user.type(screen.getByRole('textbox', { name: 'Destination town' }), 'Kumasi')
    await user.click(screen.getByRole('button', { name: 'Continue to payment' }))
    await user.click(screen.getByRole('button', { name: 'Pay with Paystack' }))

    expect(await screen.findByText(/available in inventory again/i)).toBeVisible()
    expect(screen.getByRole('button', { name: 'Pay with Paystack' })).toBeVisible()
    expect(paymentMocks.apiDelete).toHaveBeenCalledWith('/payments/payment-reference')
    expect(paymentMocks.apiPost).toHaveBeenCalledOnce()
    expect(paymentMocks.apiPost).toHaveBeenCalledWith(
      '/orders',
      expect.objectContaining({
        delivery: expect.objectContaining({
          destination: expect.objectContaining({
            recipientName: 'Ama Buyer',
            recipientPhone: '0240000000',
            region: 'Greater Accra',
            town: 'Kumasi',
          }),
        }),
      }),
      expect.objectContaining({
        headers: expect.objectContaining({ 'Idempotency-Key': expect.stringMatching(/^checkout:/) }),
      }),
    )

    await user.click(screen.getByRole('button', { name: 'Pay with Paystack' }))

    expect(await screen.findByRole('heading', { name: 'Review and confirm' })).toBeVisible()
    expect(screen.getByText(/Paystack has confirmed your payment/i)).toBeVisible()
    expect(paymentMocks.apiPost).toHaveBeenCalledWith(
      '/payments/payment-reference/actions/verify',
      {},
      expect.objectContaining({
        headers: expect.objectContaining({ 'Idempotency-Key': expect.stringMatching(/:verify$/) }),
      }),
    )
    expect(paymentMocks.navigateTo).not.toHaveBeenCalled()
    expect(cartMocks.clearCart).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'View order confirmation' }))

    expect(paymentMocks.navigateTo).toHaveBeenCalledWith('/order-confirmed?orderIds=order-1')
    expect(paymentMocks.apiPost).toHaveBeenCalledTimes(3)
    const firstKey = paymentMocks.apiPost.mock.calls[0]?.[2]?.headers?.['Idempotency-Key']
    const retryKey = paymentMocks.apiPost.mock.calls[1]?.[2]?.headers?.['Idempotency-Key']
    expect(retryKey).not.toBe(firstKey)
    expect(paymentMocks.openPaystackInline).toHaveBeenCalledTimes(2)
    expect(cartMocks.clearCart).toHaveBeenCalledOnce()
  })

  it('keeps review locked while completed payment verification is unavailable', async () => {
    const user = userEvent.setup()
    const placeOrder = {
      order: { _id: 'order-1' },
      payment: {
        accessCode: 'access-code',
        provider: 'paystack',
        reference: 'payment-reference',
        status: 'pending',
      },
    }
    let verificationAttempts = 0
    paymentMocks.apiPost.mockImplementation((path: string) => {
      if (path === '/orders') return Promise.resolve(placeOrder)
      verificationAttempts += 1
      return verificationAttempts === 1
        ? Promise.reject(new Error('Verification is temporarily unavailable'))
        : Promise.resolve({ orders: [{ _id: 'order-1' }] })
    })
    paymentMocks.openPaystackInline.mockResolvedValue({ reference: 'payment-reference', status: 'success' })

    render(<CheckoutPage />)
    await user.type(screen.getByRole('textbox', { name: 'Destination town' }), 'Kumasi')
    await user.click(screen.getByRole('button', { name: 'Continue to payment' }))
    await user.click(screen.getByRole('button', { name: 'Pay with Paystack' }))

    expect(await screen.findByRole('button', { name: 'Retry payment confirmation' })).toBeVisible()
    expect(screen.queryByRole('heading', { name: 'Review and confirm' })).not.toBeInTheDocument()
    expect(screen.getByText(/you will not be charged again/i)).toBeVisible()

    await user.click(screen.getByRole('button', { name: 'Retry payment confirmation' }))

    expect(await screen.findByRole('heading', { name: 'Review and confirm' })).toBeVisible()
    expect(paymentMocks.apiPost.mock.calls.filter(([path]) => path === '/orders')).toHaveLength(1)
    expect(paymentMocks.openPaystackInline).toHaveBeenCalledOnce()
    expect(paymentMocks.apiPost.mock.calls.filter(([path]) => path === '/payments/payment-reference/actions/verify')).toHaveLength(2)
  })
})
