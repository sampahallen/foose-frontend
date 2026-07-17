import { Children, isValidElement, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import type { Listing } from '../../types/api'
import { formatMoney, getListingImage } from '../../utils/format'
import { isActiveTopPick } from '../../utils/promotions'
import { LoadingRegion } from '../feedback/LoadingRegion'
import { SkeletonBlock } from '../feedback/SkeletonBlock'
import { Badge } from '../ui/Badge'
import { SafeImage } from '../ui/SafeImage'

const MASONRY_ROW_HEIGHT = 4

type ManagementListingMasonryProps = {
  children: ReactNode
  className?: string
  gap?: number
  maxColumns?: number
  minColumnWidth?: number
  minColumns?: number
  singleColumnBelow?: number
  targetColumnWidth?: number
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value))
}

/**
 * A measured masonry grid that keeps the visual sequence aligned with DOM order.
 * Unlike CSS columns, keyboard and screen-reader traversal follows the same order
 * in which cards are displayed.
 */
export function ManagementListingMasonry({
  children,
  className = '',
  gap = 12,
  maxColumns = 4,
  minColumnWidth = 220,
  minColumns = 1,
  singleColumnBelow = 520,
  targetColumnWidth = 280,
}: ManagementListingMasonryProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [layout, setLayout] = useState(() => ({
    availableWidth: 0,
    columnCount: clamp(minColumns, minColumns, maxColumns),
  }))
  const items = Children.toArray(children)
  const itemKey = items.map((item, index) => (
    isValidElement(item) && item.key !== null ? String(item.key) : String(index)
  )).join('\u0000')

  useLayoutEffect(() => {
    const container = containerRef.current
    if (!container) return
    let resizeFrame = 0

    const updateColumns = (availableWidth: number) => {
      if (singleColumnBelow > 0 && availableWidth < singleColumnBelow) {
        setLayout((current) => (
          current.columnCount === 1 && Math.abs(current.availableWidth - availableWidth) < 0.5
            ? current
            : { availableWidth, columnCount: 1 }
        ))
        return
      }

      const targetCount = Math.max(1, Math.round((availableWidth + gap) / (targetColumnWidth + gap)))
      const widestCount = Math.max(1, Math.floor((availableWidth + gap) / (minColumnWidth + gap)))
      const nextCount = clamp(Math.min(targetCount, widestCount), minColumns, maxColumns)
      setLayout((current) => (
        current.columnCount === nextCount && Math.abs(current.availableWidth - availableWidth) < 0.5
          ? current
          : { availableWidth, columnCount: nextCount }
      ))
    }

    updateColumns(container.getBoundingClientRect().width)
    if (typeof ResizeObserver === 'undefined') return

    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return
      window.cancelAnimationFrame(resizeFrame)
      resizeFrame = window.requestAnimationFrame(() => updateColumns(entry.contentRect.width))
    })
    observer.observe(container)

    return () => {
      observer.disconnect()
      window.cancelAnimationFrame(resizeFrame)
    }
  }, [gap, maxColumns, minColumnWidth, minColumns, singleColumnBelow, targetColumnWidth])

  useLayoutEffect(() => {
    const container = containerRef.current
    if (!container) return
    let resizeFrame = 0
    const itemElements = Array.from(container.querySelectorAll<HTMLElement>(':scope > [data-management-masonry-item]'))

    const resizeItems = (contents: Element[]) => {
      const measurements = contents.map((content) => ({
        height: content.getBoundingClientRect().height,
        item: content.parentElement,
      }))
      measurements.forEach(({ height, item }) => {
        if (!item?.hasAttribute('data-management-masonry-item')) return
        item.style.gridRowEnd = `span ${Math.max(1, Math.ceil((height + gap) / MASONRY_ROW_HEIGHT))}`
      })
    }

    const contents = itemElements.flatMap((item) => item.firstElementChild ? [item.firstElementChild] : [])
    resizeItems(contents)
    if (typeof ResizeObserver === 'undefined') return

    const observer = new ResizeObserver((entries) => {
      window.cancelAnimationFrame(resizeFrame)
      resizeFrame = window.requestAnimationFrame(() => resizeItems(entries.map((entry) => entry.target)))
    })
    contents.forEach((content) => observer.observe(content))

    return () => {
      observer.disconnect()
      window.cancelAnimationFrame(resizeFrame)
    }
  }, [gap, itemKey, layout.columnCount])

  return (
    <div
      className={`grid min-w-0 items-start ${className}`}
      data-management-masonry
      ref={containerRef}
      style={{
        columnGap: gap,
        gridAutoFlow: 'row dense',
        gridAutoRows: `${MASONRY_ROW_HEIGHT}px`,
        gridTemplateColumns: `repeat(${layout.columnCount}, minmax(0, 1fr))`,
      }}
    >
      {items.map((item, index) => (
        <div
          className="min-w-0 self-start"
          data-management-masonry-item
          key={isValidElement(item) && item.key !== null ? item.key : index}
        >
          {item}
        </div>
      ))}
    </div>
  )
}

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

