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
      <a className="back-link mb-6 inline-flex items-center gap-2 text-sm font-semibold text-foose-muted hover:text-accent" href="/browse">
        <Icon name="arrow" /> Back to Browse
      </a>
      {!slug && <EmptyState body="Open a DigiShop link to view its listings." title="Shop required" />}
      {shop.loading && <LoadingState label="Loading shop..." />}
      {shop.error && <ErrorState message={shop.error} retry={shop.refetch} />}
      {shop.data?.shop && (
        <>
          <section className="shop-profile rounded-xl border border-foose-border bg-foose-surface shadow-sm mb-8 overflow-hidden p-0">
            <div className="shop-cover overflow-hidden rounded-lg bg-foose-surface-mid [&_img]:h-full [&_img]:w-full [&_img]:object-cover h-48 rounded-none image-frame">
              {shop.data.shop.bannerUrl ? <img alt="" src={shop.data.shop.bannerUrl} /> : <span className="image-placeholder flex min-h-32 items-center justify-center bg-foose-surface-mid text-sm font-semibold text-foose-faint">DigiShop</span>}
            </div>
            <div className="shop-profile-body flex flex-col gap-3 p-5 [&>img]:-mt-16 [&>img]:size-24 [&>img]:rounded-full [&>img]:border-4 [&>img]:border-white [&>img]:object-cover [&>.initials]:-mt-16 [&>.initials]:size-24 [&>.initials]:rounded-full [&>.initials]:border-4 [&>.initials]:border-white [&>.initials]:object-cover">
              {shop.data.shop.logoUrl ? <img alt="" src={shop.data.shop.logoUrl} /> : <span className="initials inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-accent-light text-sm font-bold text-accent">{initials(shop.data.shop.shopName)}</span>}
              <div>
                <div className="badge-row flex flex-wrap items-center gap-3">
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

          <section className="home-section mx-auto w-full max-w-[1280px] my-8 rounded-xl border border-foose-border bg-foose-surface p-4 md:p-6 [&.no-pad]:p-0 [&>h2]:text-2xl [&>h2]:font-bold [&>h2]:md:text-4xl [&_a]:font-bold [&_a]:text-accent max-lg:rounded-lg max-lg:p-3 max-md:[&>h2]:text-2xl no-pad">
            <div className="section-header mb-5 flex flex-col gap-2 md:flex-row md:items-center md:justify-between [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:md:text-4xl [&_p]:text-sm [&_p]:leading-6 [&_p]:text-foose-muted [&_p]:md:text-base [&_a]:font-bold [&_a]:text-accent max-md:[&_h2]:text-2xl">
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
              <div className="product-grid grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4 [&.four]:grid-cols-2 [&.four]:lg:grid-cols-4 max-md:grid-cols-2 max-md:gap-3 max-md:[&.four]:grid-cols-2 max-md:[&.four]:gap-3 four">
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
