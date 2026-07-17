import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ShopManagementMobileNav, ShopManagementSidebar } from './ShopManagementNavigation'

describe('ShopManagementNavigation', () => {
  it('uses compact scrollable mobile labels and marks the current panel', () => {
    render(<ShopManagementMobileNav activePanel="orders" />)

    const navigation = screen.getByRole('navigation', { name: 'Shop management' })
    const orders = screen.getByRole('link', { name: 'Orders' })

    expect(navigation.firstElementChild).toHaveClass('overflow-x-auto', 'snap-x', 'pr-8')
    expect(navigation.lastElementChild).toHaveClass('bg-gradient-to-l')
    expect(screen.getByRole('link', { name: 'Overview' })).toHaveAttribute('href', '/manage-shop')
    expect(screen.getByRole('link', { name: 'Active' })).toHaveAttribute('href', '/manage-shop/listings')
    expect(orders).toHaveAttribute('aria-current', 'page')
  })

  it('marks Orders active in the desktop seller sidebar too', () => {
    render(<ShopManagementSidebar activePanel="orders" collapsed onToggle={() => undefined} />)

    expect(screen.getByRole('link', { name: 'Orders' })).toHaveAttribute('aria-current', 'page')
  })
})
