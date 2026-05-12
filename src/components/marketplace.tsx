import type { Listing } from '../types/api'
import { formatMoney, getListingImage, getShopName, listingMeta } from '../utils/format'
import { Icon } from './icons/Icon'
import { Badge } from './ui'

export function ProductCard({ listing }: { listing: Listing }) {
  const image = getListingImage(listing)
  const badge = listing.type === 'wholesale' ? 'Wholesale' : listing.condition || 'Retail'

  const content = (
    <>
      <div className="product-image">
        {image ? <img alt={listing.title} src={image} /> : <span className="image-placeholder">No image</span>}
        <Badge tone={listing.type === 'wholesale' ? 'warning' : 'accent'}>{badge}</Badge>
        <button className="floating-round" aria-label={`Save ${listing.title}`} type="button">
          <Icon name="heart" />
        </button>
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
    <a className="product-card product-card-tall" href={`/listing/${listing._id}`}>
      {content}
    </a>
  )
}

export function FilterPanel({ query = new URLSearchParams(window.location.search) }: { query?: URLSearchParams }) {
  return (
    <form action="/browse" className="filter-panel" method="get">
      <h2>Filters</h2>
      <fieldset>
        <legend>Listing type</legend>
        <label>
          <input defaultChecked={query.get('type') === 'retail'} name="type" type="radio" value="retail" />
          Retail
        </label>
        <label>
          <input defaultChecked={query.get('type') === 'wholesale'} name="type" type="radio" value="wholesale" />
          Wholesale
        </label>
      </fieldset>
      <fieldset>
        <legend>Category</legend>
        <input defaultValue={query.get('category') || ''} name="category" placeholder="Outerwear, denim, tees..." />
      </fieldset>
      <fieldset>
        <legend>Condition</legend>
        {['new', 'used', 'bale'].map((condition) => (
          <label key={condition}>
            <input defaultChecked={query.get('condition') === condition} name="condition" type="radio" value={condition} />
            {condition}
          </label>
        ))}
      </fieldset>
      <fieldset>
        <legend>Price (GHS)</legend>
        <input aria-label="Minimum price" defaultValue={query.get('minPrice') || ''} name="minPrice" placeholder="Min" type="number" />
        <input aria-label="Maximum price" defaultValue={query.get('maxPrice') || ''} name="maxPrice" placeholder="Max" type="number" />
      </fieldset>
      <fieldset>
        <legend>Size</legend>
        <input defaultValue={query.get('size') || ''} name="size" placeholder="S, M, XL..." />
      </fieldset>
      <button className="button button-primary" type="submit">
        Apply Filters
      </button>
      <a className="button button-secondary" href="/browse">
        Clear All
      </a>
    </form>
  )
}
