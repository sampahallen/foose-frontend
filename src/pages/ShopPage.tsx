import { useMemo } from 'react'
import { AppShell, Badge, EmptyState, ErrorState, Icon, LoadingState, ProductCard, ShopReviewPanel, TopFilterBar } from '../components'
import { useApiResource } from '../hooks/useApiResource'
import type { Listing, Shop } from '../types/api'
import { initials } from '../utils/format'
import { getCurrentAppPathname, withBasePath } from '../utils/navigation'

function currentShopSlug() {
  return decodeURIComponent(getCurrentAppPathname().replace(/^\/shops\/?/, '')).trim()
}

function currentQuery() {
  return new URLSearchParams(window.location.search)
}

function queryMatches(listing: Listing, query: URLSearchParams) {
  const search = (query.get('q') || '').trim().toLowerCase()

  if (search) {
    const haystack = [listing.title, listing.brand, listing.category, listing.description, listing.size]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
    if (!haystack.includes(search)) return false
  }

  if (query.get('type') && listing.type !== query.get('type')) return false
  if (query.get('category') && listing.category !== query.get('category')) return false
  if (query.get('brand') && listing.brand !== query.get('brand')) return false
  if (query.get('color') && listing.color !== query.get('color')) return false
  if (query.get('condition') && listing.condition !== query.get('condition')) return false

  return true
}

function sortListings(listings: Listing[], query: URLSearchParams) {
  const sort = query.get('sort') || 'newest'
  const items = [...listings]

  if (sort === 'price_asc') return items.sort((a, b) => a.price - b.price)
  if (sort === 'price_desc') return items.sort((a, b) => b.price - a.price)
  if (sort === 'popular') return items.sort((a, b) => (b.views || 0) - (a.views || 0))
  return items.sort((a, b) => (Date.parse(b.createdAt || '') || 0) - (Date.parse(a.createdAt || '') || 0))
}

export function ShopPage() {
  const slug = currentShopSlug()
  const query = currentQuery()
  const shop = useApiResource<{ shop: Shop }>(slug ? `/digishops/${slug}` : null)
  const listings = useApiResource<{ listings: Listing[] }>(
    shop.data?.shop._id ? `/listings/shop/${shop.data.shop._id}` : null,
    Boolean(shop.data?.shop._id),
  )
  const shopData = shop.data?.shop
  const filteredListings = useMemo(() => {
    const source = (listings.data?.listings || []).map((listing) =>
      shopData && typeof listing.shopId !== 'object' ? { ...listing, shopId: shopData } : listing,
    )
    return sortListings(source.filter((listing) => queryMatches(listing, query)), query)
  }, [listings.data?.listings, query, shopData])

  return (
    <AppShell active="browse" searchPlaceholder="Search marketplace...">
      <a className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-foose-muted hover:text-accent" href={withBasePath('/browse')}>
        <Icon name="arrow" /> Browse
      </a>
      {!slug && <EmptyState body="Open a DigiShop link to view its listings." title="Shop required" />}
      {shop.loading && <LoadingState label="Loading shop..." />}
      {shop.error && <ErrorState message={shop.error} retry={shop.refetch} />}
      {shopData && (
        <div className="grid gap-6 lg:h-[calc(100dvh-9rem)] lg:min-h-0 lg:grid-cols-[minmax(0,1fr)_320px] lg:overflow-hidden xl:grid-cols-[minmax(0,1fr)_360px]">
          <section className="min-w-0 lg:min-h-0 lg:overflow-y-auto lg:pr-2 lg:[scrollbar-width:none] lg:[&::-webkit-scrollbar]:hidden">
            <div className="relative z-50 mb-4 space-y-2">
              <p className="px-1 text-sm font-black text-foose-text">
                {filteredListings.length} {filteredListings.length === 1 ? 'item' : 'items'}
              </p>
              <TopFilterBar
                actionPath={`/shops/${slug}`}
                hideLocation
                hidePriceAndSize
                query={query}
                resultLabel={`${filteredListings.length} ${filteredListings.length === 1 ? 'item' : 'items'}`}
                resultLabelVariant="plain"
                showResultLabel={false}
              />
            </div>
            <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h1 className="text-2xl font-black text-foose-text md:text-4xl">Shop listings</h1>
                <p className="text-sm text-foose-muted">Active marketplace items from {shopData.shopName}.</p>
              </div>
            </div>
            {listings.loading && <LoadingState label="Loading listings..." />}
            {listings.error && <ErrorState message={listings.error} retry={listings.refetch} />}
            {!listings.loading && !listings.error && !filteredListings.length && (
              <EmptyState body="No listings match these filters yet." title="No listings" />
            )}
            {!!filteredListings.length && (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 [&_.product-card]:min-w-0">
                {filteredListings.map((listing) => (
                  <ProductCard key={listing._id} listing={listing} />
                ))}
              </div>
            )}
          </section>

          <aside className="lg:min-h-0 lg:overflow-y-auto lg:[scrollbar-width:none] lg:[&::-webkit-scrollbar]:hidden">
            <section className="overflow-hidden rounded-xl border border-foose-border bg-foose-surface shadow-sm">
              <div className="h-32 bg-foose-surface-mid [&_img]:h-full [&_img]:w-full [&_img]:object-cover">
                {shopData.bannerUrl ? <img alt="" src={shopData.bannerUrl} /> : <span className="flex h-full items-center justify-center text-sm font-semibold text-foose-faint">DigiShop</span>}
              </div>
              <div className="p-5">
                {shopData.logoUrl ? (
                  <img alt="" className="-mt-14 mb-3 size-20 rounded-full border-4 border-white object-cover" src={shopData.logoUrl} />
                ) : (
                  <span className="-mt-14 mb-3 inline-flex size-20 items-center justify-center rounded-full border-4 border-white bg-accent-light text-lg font-black text-accent">{initials(shopData.shopName)}</span>
                )}
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <h2 className="text-2xl font-black text-foose-text">{shopData.shopName}</h2>
                  {shopData.category && <Badge tone="accent">{shopData.category}</Badge>}
                </div>
                <p className="text-sm leading-6 text-foose-muted">{shopData.bio || 'This DigiShop has not added a bio yet.'}</p>
                <div className="mt-4 rounded-lg bg-foose-surface-low p-3 text-sm">
                  <strong className="text-foose-text">{shopData.rating || 0} / 5</strong>
                  <span className="ml-2 text-foose-muted">{shopData.totalReviews || 0} reviews</span>
                </div>
                <ShopReviewPanel className="mt-5 border-t border-foose-border pt-4" limit={5} shopId={shopData._id} shopName={shopData.shopName} title="Shop reviews" />
              </div>
            </section>
          </aside>
        </div>
      )}
    </AppShell>
  )
}
