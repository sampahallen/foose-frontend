import { useCallback, useMemo } from 'react'
import { AppShell, EmptyState, ErrorState, LoadingState, ProductCard, SectionHeader, TopFilterBar } from '../components'
import { useAuth } from '../hooks/useAuth'
import { useInfiniteApiResource } from '../hooks/useInfiniteApiResource'
import { useScrollRevealBand } from '../hooks/useScrollRevealBand'
import type { PaginatedListings } from '../types/api'
import { withoutOwnListings } from '../utils/listingOwnership'

function balePath(page: number, search: string) {
  const query = new URLSearchParams(search)
  query.set('type', 'wholesale')
  if (!query.has('limit')) query.set('limit', '20')
  query.set('page', String(page))
  return `/search?${query.toString()}`
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
      {listings.loading && <LoadingState label="Loading bales..." />}
      {listings.error && <ErrorState message={listings.error} retry={listings.refetch} />}
      {!listings.loading && !listings.error && !feedListings.length && (
        <EmptyState body="Wholesale bale listings will appear here when sellers post them." title="No bales yet" />
      )}
      {!!feedListings.length && (
        <div className="grid grid-cols-2 gap-x-2 gap-y-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {feedListings.map((listing) => (
            <ProductCard key={listing._id} listing={listing} />
          ))}
        </div>
      )}
      <div ref={listings.sentinelRef} className="flex min-h-14 items-center justify-center py-4">
        {listings.loadingMore && <span className="size-6 animate-spin rounded-full border-2 border-foose-border border-t-accent" aria-label="Loading more bales" />}
      </div>
    </AppShell>
  )
}
