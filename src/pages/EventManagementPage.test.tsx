import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ToastProvider } from '../components/feedback/ToastProvider'
import type { Event, Listing } from '../types/api'
import { EventManagementPage } from './EventManagementPage'

const mocks = vi.hoisted(() => ({
  apiDelete: vi.fn(),
  apiPost: vi.fn(),
  event: null as Event | null,
  sellerListings: [] as Listing[],
}))

vi.mock('../components/layout/AppShell', () => ({
  AppShell: ({ children }: { children: ReactNode }) => <main>{children}</main>,
}))

vi.mock('../hooks/useApiResource', () => ({
  useApiResource: (path: string | null) => {
    if (path?.includes('/listings/me')) {
      return {
        data: { listings: mocks.sellerListings },
        error: '',
        initialLoading: false,
        loading: false,
        refetch: vi.fn().mockResolvedValue(undefined),
        refreshing: false,
      }
    }
    return {
      data: mocks.event ? { event: mocks.event } : null,
      error: '',
      initialLoading: false,
      loading: false,
      refetch: vi.fn().mockResolvedValue(undefined),
      refreshing: false,
    }
  },
}))

vi.mock('../lib/api', async (importOriginal) => ({
  ...await importOriginal<typeof import('../lib/api')>(),
  apiDelete: mocks.apiDelete,
  apiPost: mocks.apiPost,
}))

function makeListing(overrides: Partial<Listing> = {}): Listing {
  return {
    _id: 'listing-1',
    currency: 'GHS',
    price: 5000,
    shopId: 'shop-1',
    status: 'active',
    title: 'Catalog item',
    type: 'retail',
    ...overrides,
  }
}

async function openPicker(user: ReturnType<typeof userEvent.setup>) {
  // "Add items" also appears as the empty-state call to action when the
  // pop-up has no listings yet, so the primary header button is the first match.
  await user.click(screen.getAllByRole('button', { name: /add items/i })[0])
}

function makeEvent(overrides: Partial<Event> = {}): Event {
  return {
    _id: 'event-1',
    date: '2026-08-01T10:00:00.000Z',
    endsAt: '2026-08-03T10:00:00.000Z',
    eventListings: [],
    startsAt: '2026-08-01T10:00:00.000Z',
    title: 'Weekend Drop',
    type: 'online-pop-up',
    ...overrides,
  }
}

describe('EventManagementPage online pop-up catalog', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/community/events/event-1/manage')
    mocks.apiDelete.mockReset()
    mocks.apiPost.mockReset()
    mocks.apiPost.mockResolvedValue({})
    mocks.event = makeEvent()
    mocks.sellerListings = [makeListing({
      _id: 'listing-2',
      images: ['https://example.test/denim-skirt.jpg'],
      price: 8000,
      title: 'Denim skirt',
    })]
  })

  it('opens an image-and-price preview picker instead of a plain dropdown', async () => {
    const user = userEvent.setup()
    render(<ToastProvider><EventManagementPage /></ToastProvider>)

    await openPicker(user)

    expect(screen.getByRole('dialog', { name: 'Add items to the pop-up' })).toBeVisible()
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
    const card = screen.getByRole('button', { name: /Denim skirt/ })
    expect(card).toHaveTextContent('GHS 80.00')
    expect(card.querySelector('img')).not.toBeNull()
  })

  it('attaches a catalog listing with a single click on its preview card', async () => {
    const user = userEvent.setup()
    render(<ToastProvider><EventManagementPage /></ToastProvider>)

    await openPicker(user)
    await user.click(screen.getByRole('button', { name: /Denim skirt/ }))

    await waitFor(() => expect(mocks.apiPost).toHaveBeenCalledWith(
      '/community/events/event-1/listings',
      { listingId: 'listing-2' },
    ))
  })

  it('shows attached items with the same card format Browse uses, plus a way to detach them', () => {
    mocks.event = makeEvent({
      eventListings: [makeListing({
        _id: 'listing-2',
        images: ['https://example.test/denim-skirt.jpg'],
        price: 8000,
        title: 'Denim skirt',
      })],
    })
    render(<ToastProvider><EventManagementPage /></ToastProvider>)

    // Same ProductCard the marketplace Browse grid uses: the card itself links
    // to the listing, and — since this is the seller's own item — an edit
    // pencil replaces the favorite heart, matching ProfilePage's own-listing view.
    const links = screen.getAllByRole('link')
    expect(links.some((link) => link.getAttribute('href') === '/listing/listing-2')).toBe(true)
    expect(screen.getByRole('link', { name: 'Edit Denim skirt' })).toHaveAttribute('href', '/listings/listing-2/edit')
    expect(screen.getByRole('button', { name: 'Remove from pop-up' })).toBeVisible()
    expect(screen.queryByRole('link', { name: 'View' })).not.toBeInTheDocument()
  })

  it('excludes listings already in the pop-up and offers a way to create a brand new item', async () => {
    mocks.event = makeEvent({ eventListings: [makeListing({ _id: 'listing-2', price: 8000, title: 'Denim skirt' })] })
    const user = userEvent.setup()
    render(<ToastProvider><EventManagementPage /></ToastProvider>)

    await openPicker(user)

    expect(screen.queryByRole('button', { name: /Denim skirt/ })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: /New item for this pop-up/ })).toHaveAttribute(
      'href',
      '/listings/new?eventId=event-1',
    )
  })

  it('filters the picker to matching catalog items as the seller searches', async () => {
    mocks.sellerListings = [
      makeListing({ _id: 'listing-2', price: 8000, title: 'Denim skirt' }),
      makeListing({ _id: 'listing-3', price: 3000, title: 'Silk scarf' }),
    ]
    const user = userEvent.setup()
    render(<ToastProvider><EventManagementPage /></ToastProvider>)

    await openPicker(user)
    await user.type(screen.getByPlaceholderText('Search your catalog'), 'scarf')

    expect(screen.queryByRole('button', { name: /Denim skirt/ })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Silk scarf/ })).toBeVisible()
  })
})
