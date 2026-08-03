/* eslint-disable react-hooks/refs -- the infinite-resource hook exposes reactive state through a stable facade */
import { useCallback, useMemo } from 'react'
import { AppShell, BrowseSearchCombobox, InlineNotice, ListingTypeToggle, MarketplaceFilters, MarketplaceSortControl, ProductCard, RefreshIndicator, StatePanel } from '../components'
import { PRODUCT_GRID_CLASS } from '../components/marketplace/ProductCard'
import { AppendFeedback, ProductGridSkeleton } from '../components/feedback/DiscoverySkeletons'
import { useAuth } from '../hooks/useAuth'
import { useInfiniteApiResource } from '../hooks/useInfiniteApiResource'
import { scrollRevealStateClass, scrollRevealTransitionClass, useScrollRevealBand } from '../hooks/useScrollRevealBand'
import type { PaginatedListings } from '../types/api'
import { withoutOwnListings } from '../utils/listingOwnership'
import { withBasePath } from '../utils/navigation'

function suggestedPath(page: number, search: string) {
  const query = new URLSearchParams(search)
  if (!query.has('page')) query.set('page', '1')
  if (!query.has('limit')) query.set('limit', '50')
  if (!query.has('type')) query.set('type', 'retail')
  if (!query.has('sort')) query.set('sort', 'relevance')
  query.set('page', String(page))
  return `/recommendations/suggested?${query.toString()}`
}

export function SuggestedForYouPage() {
  const { user } = useAuth()
  const search = window.location.search
  const query = useMemo(() => new URLSearchParams(search), [search])
  const activeMode = query.get('type') === 'wholesale' ? 'wholesale' : 'retail'
  const buildPath = useCallback((page: number) => suggestedPath(page, search), [search])
  const extractListings = useCallback((data: PaginatedListings) => data.results || [], [])
  const listings = useInfiniteApiResource(buildPath, extractListings, [search])
  const filterBandVisible = useScrollRevealBand()
  const feedListings = useMemo(() => withoutOwnListings(listings.items, user), [listings.items, user])
  const resultCount = listings.total > 50 ? '50+' : String(listings.total)

  return (
    <AppShell active="browse">
      <div className={`sticky top-16 z-40 mb-6 space-y-3 ${scrollRevealTransitionClass} ${scrollRevealStateClass(filterBandVisible)}`}>
        <div className="space-y-3 lg:pl-[19.5rem]">
          <BrowseSearchCombobox actionPath="/suggested-for-you" className="mx-auto w-full max-w-2xl" key={query.get('q') || ''} query={query} />
          <ListingTypeToggle actionPath="/suggested-for-you" activeMode={activeMode} search={search} />
        </div>
        <div className="lg:hidden">
          <MarketplaceFilters actionPath="/suggested-for-you" hideType key={`mobile-${query.toString()}`} locationOptions={listings.data?.filters?.locations || []} query={query} />
        </div>
      </div>
      <div className="browse-layout grid min-w-0 items-start gap-6 lg:grid-cols-[18rem_minmax(0,1fr)]">
        <MarketplaceFilters actionPath="/suggested-for-you" desktopOnly hideType key={`desktop-${query.toString()}`} locationOptions={listings.data?.filters?.locations || []} query={query} />
        <section aria-busy={listings.loading} className="browse-results lg:pb-24">
          {!listings.loading && !listings.error && (
            <div className="mb-4 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
              <h1 className="font-display text-xl font-semibold text-foose-text">Suggested for you</h1>
              <div className="flex min-w-0 items-center gap-2">
                <MarketplaceSortControl actionPath="/suggested-for-you" query={query} />
                <span className="whitespace-nowrap rounded-full bg-accent-light px-3 py-1.5 text-xs font-black text-accent">{resultCount} {activeMode === 'wholesale' ? 'bales' : 'items'}</span>
              </div>
            </div>
          )}
          <RefreshIndicator active={listings.refreshing} className="mb-4" label="Refreshing personalized suggestions" />
          {listings.loading && !feedListings.length && <ProductGridSkeleton label="Loading your personalized suggestions" />}
          {listings.error && !feedListings.length && <StatePanel action={<button className="button button-secondary" onClick={listings.refetch} type="button">Try again</button>} body={listings.error} layout="section" title="Your suggestions could not load" tone="error" />}
          {listings.error && !!feedListings.length && <InlineNotice action={<button className="font-black text-accent" onClick={listings.refetch} type="button">Retry</button>} tone="warning">Could not refresh your suggestions. Your current picks are still available.</InlineNotice>}
          {!listings.loading && !listings.error && !feedListings.length && (
            <StatePanel action={<a className="button button-secondary" href={withBasePath('/browse')}>Explore marketplace items</a>} body="Browse, save, and shop a few more pieces to shape this feed." layout="section" title="Your suggestions are warming up" tone="info" />
          )}
          {!!feedListings.length && (
            <div className={PRODUCT_GRID_CLASS}>
              {feedListings.map((listing) => (
                <ProductCard key={listing._id} listing={listing} />
              ))}
            </div>
          )}
          <div ref={listings.sentinelRef} className="min-h-14 py-2">
            <AppendFeedback error={listings.loadMoreError} label="Loading more suggestions" loading={listings.loadingMore} retry={listings.retryLoadMore} />
          </div>
        </section>
      </div>
    </AppShell>
  )
}
