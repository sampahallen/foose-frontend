/* eslint-disable react-hooks/refs -- the infinite-resource hook exposes reactive state through a stable facade */
import { useCallback, useMemo } from 'react'
import { AppShell, InlineNotice, MarketplaceFilters, MarketplaceSortControl, ProductCard, RefreshIndicator, StatePanel } from '../components'
import { AppendFeedback, ProductGridSkeleton } from '../components/feedback/DiscoverySkeletons'
import { useAuth } from '../hooks/useAuth'
import { useInfiniteApiResource } from '../hooks/useInfiniteApiResource'
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
  const feedListings = useMemo(() => withoutOwnListings(listings.items, user), [listings.items, user])

  return (
    <AppShell active="browse" searchPlaceholder="Search top picks...">
      <section className="page-hero [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:md:text-4xl [&_p]:text-sm [&_p]:leading-6 [&_p]:text-foose-muted [&_p]:md:text-base mb-8 rounded-xl border border-foose-border bg-foose-surface p-5 md:p-8 [&.small]:py-6 max-md:[&_h1]:text-2xl small top-picks-hero">
        <h1>Top Picks</h1>
        <p>Promoted finds from Foose sellers, curated into one faster shopping lane.</p>
      </section>
      <div className="mb-6 lg:hidden">
        <MarketplaceFilters actionPath="/top-picks" key={`mobile-${query.toString()}`} query={query} />
      </div>
      <div className="browse-layout grid min-w-0 items-start gap-6 lg:grid-cols-[18rem_minmax(0,1fr)]">
        <MarketplaceFilters actionPath="/top-picks" desktopOnly key={`desktop-${query.toString()}`} query={query} />
        <section className="browse-results">
          <div className="mb-4 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-end">
            <div className="min-w-0">
              <h2 className="font-display text-xl font-semibold text-foose-text">Promoted items</h2>
              <p className="mt-1 text-sm text-foose-muted">Listings marked for Top Picks placement</p>
            </div>
            <div className="flex min-w-0 items-center gap-2">
              <span className="whitespace-nowrap rounded-full bg-accent-light px-3 py-1.5 text-xs font-black text-accent">{listings.total} picks</span>
              <MarketplaceSortControl actionPath="/top-picks" query={query} />
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
            <div className="masonry grid grid-cols-2 gap-x-2 gap-y-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4">
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
