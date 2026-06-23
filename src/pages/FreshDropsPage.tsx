import { useMemo } from 'react'
import { AppShell, EmptyState, ErrorState, LoadingState, ProductCard, SectionHeader } from '../components'
import { useAuth } from '../hooks/useAuth'
import { useApiResource } from '../hooks/useApiResource'
import type { Listing, PaginatedListings } from '../types/api'
import { withoutOwnListings } from '../utils/listingOwnership'

function isWithinLastFiveDays(listing: Listing) {
  const createdAt = Date.parse(listing.createdAt || '')
  if (!createdAt) return false
  return Date.now() - createdAt <= 5 * 24 * 60 * 60 * 1000
}

export function FreshDropsPage() {
  const { user } = useAuth()
  const listings = useApiResource<PaginatedListings>('/search?sort=newest&page=1&limit=60')
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
      {listings.loading && <LoadingState label="Loading fresh drops..." />}
      {listings.error && <ErrorState message={listings.error} retry={listings.refetch} />}
      {!listings.loading && !listings.error && !displayItems.length && (
        <EmptyState body="Fresh listings will appear here as sellers publish them." title="No fresh drops yet" />
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
