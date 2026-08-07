/* eslint-disable react-hooks/refs -- the infinite-resource hook exposes reactive state through a stable facade */
import { useCallback, useMemo, useRef, useState } from 'react'
import { AppShell, BrowseSearchCombobox, CollectionHero, InlineNotice, MarketplaceFilters, MarketplaceSortControl, ProductCard, RefreshIndicator, StatePanel } from '../components'
import { PRODUCT_GRID_CLASS } from '../components/marketplace/ProductCard'
import { AppendFeedback, ProductGridSkeleton } from '../components/feedback/DiscoverySkeletons'
import { useAuth } from '../hooks/useAuth'
import { useInfiniteApiResource, type InfiniteResourceSnapshot } from '../hooks/useInfiniteApiResource'
import { usePageNavigationSnapshot } from '../hooks/usePageNavigationSnapshot'
import { scrollRevealStateClass, scrollRevealTransitionClass, useScrollRevealBand } from '../hooks/useScrollRevealBand'
import { getNavigationSnapshot } from '../stores/navigationMemoryStore'
import type { Listing, PaginatedListings } from '../types/api'
import { withoutOwnListings } from '../utils/listingOwnership'
import { createRandomSeed, withBasePath } from '../utils/navigation'

type BaleNavigationSnapshot = {
  listings: InfiniteResourceSnapshot<Listing, PaginatedListings>
  search: string
  seed: string
  version: 1
}

function balePath(page: number, search: string, seed: string) {
  const query = new URLSearchParams(search)
  query.set('type', 'wholesale')
  if (!query.has('page')) query.set('page', '1')
  if (!query.has('limit')) query.set('limit', '85')
  if (!query.has('sort')) query.set('sort', 'relevance')
  query.set('page', String(page))
  query.set('seed', seed)
  return `/recommendations/feed?${query.toString()}`
}

export function BaleWholesalePage() {
  const { user } = useAuth()
  const search = window.location.search
  const query = useMemo(() => {
    const params = new URLSearchParams(search)
    params.set('type', 'wholesale')
    return params
  }, [search])
  const [restoredBales] = useState<BaleNavigationSnapshot | null>(() => {
    const snapshot = getNavigationSnapshot<BaleNavigationSnapshot>('bales')?.data
    return snapshot?.version === 1 && snapshot.search === search ? snapshot : null
  })
  const seedRef = useRef(restoredBales?.seed || createRandomSeed())
  const buildPath = useCallback((page: number) => balePath(page, search, seedRef.current), [search])
  const extractListings = useCallback((data: PaginatedListings) => data.results || [], [])
  const listings = useInfiniteApiResource(buildPath, extractListings, [search], restoredBales?.listings ?? null)
  usePageNavigationSnapshot<BaleNavigationSnapshot>({
    capture: () => ({ listings: listings.navigationSnapshot, search, seed: seedRef.current, version: 1 }),
    namespace: 'bales',
    ready: !listings.loading,
  })
  const filterBandVisible = useScrollRevealBand()
  const feedListings = useMemo(() => withoutOwnListings(listings.items, user), [listings.items, user])
  const resultCount = listings.total > 50 ? '50+' : String(listings.total)

  return (
    <AppShell active="browse">
      <CollectionHero description="Bulk and bale listings for sellers sourcing inventory without WhatsApp back-and-forth." title="Bale Wholesale" />
      <div className={`sticky top-16 z-40 mb-6 space-y-3 ${scrollRevealTransitionClass} ${scrollRevealStateClass(filterBandVisible)}`}>
        <div className="lg:pl-[19.5rem]">
          <BrowseSearchCombobox actionPath="/bales" className="mx-auto w-full max-w-2xl" key={query.get('q') || ''} query={query} />
        </div>
        <div className="lg:hidden">
          <MarketplaceFilters actionPath="/bales" hideType key={`mobile-${query.toString()}`} locationOptions={listings.data?.filters?.locations || []} query={query} />
        </div>
      </div>
      <div className="browse-layout grid min-w-0 items-start gap-6 lg:grid-cols-[18rem_minmax(0,1fr)]">
        <MarketplaceFilters actionPath="/bales" desktopOnly hideType key={`desktop-${query.toString()}`} locationOptions={listings.data?.filters?.locations || []} query={query} />
        <section aria-busy={listings.loading} className="browse-results lg:pb-24">
          {!listings.loading && !listings.error && (
            <div className="mb-4 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
              <h2 className="font-display text-xl font-semibold text-foose-text">Wholesale bales</h2>
              <div className="flex min-w-0 items-center gap-2">
                <MarketplaceSortControl actionPath="/bales" query={query} />
                <span className="whitespace-nowrap rounded-full bg-accent-light px-3 py-1.5 text-xs font-black text-accent">{resultCount} bales</span>
              </div>
            </div>
          )}
          <RefreshIndicator active={listings.refreshing} className="mb-4" label="Refreshing wholesale bales" />
          {listings.loading && !feedListings.length && <ProductGridSkeleton label="Loading wholesale bales" />}
          {listings.error && !feedListings.length && <StatePanel action={<button className="button inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border px-5 py-2.5 text-center text-sm font-bold transition disabled:pointer-events-none disabled:opacity-50 [&.full]:w-full button-secondary border-foose-border bg-foose-surface text-foose-text hover:border-accent hover:text-accent" onClick={listings.refetch} type="button">Try again</button>} body={listings.error} layout="section" title="Bale marketplace could not load" tone="error" />}
          {listings.error && !!feedListings.length && <InlineNotice action={<button className="font-black text-accent" onClick={listings.refetch} type="button">Retry</button>} tone="warning">Could not refresh the bale feed. Showing the listings already loaded.</InlineNotice>}
          {!listings.loading && !listings.error && !feedListings.length && (
            <StatePanel action={<a className="button inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border px-5 py-2.5 text-center text-sm font-bold transition disabled:pointer-events-none disabled:opacity-50 [&.full]:w-full button-secondary border-foose-border bg-foose-surface text-foose-text hover:border-accent hover:text-accent" href={withBasePath('/browse?type=retail')}>Browse retail items</a>} body="Wholesale bale listings will appear here when sellers post them." layout="section" title="No bales yet" tone="empty" />
          )}
          {!!feedListings.length && (
            <div className={PRODUCT_GRID_CLASS}>
              {feedListings.map((listing) => (
                <ProductCard key={listing._id} listing={listing} />
              ))}
            </div>
          )}
          <div ref={listings.sentinelRef} className="min-h-14 py-2">
            <AppendFeedback error={listings.loadMoreError} label="Loading more bales" loading={listings.loadingMore} retry={listings.retryLoadMore} />
          </div>
        </section>
      </div>
    </AppShell>
  )
}
