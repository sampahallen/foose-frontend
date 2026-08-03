import type { ReactNode } from 'react'
import type { Listing } from '../../types/api'
import { formatMoney, getListingImage } from '../../utils/format'
import { withBasePath } from '../../utils/navigation'
import { isActiveTopPick } from '../../utils/promotions'
import { LoadingRegion } from '../feedback/LoadingRegion'
import { SkeletonBlock } from '../feedback/SkeletonBlock'
import { Badge } from '../ui/Badge'
import { SafeImage } from '../ui/SafeImage'

function readableValue(value?: string, fallback = 'Not set') {
  if (!value?.trim()) return fallback
  return value
    .trim()
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function statusTone(status: NonNullable<Listing['status']>) {
  if (status === 'sold' || status === 'removed') return 'danger' as const
  if (status === 'active') return 'success' as const
  return 'neutral' as const
}

function defaultMeta(listing: Listing) {
  const categorySegment = listing.category
    ? `${readableValue(listing.category)}${listing.subcategory ? ` › ${readableValue(listing.subcategory)}` : ''}`
    : ''
  const parts = [categorySegment, listing.size ? readableValue(listing.size) : '', listing.color ? readableValue(listing.color) : ''].filter(Boolean)
  return parts.length ? parts.join(' · ') : 'No details set'
}

export function ManagementListingRow({
  actions,
  href,
  listing,
  meta,
  price,
}: {
  actions?: ReactNode
  href?: string
  listing: Listing
  meta?: ReactNode
  price?: number
}) {
  const image = getListingImage(listing)
  const status = listing.status || 'active'
  const promoted = isActiveTopPick(listing.promotionTags, listing.promotionExpiresAt)
  const title = listing.title?.trim() || 'Untitled listing'

  return (
    <li className="flex items-center gap-3 px-3 py-2 sm:gap-4 sm:px-4 sm:py-2.5" data-management-listing-row>
      <a className="flex min-w-0 flex-1 items-center gap-3 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-accent/40 sm:gap-4" href={href ? withBasePath(href) : undefined}>
        <span className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-foose-surface-low sm:size-16">
          <SafeImage alt="" className="h-full w-full object-cover" fallback="No image" fallbackClassName="text-[10px] font-bold" src={image} />
          {promoted && (
            <span aria-label="Top Pick" className="absolute left-0.5 top-0.5 inline-flex size-4 items-center justify-center rounded-full bg-foose-success text-[9px] text-white">★</span>
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex min-w-0 flex-wrap items-center gap-1.5">
            <strong className="max-w-full truncate text-sm font-bold text-foose-text sm:text-base" title={title}>{title}</strong>
            <Badge tone={listing.type === 'wholesale' ? 'warning' : 'accent'}>{readableValue(listing.type)}</Badge>
            <Badge tone={statusTone(status)}>{readableValue(status)}</Badge>
          </span>
          <span className="mt-0.5 block truncate text-xs text-foose-muted sm:text-sm">{meta ?? defaultMeta(listing)}</span>
        </span>
        <span className="shrink-0 whitespace-nowrap text-sm font-black text-accent sm:text-base">{formatMoney(price ?? listing.price, listing.currency)}</span>
      </a>
      {actions && (
        <span className="ml-1 flex shrink-0 items-center gap-1.5 sm:gap-2 [&_a]:min-h-11 [&_a]:min-w-11 [&_button]:min-h-11 [&_button]:min-w-11">
          {actions}
        </span>
      )}
    </li>
  )
}

function ManagementListingRowSkeleton() {
  return (
    <li aria-hidden className="flex items-center gap-3 px-3 py-2 sm:gap-4 sm:px-4 sm:py-2.5">
      <SkeletonBlock className="size-14 shrink-0 rounded-lg sm:size-16" />
      <span className="min-w-0 flex-1 space-y-2">
        <SkeletonBlock className="h-4 w-2/3" />
        <SkeletonBlock className="h-3 w-1/3" />
      </span>
      <SkeletonBlock className="h-4 w-14 shrink-0" />
    </li>
  )
}

export function ManagementListingRowsSkeleton({
  count = 8,
  label = 'Loading listings',
}: {
  count?: number
  label?: string
}) {
  return (
    <LoadingRegion label={label} layout="section">
      <ul className="divide-y divide-foose-border overflow-hidden rounded-xl border border-foose-border bg-foose-surface sm:rounded-2xl">
        {Array.from({ length: count }, (_, index) => <ManagementListingRowSkeleton key={index} />)}
      </ul>
    </LoadingRegion>
  )
}
