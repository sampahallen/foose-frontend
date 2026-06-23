import { useEffect } from 'react'
import { useImagePreviewStore } from '../../stores/imagePreviewStore'
import { Icon } from '../icons/Icon'

export function ImagePreviewModal() {
  const { closePreview, index, items, nextPreview, previousPreview } = useImagePreviewStore()
  const item = items[index]
  const hasNavigation = items.length > 1

  useEffect(() => {
    if (!item) return undefined

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') closePreview()
      if (event.key === 'ArrowLeft') previousPreview()
      if (event.key === 'ArrowRight') nextPreview()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [closePreview, item, nextPreview, previousPreview])

  if (!item) return null

  return (
    <div
      aria-label={item.alt || 'Media preview'}
      aria-modal="true"
      className="image-lightbox fixed inset-0 z-[120] flex items-center justify-center bg-black/85 p-4"
      onClick={closePreview}
      role="dialog"
    >
      <button
        aria-label="Close preview"
        className="image-lightbox-close absolute right-3 top-3 inline-flex size-10 items-center justify-center rounded-full border border-white/30 bg-black/60 text-white transition hover:bg-black"
        onClick={(event) => {
          event.stopPropagation()
          closePreview()
        }}
        type="button"
      >
        <Icon name="close" />
      </button>
      {hasNavigation && (
        <button
          aria-label="Previous preview"
          className="absolute left-3 top-1/2 inline-flex size-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/30 bg-black/60 text-white transition hover:bg-black"
          onClick={(event) => {
            event.stopPropagation()
            previousPreview()
          }}
          type="button"
        >
          <span className="rotate-180">
            <Icon name="chevron" />
          </span>
        </button>
      )}
      <div className="flex max-h-[88dvh] max-w-[92vw] items-center justify-center" onClick={(event) => event.stopPropagation()}>
        {item.type === 'video' ? (
          <video className="max-h-[88dvh] max-w-[92vw] rounded-xl object-contain" controls src={item.src} />
        ) : (
          <img alt={item.alt || 'Preview'} className="max-h-[88dvh] max-w-[92vw] rounded-xl object-contain" src={item.src} />
        )}
      </div>
      {hasNavigation && (
        <button
          aria-label="Next preview"
          className="absolute right-3 top-1/2 inline-flex size-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/30 bg-black/60 text-white transition hover:bg-black"
          onClick={(event) => {
            event.stopPropagation()
            nextPreview()
          }}
          type="button"
        >
          <Icon name="chevron" />
        </button>
      )}
    </div>
  )
}
