import { useState } from 'react'
import { AppShell, CategoryStrip, EmptyState, ErrorState, FilterPanel, Icon, LoadingState, ProductCard } from '../components'
import { useApiResource } from '../hooks/useApiResource'
import type { PaginatedListings } from '../types/api'
import { navigateTo } from '../utils/navigation'

function searchPath() {
  const query = new URLSearchParams(window.location.search)
  if (!query.has('page')) query.set('page', '1')
  if (!query.has('limit')) query.set('limit', '20')
  return `/search?${query.toString()}`
}

export function BrowsePage() {
  const query = new URLSearchParams(window.location.search)
  const listings = useApiResource<PaginatedListings>(searchPath())
  const [filtersOpen, setFiltersOpen] = useState(false)

  return (
    <AppShell active="browse" searchPlaceholder="Search curated thrift...">
      <CategoryStrip query={query} />
      <div className="browse-layout grid gap-5 lg:grid-cols-[240px_minmax(0,1fr)]">
        <div className={`filter-drawer hidden lg:block max-lg:fixed max-lg:bottom-0 max-lg:left-0 max-lg:top-16 max-lg:z-70 max-lg:block max-lg:w-[min(86vw,320px)] max-lg:-translate-x-full max-lg:overflow-y-auto max-lg:bg-foose-surface max-lg:p-4 max-lg:shadow-2xl max-lg:transition-transform max-lg:[&.open]:translate-x-0 ${filtersOpen ? 'open' : ''} `}>
          <FilterPanel query={query} />
        </div>
        {filtersOpen && <button className="filter-backdrop fixed inset-0 z-60 border-0 bg-black/35 lg:hidden" aria-label="Close filters" onClick={() => setFiltersOpen(false)} type="button" />}
        <section className="browse-results">
          <div className="browse-top [&_label]:text-sm [&_label]:font-semibold [&_label]:text-foose-text flex items-center justify-between gap-3 text-sm text-foose-muted">
            <div className="browse-count flex items-center justify-between gap-3 text-sm text-foose-muted">
              <button className="mobile-filter-button inline-flex items-center gap-2 rounded-lg border border-foose-border bg-foose-surface px-3 py-2 text-sm font-bold lg:hidden" onClick={() => setFiltersOpen(true)} type="button">
                <Icon name="filter" /> Filters
              </button>
              <strong>{listings.data?.total ?? 0} items found</strong>
            </div>
            <label>
              Sort by
              <select defaultValue={query.get('sort') || 'newest'} onChange={(event) => {
                query.set('sort', event.target.value)
                navigateTo(`/browse?${query.toString()}`)
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
            <EmptyState body="Try different filters or check back soon for new listings." title="No listings found" />
          )}
          {!!listings.data?.results.length && (
            <div className="masonry columns-2 gap-3 md:columns-3 lg:columns-4 [&_.product-card]:mb-4 [&_.product-card]:break-inside-avoid max-md:columns-2 max-md:gap-2">
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
