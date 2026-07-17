import { useMemo } from 'react'
import { AppShell, InlineNotice, ProductCard, RefreshIndicator, SectionHeader, StatePanel } from '../components'
import { ProductGridSkeleton } from '../components/feedback/DiscoverySkeletons'
import { useAuth } from '../hooks/useAuth'
import { useApiResource } from '../hooks/useApiResource'
import type { Listing, PaginatedListings } from '../types/api'
import { withoutOwnListings } from '../utils/listingOwnership'
import { withBasePath } from '../utils/navigation'

function isWithinLastFiveDays(listing: Listing) {
  const createdAt = Date.parse(listing.createdAt || '')
  if (!createdAt) return false
  return Date.now() - createdAt <= 5 * 24 * 60 * 60 * 1000
}

export function FreshDropsPage() {
  const { user } = useAuth()
  const listings = useApiResource<PaginatedListings>('/search/items?sort=newest&page=1&limit=60')
  const sourceItems = useMemo(() => withoutOwnListings(listings.data?.results || [], user), [listings.data?.results, user])
  const recentItems = useMemo(() => sourceItems.filter(isWithinLastFiveDays), [sourceItems])
  const displayItems = recentItems.length ? recentItems : sourceItems
  const usingFallback = Boolean(sourceItems.length && !recentItems.length)

  return (
    <AppShell active="browse" searchPlaceholder="Search fresh drops...">
      <section className="mb-8 rounded-2xl bg-foose-surface p-5 md:p-8">
        <h1 className="text-3xl font-black text-foose-text md:text-5xl">Fresh Drops</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-foose-muted md:text-base">
          The newest listings from the last 5 days. If the week is quiet, we keep the most recently posted finds here.
        </p>
      </section>

      <SectionHeader
        title={usingFallback ? 'Most recent listings' : 'Last 5 days'}
        eyebrow={usingFallback ? 'No listings were posted in the last 5 days, so these are the latest available.' : `${displayItems.length} recent drops`}
      />
      <RefreshIndicator active={listings.refreshing} className="mb-4" label="Refreshing fresh drops" />
      {listings.initialLoading && <ProductGridSkeleton label="Loading fresh drops" />}
      {listings.error && !displayItems.length && <StatePanel action={<button className="button button-secondary" onClick={listings.refetch} type="button">Try again</button>} body={listings.error} layout="section" title="Fresh drops could not load" tone="error" />}
      {listings.error && !!displayItems.length && <InlineNotice action={<button className="font-black text-accent" onClick={listings.refetch} type="button">Retry</button>} tone="warning">Fresh drops could not refresh. Showing the most recently loaded items.</InlineNotice>}
      {!listings.loading && !listings.error && !displayItems.length && (
        <StatePanel action={<a className="button button-secondary" href={withBasePath('/browse')}>Browse all items</a>} body="Fresh listings will appear here as sellers publish them." layout="section" title="No fresh drops yet" tone="empty" />
      )}
      {!!displayItems.length && (
        <div className="grid grid-cols-2 gap-x-2 gap-y-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {displayItems.map((listing) => (
            <ProductCard key={listing._id} listing={listing} />
          ))}
        </div>
      )}
    </AppShell>
  )
}
