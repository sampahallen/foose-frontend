import { AppShell, Badge, ButtonLink, EmptyState, ErrorState, Icon, LoadingState } from '../components'
import { useApiResource } from '../hooks/useApiResource'
import { useCart } from '../hooks/useCart'
import type { Listing } from '../types/api'
import { formatMoney, getListingImage, getShop, getShopName, listingMeta } from '../utils/format'

function currentListingId() {
  return decodeURIComponent(window.location.pathname.replace(/^\/listing\/?/, '')).trim()
}

export function RetailDetailPage() {
  const listingId = currentListingId()
  const listingResource = useApiResource<{ listing: Listing }>(listingId ? `/listings/${listingId}` : null)
  const { addListing } = useCart()
  const listing = listingResource.data?.listing
  const shop = listing ? getShop(listing) : undefined
  const mainImage = listing ? getListingImage(listing) : undefined

  function handleAddToCart() {
    if (!listing) return
    addListing(listing)
    window.location.href = '/cart'
  }

  return (
    <AppShell active="browse">
      <a className="back-link" href="/browse">
        <Icon name="arrow" /> Back to Browse
      </a>
      {!listingId && <EmptyState body="Open a listing from the marketplace to see its API details." title="Listing required" />}
      {listingResource.loading && <LoadingState label="Loading listing..." />}
      {listingResource.error && <ErrorState message={listingResource.error} retry={listingResource.refetch} />}
      {listing && (
        <div className="detail-grid">
          <section className="gallery">
            <div className="main-product-image image-frame">
              {mainImage ? <img alt={listing.title} src={mainImage} /> : <span className="image-placeholder">No image</span>}
            </div>
            {!!listing.images?.length && (
              <div className="thumb-row">
                {listing.images.map((image, index) => (
                  <img alt={`${listing.title} thumbnail ${index + 1}`} className={index === 0 ? 'selected' : ''} key={image} src={image} />
                ))}
              </div>
            )}
          </section>
          <aside className="detail-panel">
            <div className="badge-row">
              <Badge tone={listing.type === 'wholesale' ? 'warning' : 'accent'}>{listing.type}</Badge>
              {listing.condition && <Badge>{listing.condition}</Badge>}
            </div>
            <h1>{listing.title}</h1>
            <div className="seller-rating">
              {shop?.slug ? <a href={`/shops/${shop.slug}`}>{getShopName(listing)}</a> : <span>{getShopName(listing)}</span>}
              {shop?.rating !== undefined && <span>{shop.rating.toFixed(1)} ({shop.totalReviews || 0} reviews)</span>}
            </div>
            <p className="detail-price">
              {formatMoney(listing.price, listing.currency)} {listing.type === 'wholesale' && <span>per unit</span>}
            </p>
            <p className="muted-copy">{listingMeta(listing)}</p>
            {listing.type === 'wholesale' && (
              <div className="spec-row">
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
              <table className="sharp-table pricing-table">
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
            <button className="button button-primary full" disabled={listing.status !== 'active'} onClick={handleAddToCart} type="button">
              Add to cart
            </button>
            <ButtonLink to="/inbox" className="full" variant="secondary">
              Message seller
            </ButtonLink>
            <div className="info-card">
              <Icon name="truck" />
              <div>
                <strong>Delivery handled at checkout</strong>
                <p>Fees are estimated through the backend delivery service.</p>
              </div>
            </div>
            <details className="detail-accordion" open>
              <summary>Description</summary>
              <p>{listing.description || 'No description has been added for this listing yet.'}</p>
            </details>
          </aside>
        </div>
      )}
    </AppShell>
  )
}
