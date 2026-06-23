import type { Listing } from '../../types/api'
import { useNavigationMemoryStore } from '../../stores/navigationMemoryStore'
import { formatMoney, getListingImage, getShopName } from '../../utils/format'
import { withBasePath } from '../../utils/navigation'
import { FavoriteButton } from '../ui/FavoriteButton'
import { MdVerified } from 'react-icons/md'

export function ProductCard({ listing }: { listing: Listing }) {
  const image = getListingImage(listing)
  const setListingReturn = useNavigationMemoryStore((state) => state.setListingReturn)
  const brand = listing.brand || 'Other'
  const size = listing.size || (listing.type === 'wholesale' ? `${listing.bulkMinQty || 1}+` : 'One size')
  const shopName = getShopName(listing)

  function rememberPosition() {
    setListingReturn({
      href: `${window.location.pathname}${window.location.search}`,
      scrollY: window.scrollY,
    })
  }

  const content = (
    <>
      <div className="product-image relative overflow-hidden rounded-md bg-foose-surface-mid aspect-[4/5] [&_img]:h-full [&_img]:w-full [&_img]:object-cover">
        {image ? <img alt={listing.title} src={image} /> : <span className="image-placeholder flex min-h-32 items-center justify-center bg-foose-surface-mid text-sm font-semibold text-foose-faint">No image</span>}
        {listing.status === 'sold' && (
          <span className="absolute left-2 top-2 rounded-full bg-foose-danger px-2 py-1 text-[10px] font-black uppercase tracking-wide text-white">
            Sold
          </span>
        )}
      </div>
      <div className="product-body flex flex-1 flex-col gap-px px-0 py-1">
        <strong className="truncate text-[11px] font-semibold leading-tight text-accent">{brand}</strong>
        <span className="text-[11px] leading-tight text-foose-muted">{size}</span>
        <strong className="text-xs font-black leading-tight text-accent">{formatMoney(listing.price, listing.currency)}</strong>
        <p className="mt-px flex min-w-0 items-center gap-1 text-[10px] font-bold leading-tight text-foose-muted">
          <span className="truncate">{shopName}</span>
          <MdVerified className="shrink-0 text-accent" aria-label="Verified shop" />
        </p>
      </div>
    </>
  )

  return (
    <article className="product-card relative flex min-h-full flex-col overflow-hidden bg-transparent transition hover:-translate-y-0.5">
      <a className="product-card-link flex flex-1 flex-col" href={withBasePath(`/listing/${listing._id}`)} onClick={rememberPosition}>
        {content}
      </a>
      <FavoriteButton className="floating-round inline-flex size-7 shrink-0 items-center justify-center rounded-full border border-transparent bg-white/90 text-foose-text shadow transition hover:bg-accent-light hover:text-accent absolute right-1.5 top-1.5 z-10 favorite-button [&.is-active]:bg-accent [&.is-active]:text-white" targetId={listing._id} targetType="listing" />
    </article>
  )
}
