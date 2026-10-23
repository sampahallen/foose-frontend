import { fireEvent, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SavedPage } from './SavedPage'

const mocks = vi.hoisted(() => ({
  refetch: vi.fn(),
  collections: {
    listings: [{ _id: 'listing-1', title: 'Blue jacket' }],
    events: [{ _id: 'event-1', title: 'Vintage market', date: '2026-11-01', location: 'Accra' }],
    finspos: [{ _id: 'post-1', caption: 'Weekend look', likes: [] }],
  },
}))

vi.mock('../components', () => ({
  AppShell: ({ children }: { children: ReactNode }) => <main>{children}</main>,
  FavoriteButton: () => <button type="button">Save event</button>,
  FinspoCaption: ({ caption }: { caption: string }) => <p>{caption}</p>,
  FinspoLikeButton: () => <button type="button">Like</button>,
  FinspoMediaBadge: () => null,
  InlineNotice: () => null,
  ProductCard: ({ listing, onFavoriteChange }: { listing: { title: string }; onFavoriteChange: (active: boolean) => void }) => (
    <article>
      <span>{listing.title}</span>
      <button onClick={() => onFavoriteChange(false)} type="button">Remove item</button>
    </article>
  ),
  RefreshIndicator: () => null,
  StatePanel: ({ title }: { title: string }) => <p>{title}</p>,
}))

vi.mock('../hooks/useApiResource', () => ({
  useApiResource: () => ({
    data: mocks.collections,
    error: '',
    initialLoading: false,
    loading: false,
    refetch: mocks.refetch,
    refreshing: false,
  }),
}))
vi.mock('../hooks/useImageBatchReady', () => ({ useImageBatchReady: () => ({ failed: [], ready: true }) }))
vi.mock('../hooks/usePageNavigationSnapshot', () => ({ usePageNavigationSnapshot: () => undefined }))
vi.mock('../stores/navigationMemoryStore', () => ({ getNavigationSnapshot: () => null }))
vi.mock('../utils/navigation', () => ({
  cacheFinspoPreview: vi.fn(),
  captureNavigationTrigger: vi.fn(),
  navigateTo: vi.fn(),
  withBasePath: (path: string) => path,
}))

describe('SavedPage', () => {
  beforeEach(() => {
    mocks.refetch.mockClear()
    window.history.replaceState({}, '', '/saved')
  })

  it('shows saved items by default and removes an item after an unsave succeeds', () => {
    render(<SavedPage />)

    expect(screen.getByRole('tab', { name: 'Items 1' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByText('Blue jacket')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Remove item' }))

    expect(screen.queryByText('Blue jacket')).not.toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Items 0' })).toBeInTheDocument()
    expect(mocks.refetch).toHaveBeenCalledOnce()
  })

  it('shows the event and Finspo galleries for their existing tab URLs', () => {
    window.history.replaceState({}, '', '/saved?tab=events')
    const { unmount } = render(<SavedPage />)
    expect(screen.getByRole('tab', { name: 'Events 1' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('link', { name: 'Vintage market' })).toHaveAttribute('href', '/community/events/event-1')

    unmount()
    window.history.replaceState({}, '', '/saved?tab=finspos')
    render(<SavedPage />)
    expect(screen.getByRole('tab', { name: 'Finspo 1' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByText('Weekend look')).toBeInTheDocument()
  })
})
