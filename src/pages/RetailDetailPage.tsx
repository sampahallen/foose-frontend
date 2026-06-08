import { AppShell, Badge, ButtonLink, EmptyState, ErrorState, FavoriteButton, Icon, LightboxImage, LoadingState } from '../components'
import { useApiResource } from '../hooks/useApiResource'
import { useCart } from '../hooks/useCart'
import type { Listing } from '../types/api'
import { formatMoney, getListingImage, getShop, getShopName, listingMeta } from '../utils/format'
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

export function RetailDetailPage() {
  const listingId = currentListingId()
  const listingResource = useApiResource<{ listing: Listing }>(listingId ? `/listings/${listingId}` : null)
  const { addListing } = useCart()
  const listing = listingResource.data?.listing
  const shop = listing ? getShop(listing) : undefined
  const mainImage = listing ? getListingImage(listing) : undefined
  const sellerId = shopOwnerId(shop?.ownerId)
  const messageSellerHref = sellerId
    ? `/inbox?receiverId=${encodeURIComponent(sellerId)}&listingId=${encodeURIComponent(listingId)}`
    : '/inbox'

  function handleAddToCart() {
    if (!listing) return
    addListing(listing)
    navigateTo('/cart')
  }

  return (
    <AppShell active="browse">
      <a className="back-link mb-6 inline-flex items-center gap-2 text-sm font-semibold text-foose-muted hover:text-accent" href="/browse">
        <Icon name="arrow" /> Back to Browse
      </a>
      {!listingId && <EmptyState body="Open a listing from the marketplace to see full details." title="Listing required" />}
      {listingResource.loading && <LoadingState label="Loading listing..." />}
      {listingResource.error && <ErrorState message={listingResource.error} retry={listingResource.refetch} />}
      {listing && (
        <div className="detail-grid grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(360px,0.8fr)] max-lg:grid-cols-1">
          <section className="gallery space-y-4">
            <div className="main-product-image overflow-hidden rounded-lg bg-foose-surface-mid [&_img]:h-full [&_img]:w-full [&_img]:object-cover aspect-[4/5] image-frame">
              {mainImage ? <LightboxImage alt={listing.title} src={mainImage} /> : <span className="image-placeholder flex min-h-32 items-center justify-center bg-foose-surface-mid text-sm font-semibold text-foose-faint">No image</span>}
            </div>
            {!!listing.images?.length && (
              <div className="thumb-row grid grid-cols-4 gap-3 [&_img]:aspect-square [&_img]:rounded-lg [&_img]:object-cover [&_.lightbox-trigger]:aspect-square [&_.lightbox-trigger]:rounded-lg [&_.lightbox-trigger]:object-cover [&_.lightbox-trigger.selected]:ring-2 [&_.lightbox-trigger.selected]:ring-accent">
                {listing.images.map((image, index) => (
                  <LightboxImage
                    alt={`${listing.title} thumbnail ${index + 1}`}
                    className={index === 0 ? 'selected' : ''}
                    key={image}
                    src={image}
                  />
                ))}
              </div>
            )}
          </section>
          <aside className="detail-panel [&_.full]:w-full flex flex-col gap-5 [&_h1]:text-3xl [&_h1]:font-bold [&_h1]:md:text-5xl max-md:[&_h1]:text-3xl">
            <div className="badge-row flex flex-wrap items-center gap-3">
              <Badge tone={listing.type === 'wholesale' ? 'warning' : 'accent'}>{listing.type}</Badge>
              {listing.condition && <Badge>{listing.condition}</Badge>}
            </div>
            <h1>{listing.title}</h1>
            <div className="seller-rating flex flex-wrap items-center gap-3">
              {shop?.slug ? <a href={withBasePath(`/shops/${shop.slug}`)}>{getShopName(listing)}</a> : <span>{getShopName(listing)}</span>}
              {shop?.rating !== undefined && <span>{shop.rating.toFixed(1)} ({shop.totalReviews || 0} reviews)</span>}
            </div>
            <p className="detail-price font-display text-xl font-bold text-accent md:text-2xl">
              {formatMoney(listing.price, listing.currency)} {listing.type === 'wholesale' && <span>per unit</span>}
            </p>
            <p className="muted-copy text-sm leading-6 text-foose-muted md:text-base">{listingMeta(listing)}</p>
            {listing.type === 'wholesale' && (
              <div className="spec-row flex flex-wrap items-center gap-3">
                {listing.bulkWeight && (
                  <span>
                    <Icon name="bag" /> {listing.bulkWeight}
                  </span>
                )}
                {listing.bulkMinQty !== undefined && (
                  <span>
                    <Icon name="box" /> Min. {listing.bulkMinQty}
                  </span>
                )}
              </div>
            )}
            {!!listing.volumeDiscounts?.length && (
              <table className="sharp-table w-full border-collapse overflow-hidden rounded-xl border border-foose-border text-left text-sm [&_th]:border-b [&_th]:border-foose-border [&_th]:px-4 [&_th]:py-3 [&_th]:align-middle [&_td]:border-b [&_td]:border-foose-border [&_td]:px-4 [&_td]:py-3 [&_td]:align-middle [&_th]:bg-foose-surface-mid [&_th]:text-xs [&_th]:font-bold [&_th]:uppercase [&_th]:tracking-widest [&_th]:text-foose-muted pricing-table">
                <thead>
                  <tr>
                    <th>Minimum quantity</th>
                    <th>Price per unit</th>
                  </tr>
                </thead>
                <tbody>
                  {listing.volumeDiscounts.map((discount) => (
                    <tr key={`${discount.minQty}-${discount.pricePerUnit}`}>
                      <td>{discount.minQty}</td>
                      <td>{formatMoney(discount.pricePerUnit || 0, listing.currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <div className="detail-actions flex flex-wrap items-center gap-3">
              <button className="button inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border px-5 py-2.5 text-center text-sm font-bold transition disabled:pointer-events-none disabled:opacity-50 [&.full]:w-full button-primary border-accent bg-accent text-white shadow-md shadow-accent/15 hover:bg-accent-hover full" disabled={listing.status !== 'active'} onClick={handleAddToCart} type="button">
                Add to cart
              </button>
              <FavoriteButton
                className="button inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border px-5 py-2.5 text-center text-sm font-bold transition disabled:pointer-events-none disabled:opacity-50 [&.full]:w-full button-secondary border-foose-border bg-foose-surface text-foose-text hover:border-accent hover:text-accent favorite-button [&.is-active]:bg-foose-danger-bg [&.is-active]:text-foose-danger"
                showText
                targetId={listing._id}
                targetType="listing"
              />
            </div>
            <ButtonLink to={messageSellerHref} className="full" variant="secondary">
              Message seller
            </ButtonLink>
            <div className="info-card rounded-xl border border-foose-border bg-foose-surface shadow-sm p-4 md:p-5">
              <Icon name="truck" />
              <div>
                <strong>Delivery handled at checkout</strong>
                <p>Fees are estimated through the backend delivery service.</p>
              </div>
            </div>
            <details className="detail-accordion rounded-xl border border-foose-border bg-foose-surface-low p-4 [&_summary]:cursor-pointer [&_summary]:font-semibold" open>
              <summary>Description</summary>
              <p>{listing.description || 'No description has been added for this listing yet.'}</p>
            </details>
          </aside>
        </div>
      )}
    </AppShell>
  )
}
