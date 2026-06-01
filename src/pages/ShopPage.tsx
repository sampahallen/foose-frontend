import { AppShell, Badge, EmptyState, ErrorState, Icon, LoadingState, ProductCard } from '../components'
import { useApiResource } from '../hooks/useApiResource'
import type { Listing, Shop } from '../types/api'
import { initials } from '../utils/format'
import { getCurrentAppPathname } from '../utils/navigation'

function currentShopSlug() {
  return decodeURIComponent(getCurrentAppPathname().replace(/^\/shops\/?/, '')).trim()
}

export function ShopPage() {
  const slug = currentShopSlug()
  const shop = useApiResource<{ shop: Shop }>(slug ? `/digishops/${slug}` : null)
  const listings = useApiResource<{ listings: Listing[] }>(
    shop.data?.shop._id ? `/listings/shop/${shop.data.shop._id}` : null,
    Boolean(shop.data?.shop._id),
  )

  return (
    <AppShell active="browse" searchPlaceholder="Search marketplace...">
      <a className="back-link" href="/browse">
        <Icon name="arrow" /> Back to Browse
      </a>
      {!slug && <EmptyState body="Open a DigiShop link to view its listings." title="Shop required" />}
      {shop.loading && <LoadingState label="Loading shop..." />}
      {shop.error && <ErrorState message={shop.error} retry={shop.refetch} />}
      {shop.data?.shop && (
        <>
          <section className="shop-profile">
            <div className="shop-cover image-frame">
              {shop.data.shop.bannerUrl ? <img alt="" src={shop.data.shop.bannerUrl} /> : <span className="image-placeholder">DigiShop</span>}
            </div>
            <div className="shop-profile-body">
              {shop.data.shop.logoUrl ? <img alt="" src={shop.data.shop.logoUrl} /> : <span className="initials">{initials(shop.data.shop.shopName)}</span>}
              <div>
                <div className="badge-row">
                  <h1>{shop.data.shop.shopName}</h1>
                  {shop.data.shop.category && <Badge tone="accent">{shop.data.shop.category}</Badge>}
                </div>
                <p>{shop.data.shop.bio || 'This DigiShop has not added a bio yet.'}</p>
                <small>
                  {shop.data.shop.rating || 0} rating / {shop.data.shop.totalReviews || 0} reviews
                </small>
              </div>
            </div>
          </section>

          <section className="home-section no-pad">
            <div className="section-header">
              <div>
                <h2>Listings</h2>
                <p>Active marketplace items from this DigiShop.</p>
              </div>
            </div>
            {listings.loading && <LoadingState label="Loading listings..." />}
            {listings.error && <ErrorState message={listings.error} retry={listings.refetch} />}
            {!listings.loading && !listings.error && !listings.data?.listings.length && (
              <EmptyState body="This shop does not have active listings yet." title="No listings" />
            )}
            {!!listings.data?.listings.length && (
              <div className="product-grid four">
                {listings.data.listings.map((listing) => (
                  <ProductCard key={listing._id} listing={listing} />
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </AppShell>
  )
}
