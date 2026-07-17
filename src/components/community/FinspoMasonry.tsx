import { Children, isValidElement, useLayoutEffect, useRef, useState, type ReactNode } from 'react'

const MASONRY_ROW_HEIGHT = 4

type FinspoMasonryProps = {
  children: ReactNode
  className?: string
  featuredItem?: ReactNode
  featuredMaxFraction?: number
  featuredReserveColumns?: number
  featuredWidth?: number
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

export function FinspoMasonry({
  children,
  className = '',
  featuredItem,
  featuredMaxFraction = 0.72,
  featuredReserveColumns = 0,
  featuredWidth = 0,
  gap = 8,
  maxColumns = 8,
  minColumnWidth = 140,
  minColumns = 1,
  singleColumnBelow = 0,
  targetColumnWidth = 190,
}: FinspoMasonryProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [layout, setLayout] = useState(() => ({
    availableWidth: 0,
    columnCount: clamp(minColumns, minColumns, maxColumns),
  }))
  const { availableWidth, columnCount } = layout
  const featuredItems = Children.toArray(featuredItem)
  const hasFeaturedItem = featuredItems.length > 0
  const items = hasFeaturedItem
    ? [featuredItems[0], ...Children.toArray(children)]
    : Children.toArray(children)
  const canWrapFeatured = hasFeaturedItem && featuredReserveColumns > 0 && columnCount >= 3
  const columnWidth = availableWidth > 0
    ? (availableWidth - (gap * (columnCount - 1))) / columnCount
    : targetColumnWidth
  const desiredFeaturedWidth = canWrapFeatured
    ? Math.min(featuredWidth, availableWidth * featuredMaxFraction)
    : availableWidth
  const featuredColumnSpan = !hasFeaturedItem
    ? 1
    : canWrapFeatured
      ? clamp(
          Math.max(2, Math.round((desiredFeaturedWidth + gap) / (columnWidth + gap))),
          2,
          Math.max(2, columnCount - featuredReserveColumns),
        )
      : columnCount
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
      const nextCount = clamp(
        Math.min(targetCount, widestCount),
        minColumns,
        maxColumns,
      )
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
      resizeFrame = window.requestAnimationFrame(() => {
        updateColumns(entry.contentRect.width)
      })
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
    const itemElements = Array.from(container.querySelectorAll<HTMLElement>(':scope > [data-finspo-masonry-item]'))

    const resizeItems = (contents: Element[]) => {
      const measurements = contents.map((content) => ({
        height: content.getBoundingClientRect().height,
        item: content.parentElement,
      }))
      measurements.forEach(({ height, item }) => {
        if (!item?.hasAttribute('data-finspo-masonry-item')) return
        const rowSpan = Math.max(1, Math.ceil((height + gap) / MASONRY_ROW_HEIGHT))
        item.style.gridRowEnd = `span ${rowSpan}`
      })
    }

    resizeItems(itemElements.flatMap((item) => item.firstElementChild ? [item.firstElementChild] : []))

    if (typeof ResizeObserver === 'undefined') return

    const observer = new ResizeObserver((entries) => {
      window.cancelAnimationFrame(resizeFrame)
      resizeFrame = window.requestAnimationFrame(() => {
        resizeItems(entries.map((entry) => entry.target))
      })
    })

    itemElements.forEach((item) => {
      if (item.firstElementChild) observer.observe(item.firstElementChild)
    })

    return () => {
      observer.disconnect()
      window.cancelAnimationFrame(resizeFrame)
    }
  }, [columnCount, featuredColumnSpan, gap, itemKey])

  return (
    <div
      className={`grid min-w-0 items-start [&_.finspo-tile]:mb-0 ${className}`}
      ref={containerRef}
      style={{
        columnGap: gap,
        gridAutoFlow: 'row dense',
        gridAutoRows: `${MASONRY_ROW_HEIGHT}px`,
        gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))`,
      }}
    >
      {items.map((item, index) => {
        const key = isValidElement(item) && item.key !== null ? item.key : index
        const isFeatured = hasFeaturedItem && index === 0
        return (
          <div
            className="min-w-0 self-start"
            data-finspo-masonry-featured={isFeatured || undefined}
            data-finspo-masonry-item
            key={key}
            style={isFeatured ? {
              gridColumnEnd: `span ${featuredColumnSpan}`,
              gridColumnStart: 1,
              gridRowStart: 1,
            } : undefined}
          >
            {item}
          </div>
        )
      })}
    </div>
  )
}
