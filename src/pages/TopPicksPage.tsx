/* eslint-disable react-hooks/refs -- the infinite-resource hook exposes reactive state through a stable facade */
import { useCallback, useMemo } from 'react'
import { AppShell, BrowseSearchCombobox, CollectionHero, InlineNotice, MarketplaceFilters, MarketplaceSortControl, ProductCard, RefreshIndicator, StatePanel } from '../components'
import { PRODUCT_GRID_CLASS } from '../components/marketplace/ProductCard'
import { AppendFeedback, ProductGridSkeleton } from '../components/feedback/DiscoverySkeletons'
import { useAuth } from '../hooks/useAuth'
import { useInfiniteApiResource } from '../hooks/useInfiniteApiResource'
import { scrollRevealStateClass, scrollRevealTransitionClass, useScrollRevealBand } from '../hooks/useScrollRevealBand'
import type { PaginatedListings } from '../types/api'
import { withoutOwnListings } from '../utils/listingOwnership'
import { withBasePath } from '../utils/navigation'

function topPicksPath(page: number, search: string) {
  const query = new URLSearchParams(search)
  if (!query.has('page')) query.set('page', '1')
  if (!query.has('limit')) query.set('limit', '20')
  if (!query.has('sort')) query.set('sort', 'relevance')
  query.set('page', String(page))
  return `/search/top-picks?${query.toString()}`
}

export function TopPicksPage() {
  const { user } = useAuth()
  const search = window.location.search
  const query = useMemo(() => new URLSearchParams(search), [search])
  const buildPath = useCallback((page: number) => topPicksPath(page, search), [search])
  const extractListings = useCallback((data: PaginatedListings) => data.results || [], [])
  const listings = useInfiniteApiResource(buildPath, extractListings, [search])
  const filterBandVisible = useScrollRevealBand()
  const feedListings = useMemo(() => withoutOwnListings(listings.items, user), [listings.items, user])

  return (
    <AppShell active="browse">
      <CollectionHero description="Promoted finds from Foose sellers, curated into one faster shopping lane." title="Top Picks" />
      <div className={`sticky top-16 z-40 mb-6 space-y-3 ${scrollRevealTransitionClass} ${scrollRevealStateClass(filterBandVisible)}`}>
        <div className="lg:pl-[19.5rem]">
          <BrowseSearchCombobox actionPath="/top-picks" className="mx-auto w-full max-w-2xl" key={query.get('q') || ''} query={query} />
        </div>
        <div className="lg:hidden">
          <MarketplaceFilters actionPath="/top-picks" key={`mobile-${query.toString()}`} query={query} />
        </div>
      </div>
      <div className="browse-layout grid min-w-0 items-start gap-6 lg:grid-cols-[18rem_minmax(0,1fr)]">
        <MarketplaceFilters actionPath="/top-picks" desktopOnly key={`desktop-${query.toString()}`} query={query} />
        <section aria-busy={listings.loading} className="browse-results lg:pb-24">
          <div className="mb-4 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-end">
            <div className="min-w-0">
              <h2 className="font-display text-xl font-semibold text-foose-text">Promoted items</h2>
              <p className="mt-1 text-sm text-foose-muted">Listings marked for Top Picks placement</p>
            </div>
            <div className="flex min-w-0 items-center gap-2">
              <MarketplaceSortControl actionPath="/top-picks" query={query} />
              <span className="whitespace-nowrap rounded-full bg-accent-light px-3 py-1.5 text-xs font-black text-accent">{listings.total} picks</span>
            </div>
          </div>
          <RefreshIndicator active={listings.refreshing} className="mb-4" label="Refreshing Top Picks" />
          {listings.loading && !feedListings.length && <ProductGridSkeleton label="Loading promoted Top Picks" />}
          {listings.error && !feedListings.length && <StatePanel action={<button className="button button-secondary" onClick={listings.refetch} type="button">Try again</button>} body={listings.error} layout="section" title="Top Picks could not load" tone="error" />}
          {listings.error && !!feedListings.length && <InlineNotice action={<button className="font-black text-accent" onClick={listings.refetch} type="button">Retry</button>} tone="warning">Could not refresh Top Picks. Showing the promoted items already loaded.</InlineNotice>}
          {!listings.loading && !listings.error && !feedListings.length && (
            <StatePanel action={<a className="button button-secondary" href={withBasePath('/browse')}>Browse the marketplace</a>} body="Top Picks will appear when promoted listings are active." layout="section" title="No Top Picks right now" tone="empty" />
          )}
          {!!feedListings.length && (
            <div className={PRODUCT_GRID_CLASS}>
              {feedListings.map((listing) => (
                <ProductCard key={listing._id} listing={listing} />
              ))}
            </div>
          )}
          <div ref={listings.sentinelRef} className="min-h-14 py-2">
            <AppendFeedback error={listings.loadMoreError} label="Loading more Top Picks" loading={listings.loadingMore} retry={listings.retryLoadMore} />
          </div>
        </section>
      </div>
    </AppShell>
  )
}
