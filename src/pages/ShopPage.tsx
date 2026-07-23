import { useMemo } from 'react'
import { AppShell, Badge, InlineNotice, ProductCard, RefreshIndicator, SafeImage, ShopReviewPanel, StatePanel, TopFilterBar } from '../components'
import { ProductGridSkeleton, ShopDetailSkeleton } from '../components/feedback/DiscoverySkeletons'
import { DiscoveryImage } from '../components/feedback/DiscoveryMedia'
import { NavigationBackButton } from '../components/navigation'
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
      <NavigationBackButton className="mb-6" fallback={{ href: '/digishops', label: 'DigiShops' }} />
      {!slug && <StatePanel action={<a className="button button-secondary" href={withBasePath('/digishops')}>Browse DigiShops</a>} body="This link does not identify a DigiShop." layout="page" title="Shop link is incomplete" tone="unavailable" />}
      {shop.initialLoading && <ShopDetailSkeleton />}
      <RefreshIndicator active={shop.refreshing || listings.refreshing} className="mb-4" label="Refreshing DigiShop" />
      {shop.error && <StatePanel action={<button className="button button-secondary" onClick={shop.refetch} type="button">Try again</button>} body={shop.error} layout="page" title={shop.errorMeta?.status === 404 ? 'This DigiShop is unavailable' : 'DigiShop could not load'} tone={shop.errorMeta?.status === 403 ? 'permission' : shop.errorMeta?.status === 404 ? 'unavailable' : 'error'} />}
      {shopData && (
        <div className="grid gap-6 lg:h-[calc(100dvh-9rem)] lg:min-h-0 lg:grid-cols-[minmax(0,1fr)_320px] lg:overflow-hidden xl:grid-cols-[minmax(0,1fr)_360px]">
          <section className="order-2 min-w-0 lg:order-1 lg:min-h-0 lg:overflow-y-auto lg:pr-2 lg:[scrollbar-width:none] lg:[&::-webkit-scrollbar]:hidden">
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
            {listings.initialLoading && <ProductGridSkeleton count={8} label={`Loading ${shopData.shopName} listings`} />}
            {listings.error && !filteredListings.length && <StatePanel action={<button className="button button-secondary" onClick={listings.refetch} type="button">Retry listings</button>} body={listings.error} layout="section" title="Shop listings could not load" tone="error" />}
            {listings.error && !!filteredListings.length && <InlineNotice action={<button className="font-black text-accent" onClick={listings.refetch} type="button">Retry</button>} tone="warning">Could not refresh this catalog. Showing its current listings.</InlineNotice>}
            {!listings.loading && !listings.error && !filteredListings.length && (
              <StatePanel action={<a className="button button-secondary" href={withBasePath(`/shops/${slug}`)}>Clear shop filters</a>} body={query.toString() ? 'No active listings match the selected shop filters.' : 'This DigiShop has not published an active listing yet.'} layout="section" title={query.toString() ? 'No matching shop items' : 'Shop shelves are empty'} tone="empty" />
            )}
            {!!filteredListings.length && (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 [&_.product-card]:min-w-0">
                {filteredListings.map((listing) => (
                  <ProductCard key={listing._id} listing={listing} />
                ))}
              </div>
            )}
          </section>

          <aside className="order-1 lg:order-2 lg:min-h-0 lg:overflow-y-auto lg:[scrollbar-width:none] lg:[&::-webkit-scrollbar]:hidden">
            <section className="overflow-hidden rounded-xl border border-foose-border bg-foose-surface shadow-sm">
              <div className="h-32 bg-foose-surface-mid [&_img]:h-full [&_img]:w-full [&_img]:object-cover">
                <DiscoveryImage alt={`${shopData.shopName} banner`} fallback="DigiShop" fallbackClassName="h-full w-full" src={shopData.bannerUrl} />
              </div>
              <div className="p-5">
                <SafeImage
                  alt=""
                  className="-mt-14 mb-3 size-20 rounded-full border-4 border-white object-cover"
                  fallback={initials(shopData.shopName)}
                  fallbackClassName="bg-accent-light text-lg font-black text-accent"
                  src={shopData.logoUrl}
                />
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
