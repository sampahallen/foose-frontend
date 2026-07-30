/* eslint-disable react-hooks/refs -- the infinite-resource hook exposes reactive state through a stable facade */
import { useCallback, useMemo } from 'react'
import { AppShell, InlineNotice, MarketplaceFilters, ProductCard, RefreshIndicator, SectionHeader, StatePanel } from '../components'
import { AppendFeedback, ProductGridSkeleton } from '../components/feedback/DiscoverySkeletons'
import { useAuth } from '../hooks/useAuth'
import { useInfiniteApiResource } from '../hooks/useInfiniteApiResource'
import type { PaginatedListings } from '../types/api'
import { withoutOwnListings } from '../utils/listingOwnership'
import { withBasePath } from '../utils/navigation'

function balePath(page: number, search: string) {
  const query = new URLSearchParams(search)
  query.set('type', 'wholesale')
  if (!query.has('limit')) query.set('limit', '85')
  query.set('page', String(page))
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
  const buildPath = useCallback((page: number) => balePath(page, search), [search])
  const extractListings = useCallback((data: PaginatedListings) => data.results || [], [])
  const listings = useInfiniteApiResource(buildPath, extractListings, [search])
  const feedListings = useMemo(() => withoutOwnListings(listings.items, user), [listings.items, user])

  return (
    <AppShell active="browse" searchPlaceholder="Search bales...">
      <section className="mb-8 rounded-2xl bg-foose-surface p-5 md:p-8">
        <h1 className="text-3xl font-black text-foose-text md:text-5xl">Bale Wholesale</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-foose-muted md:text-base">
          Bulk and bale listings for sellers sourcing inventory without WhatsApp back-and-forth.
        </p>
      </section>
      <div className="mb-6 lg:hidden">
        <MarketplaceFilters actionPath="/bales" hideType key={`mobile-${query.toString()}`} locationOptions={listings.data?.filters?.locations || []} query={query} />
      </div>
      <div className="browse-layout grid min-w-0 items-start gap-6 lg:grid-cols-[18rem_minmax(0,1fr)]">
        <MarketplaceFilters actionPath="/bales" desktopOnly hideType key={`desktop-${query.toString()}`} locationOptions={listings.data?.filters?.locations || []} query={query} />
        <section className="browse-results">
          <SectionHeader title="Wholesale bales" eyebrow={`Active bale listings from Foose DigiShops · ${listings.total} bales`} />
          <RefreshIndicator active={listings.refreshing} className="mb-4" label="Refreshing wholesale bales" />
          {listings.loading && !feedListings.length && <ProductGridSkeleton label="Loading wholesale bales" />}
          {listings.error && !feedListings.length && <StatePanel action={<button className="button button-secondary" onClick={listings.refetch} type="button">Try again</button>} body={listings.error} layout="section" title="Bale marketplace could not load" tone="error" />}
          {listings.error && !!feedListings.length && <InlineNotice action={<button className="font-black text-accent" onClick={listings.refetch} type="button">Retry</button>} tone="warning">Could not refresh the bale feed. Showing the listings already loaded.</InlineNotice>}
          {!listings.loading && !listings.error && !feedListings.length && (
            <StatePanel action={<a className="button button-secondary" href={withBasePath('/browse?type=retail')}>Browse retail items</a>} body="Wholesale bale listings will appear here when sellers post them." layout="section" title="No bales yet" tone="empty" />
          )}
          {!!feedListings.length && (
            <div className="grid grid-cols-2 gap-x-2 gap-y-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4">
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
