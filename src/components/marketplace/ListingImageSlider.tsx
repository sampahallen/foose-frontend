import { useMemo, useRef, useState, type KeyboardEvent, type UIEvent } from 'react'
import { useImagePreviewStore, type PreviewItem } from '../../stores/imagePreviewStore'
import { Icon } from '../icons/Icon'
import { SafeImage } from '../ui/SafeImage'

function uniqueImages(images: Array<string | null | undefined>) {
  return Array.from(new Set(images.map((image) => image?.trim()).filter((image): image is string => Boolean(image))))
}

export function ListingImageSlider({
  images,
  title,
}: {
  images: Array<string | null | undefined>
  title: string
}) {
  const sources = useMemo(() => uniqueImages(images), [images])
  const previewItems = useMemo<PreviewItem[]>(() => sources.map((src, index) => ({
    alt: `${title} image ${index + 1}`,
    src,
  })), [sources, title])
  const openPreview = useImagePreviewStore((store) => store.openPreview)
  const trackRef = useRef<HTMLDivElement | null>(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const [failedImages, setFailedImages] = useState<Set<string>>(() => new Set())
  const [imageRatios, setImageRatios] = useState<Record<string, number>>({})
  const hasNavigation = sources.length > 1

  function selectImage(index: number) {
    const nextIndex = Math.min(Math.max(index, 0), Math.max(sources.length - 1, 0))
    setActiveIndex(nextIndex)
    const track = trackRef.current
    if (!track) return
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    track.scrollTo({ behavior: reducedMotion ? 'auto' : 'smooth', left: nextIndex * track.clientWidth })
  }

  function handleScroll(event: UIEvent<HTMLDivElement>) {
    const track = event.currentTarget
    if (!track.clientWidth) return
    const nextIndex = Math.min(
      Math.max(Math.round(track.scrollLeft / track.clientWidth), 0),
      Math.max(sources.length - 1, 0),
    )
    setActiveIndex((current) => current === nextIndex ? current : nextIndex)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
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

  if (!sources.length) {
    return <span className="flex min-h-72 items-center justify-center rounded-xl bg-foose-surface-mid text-sm font-semibold text-foose-faint">No image</span>
  }

  return (
    <section aria-label={`${title} photos`} aria-roledescription="carousel" className="space-y-3" onKeyDown={handleKeyDown}>
      <div className="relative overflow-hidden rounded-xl bg-foose-surface-mid shadow-sm">
        <div
          className="flex w-full snap-x snap-mandatory overflow-x-auto overscroll-x-contain scroll-smooth [scrollbar-width:none] motion-reduce:scroll-auto md:max-h-[calc(100dvh-9rem)] [&::-webkit-scrollbar]:hidden"
          data-testid="listing-image-track"
          onScroll={handleScroll}
          ref={trackRef}
          style={{ aspectRatio: imageRatios[sources[activeIndex]] || 4 / 5 }}
        >
          {sources.map((src, index) => {
            const failed = failedImages.has(src)
            return (
              <div
                aria-label={`Image ${index + 1} of ${sources.length}`}
                aria-roledescription="slide"
                className="h-full min-w-full snap-center snap-always"
                key={src}
                role="group"
              >
                <button
                  aria-label={failed ? `${title} image ${index + 1} unavailable` : `Open ${title} image ${index + 1}`}
                  className="block h-full w-full border-0 bg-transparent p-0 focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-accent"
                  disabled={failed}
                  onClick={() => openPreview(previewItems, index)}
                  tabIndex={index === activeIndex ? 0 : -1}
                  type="button"
                >
                  <SafeImage
                    alt={`${title} image ${index + 1}`}
                    className="h-full w-full select-none object-contain"
                    decoding="async"
                    draggable={false}
                    fallback="Image unavailable"
                    loading={Math.abs(index - activeIndex) <= 1 ? 'eager' : 'lazy'}
                    onError={() => setFailedImages((current) => new Set(current).add(src))}
                    onLoad={(event) => {
                      const ratio = event.currentTarget.naturalWidth / event.currentTarget.naturalHeight
                      if (!Number.isFinite(ratio) || ratio <= 0) return
                      setImageRatios((current) => current[src] === ratio ? current : { ...current, [src]: ratio })
                    }}
                    src={src}
                  />
                </button>
              </div>
            )
          })}
        </div>

        {hasNavigation && (
          <>
            <button
              aria-label="Previous listing image"
              className="absolute left-3 top-1/2 z-20 hidden size-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 text-foose-text shadow-lg transition hover:bg-accent hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:pointer-events-none disabled:opacity-35 md:inline-flex"
              disabled={activeIndex === 0}
              onClick={() => selectImage(activeIndex - 1)}
              type="button"
            >
              <span className="rotate-180"><Icon name="chevron" /></span>
            </button>
            <button
              aria-label="Next listing image"
              className="absolute right-3 top-1/2 z-20 hidden size-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 text-foose-text shadow-lg transition hover:bg-accent hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:pointer-events-none disabled:opacity-35 md:inline-flex"
              disabled={activeIndex === sources.length - 1}
              onClick={() => selectImage(activeIndex + 1)}
              type="button"
            >
              <Icon name="chevron" />
            </button>
            <span className="absolute bottom-3 right-3 z-20 rounded-full bg-black/65 px-2.5 py-1 text-xs font-black text-white" aria-hidden="true">
              {activeIndex + 1}/{sources.length}
            </span>
          </>
        )}
      </div>

      {hasNavigation && (
        <div aria-label="Choose a listing image" className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:thin]" role="group">
          {sources.map((src, index) => (
            <button
              aria-label={`Show image ${index + 1} of ${sources.length}`}
              aria-pressed={activeIndex === index}
              className={`relative size-14 shrink-0 overflow-hidden rounded-lg border-2 bg-foose-surface-low transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:size-16 ${activeIndex === index ? 'border-accent shadow-sm' : 'border-transparent opacity-75 hover:opacity-100'}`}
              key={src}
              onClick={() => selectImage(index)}
              type="button"
            >
              <SafeImage alt="" className="h-full w-full object-cover" draggable={false} loading="lazy" src={src} />
            </button>
          ))}
        </div>
      )}

      <p aria-live="polite" className="sr-only">Image {activeIndex + 1} of {sources.length}</p>
    </section>
  )
}