export function ManagementListingCard({
  actions,
  className = '',
  extraDetails,
  imageLoading = 'lazy',
  listing,
}: {
  actions?: ReactNode
  className?: string
  extraDetails?: ReactNode
  imageLoading?: 'eager' | 'lazy'
  listing: Listing
}) {
  const image = getListingImage(listing)
  const status = listing.status || 'active'
  const promoted = isActiveTopPick(listing.promotionTags, listing.promotionExpiresAt)

  const metadata = [
    ['Category', readableValue(listing.category)],
    ['Size', readableValue(listing.size)],
    ['Gender', readableValue(listing.gender)],
    ['Color', readableValue(listing.color)],
  ]

  return (
    <article
      className={`overflow-hidden rounded-xl border border-foose-border bg-foose-surface shadow-sm transition-shadow hover:shadow-md sm:rounded-2xl ${className}`}
      data-management-listing-card
    >
      <div className="relative flex min-h-40 max-h-[70dvh] items-center justify-center overflow-hidden bg-foose-surface-low sm:max-h-[36rem]">
        <SafeImage
          alt={listing.title || 'Listing image'}
          className="block h-auto max-h-[70dvh] w-full object-contain sm:max-h-[36rem]"
          fallback="No image"
          fallbackClassName="aspect-[4/5] min-h-48 max-h-[70dvh] sm:max-h-[36rem]"
          loading={imageLoading}
          src={image}
        />
        {promoted && (
          <span className="absolute left-3 top-3">
            <Badge tone="success">Top Pick</Badge>
          </span>
        )}
      </div>

      <div className="space-y-3 p-3 sm:space-y-4 sm:p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={listing.type === 'wholesale' ? 'warning' : 'accent'}>{readableValue(listing.type)}</Badge>
          <Badge tone={statusTone(status)}>{readableValue(status)}</Badge>
        </div>

        <div className="space-y-1.5">
          <h3 className="break-words font-display text-lg font-semibold leading-snug text-foose-text">
            {listing.title?.trim() || 'Untitled listing'}
          </h3>
          <p className="text-lg font-black text-accent">{formatMoney(listing.price, listing.currency)}</p>
        </div>

        <dl className="grid grid-cols-2 gap-x-3 gap-y-3 border-t border-foose-border pt-4 text-sm">
          {metadata.map(([label, value]) => (
            <div className="min-w-0" key={label}>
              <dt className="text-[11px] font-black uppercase tracking-[0.1em] text-foose-faint">{label}</dt>
              <dd className="mt-1 break-words font-semibold text-foose-text">{value}</dd>
            </div>
          ))}
        </dl>

        {extraDetails && <div className="border-t border-foose-border pt-4">{extraDetails}</div>}
        {actions && (
          <div className="flex w-full flex-wrap items-center justify-end gap-2 border-t border-foose-border pt-4 [&_a]:min-h-11 [&_a]:min-w-11 [&_button]:min-h-11 [&_button]:min-w-11">
            {actions}
          </div>
        )}
      </div>
    </article>
  )
}

function ManagementListingCardSkeleton({ index }: { index: number }) {
  const imageRatios = ['aspect-[4/5]', 'aspect-square', 'aspect-[3/4]', 'aspect-[5/4]']

  return (
    <article aria-hidden className="overflow-hidden rounded-xl border border-foose-border bg-foose-surface shadow-sm sm:rounded-2xl">
      <SkeletonBlock className={`${imageRatios[index % imageRatios.length]} w-full rounded-none`} />
      <div className="space-y-3 p-3 sm:space-y-4 sm:p-4">
        <div className="flex gap-2">
          <SkeletonBlock className="h-6 w-16 rounded-full" />
          <SkeletonBlock className="h-6 w-20 rounded-full" />
        </div>
        <div className="space-y-2">
          <SkeletonBlock className="h-5 w-4/5" />
          {index % 3 === 0 && <SkeletonBlock className="h-5 w-2/5" />}
          <SkeletonBlock className="h-6 w-28" />
        </div>
        <div className="grid grid-cols-2 gap-3 border-t border-foose-border pt-4">
          {Array.from({ length: 4 }, (_, metadataIndex) => (
            <div className="space-y-2" key={metadataIndex}>
              <SkeletonBlock className="h-3 w-14" />
              <SkeletonBlock className="h-4 w-20 max-w-full" />
            </div>
          ))}
        </div>
        <div className="flex justify-end gap-2 border-t border-foose-border pt-4">
          <SkeletonBlock className="h-11 w-20 rounded-lg" />
          <SkeletonBlock className="h-11 w-11 rounded-lg" />
        </div>
      </div>
    </article>
  )
}

export function ManagementListingMasonrySkeleton({
  count = 8,
  label = 'Loading shop listings',
  showToolbar = true,
}: {
  count?: number
  label?: string
  showToolbar?: boolean
}) {
  return (
    <LoadingRegion label={label} layout="section">
      {showToolbar && (
        <div className="mb-5 grid grid-cols-1 gap-3 rounded-xl bg-foose-surface-low p-3 min-[360px]:grid-cols-2 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_150px_150px_150px]">
          {['w-24', 'w-20', 'w-16', 'w-16'].map((labelWidth, index) => (
            <div className={`grid min-w-0 gap-1 ${index < 2 ? 'col-span-full sm:col-span-1' : ''}`} key={index}>
              <SkeletonBlock className={`h-3 ${labelWidth}`} />
              <SkeletonBlock className="h-11 w-full rounded-lg" />
            </div>
          ))}
        </div>
      )}
      <ManagementListingMasonry>
        {Array.from({ length: count }, (_, index) => <ManagementListingCardSkeleton index={index} key={index} />)}
      </ManagementListingMasonry>
    </LoadingRegion>
  )
}
