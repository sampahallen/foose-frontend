import type { Listing } from '../../types/api'
import { formatMoney, getListingImage, getShopName, listingMeta } from '../../utils/format'
import { Badge } from '../ui/Badge'
import { FavoriteButton } from '../ui/FavoriteButton'

export function ProductCard({ listing }: { listing: Listing }) {
  const image = getListingImage(listing)
  const isTopPick = listing.promotionTags?.includes('top-pick')
  const badge = isTopPick ? 'Top Pick' : listing.type === 'wholesale' ? 'Wholesale' : listing.condition || 'Retail'

  const content = (
    <>
      <div className="product-image">
        {image ? <img alt={listing.title} src={image} /> : <span className="image-placeholder">No image</span>}
        <Badge tone={listing.type === 'wholesale' && !isTopPick ? 'warning' : 'accent'}>{badge}</Badge>
      </div>
      <div className="product-body">
        <p className="product-meta">{listingMeta(listing)}</p>
        <h3>{listing.title}</h3>
        <p className="verified-line">
          {getShopName(listing)}
          <span>verified</span>
        </p>
        <div className="product-foot">
          <strong>{formatMoney(listing.price, listing.currency)}</strong>
          <span>{listing.type === 'wholesale' ? 'Unit price' : 'Price'}</span>
        </div>
      </div>
    </>
  )

  return (
    <article className="product-card product-card-tall">
      <a className="product-card-link" href={`/listing/${listing._id}`}>
        {content}
      </a>
      <FavoriteButton className="floating-round favorite-button" targetId={listing._id} targetType="listing" />
    </article>
  )
}
