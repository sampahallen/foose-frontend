import type { MouseEvent } from 'react'
import { useMemo } from 'react'
import { MdVerified } from 'react-icons/md'
import { AppShell, Badge, ButtonLink, EmptyState, ErrorState, FavoriteButton, Icon, LightboxImage, LoadingState, ProductCard, SectionHeader, ShopReviewPanel } from '../components'
import { useApiResource } from '../hooks/useApiResource'
import { useCart } from '../hooks/useCart'
import { useNavigationMemoryStore } from '../stores/navigationMemoryStore'
import type { Listing, PaginatedListings } from '../types/api'
import { formatMoney, getListingImage, getShop, getShopName, initials, listingMeta } from '../utils/format'
import { getCurrentAppPathname, navigateTo, withBasePath } from '../utils/navigation'

function currentListingId() {
  return decodeURIComponent(getCurrentAppPathname().replace(/^\/listing\/?/, '')).trim()
}

function shopOwnerId(owner: unknown) {
  if (!owner) return ''
  if (typeof owner === 'string') return owner
  if (typeof owner === 'object' && '_id' in owner && typeof owner._id === 'string') return owner._id
  return ''
}

function shopIdValue(shopId: Listing['shopId']) {
  if (!shopId) return ''
  if (typeof shopId === 'string') return shopId
  return shopId._id
}

function clampRating(value?: number) {
  return Math.max(0, Math.min(5, Number(value) || 0))
}

function StarRating({ count, label, size = 14, value }: { count?: number; label?: string; size?: number; value?: number }) {
  const rating = clampRating(value)
  const rounded = Math.round(rating)

  return (
    <span className="inline-flex flex-wrap items-center gap-1 text-xs font-semibold text-foose-muted">
      <span aria-label={`${rating.toFixed(1)} out of 5 stars`} className="inline-flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <span className={star <= rounded ? 'inline-flex text-foose-text [&_svg]:fill-current' : 'inline-flex text-foose-border'} key={star}>
            <Icon name="star" size={size} />
          </span>
        ))}
      </span>
      {label ? <span>{label}</span> : count !== undefined ? <span>({count})</span> : null}
    </span>
  )
}

function compactListings(items: Listing[] | undefined, currentId?: string, limit = 5) {
  return (items || []).filter((item) => item._id !== currentId && item.status !== 'sold').slice(0, limit)
}

function ListingBand({
  action,
  listings,
  title,
}: {
  action?: string
  listings: Listing[]
  title: string
}) {
  if (!listings.length) return null

  return (
    <section className="mt-8">
      <SectionHeader title={title} action={action ? <a href={withBasePath(action)}>View more</a> : undefined} />
      <div className="flex gap-3 overflow-x-auto pb-3 [scrollbar-width:thin] [&_.product-card]:w-[132px] [&_.product-card]:shrink-0 sm:[&_.product-card]:w-[148px] md:[&_.product-card]:w-[160px] lg:[&_.product-card]:w-[172px]">
        {listings.map((listing) => (
          <ProductCard key={listing._id} listing={listing} />
        ))}
      </div>
    </section>
  )
}

