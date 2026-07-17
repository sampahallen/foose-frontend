import { render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { Listing } from '../../types/api'
import {
  ManagementListingCard,
  ManagementListingMasonry,
  ManagementListingMasonrySkeleton,
} from './ManagementListingMasonry'
import { ShopManagementNavigation } from './ShopManagementNavigation'

const listing: Listing = {
  _id: 'listing-1',
  category: 'outerwear',
  color: 'navy',
  currency: 'GHS',
  gender: 'unisex',
  images: ['coat.jpg'],
  price: 12345,
  size: 'XL',
  status: 'draft',
  title: 'A complete, deliberately long listing title that must never be truncated',
  type: 'retail',
}

describe('shop listing management components', () => {
  it('shows the complete management metadata, natural-ratio media, and injected regions', () => {
    render(
      <ManagementListingCard
        actions={<button type="button">Edit listing</button>}
        extraDetails={<p>Buyer and order details</p>}
        listing={listing}
      />,
    )

    const card = screen.getByText(listing.title).closest('[data-management-listing-card]')
    expect(card).toBeInTheDocument()
    expect(screen.getByText(listing.title)).not.toHaveClass('truncate', 'line-clamp-1', 'line-clamp-2')
    expect(screen.getByText(/GHS\s*123\.45/)).toBeVisible()

    for (const value of ['Outerwear', 'XL', 'Unisex', 'Navy', 'Retail', 'Draft']) {
      expect(within(card as HTMLElement).getByText(value)).toBeVisible()
    }

    expect(screen.getByRole('img', { name: listing.title })).toHaveClass('h-auto', 'w-full', 'object-contain', 'max-h-[70dvh]')
    expect(screen.getByRole('img', { name: listing.title }).parentElement).toHaveClass('min-h-40', 'max-h-[70dvh]', 'items-center')
    expect(screen.getByText('Buyer and order details')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Edit listing' }).parentElement).toHaveClass('[&_button]:min-h-11')
  })

  it('uses explicit fallbacks while retaining a real zero price', () => {
    render(
      <ManagementListingCard
        listing={{ ...listing, category: undefined, color: undefined, gender: undefined, images: [], price: 0, size: '' }}
      />,
    )

    expect(screen.getByText(/GHS\s*0\.00/)).toBeVisible()
    expect(screen.getAllByText('Not set')).toHaveLength(4)
    expect(screen.getByRole('img', { name: 'Media unavailable' })).toHaveClass('aspect-[4/5]')
  })

  it('keeps source order in the masonry DOM and exposes an exact-layout loading region', () => {
    const { container, rerender } = render(
      <ManagementListingMasonry>
        <button key="first" type="button">First</button>
        <button key="second" type="button">Second</button>
        <button key="third" type="button">Third</button>
      </ManagementListingMasonry>,
    )

    const items = Array.from(container.querySelectorAll('[data-management-masonry-item]'))
    expect(items.map((item) => item.textContent)).toEqual(['First', 'Second', 'Third'])

    rerender(<ManagementListingMasonrySkeleton count={3} label="Loading draft listings" />)
    expect(screen.getByRole('status', { name: 'Loading draft listings' })).toHaveAttribute('aria-busy', 'true')
    expect(container.querySelectorAll('[data-management-masonry-item]')).toHaveLength(3)
  })

  it('provides desktop and mobile draft navigation with a 44px target', () => {
    const onToggle = vi.fn()
    render(<ShopManagementNavigation activePanel="drafts" collapsed={false} onToggle={onToggle} />)

    const draftLinks = screen.getAllByRole('link', { name: 'Drafts' })
    expect(draftLinks).toHaveLength(2)
    draftLinks.forEach((link) => {
      expect(link).toHaveAttribute('href', '/manage-shop/drafts')
      expect(link).toHaveAttribute('aria-current', 'page')
      expect(link).toHaveClass('min-h-11')
      expect(link.querySelector('svg')).toBeInTheDocument()
    })
    expect(screen.getByRole('button', { name: 'Collapse shop sidebar' })).toHaveClass('size-11')
  })
})
