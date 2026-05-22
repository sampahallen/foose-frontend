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
      <button className={`lightbox-trigger ${className || ''}`} onClick={() => setOpen(true)} type="button">
        <img alt={alt} src={src} />
      </button>
      {open && (
        <div className="image-lightbox" role="dialog" aria-modal="true" aria-label={alt || 'Image preview'}>
          <button className="image-lightbox-close" onClick={() => setOpen(false)} type="button" aria-label="Close image preview">
            <Icon name="plus" />
          </button>
          <img alt={alt} src={src} />
        </div>
      )}
    </>
  )
}
