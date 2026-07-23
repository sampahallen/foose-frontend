import type { Listing } from '../../types/api'
import { formatMoney, getListingImage, getShopName } from '../../utils/format'
import { captureNavigationTrigger, navigateTo, withBasePath } from '../../utils/navigation'
import { isActiveTopPick, recordPromotionMetric } from '../../utils/promotions'
import { FavoriteButton } from '../ui/FavoriteButton'
import { MdVerified } from 'react-icons/md'
import { useEffect, useRef, useState, type MouseEvent } from 'react'

export function ProductCard({
  className = '',
  imageFailed = false,
  imageLoading = 'lazy',
  listing,
}: {
  className?: string
  imageFailed?: boolean
  imageLoading?: 'eager' | 'lazy'
  listing: Listing
}) {
  const image = getListingImage(listing)
  const [failedImageUrl, setFailedImageUrl] = useState('')
  const [loadedImageUrl, setLoadedImageUrl] = useState('')
  const cardRef = useRef<HTMLElement | null>(null)
  const promoted = isActiveTopPick(listing.promotionTags, listing.promotionExpiresAt)
  const brand = listing.brand || 'Other'
  const size = listing.size || (listing.type === 'wholesale' ? `${listing.bulkMinQty || 1}+` : 'One size')
  const shopName = getShopName(listing)
  const imageAvailable = Boolean(image && !imageFailed && failedImageUrl !== image)
  const imagePending = imageAvailable && loadedImageUrl !== image

  useEffect(() => {
    if (!promoted || !cardRef.current || typeof IntersectionObserver === 'undefined') return undefined
    let timer = 0
    const observer = new IntersectionObserver(([entry]) => {
      window.clearTimeout(timer)
      if (entry?.isIntersecting && entry.intersectionRatio >= 0.5) {
        timer = window.setTimeout(() => recordPromotionMetric(listing._id, 'impression'), 1000)
      }
    }, { threshold: [0.5] })
    observer.observe(cardRef.current)
    return () => {
      window.clearTimeout(timer)
      observer.disconnect()
    }
  }, [listing._id, promoted])

  function openListing(event: MouseEvent<HTMLAnchorElement>) {
    if (promoted) recordPromotionMetric(listing._id, 'click')
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return
    event.preventDefault()

    navigateTo(`/listing/${listing._id}`, {
      presentation: 'modal',
      trigger: captureNavigationTrigger(event.currentTarget),
    })
  }

  const content = (
    <>
      <div className="product-image relative overflow-hidden rounded-md bg-foose-surface-mid aspect-[4/5] [&_img]:h-full [&_img]:w-full [&_img]:object-cover">
        {imageAvailable ? (
          <>
            <img
              alt={listing.title}
              className={`transition-opacity duration-200 motion-reduce:transition-none ${imagePending ? 'opacity-0' : 'opacity-100'}`}
              loading={imageLoading}
              onError={() => setFailedImageUrl(image || '')}
              onLoad={() => setLoadedImageUrl(image || '')}
              src={image || ''}
            />
            {imagePending && <span aria-hidden className="absolute inset-0 animate-pulse bg-foose-surface-mid motion-reduce:animate-none" />}
          </>
        ) : (
          <span className="image-placeholder flex h-full min-h-32 items-center justify-center bg-foose-surface-mid px-3 text-center text-sm font-semibold text-foose-faint">Image unavailable</span>
        )}
        {listing.status === 'sold' && (
          <span className="absolute left-2 top-2 rounded-full bg-foose-danger px-2 py-1 text-[10px] font-black uppercase tracking-wide text-white">
            Sold
          </span>
        )}
        {promoted && listing.status !== 'sold' && (
          <span className="absolute left-2 top-2 rounded-full bg-accent px-2 py-1 text-[10px] font-black uppercase tracking-wide text-white shadow-sm">Promoted</span>
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
    <article aria-busy={imagePending} className={`product-card relative flex min-h-full flex-col overflow-hidden bg-transparent transition hover:-translate-y-0.5 ${className}`} ref={cardRef}>
      <a className="product-card-link flex flex-1 flex-col" href={withBasePath(`/listing/${listing._id}`)} id={`listing-card-${listing._id}`} onClick={openListing}>
        {content}
      </a>
      <FavoriteButton className="floating-round inline-flex size-7 shrink-0 items-center justify-center rounded-full border border-transparent bg-white/90 text-foose-text shadow transition hover:bg-accent-light hover:text-accent absolute right-1.5 top-1.5 z-10 favorite-button [&.is-active]:bg-accent [&.is-active]:text-white" targetId={listing._id} targetType="listing" />
    </article>
  )
}
