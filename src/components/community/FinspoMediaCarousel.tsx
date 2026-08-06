import { useCallback, useEffect, useMemo, useRef, useState, type FocusEvent, type KeyboardEvent, type MouseEvent, type PointerEvent, type UIEvent } from 'react'
import { useImagePreviewStore, type PreviewItem } from '../../stores/imagePreviewStore'
import { Icon } from '../icons/Icon'
import { SafeImage } from '../ui/SafeImage'

type FinspoMediaCarouselProps = {
  alt: string
  autoplay?: boolean
  autoplayDelay?: number
  className?: string
  href?: string
  images: string[]
  onActiveImageLoad?: (image: { height: number; url: string; width: number }) => void
  onNavigate?: (event: MouseEvent<HTMLAnchorElement>) => void
  showArrows?: boolean
  surface?: 'detail' | 'feed' | 'profile'
  /** @deprecated Use surface instead. */
  variant?: 'detail' | 'feed'
}

export function FinspoMediaCarousel({
  alt,
  autoplay,
  autoplayDelay = 10_000,
  className = '',
  href,
  images,
  onActiveImageLoad,
  onNavigate,
  showArrows,
  surface,
  variant,
}: FinspoMediaCarouselProps) {
  const resolvedSurface = surface || variant || 'feed'
  const shouldAutoplay = autoplay ?? resolvedSurface === 'feed'
  const shouldShowArrows = showArrows ?? resolvedSurface === 'detail'
  const sources = useMemo(
    () => Array.from(new Set(images.map((image) => image.trim()).filter(Boolean))),
    [images],
  )
  const previewItems = useMemo<PreviewItem[]>(() => sources.map((src, index) => ({
    alt: `${alt} image ${index + 1}`,
    src,
  })), [alt, sources])
  const openPreview = useImagePreviewStore((store) => store.openPreview)
  const carouselRef = useRef<HTMLElement | null>(null)
  const trackRef = useRef<HTMLDivElement | null>(null)
  const pointerStartRef = useRef<number | null>(null)
  const suppressNavigationRef = useRef(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const [failedImages, setFailedImages] = useState<Set<string>>(() => new Set())
  const [ratios, setRatios] = useState<Record<string, number>>({})
  const [dimensions, setDimensions] = useState<Record<string, { height: number; url: string; width: number }>>({})
  const [documentVisible, setDocumentVisible] = useState(() => typeof document === 'undefined' || document.visibilityState !== 'hidden')
  const [focused, setFocused] = useState(false)
  const [hovered, setHovered] = useState(false)
  const [inViewport, setInViewport] = useState(true)
  const [reducedMotion, setReducedMotion] = useState(() => typeof window !== 'undefined' && Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches))
  const [timerVersion, setTimerVersion] = useState(0)
  const hasNavigation = sources.length > 1

  useEffect(() => {
    const carousel = carouselRef.current
    if (!carousel || typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(([entry]) => setInViewport(Boolean(entry?.isIntersecting)), { threshold: 0.1 })
    observer.observe(carousel)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const onVisibilityChange = () => setDocumentVisible(document.visibilityState !== 'hidden')
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => document.removeEventListener('visibilitychange', onVisibilityChange)
  }, [])

  useEffect(() => {
    const media = window.matchMedia?.('(prefers-reduced-motion: reduce)')
    if (!media) return
    const onChange = (event: MediaQueryListEvent) => setReducedMotion(event.matches)
    media.addEventListener?.('change', onChange)
    return () => media.removeEventListener?.('change', onChange)
  }, [])

  useEffect(() => {
    if (!hasNavigation || !shouldAutoplay || !inViewport || hovered || focused || !documentVisible || reducedMotion) return
    const timer = window.setTimeout(() => {
      const nextIndex = (activeIndex + 1) % sources.length
      setActiveIndex(nextIndex)
      const track = trackRef.current
      track?.scrollTo({ behavior: 'smooth', left: nextIndex * (track.clientWidth || 0) })
    }, autoplayDelay)
    return () => window.clearTimeout(timer)
  }, [activeIndex, autoplayDelay, documentVisible, focused, hasNavigation, hovered, inViewport, reducedMotion, shouldAutoplay, sources.length, timerVersion])

  useEffect(() => {
    const activeDimensions = dimensions[sources[activeIndex]]
    if (activeDimensions) onActiveImageLoad?.(activeDimensions)
  }, [activeIndex, dimensions, onActiveImageLoad, sources])

  const selectImage = useCallback((index: number, manual = true) => {
    const nextIndex = Math.min(Math.max(index, 0), Math.max(sources.length - 1, 0))
    setActiveIndex(nextIndex)
    if (manual) setTimerVersion((current) => current + 1)
    const track = trackRef.current
    if (!track) return
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    track.scrollTo({ behavior: reducedMotion ? 'auto' : 'smooth', left: nextIndex * track.clientWidth })
  }, [sources.length])

  function handleScroll(event: UIEvent<HTMLDivElement>) {
    const track = event.currentTarget
    if (!track.clientWidth) return
    const nextIndex = Math.min(
      Math.max(Math.round(track.scrollLeft / track.clientWidth), 0),
      Math.max(sources.length - 1, 0),
    )
    setActiveIndex((current) => current === nextIndex ? current : nextIndex)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (!hasNavigation) return
    if (event.key === 'ArrowLeft' && activeIndex > 0) {
      event.preventDefault()
      selectImage(activeIndex - 1)
    }
    if (event.key === 'ArrowRight' && activeIndex < sources.length - 1) {
      event.preventDefault()
      selectImage(activeIndex + 1)
    }
  }

  function beginPointer(event: PointerEvent<HTMLElement>) {
    pointerStartRef.current = event.clientX
    suppressNavigationRef.current = false
  }

  function endPointer(event: PointerEvent<HTMLElement>) {
    if (pointerStartRef.current !== null && Math.abs(event.clientX - pointerStartRef.current) > 8) {
      suppressNavigationRef.current = true
      setTimerVersion((current) => current + 1)
    }
    pointerStartRef.current = null
  }

  function handleLinkClick(event: MouseEvent<HTMLAnchorElement>) {
    if (suppressNavigationRef.current) {
      event.preventDefault()
      suppressNavigationRef.current = false
      return
    }
    onNavigate?.(event)
  }

  if (!sources.length) {
    return <span className="flex aspect-[4/5] w-full items-center justify-center bg-foose-surface-mid px-3 text-center text-xs font-bold text-foose-muted">Media unavailable</span>
  }

  const frameClass = resolvedSurface === 'detail'
    ? 'max-h-[min(72dvh,680px)]'
    : ''

  return (
    <section
      aria-label={`${alt} photos`}
      aria-roledescription="carousel"
      className={`relative overflow-hidden bg-foose-surface-mid ${frameClass} ${className}`}
      onBlur={(event: FocusEvent<HTMLElement>) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocused(false)
      }}
      onFocus={() => setFocused(true)}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onPointerDown={beginPointer}
      onPointerUp={endPointer}
      ref={carouselRef}
      style={{ aspectRatio: ratios[sources[activeIndex]] || 4 / 5 }}
    >
      <div
        className="flex h-full w-full snap-x snap-mandatory overflow-x-auto overscroll-x-contain scroll-smooth [scrollbar-width:none] motion-reduce:scroll-auto [&::-webkit-scrollbar]:hidden"
        data-testid="finspo-media-track"
        onScroll={handleScroll}
        ref={trackRef}
      >
        {sources.map((src, index) => {
          const failed = failedImages.has(src)
          const media = failed ? (
            <span className="flex h-full w-full items-center justify-center bg-foose-surface-mid px-3 text-center text-xs font-bold text-foose-muted" role="img" aria-label={`Image ${index + 1} unavailable`}>Media unavailable</span>
          ) : (
            <SafeImage
              alt={`${alt} image ${index + 1}`}
              className="h-full w-full select-none object-contain"
              decoding="async"
              draggable={false}
              fallback="Media unavailable"
              loading={Math.abs(index - activeIndex) <= 1 ? 'eager' : 'lazy'}
              onError={() => setFailedImages((current) => new Set(current).add(src))}
              onLoad={(event) => {
                const image = event.currentTarget
                const ratio = image.naturalWidth / image.naturalHeight
                if (Number.isFinite(ratio) && ratio > 0) {
                  setRatios((current) => current[src] === ratio ? current : { ...current, [src]: ratio })
                }
                if (image.naturalWidth && image.naturalHeight) {
                  setDimensions((current) => current[src]?.width === image.naturalWidth && current[src]?.height === image.naturalHeight
                    ? current
                    : { ...current, [src]: { height: image.naturalHeight, url: src, width: image.naturalWidth } })
                }
              }}
              src={src}
            />
          )

          return (
            <div aria-label={`Image ${index + 1} of ${sources.length}`} aria-roledescription="slide" className="h-full min-w-full snap-center snap-always" key={src} role="group">
              {href ? (
                <a
                  aria-label={`Open ${alt}, image ${index + 1} of ${sources.length}`}
                  className="block h-full w-full border-0 bg-transparent p-0 focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-accent"
                  href={href}
                  onClick={handleLinkClick}
                  tabIndex={index === activeIndex ? 0 : -1}
                >
                  {media}
                </a>
              ) : (
                <button
                  aria-label={failed ? `${alt} image ${index + 1} unavailable` : `Open ${alt} image ${index + 1}`}
                  className="block h-full w-full border-0 bg-transparent p-0 focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-accent"
                  disabled={failed}
                  onClick={() => openPreview(previewItems, index)}
                  tabIndex={index === activeIndex ? 0 : -1}
                  type="button"
                >
                  {media}
                </button>
              )}
            </div>
          )
        })}
      </div>

      {hasNavigation && (
        <>
          {shouldShowArrows && activeIndex > 0 && (
            <button aria-label="Previous Finspo image" className="absolute left-3 top-1/2 z-20 hidden size-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 text-foose-ink shadow-lg transition hover:bg-accent hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent lg:inline-flex" onClick={() => selectImage(activeIndex - 1)} type="button">
              <span className="rotate-180"><Icon name="chevron" /></span>
            </button>
          )}
          {shouldShowArrows && activeIndex < sources.length - 1 && (
            <button aria-label="Next Finspo image" className="absolute right-3 top-1/2 z-20 hidden size-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 text-foose-ink shadow-lg transition hover:bg-accent hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent lg:inline-flex" onClick={() => selectImage(activeIndex + 1)} type="button">
              <Icon name="chevron" />
            </button>
          )}
          <div aria-label="Choose a Finspo image" className="absolute bottom-3 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-black/35 px-2 py-1.5 backdrop-blur-sm" role="group">
            {sources.map((src, index) => (
              <button
                aria-label={`Show image ${index + 1} of ${sources.length}`}
                aria-pressed={activeIndex === index}
                className={`size-2 rounded-full ring-1 ring-white/70 transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${activeIndex === index ? 'scale-110 bg-white' : 'bg-white/45'}`}
                key={src}
                onClick={() => selectImage(index)}
                type="button"
              />
            ))}
          </div>
        </>
      )}
      <p aria-live="polite" className="sr-only">Image {activeIndex + 1} of {sources.length}</p>
    </section>
  )
}

export function FinspoMediaBadge({ count }: { count: number }) {
  if (count <= 1) return null
  return (
    <span aria-label={`${count} images`} className="absolute left-2 top-2 z-10 inline-flex min-h-7 items-center rounded-full bg-black/65 px-2 text-[11px] font-black text-white shadow">
      {count}
    </span>
  )
}
