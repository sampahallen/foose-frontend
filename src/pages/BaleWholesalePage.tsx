/* eslint-disable react-hooks/refs -- the infinite-resource hook exposes reactive state through a stable facade */
import { useCallback, useMemo } from 'react'
import { AppShell, InlineNotice, ProductCard, RefreshIndicator, SectionHeader, StatePanel, TopFilterBar } from '../components'
import { AppendFeedback, ProductGridSkeleton } from '../components/feedback/DiscoverySkeletons'
import { useAuth } from '../hooks/useAuth'
import { useInfiniteApiResource } from '../hooks/useInfiniteApiResource'
import { useScrollRevealBand } from '../hooks/useScrollRevealBand'
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
  const filterBandVisible = useScrollRevealBand()
  const feedListings = useMemo(() => withoutOwnListings(listings.items, user), [listings.items, user])

  return (
    <AppShell active="browse" searchPlaceholder="Search bales...">
      <section className="mb-8 rounded-2xl bg-foose-surface p-5 md:p-8">
        <h1 className="text-3xl font-black text-foose-text md:text-5xl">Bale Wholesale</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-foose-muted md:text-base">
          Bulk and bale listings for sellers sourcing inventory without WhatsApp back-and-forth.
        </p>
      </section>
      <div className={`sticky top-16 z-40 mb-6 transition duration-200 ${filterBandVisible ? 'translate-y-0 opacity-100' : 'pointer-events-none -translate-y-full opacity-0'}`}>
        <TopFilterBar actionPath="/bales" hideType locationOptions={listings.data?.filters?.locations || []} query={query} resultLabel={`${listings.total} bales`} />
      </div>
      <SectionHeader title="Wholesale bales" eyebrow="Active bale listings from Foose DigiShops." />
      <RefreshIndicator active={listings.refreshing} className="mb-4" label="Refreshing wholesale bales" />
      {listings.loading && !feedListings.length && <ProductGridSkeleton label="Loading wholesale bales" />}
      {listings.error && !feedListings.length && <StatePanel action={<button className="button button-secondary" onClick={listings.refetch} type="button">Try again</button>} body={listings.error} layout="section" title="Bale marketplace could not load" tone="error" />}
      {listings.error && !!feedListings.length && <InlineNotice action={<button className="font-black text-accent" onClick={listings.refetch} type="button">Retry</button>} tone="warning">Could not refresh the bale feed. Showing the listings already loaded.</InlineNotice>}
      {!listings.loading && !listings.error && !feedListings.length && (
        <StatePanel action={<a className="button button-secondary" href={withBasePath('/browse?type=retail')}>Browse retail items</a>} body="Wholesale bale listings will appear here when sellers post them." layout="section" title="No bales yet" tone="empty" />
      )}
      {!!feedListings.length && (
        <div className="grid grid-cols-2 gap-x-2 gap-y-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {feedListings.map((listing) => (
            <ProductCard key={listing._id} listing={listing} />
          ))}
        </div>
      )}
      <div ref={listings.sentinelRef} className="min-h-14 py-2">
        <AppendFeedback error={listings.loadMoreError} label="Loading more bales" loading={listings.loadingMore} retry={listings.retryLoadMore} />
      </div>
    </AppShell>
  )
}
