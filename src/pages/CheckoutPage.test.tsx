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

vi.mock('../components/layout/AppShell', () => ({
  AppShell: ({ children }: { children: ReactNode }) => <main>{children}</main>,
}))

vi.mock('../hooks/useCart', () => ({
  useCart: () => ({
    clearCart: cartMocks.clearCart,
    items: cartMocks.items,
  }),
}))

describe('guided checkout form', () => {
  beforeEach(() => {
    cartMocks.clearCart.mockReset()
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
    expect(region).toHaveAccessibleDescription('Enter a delivery or pickup region.')
    await user.click(screen.getByRole('link', { name: 'Enter a delivery or pickup region.' }))
    expect(region).toHaveFocus()
  })

  it('preserves entered delivery values while moving forward and back', async () => {
    const user = userEvent.setup()
    render(<CheckoutPage />)

    const region = screen.getByRole('textbox', { name: 'Region' })
    const city = screen.getByRole('textbox', { name: /City or area/ })
    await user.clear(region)
    await user.type(region, 'Ashanti')
    await user.type(city, 'Kumasi')
    await user.click(screen.getByRole('button', { name: 'Continue to payment' }))

    expect(screen.getByRole('heading', { name: 'Payment' })).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Delivery, completed' }))

    expect(screen.getByRole('textbox', { name: 'Region' })).toHaveValue('Ashanti')
    expect(screen.getByRole('textbox', { name: /City or area/ })).toHaveValue('Kumasi')
  })
})
