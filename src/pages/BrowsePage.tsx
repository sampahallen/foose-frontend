import { AppShell, EmptyState, ErrorState, FilterPanel, LoadingState, ProductCard } from '../components'
import { useApiResource } from '../hooks/useApiResource'
import type { PaginatedListings } from '../types/api'

function searchPath() {
  const query = new URLSearchParams(window.location.search)
  if (!query.has('page')) query.set('page', '1')
  if (!query.has('limit')) query.set('limit', '20')
  return `/search?${query.toString()}`
}

export function BrowsePage() {
  const query = new URLSearchParams(window.location.search)
  const listings = useApiResource<PaginatedListings>(searchPath())

  return (
    <AppShell active="browse" searchPlaceholder="Search curated thrift...">
      <div className="browse-layout">
        <FilterPanel query={query} />
        <section className="browse-results">
          <div className="browse-top">
            <strong>{listings.data?.total ?? 0} items found</strong>
            <label>
              Sort by
              <select defaultValue={query.get('sort') || 'newest'} onChange={(event) => {
                query.set('sort', event.target.value)
                window.location.href = `/browse?${query.toString()}`
              }}>
                <option value="newest">Newest first</option>
                <option value="price_desc">Price high to low</option>
                <option value="price_asc">Price low to high</option>
                <option value="popular">Popular</option>
              </select>
            </label>
          </div>
          {listings.loading && <LoadingState label="Loading marketplace..." />}
          {listings.error && <ErrorState message={listings.error} retry={listings.refetch} />}
          {!listings.loading && !listings.error && !listings.data?.results.length && (
            <EmptyState body="No API listings match this search yet." title="No listings found" />
          )}
          {!!listings.data?.results.length && (
            <div className="masonry">
              {listings.data.results.map((listing) => (
                <ProductCard key={listing._id} listing={listing} />
              ))}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  )
}
