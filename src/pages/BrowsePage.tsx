/* eslint-disable react-hooks/refs -- the infinite-resource hook exposes reactive state through a stable facade */
import { useCallback, useMemo, useRef, useState } from 'react'
import { AppShell, BrowseSearchCombobox, InlineNotice, ListingTypeToggle, MarketplaceFilters, MarketplaceSortControl, ProductCard, RefreshIndicator, StatePanel } from '../components'
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

type BrowseNavigationSnapshot = {
  listings: InfiniteResourceSnapshot<Listing, PaginatedListings>
  search: string
  seed: string
  version: 1
}

function searchPath(page: number, search: string, seed: string) {
  const query = new URLSearchParams(search)
  if (!query.has('page')) query.set('page', '1')
  if (!query.has('limit')) query.set('limit', '85')
  if (!query.has('type')) query.set('type', 'retail')
  if (!query.has('sort')) query.set('sort', 'relevance')
  query.set('page', String(page))
  query.set('seed', seed)
  return `/recommendations/feed?${query.toString()}`
}

export function BrowsePage() {
  const { user } = useAuth()
  const search = window.location.search
  const query = useMemo(() => new URLSearchParams(search), [search])
  const activeMode = query.get('type') === 'wholesale' ? 'wholesale' : 'retail'
  const [restoredBrowse] = useState<BrowseNavigationSnapshot | null>(() => {
    const snapshot = getNavigationSnapshot<BrowseNavigationSnapshot>('browse')?.data
    return snapshot?.version === 1 && snapshot.search === search ? snapshot : null
  })
  const seedRef = useRef(restoredBrowse?.seed || createRandomSeed())
  const buildPath = useCallback((page: number) => searchPath(page, search, seedRef.current), [search])
  const extractListings = useCallback((data: PaginatedListings) => data.results || [], [])
  const listings = useInfiniteApiResource(buildPath, extractListings, [search], restoredBrowse?.listings ?? null)
  usePageNavigationSnapshot<BrowseNavigationSnapshot>({
    capture: () => ({ listings: listings.navigationSnapshot, search, seed: seedRef.current, version: 1 }),
    namespace: 'browse',
    ready: !listings.loading,
  })
  const filterBandVisible = useScrollRevealBand()
  const feedListings = useMemo(() => withoutOwnListings(listings.items, user), [listings.items, user])
  const hasSearchQuery = Boolean(query.get('q')?.trim())
  const resultCount = listings.total > 50 ? '50+' : String(listings.total)
  const modeLabel = activeMode === 'wholesale' ? 'Bale marketplace' : 'Retail marketplace'

  return (
    <AppShell active="browse">
      <div className="relative mb-5 overflow-hidden rounded-[28px] border border-foose-border/60 bg-foose-surface px-5 py-7 shadow-sm sm:px-8 sm:py-9 lg:px-10">
        <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-28 size-72 rounded-full bg-accent-light/80 blur-3xl sm:size-96" />
        <div className="relative max-w-2xl">
          <p className="mb-3 text-[11px] font-black uppercase tracking-[0.22em] text-accent">The Foose marketplace</p>
          <h1 className="font-display text-[clamp(2rem,4.5vw,3.7rem)] font-bold leading-[1.07] tracking-[-0.045em] text-foose-text">Find a piece with a story.</h1>
          <p className="mt-3 text-sm leading-6 text-foose-muted sm:text-base">Shop pre-loved finds from independent sellers, or source bales for your shop.</p>
        </div>
      </div>
      <div className={`sticky top-16 z-40 mb-7 space-y-3 rounded-[22px] border border-foose-border/60 bg-foose-bg/95 p-3 shadow-sm backdrop-blur lg:top-[78px] ${scrollRevealTransitionClass} ${scrollRevealStateClass(filterBandVisible)}`}>
        <div className="space-y-3 lg:pl-[19.5rem]">
          <BrowseSearchCombobox actionPath="/browse" className="mx-auto w-full max-w-2xl" key={query.get('q') || ''} query={query} />
          <ListingTypeToggle actionPath="/browse" activeMode={activeMode} search={search} />
        </div>
        <div className="lg:hidden">
          <MarketplaceFilters actionPath="/browse" hideType key={`mobile-${query.toString()}`} locationOptions={listings.data?.filters?.locations || []} query={query} />
        </div>
      </div>
      <div className="browse-layout grid min-w-0 items-start gap-6 lg:grid-cols-[18rem_minmax(0,1fr)]">
        <MarketplaceFilters actionPath="/browse" desktopOnly hideType key={`desktop-${query.toString()}`} locationOptions={listings.data?.filters?.locations || []} query={query} stackedToolbar />
        <section aria-busy={listings.loading} className="browse-results lg:pb-24">
          <div className="mb-6 flex flex-col items-start justify-between gap-3 border-b border-foose-border/70 pb-5 sm:flex-row sm:items-end">
            <div>
              <p className="mb-1 text-[11px] font-black uppercase tracking-[0.16em] text-accent">{modeLabel}</p>
              <h2 className="font-display text-2xl font-bold tracking-tight text-foose-text sm:text-3xl">{hasSearchQuery ? `Results for “${query.get('q')?.trim()}”` : activeMode === 'wholesale' ? 'Bales for your business' : 'The latest finds'}</h2>
              {!listings.loading && !listings.error && <p className="mt-1.5 text-sm text-foose-muted">{resultCount} {activeMode === 'wholesale' ? 'bales' : 'items'} to explore</p>}
            </div>
            <MarketplaceSortControl actionPath="/browse" query={query} />
          </div>
          <RefreshIndicator active={listings.refreshing} className="mb-4" label="Refreshing marketplace listings" />
          {listings.loading && !feedListings.length && <ProductGridSkeleton label={hasSearchQuery ? 'Searching marketplace' : 'Loading marketplace'} variant="catalog" />}
          {listings.error && !feedListings.length && (
            <StatePanel action={<button className="button inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border px-5 py-2.5 text-center text-sm font-bold transition disabled:pointer-events-none disabled:opacity-50 [&.full]:w-full button-secondary border-foose-border bg-foose-surface text-foose-text hover:border-accent hover:text-accent" onClick={listings.refetch} type="button">Try again</button>} body={listings.error} layout="section" title="Marketplace could not load" tone="error" />
          )}
          {listings.error && !!feedListings.length && <InlineNotice action={<button className="font-black text-accent" onClick={listings.refetch} type="button">Retry</button>} tone="warning">The latest marketplace update failed. Your current results are still here.</InlineNotice>}
          {!listings.loading && !listings.error && !feedListings.length && (
            <StatePanel
              action={<a className="button inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border px-5 py-2.5 text-center text-sm font-bold transition disabled:pointer-events-none disabled:opacity-50 [&.full]:w-full button-secondary border-foose-border bg-foose-surface text-foose-text hover:border-accent hover:text-accent" href={withBasePath(activeMode === 'wholesale' ? '/browse?type=wholesale' : '/browse?type=retail')}>Clear search and filters</a>}
              body={hasSearchQuery ? `No ${activeMode === 'wholesale' ? 'bales' : 'items'} match “${query.get('q')}”. Try a shorter search or clear a filter.` : `There are no active ${activeMode === 'wholesale' ? 'bales' : 'items'} for these filters yet.`}
              layout="section"
              title="No marketplace matches"
              tone="empty"
            />
          )}
          {!!feedListings.length && (
            <div className={`${PRODUCT_GRID_CLASS} sm:gap-x-4 sm:gap-y-7`}>
              {feedListings.map((listing) => (
                <ProductCard key={listing._id} listing={listing} variant="catalog" />
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
