import { useCallback, useMemo } from 'react'
import { AppShell, EmptyState, ErrorState, LoadingState, ProductCard, TopFilterBar } from '../components'
import { useAuth } from '../hooks/useAuth'
import { useInfiniteApiResource } from '../hooks/useInfiniteApiResource'
import { useScrollRevealBand } from '../hooks/useScrollRevealBand'
import type { PaginatedListings } from '../types/api'
import { withoutOwnListings } from '../utils/listingOwnership'
import { withBasePath } from '../utils/navigation'

function searchPath(page: number, search: string) {
  const query = new URLSearchParams(search)
  if (!query.has('page')) query.set('page', '1')
  if (!query.has('limit')) query.set('limit', '20')
  if (!query.has('type')) query.set('type', 'retail')
  query.set('page', String(page))
  return `/search?${query.toString()}`
}

function modeHref(mode: 'retail' | 'wholesale', search: string) {
  const query = new URLSearchParams(search)
  query.set('type', mode)
  query.delete('page')
  return withBasePath(`/browse?${query.toString()}`)
}

export function BrowsePage() {
  const { user } = useAuth()
  const search = window.location.search
  const query = useMemo(() => new URLSearchParams(search), [search])
  const activeMode = query.get('type') === 'wholesale' ? 'wholesale' : 'retail'
  const buildPath = useCallback((page: number) => searchPath(page, search), [search])
  const extractListings = useCallback((data: PaginatedListings) => data.results || [], [])
  const listings = useInfiniteApiResource(buildPath, extractListings, [search])
  const filterBandVisible = useScrollRevealBand()
  const feedListings = useMemo(() => withoutOwnListings(listings.items, user), [listings.items, user])

  return (
    <AppShell active="browse" searchPlaceholder="Search curated thrift...">
      <div className={`sticky top-16 z-40 mb-6 space-y-3 transition duration-200 ${filterBandVisible ? 'translate-y-0 opacity-100' : 'pointer-events-none -translate-y-full opacity-0'}`}>
        <nav className="flex items-center justify-center border-b border-foose-border bg-foose-bg/95 py-2 backdrop-blur" aria-label="Browse listing type">
          <div className="flex w-full max-w-md items-center justify-between gap-4 text-sm font-black">
            <a className={`border-b-2 px-4 py-2 transition ${activeMode === 'retail' ? 'border-accent text-accent' : 'border-transparent text-foose-muted hover:text-accent'}`} href={modeHref('retail', search)}>
              Retail
            </a>
            <a className={`border-b-2 px-4 py-2 transition ${activeMode === 'wholesale' ? 'border-accent text-accent' : 'border-transparent text-foose-muted hover:text-accent'}`} href={modeHref('wholesale', search)}>
              Bale
            </a>
          </div>
        </nav>
        <TopFilterBar hideType query={query} resultLabel={`${listings.total} ${activeMode === 'wholesale' ? 'bales' : 'items'}`} />
      </div>
      <div className="browse-layout">
        <section className="browse-results">
          {listings.loading && <LoadingState label="Loading marketplace..." />}
          {listings.error && <ErrorState message={listings.error} retry={listings.refetch} />}
          {!listings.loading && !listings.error && !feedListings.length && (
            <EmptyState body="Try different filters or check back soon for new listings." title="No listings found" />
          )}
          {!!feedListings.length && (
            <div className="masonry grid grid-cols-2 gap-x-2 gap-y-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {feedListings.map((listing) => (
                <ProductCard key={listing._id} listing={listing} />
              ))}
            </div>
          )}
          <div ref={listings.sentinelRef} className="flex min-h-14 items-center justify-center py-4">
            {listings.loadingMore && <span className="size-6 animate-spin rounded-full border-2 border-foose-border border-t-accent" aria-label="Loading more listings" />}
          </div>
        </section>
      </div>
    </AppShell>
  )
}
