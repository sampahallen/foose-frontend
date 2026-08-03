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
    shopId: 'shop-1',
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
    paymentMocks.apiGet.mockResolvedValue({ shops: [] })
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

    await user.click(screen.getByRole('radio', { name: 'Express delivery (airport-to-airport)' }))
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

  it('treats shop pickup as collection from the seller shop', async () => {
    const user = userEvent.setup()
    paymentMocks.apiPost.mockResolvedValue({
      order: { _id: 'pickup-order' },
      orders: [{ _id: 'pickup-order' }],
      payment: { mode: 'pickup', provider: 'cash', status: 'pending' },
    })
    render(<CheckoutPage />)

    await user.click(screen.getByRole('radio', { name: 'Shop pickup' }))

    expect(screen.queryByRole('textbox', { name: 'Destination town' })).not.toBeInTheDocument()
    expect(screen.getByText(/collecting from the seller's physical shop/i)).toBeVisible()

    await user.click(screen.getByRole('button', { name: 'Continue to payment' }))
    expect(screen.getByRole('heading', { name: 'Payment' })).toBeVisible()

    await user.click(screen.getByRole('radio', { name: /Cash on pickup/ }))
    await user.click(screen.getByRole('button', { name: 'Review order' }))
    await user.click(screen.getByRole('button', { name: 'Place pickup order' }))

    expect(paymentMocks.apiPost).toHaveBeenCalledWith(
      '/orders',
      expect.objectContaining({
        deliveryByShop: { 'shop-1': { method: 'shop_pickup' } },
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
    await user.click(screen.getByRole('radio', { name: 'Express delivery (airport-to-airport)' }))
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
        deliveryByShop: expect.objectContaining({
          'shop-1': expect.objectContaining({
            destination: expect.objectContaining({
              recipientName: 'Ama Buyer',
              recipientPhone: '0240000000',
              region: 'Greater Accra',
              town: 'Kumasi',
            }),
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
    await user.click(screen.getByRole('radio', { name: 'Express delivery (airport-to-airport)' }))
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

  it('shows a 2M Express destination dropdown scoped to the seller origin, or a warning when ineligible', async () => {
    const user = userEvent.setup()
    paymentMocks.apiGet.mockResolvedValue({
      shops: [{
        location: { city: 'Accra', region: 'Greater Accra' },
        shopId: 'shop-1',
        shopName: 'Archive Shop',
        twoMExpress: {
          destinations: [
            { label: 'Kumasi (Asafo)', region: 'Ashanti', terminal: 'Asafo', town: 'Kumasi' },
            { label: 'Takoradi', region: 'Western', terminal: '', town: 'Takoradi' },
          ],
          eligible: true,
        },
      }],
    })
    render(<CheckoutPage />)

    await user.click(screen.getByRole('radio', { name: '2M Express' }))
    const destinationSelect = await screen.findByRole('combobox', { name: 'Destination' })
    expect(screen.getByRole('option', { name: 'Kumasi (Asafo)' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Takoradi' })).toBeInTheDocument()
    expect(screen.queryByRole('textbox', { name: 'Region' })).not.toBeInTheDocument()

    await user.selectOptions(destinationSelect, 'Ashanti|Kumasi|Asafo')
    await user.click(screen.getByRole('button', { name: 'Continue to payment' }))

    expect(paymentMocks.apiGet).toHaveBeenCalledWith('/orders/checkout/delivery-options?shopIds=shop-1')
    expect(screen.getByRole('heading', { name: 'Payment' })).toBeVisible()
  })

  it('warns when the seller has no eligible 2M Express route', async () => {
    const user = userEvent.setup()
    paymentMocks.apiGet.mockResolvedValue({
      shops: [{
        location: { city: 'Ho', region: 'Volta' },
        shopId: 'shop-1',
        shopName: 'Archive Shop',
        twoMExpress: { destinations: [], eligible: false },
      }],
    })
    render(<CheckoutPage />)

    await user.click(screen.getByRole('radio', { name: '2M Express' }))

    expect(await screen.findByText(/2M Express doesn't serve a route from Archive Shop's location/i)).toBeVisible()
    expect(screen.queryByRole('combobox', { name: 'Destination' })).not.toBeInTheDocument()
  })

  it('shows a broader Intercity STC destination dropdown, since STC covers far more terminals than 2M Express', async () => {
    const user = userEvent.setup()
    paymentMocks.apiGet.mockResolvedValue({
      shops: [{
        intercityStc: {
          destinations: [
            { label: 'Kumasi (Adum)', region: 'Ashanti', terminal: 'Adum', town: 'Kumasi' },
            { label: 'Kumasi (Asafo)', region: 'Ashanti', terminal: 'Asafo', town: 'Kumasi' },
            { label: 'Takoradi (Main)', region: 'Western', terminal: 'Main', town: 'Takoradi' },
            { label: 'Tamale (Main)', region: 'Northern', terminal: 'Main', town: 'Tamale' },
            { label: 'Wa', region: 'Upper West', terminal: '', town: 'Wa' },
          ],
          eligible: true,
        },
        location: { city: 'Accra', region: 'Greater Accra' },
        shopId: 'shop-1',
        shopName: 'Archive Shop',
        twoMExpress: { destinations: [], eligible: false },
      }],
    })
    render(<CheckoutPage />)

    await user.click(screen.getByRole('radio', { name: 'Intercity STC' }))
    const destinationSelect = await screen.findByRole('combobox', { name: 'Destination' })
    expect(screen.getByRole('option', { name: 'Tamale (Main)' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Wa' })).toBeInTheDocument()
    expect(screen.queryByRole('textbox', { name: 'Region' })).not.toBeInTheDocument()

    await user.selectOptions(destinationSelect, 'Northern|Tamale|Main')
    await user.click(screen.getByRole('button', { name: 'Continue to payment' }))

    expect(screen.getByRole('heading', { name: 'Payment' })).toBeVisible()
  })

  it('warns when the seller has no eligible Intercity STC terminal nearby', async () => {
    const user = userEvent.setup()
    paymentMocks.apiGet.mockResolvedValue({
      shops: [{
        intercityStc: { destinations: [], eligible: false },
        location: { city: 'Somewhere Remote', region: 'Ashanti' },
        shopId: 'shop-1',
        shopName: 'Archive Shop',
        twoMExpress: { destinations: [], eligible: false },
      }],
    })
    render(<CheckoutPage />)

    await user.click(screen.getByRole('radio', { name: 'Intercity STC' }))

    expect(await screen.findByText(/Intercity STC doesn't serve a route from Archive Shop's location/i)).toBeVisible()
    expect(screen.queryByRole('combobox', { name: 'Destination' })).not.toBeInTheDocument()
  })

  it('shows every spoke town as a VIP Jeoun destination when the seller is at the Accra hub', async () => {
    const user = userEvent.setup()
    paymentMocks.apiGet.mockResolvedValue({
      shops: [{
        intercityStc: { destinations: [], eligible: false },
        location: { city: 'Accra', region: 'Greater Accra' },
        shopId: 'shop-1',
        shopName: 'Archive Shop',
        twoMExpress: { destinations: [], eligible: false },
        vipJeoun: {
          destinations: [
            { label: 'Kumasi', region: 'Ashanti', terminal: '', town: 'Kumasi' },
            { label: 'Wa', region: 'Upper West', terminal: '', town: 'Wa' },
            { label: 'Tamale', region: 'Northern', terminal: '', town: 'Tamale' },
          ],
          eligible: true,
        },
      }],
    })
    render(<CheckoutPage />)

    await user.click(screen.getByRole('radio', { name: 'VIP Jeoun' }))
    const destinationSelect = await screen.findByRole('combobox', { name: 'Destination' })
    expect(screen.getByRole('option', { name: 'Kumasi' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Wa' })).toBeInTheDocument()
    expect(screen.queryByRole('textbox', { name: 'Region' })).not.toBeInTheDocument()

    await user.selectOptions(destinationSelect, 'Ashanti|Kumasi|')
    await user.click(screen.getByRole('button', { name: 'Continue to payment' }))

    expect(screen.getByRole('heading', { name: 'Payment' })).toBeVisible()
  })

  it('only offers Accra as a VIP Jeoun destination when the seller is at a spoke town', async () => {
    const user = userEvent.setup()
    paymentMocks.apiGet.mockResolvedValue({
      shops: [{
        intercityStc: { destinations: [], eligible: false },
        location: { city: 'Sunyani', region: 'Bono' },
        shopId: 'shop-1',
        shopName: 'Archive Shop',
        twoMExpress: { destinations: [], eligible: false },
        vipJeoun: {
          destinations: [{ label: 'Accra', region: 'Greater Accra', terminal: '', town: 'Accra' }],
          eligible: true,
        },
      }],
    })
    render(<CheckoutPage />)

    await user.click(screen.getByRole('radio', { name: 'VIP Jeoun' }))
    const destinationSelect = await screen.findByRole('combobox', { name: 'Destination' })
    const options = screen.getAllByRole('option')
    expect(options.map((option) => option.textContent)).toEqual(['Choose a destination', 'Accra'])
    expect(destinationSelect).toBeVisible()
  })

  it('warns when the seller has no eligible VIP Jeoun stop nearby', async () => {
    const user = userEvent.setup()
    paymentMocks.apiGet.mockResolvedValue({
      shops: [{
        intercityStc: { destinations: [], eligible: false },
        location: { city: 'Somewhere Remote', region: 'Volta' },
        shopId: 'shop-1',
        shopName: 'Archive Shop',
        twoMExpress: { destinations: [], eligible: false },
        vipJeoun: { destinations: [], eligible: false },
      }],
    })
    render(<CheckoutPage />)

    await user.click(screen.getByRole('radio', { name: 'VIP Jeoun' }))

    expect(await screen.findByText(/VIP Jeoun doesn't serve a route from Archive Shop's location/i)).toBeVisible()
    expect(screen.queryByRole('combobox', { name: 'Destination' })).not.toBeInTheDocument()
  })
})
