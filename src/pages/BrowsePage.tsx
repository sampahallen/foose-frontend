/* eslint-disable react-hooks/refs -- the infinite-resource hook exposes reactive state through a stable facade */
import { useCallback, useMemo } from 'react'
import { AppShell, BrowseSearchCombobox, InlineNotice, ProductCard, RefreshIndicator, StatePanel, TopFilterBar } from '../components'
import { AppendFeedback, ProductGridSkeleton } from '../components/feedback/DiscoverySkeletons'
import { useAuth } from '../hooks/useAuth'
import { useInfiniteApiResource } from '../hooks/useInfiniteApiResource'
import { useScrollRevealBand } from '../hooks/useScrollRevealBand'
import type { PaginatedListings } from '../types/api'
import { withoutOwnListings } from '../utils/listingOwnership'
import { withBasePath } from '../utils/navigation'

function searchPath(page: number, search: string) {
  const query = new URLSearchParams(search)
  if (!query.has('page')) query.set('page', '1')
  if (!query.has('limit')) query.set('limit', '85')
  if (!query.has('type')) query.set('type', 'retail')
  query.set('page', String(page))
  const endpoint = query.get('q')?.trim() ? '/search/items' : '/recommendations/feed'
  return `${endpoint}?${query.toString()}`
}

function modeHref(mode: 'retail' | 'wholesale', search: string) {
  const query = new URLSearchParams(search)
  query.set('type', mode)
  query.delete('page')
  return withBasePath(`/browse?${query.toString()}`)
}

export function BrowsePage() {
  const { user } = useAuth()
  const search = window.location.search
  const query = useMemo(() => new URLSearchParams(search), [search])
  const activeMode = query.get('type') === 'wholesale' ? 'wholesale' : 'retail'
  const buildPath = useCallback((page: number) => searchPath(page, search), [search])
  const extractListings = useCallback((data: PaginatedListings) => data.results || [], [])
  const listings = useInfiniteApiResource(buildPath, extractListings, [search])
  const filterBandVisible = useScrollRevealBand()
  const feedListings = useMemo(() => withoutOwnListings(listings.items, user), [listings.items, user])
  const hasSearchQuery = Boolean(query.get('q')?.trim())
  const resultCount = listings.total > 50 ? '50+' : String(listings.total)

  return (
    <AppShell active="browse">
      <div className={`sticky top-16 z-40 mb-6 space-y-3 transition duration-200 ${filterBandVisible ? 'translate-y-0 opacity-100' : 'pointer-events-none -translate-y-full opacity-0'}`}>
        <BrowseSearchCombobox key={query.get('q') || ''} query={query} />
        <nav className="flex items-center justify-center border-b border-foose-border bg-foose-bg/95 py-2 backdrop-blur" aria-label="Browse listing type">
          <div className="flex w-full max-w-md items-center justify-center gap-4 text-sm font-black md:justify-between">
            <a className={`border-b-2 px-4 py-2 transition ${activeMode === 'retail' ? 'border-accent text-accent' : 'border-transparent text-foose-muted hover:text-accent'}`} href={modeHref('retail', search)}>
              Retail
            </a>
            <a className={`border-b-2 px-4 py-2 transition ${activeMode === 'wholesale' ? 'border-accent text-accent' : 'border-transparent text-foose-muted hover:text-accent'}`} href={modeHref('wholesale', search)}>
              Bale
            </a>
          </div>
        </nav>
        <TopFilterBar
          hideType
          locationOptions={listings.data?.filters?.locations || []}
          query={query}
          resultLabel={`${resultCount} ${activeMode === 'wholesale' ? 'bales' : 'items'}`}
          showResultLabel={hasSearchQuery && !listings.loading && !listings.error}
        />
      </div>
      <div className="browse-layout">
        <section aria-busy={listings.loading} className="browse-results">
          <RefreshIndicator active={listings.refreshing} className="mb-4" label="Refreshing marketplace listings" />
          {listings.loading && !feedListings.length && <ProductGridSkeleton label={hasSearchQuery ? 'Searching marketplace' : 'Loading marketplace'} />}
          {listings.error && !feedListings.length && (
            <StatePanel action={<button className="button button-secondary" onClick={listings.refetch} type="button">Try again</button>} body={listings.error} layout="section" title="Marketplace could not load" tone="error" />
          )}
          {listings.error && !!feedListings.length && <InlineNotice action={<button className="font-black text-accent" onClick={listings.refetch} type="button">Retry</button>} tone="warning">The latest marketplace update failed. Your current results are still here.</InlineNotice>}
          {!listings.loading && !listings.error && !feedListings.length && (
            <StatePanel
              action={<a className="button button-secondary" href={withBasePath(activeMode === 'wholesale' ? '/browse?type=wholesale' : '/browse?type=retail')}>Clear search and filters</a>}
              body={hasSearchQuery ? `No ${activeMode === 'wholesale' ? 'bales' : 'items'} match “${query.get('q')}”. Try a shorter search or clear a filter.` : `There are no active ${activeMode === 'wholesale' ? 'bales' : 'items'} for these filters yet.`}
              layout="section"
              title="No marketplace matches"
              tone="empty"
            />
          )}
          {!!feedListings.length && (
            <div className="masonry grid grid-cols-2 gap-x-2 gap-y-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {feedListings.map((listing) => (
                <ProductCard key={listing._id} listing={listing} />
              ))}
            </div>
          )}
          <div ref={listings.sentinelRef} className="min-h-14 py-2">
            <AppendFeedback error={listings.loadMoreError} label="Loading more marketplace listings" loading={listings.loadingMore} retry={listings.retryLoadMore} />
          </div>
        </section>
      </div>
    </AppShell>
  )
}
