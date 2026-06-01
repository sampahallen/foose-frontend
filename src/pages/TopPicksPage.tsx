import { useState } from 'react'
import { AppShell, CategoryStrip, EmptyState, ErrorState, FilterPanel, Icon, LoadingState, ProductCard, SectionHeader } from '../components'
import { useApiResource } from '../hooks/useApiResource'
import type { PaginatedListings } from '../types/api'
import { navigateTo } from '../utils/navigation'

function topPicksPath() {
  const query = new URLSearchParams(window.location.search)
  if (!query.has('page')) query.set('page', '1')
  if (!query.has('limit')) query.set('limit', '20')
  return `/search/top-picks?${query.toString()}`
}

export function TopPicksPage() {
  const query = new URLSearchParams(window.location.search)
  const listings = useApiResource<PaginatedListings>(topPicksPath())
  const [filtersOpen, setFiltersOpen] = useState(false)

  return (
    <AppShell active="browse" searchPlaceholder="Search top picks...">
      <section className="page-hero small top-picks-hero">
        <h1>Top Picks</h1>
        <p>Promoted finds from Foose sellers, curated into one faster shopping lane.</p>
      </section>
      <CategoryStrip basePath="/top-picks" query={query} />
      <div className="browse-layout">
        <div className={`filter-drawer ${filtersOpen ? 'open' : ''}`}>
          <FilterPanel actionPath="/top-picks" query={query} />
        </div>
        {filtersOpen && <button className="filter-backdrop" aria-label="Close filters" onClick={() => setFiltersOpen(false)} type="button" />}
        <section className="browse-results">
          <div className="browse-top">
            <div className="browse-count">
              <button className="mobile-filter-button" onClick={() => setFiltersOpen(true)} type="button">
                <Icon name="filter" /> Filters
              </button>
              <strong>{listings.data?.total ?? 0} promoted picks found</strong>
            </div>
            <label>
              Sort by
              <select
                defaultValue={query.get('sort') || 'newest'}
                onChange={(event) => {
                  query.set('sort', event.target.value)
                  navigateTo(`/top-picks?${query.toString()}`)
                }}
              >
                <option value="newest">Newest first</option>
                <option value="price_desc">Price high to low</option>
                <option value="price_asc">Price low to high</option>
                <option value="popular">Popular</option>
              </select>
            </label>
          </div>
          <SectionHeader title="Promoted items" eyebrow="Listings marked for Top Picks placement." />
          {listings.loading && <LoadingState label="Loading top picks..." />}
          {listings.error && <ErrorState message={listings.error} retry={listings.refetch} />}
          {!listings.loading && !listings.error && !listings.data?.results.length && (
            <EmptyState body="Top Picks will appear when promoted listings are active." title="No top picks yet" />
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