export function RetailDetailPage() {
  const listingId = currentListingId()
  const listingResource = useApiResource<{ listing: Listing }>(listingId ? `/listings/${listingId}` : null)
  const { addListing } = useCart()
  const clearListingReturn = useNavigationMemoryStore((state) => state.clearListingReturn)
  const listingReturn = useNavigationMemoryStore((state) => state.listingReturn)
  const listing = listingResource.data?.listing
  const shop = listing ? getShop(listing) : undefined
  const shopId = shopIdValue(listing?.shopId)
  const sellerListingsResource = useApiResource<{ listings: Listing[] }>(shopId ? `/listings/shop/${shopId}` : null, Boolean(shopId))
  const relatedListingsResource = useApiResource<PaginatedListings>(
    listing?.category ? `/search?category=${encodeURIComponent(listing.category)}&limit=12&sort=newest` : null,
    Boolean(listing?.category),
  )
  const mainImage = listing ? getListingImage(listing) : undefined
  const galleryItems = listing?.images?.length
    ? listing.images.map((image, index) => ({ alt: `${listing.title} image ${index + 1}`, src: image }))
    : mainImage
      ? [{ alt: listing?.title || 'Listing image', src: mainImage }]
      : []
  const sellerId = shopOwnerId(shop?.ownerId)
  const askQuestionHref = sellerId
    ? `/inbox?receiverId=${encodeURIComponent(sellerId)}&listingId=${encodeURIComponent(listingId)}`
    : '/inbox'
  const messageSellerHref = sellerId ? `/inbox?receiverId=${encodeURIComponent(sellerId)}` : '/inbox'
  const sellerListings = useMemo(
    () => (sellerListingsResource.data?.listings || []).map((item) => (shop && typeof item.shopId !== 'object' ? { ...item, shopId: shop } : item)),
    [sellerListingsResource.data?.listings, shop],
  )
  const moreFromSeller = useMemo(
    () => compactListings(sellerListings, listing?._id, 6),
    [listing?._id, sellerListings],
  )
  const youMightLike = useMemo(
    () => compactListings(relatedListingsResource.data?.results, listing?._id, 6).filter((item) => shopIdValue(item.shopId) !== shopId),
    [listing?._id, relatedListingsResource.data?.results, shopId],
  )

  function handleAddToCart() {
    if (!listing) return
    addListing(listing)
    navigateTo('/cart')
  }

  function handleBuyNow() {
    if (!listing) return
    addListing(listing)
    navigateTo('/checkout')
  }

  function handleBrowseReturn(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault()
    const target = listingReturn?.href || withBasePath('/browse')
    window.history.pushState(null, '', target)
    window.dispatchEvent(new PopStateEvent('popstate'))
    window.setTimeout(() => {
      window.scrollTo({ top: listingReturn?.scrollY || 0 })
      clearListingReturn()
    }, 0)
  }

  return (
    <AppShell active="browse">
      <a className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-foose-muted transition hover:text-accent" href={listingReturn?.href || withBasePath('/browse')} onClick={handleBrowseReturn}>
        <Icon name="arrow" /> Browse
      </a>
      {!listingId && <EmptyState body="Open a listing from the marketplace to see full details." title="Listing required" />}
      {listingResource.loading && <LoadingState label="Loading listing..." />}
      {listingResource.error && <ErrorState message={listingResource.error} retry={listingResource.refetch} />}
      {listing && (
        <>
          <div className="grid gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(320px,0.62fr)] lg:items-start xl:gap-8">
            <section className="space-y-3 lg:sticky lg:top-24">
              <div className="relative overflow-hidden rounded-lg bg-foose-surface-mid image-frame lg:max-h-[calc(100dvh-9rem)] [&_img]:h-full [&_img]:w-full [&_img]:object-cover">
                {mainImage ? (
                  <LightboxImage alt={listing.title} index={0} items={galleryItems} src={mainImage} />
                ) : (
                  <span className="flex min-h-72 items-center justify-center bg-foose-surface-mid text-sm font-semibold text-foose-faint">No image</span>
                )}
                <FavoriteButton className="absolute right-3 top-3 z-10 inline-flex size-10 items-center justify-center rounded-full border border-foose-border bg-white/95 text-foose-text shadow transition hover:bg-accent hover:text-white [&.is-active]:bg-accent [&.is-active]:text-white" targetId={listing._id} targetType="listing" />
              </div>
              {!!listing.images?.length && (
                <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
                  {listing.images.slice(0, 6).map((image, index) => (
                    <LightboxImage
                      alt={`${listing.title} thumbnail ${index + 1}`}
                      className="aspect-square overflow-hidden rounded-md border border-foose-border bg-foose-surface-low [&_img]:h-full [&_img]:w-full [&_img]:object-cover"
                      index={index}
                      items={galleryItems}
                      key={image}
                      src={image}
                    />
                  ))}
                </div>
              )}
            </section>

            <aside className="flex flex-col gap-4">
              <section className="rounded-xl border border-foose-border bg-foose-surface p-4 shadow-sm sm:p-5">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  {listing.promotionTags?.includes('top-pick') && <Badge tone="accent">Top pick</Badge>}
                  <Badge tone={listing.type === 'wholesale' ? 'warning' : 'accent'}>{listing.type}</Badge>
                  {listing.condition && <Badge>{listing.condition}</Badge>}
                </div>
                <h1 className="text-2xl font-black leading-tight text-foose-text md:text-3xl">{listing.title}</h1>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-foose-muted">
                  {shop?.slug ? (
                    <a className="inline-flex items-center gap-1 font-bold text-foose-text hover:text-accent" href={withBasePath(`/shops/${shop.slug}`)}>
                      {getShopName(listing)}
                      <MdVerified className="text-accent" aria-label="Verified shop" />
                    </a>
                  ) : (
                    <span>{getShopName(listing)}</span>
                  )}
                  <StarRating count={shop?.totalReviews || 0} value={shop?.rating} />
                </div>
                <div className="my-4 h-px bg-foose-border" />
                <p className="text-3xl font-black text-foose-text">{formatMoney(listing.price, listing.currency)}</p>
                <p className="mt-2 text-sm text-foose-muted">
                  {listingMeta(listing)}
                  {listing.color ? ` - ${listing.color}` : ''}
                </p>
                {listing.type === 'wholesale' && (
                  <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold text-foose-muted">
                    {listing.bulkMinQty !== undefined && <span className="rounded-full bg-foose-surface-mid px-3 py-1">Min. {listing.bulkMinQty}</span>}
                    {listing.bulkWeight && <span className="rounded-full bg-foose-surface-mid px-3 py-1">{listing.bulkWeight}</span>}
                  </div>
                )}
                {!!listing.volumeDiscounts?.length && (
                  <table className="mt-4 w-full overflow-hidden rounded-lg border border-foose-border text-left text-xs">
                    <thead className="bg-foose-surface-mid text-foose-muted">
                      <tr>
                        <th className="px-3 py-2">Quantity</th>
                        <th className="px-3 py-2">Unit price</th>
                      </tr>
                    </thead>
                    <tbody>
                      {listing.volumeDiscounts.map((discount) => (
                        <tr className="border-t border-foose-border" key={`${discount.minQty}-${discount.pricePerUnit}`}>
                          <td className="px-3 py-2">{discount.minQty || 0}+</td>
                          <td className="px-3 py-2 font-bold text-accent">{formatMoney(discount.pricePerUnit || 0, listing.currency)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
                <div className="mt-5 grid gap-2">
                  <button className="inline-flex h-11 items-center justify-center rounded-md border border-foose-text bg-foose-text px-4 text-sm font-black text-white transition hover:bg-black disabled:pointer-events-none disabled:opacity-50" disabled={listing.status !== 'active'} onClick={handleBuyNow} type="button">
                    Buy now
                  </button>
                  <button className="inline-flex h-11 items-center justify-center rounded-md border border-foose-text bg-white px-4 text-sm font-black text-foose-text transition hover:border-accent hover:text-accent disabled:pointer-events-none disabled:opacity-50" disabled={listing.status !== 'active'} onClick={handleAddToCart} type="button">
                    Add to cart
                  </button>
                  <ButtonLink to={askQuestionHref} className="h-11 rounded-md" variant="secondary">
                    Ask a question
                  </ButtonLink>
                </div>
                <div className="mt-4 flex items-center justify-center gap-2 text-sm font-semibold text-foose-success">
                  <Icon name="box" size={17} /> Checkout protected by Foose escrow
                </div>
              </section>

              <section className="rounded-xl border border-foose-border bg-foose-surface p-4 shadow-sm sm:p-5">
                <div className="grid gap-4 border-b border-foose-border pb-4 text-sm text-foose-text">
                  <div className="flex gap-3">
                    <Icon name="shield" />
                    <p>Purchases are held in escrow until the buyer confirms delivery or pickup.</p>
                  </div>
                  <div className="flex gap-3">
                    <Icon name="truck" />
                    <p>Delivery and pickup options are confirmed at checkout.</p>
                  </div>
                </div>
                <details className="pt-4 text-sm" open>
                  <summary className="cursor-pointer font-bold text-foose-text">Description</summary>
                  <p className="mt-3 leading-6 text-foose-muted">{listing.description || 'No description has been added for this listing yet.'}</p>
                </details>
              </section>

              <section className="rounded-xl border border-foose-border bg-foose-surface p-4 shadow-sm sm:p-5">
                <div className="flex items-center gap-3 border-b border-foose-border pb-4">
                  {shop?.logoUrl ? (
                    <img alt="" className="size-12 rounded-full object-cover" src={shop.logoUrl} />
                  ) : (
                    <span className="inline-flex size-12 items-center justify-center rounded-full bg-accent-light text-sm font-black text-accent">{initials(getShopName(listing))}</span>
                  )}
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate text-base font-black text-foose-text">{getShopName(listing)}</h2>
                    <p className="text-sm text-foose-muted">{shop?.totalReviews || 0} reviews</p>
                    <StarRating count={shop?.totalReviews || 0} value={shop?.rating} />
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {shop?.slug && (
                    <a className="inline-flex h-10 items-center justify-center rounded-md border border-foose-border text-sm font-bold text-foose-text hover:border-accent hover:text-accent" href={withBasePath(`/shops/${shop.slug}`)}>
                      Visit shop
                    </a>
                  )}
                  <a className="inline-flex h-10 items-center justify-center rounded-md border border-foose-border text-sm font-bold text-foose-text hover:border-accent hover:text-accent" href={withBasePath(messageSellerHref)}>
                    Message seller
                  </a>
                </div>
                {shopId && <ShopReviewPanel className="mt-5 border-t border-foose-border pt-4" limit={3} shopId={shopId} shopName={getShopName(listing)} showForm={false} title="Seller reviews" />}
              </section>
            </aside>
          </div>

          <ListingBand action={shop?.slug ? `/shops/${shop.slug}` : undefined} listings={moreFromSeller} title="More from this seller" />
          <ListingBand action={listing.category ? `/browse?category=${encodeURIComponent(listing.category)}` : '/browse'} listings={youMightLike} title="You might also like" />
        </>
      )}
    </AppShell>
  )
}
