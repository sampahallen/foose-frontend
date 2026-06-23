import { useCallback, useMemo } from 'react'
import { AppShell, EmptyState, ErrorState, LoadingState, ProductCard, SectionHeader, TopFilterBar } from '../components'
import { useAuth } from '../hooks/useAuth'
import { useInfiniteApiResource } from '../hooks/useInfiniteApiResource'
import { useScrollRevealBand } from '../hooks/useScrollRevealBand'
import type { PaginatedListings } from '../types/api'
import { withoutOwnListings } from '../utils/listingOwnership'

function topPicksPath(page: number, search: string) {
  const query = new URLSearchParams(search)
  if (!query.has('page')) query.set('page', '1')
  if (!query.has('limit')) query.set('limit', '20')
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
    <AppShell active="browse" searchPlaceholder="Search top picks...">
      <section className="page-hero [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:md:text-4xl [&_p]:text-sm [&_p]:leading-6 [&_p]:text-foose-muted [&_p]:md:text-base mb-8 rounded-xl border border-foose-border bg-foose-surface p-5 md:p-8 [&.small]:py-6 max-md:[&_h1]:text-2xl small top-picks-hero">
        <h1>Top Picks</h1>
        <p>Promoted finds from Foose sellers, curated into one faster shopping lane.</p>
      </section>
      <div className={`sticky top-16 z-40 mb-6 transition duration-200 ${filterBandVisible ? 'translate-y-0 opacity-100' : 'pointer-events-none -translate-y-full opacity-0'}`}>
        <TopFilterBar actionPath="/top-picks" query={query} resultLabel={`${listings.total} picks`} />
      </div>
      <div className="browse-layout">
        <section className="browse-results">
          <SectionHeader title="Promoted items" eyebrow="Listings marked for Top Picks placement." />
          {listings.loading && <LoadingState label="Loading top picks..." />}
          {listings.error && <ErrorState message={listings.error} retry={listings.refetch} />}
          {!listings.loading && !listings.error && !feedListings.length && (
            <EmptyState body="Top Picks will appear when promoted listings are active." title="No top picks yet" />
          )}
          {!!feedListings.length && (
            <div className="masonry grid grid-cols-2 gap-x-2 gap-y-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {feedListings.map((listing) => (
                <ProductCard key={listing._id} listing={listing} />
              ))}
            </div>
          )}
          <div ref={listings.sentinelRef} className="flex min-h-14 items-center justify-center py-4">
            {listings.loadingMore && <span className="size-6 animate-spin rounded-full border-2 border-foose-border border-t-accent" aria-label="Loading more top picks" />}
          </div>
        </section>
      </div>
    </AppShell>
  )
}
