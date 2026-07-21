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
  apiGet: vi.fn(),
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

vi.mock('../lib/api', async (importOriginal) => ({
  ...await importOriginal<typeof import('../lib/api')>(),
  apiDelete: paymentMocks.apiDelete,
  apiGet: paymentMocks.apiGet,
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
    paymentMocks.apiGet.mockReset()
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
    expect(screen.getByRole('textbox', { name: 'Street address' })).toHaveAccessibleDescription('Enter a street address.')
    await user.click(screen.getByRole('link', { name: 'Enter a delivery region.' }))
    expect(region).toHaveFocus()
  })

  it('preserves entered delivery values while moving forward and back', async () => {
    const user = userEvent.setup()
    render(<CheckoutPage />)

    const region = screen.getByRole('textbox', { name: 'Region' })
    const city = screen.getByRole('textbox', { name: /City or area/ })
    const street = screen.getByRole('textbox', { name: 'Street address' })
    await user.clear(region)
    await user.type(region, 'Ashanti')
    await user.type(city, 'Kumasi')
    await user.type(street, 'Adum High Street 14')
    await user.click(screen.getByRole('button', { name: 'Continue to payment' }))

    expect(screen.getByRole('heading', { name: 'Payment' })).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Delivery, completed' }))

    expect(screen.getByRole('textbox', { name: 'Region' })).toHaveValue('Ashanti')
    expect(screen.getByRole('textbox', { name: /City or area/ })).toHaveValue('Kumasi')
    expect(screen.getByRole('textbox', { name: 'Street address' })).toHaveValue('Adum High Street 14')
  })

  it('treats pickup as collection from the seller shop and keeps meet up unavailable', async () => {
    const user = userEvent.setup()
    render(<CheckoutPage />)

    expect(screen.getByRole('radio', { name: /Meet up/ })).toBeDisabled()
    await user.click(screen.getByRole('radio', { name: /Pickup/ }))

    expect(screen.queryByRole('textbox', { name: 'Street address' })).not.toBeInTheDocument()
    expect(screen.queryByRole('textbox', { name: /Pickup note/i })).not.toBeInTheDocument()
    expect(screen.getByText(/collecting from the seller's physical shop/i)).toBeVisible()

    await user.click(screen.getByRole('button', { name: 'Continue to payment' }))
    expect(screen.getByRole('heading', { name: 'Payment' })).toBeVisible()
  })

  it('releases inventory after cancellation and creates a fresh transaction on retry', async () => {
    const user = userEvent.setup()
    paymentMocks.apiPost.mockResolvedValue({
      order: { _id: 'order-1' },
      orders: [{ _id: 'order-1' }],
      payment: {
        accessCode: 'access-code',
        provider: 'paystack',
        reference: 'payment-reference',
        status: 'pending',
      },
    })
    paymentMocks.openPaystackInline
      .mockResolvedValueOnce({ status: 'cancelled' })
      .mockResolvedValueOnce({ reference: 'payment-reference', status: 'success' })
    paymentMocks.apiDelete.mockResolvedValue({ cancelled: true, paid: false, releasedItemCount: 1 })
    paymentMocks.apiGet.mockResolvedValue({ order: { _id: 'order-1' }, orders: [{ _id: 'order-1' }] })

    render(<CheckoutPage />)
    await user.type(screen.getByRole('textbox', { name: 'Street address' }), '14 High Street')
    await user.click(screen.getByRole('button', { name: 'Continue to payment' }))
    await user.click(screen.getByRole('button', { name: 'Pay with Paystack' }))

    expect(await screen.findByText(/available in inventory again/i)).toBeVisible()
    expect(screen.getByRole('button', { name: 'Pay with Paystack' })).toBeVisible()
    expect(paymentMocks.apiDelete).toHaveBeenCalledWith('/payments/payment-reference')
    expect(paymentMocks.apiPost).toHaveBeenCalledOnce()

    await user.click(screen.getByRole('button', { name: 'Pay with Paystack' }))

    expect(await screen.findByRole('heading', { name: 'Review and confirm' })).toBeVisible()
    expect(screen.getByText(/Paystack has confirmed your payment/i)).toBeVisible()
    expect(paymentMocks.apiGet).toHaveBeenCalledWith('/payments/verify/payment-reference')
    expect(paymentMocks.navigateTo).not.toHaveBeenCalled()
    expect(cartMocks.clearCart).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'View order confirmation' }))

    expect(paymentMocks.navigateTo).toHaveBeenCalledWith('/order-confirmed?orderIds=order-1')
    expect(paymentMocks.apiPost).toHaveBeenCalledTimes(2)
    expect(paymentMocks.openPaystackInline).toHaveBeenCalledTimes(2)
    expect(cartMocks.clearCart).toHaveBeenCalledOnce()
  })

  it('keeps review locked while completed payment verification is unavailable', async () => {
    const user = userEvent.setup()
    paymentMocks.apiPost.mockResolvedValue({
      order: { _id: 'order-1' },
      payment: {
        accessCode: 'access-code',
        provider: 'paystack',
        reference: 'payment-reference',
        status: 'pending',
      },
    })
    paymentMocks.openPaystackInline.mockResolvedValue({ reference: 'payment-reference', status: 'success' })
    paymentMocks.apiGet
      .mockRejectedValueOnce(new Error('Verification is temporarily unavailable'))
      .mockResolvedValueOnce({ orders: [{ _id: 'order-1' }] })

    render(<CheckoutPage />)
    await user.type(screen.getByRole('textbox', { name: 'Street address' }), '14 High Street')
    await user.click(screen.getByRole('button', { name: 'Continue to payment' }))
    await user.click(screen.getByRole('button', { name: 'Pay with Paystack' }))

    expect(await screen.findByRole('button', { name: 'Retry payment confirmation' })).toBeVisible()
    expect(screen.queryByRole('heading', { name: 'Review and confirm' })).not.toBeInTheDocument()
    expect(screen.getByText(/you will not be charged again/i)).toBeVisible()

    await user.click(screen.getByRole('button', { name: 'Retry payment confirmation' }))

    expect(await screen.findByRole('heading', { name: 'Review and confirm' })).toBeVisible()
    expect(paymentMocks.apiPost).toHaveBeenCalledOnce()
    expect(paymentMocks.openPaystackInline).toHaveBeenCalledOnce()
    expect(paymentMocks.apiGet).toHaveBeenCalledTimes(2)
  })
})
