import type { Listing } from '../../types/api'
import { formatMoney, getListingImage, getShopName, listingMeta } from '../../utils/format'
import { withBasePath } from '../../utils/navigation'
import { Badge } from '../ui/Badge'
import { FavoriteButton } from '../ui/FavoriteButton'

export function ProductCard({ listing }: { listing: Listing }) {
  const image = getListingImage(listing)
  const isTopPick = listing.promotionTags?.includes('top-pick')
  const badge = isTopPick ? 'Top Pick' : listing.type === 'wholesale' ? 'Wholesale' : listing.condition || 'Retail'

  const content = (
    <>
      <div className="product-image overflow-hidden rounded-lg bg-foose-surface-mid aspect-[4/5] [&_img]:h-full [&_img]:w-full [&_img]:object-cover">
        {image ? <img alt={listing.title} src={image} /> : <span className="image-placeholder flex min-h-32 items-center justify-center bg-foose-surface-mid text-sm font-semibold text-foose-faint">No image</span>}
        <Badge tone={listing.type === 'wholesale' && !isTopPick ? 'warning' : 'accent'}>{badge}</Badge>
      </div>
      <div className="product-body flex flex-1 flex-col gap-2 p-3 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:leading-tight [&_h3]:md:text-lg max-lg:p-2">
        <p className="product-meta text-xs uppercase tracking-wide text-foose-faint">{listingMeta(listing)}</p>
        <h3>{listing.title}</h3>
        <p className="verified-line text-xs uppercase tracking-wide text-foose-faint">
          {getShopName(listing)}
          <span>verified</span>
        </p>
        <div className="product-foot [&_span]:text-xs [&_span]:uppercase [&_span]:tracking-wide [&_span]:text-foose-faint flex flex-wrap items-center gap-3 mt-auto justify-between [&_strong]:font-display [&_strong]:text-xl [&_strong]:font-bold [&_strong]:text-accent [&_strong]:md:text-2xl">
          <strong>{formatMoney(listing.price, listing.currency)}</strong>
          <span>{listing.type === 'wholesale' ? 'Unit price' : 'Price'}</span>
        </div>
      </div>
    </>
  )

  return (
    <article className="product-card rounded-xl border border-foose-border bg-foose-surface shadow-sm p-4 md:p-5 relative flex min-h-full flex-col overflow-hidden transition hover:-translate-y-0.5 hover:shadow-lg max-lg:rounded-lg max-lg:p-3 product-card-tall [&_.product-image]:aspect-[3/4]">
      <a className="product-card-link flex flex-1 flex-col" href={withBasePath(`/listing/${listing._id}`)}>
        {content}
      </a>
      <FavoriteButton className="floating-round inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-transparent bg-transparent text-current transition hover:bg-accent-light hover:text-accent absolute right-3 top-3 z-10 bg-white/90 shadow favorite-button [&.is-active]:bg-foose-danger-bg [&.is-active]:text-foose-danger" targetId={listing._id} targetType="listing" />
    </article>
  )
}
