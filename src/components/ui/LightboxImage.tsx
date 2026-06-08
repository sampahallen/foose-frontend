import { useState } from 'react'
import { Icon } from '../icons/Icon'

export function LightboxImage({
  alt,
  className,
  src,
}: {
  alt: string
  className?: string
  src: string
}) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button className={`lightbox-trigger block w-full border-0 bg-transparent p-0 ${className || ''} `} onClick={() => setOpen(true)} type="button">
        <img alt={alt} src={src} />
      </button>
      {open && (
        <div className="image-lightbox fixed inset-0 z-100 flex items-center justify-center bg-black/85 p-4 [&>img]:max-h-[88dvh] [&>img]:max-w-[92vw] [&>img]:rounded-xl [&>img]:object-contain [&>video]:max-h-[88dvh] [&>video]:max-w-[92vw] [&>video]:rounded-xl [&>video]:object-contain" role="dialog" aria-modal="true" aria-label={alt || 'Image preview'}>
          <button className="image-lightbox-close absolute right-2 top-2 inline-flex size-9 items-center justify-center rounded-full border border-white/30 bg-black/60 text-white hover:bg-black" onClick={() => setOpen(false)} type="button" aria-label="Close image preview">
            <Icon name="plus" />
          </button>
          <img alt={alt} src={src} />
        </div>
      )}
    </>
  )
}
