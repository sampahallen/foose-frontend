import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useNavigationStore } from '../../stores/navigationMemoryStore'
import type { Listing } from '../../types/api'
import { getCurrentNavigationEntry, initializeNavigation, resetNavigationForTests } from '../../utils/navigation'
import { ProductCard } from './ProductCard'

vi.mock('../ui/FavoriteButton', () => ({
  FavoriteButton: () => <button aria-label="Favorite" type="button" />,
}))

const listing: Listing = {
  _id: 'listing-42',
  category: 'outerwear',
  currency: 'GHS',
  images: ['coat.jpg'],
  price: 15000,
  status: 'active',
  title: 'Blue coat',
  type: 'retail',
}

describe('ProductCard listing navigation', () => {
  beforeEach(() => {
    resetNavigationForTests()
    window.sessionStorage.clear()
    useNavigationStore.getState().resetSession('product-card-test')
    window.history.replaceState({}, '', '/browse?type=retail')
    initializeNavigation()
  })

  afterEach(() => resetNavigationForTests())

  it('opens listing details as a tracked modal and records the originating card', () => {
    render(<ProductCard listing={listing} />)

    fireEvent.click(screen.getByRole('link'))

    expect(window.location.pathname).toBe('/listing/listing-42')
    expect(getCurrentNavigationEntry()).toMatchObject({
      href: '/listing/listing-42',
      presentation: 'modal',
      route: 'retailDetail',
      sourceLabel: 'Browse',
    })
    expect(useNavigationStore.getState().entries.find((entry) => entry.route === 'browse')).toMatchObject({
      trigger: { elementId: expect.any(String) },
    })
  })
})
