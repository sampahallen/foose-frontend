import { useState, type ReactEventHandler } from 'react'
import { useImagePreviewStore, type PreviewItem } from '../../stores/imagePreviewStore'

export function LightboxImage({
  alt,
  className,
  index = 0,
  items,
  onError,
  onLoad,
  src,
}: {
  alt: string
  className?: string
  index?: number
  items?: PreviewItem[]
  onError?: ReactEventHandler<HTMLImageElement>
  onLoad?: ReactEventHandler<HTMLImageElement>
  src: string
}) {
  const openPreview = useImagePreviewStore((store) => store.openPreview)
  const previewItems = items?.length ? items : [{ alt, src }]
  const [failedSrc, setFailedSrc] = useState('')
  const failed = failedSrc === src

  return (
    <button
      aria-label={failed ? `${alt} — media unavailable` : `Open ${alt}`}
      className={`lightbox-trigger block w-full border-0 bg-transparent p-0 ${className || ''} `}
      disabled={failed}
      onClick={() => openPreview(previewItems, index)}
      type="button"
    >
      {failed ? (
        <span className="flex h-full min-h-28 w-full items-center justify-center bg-foose-surface-mid px-3 text-center text-sm font-semibold text-foose-faint" role="img">
          Media unavailable
        </span>
      ) : (
        <img
          alt={alt}
          onError={(event) => {
            setFailedSrc(src)
            onError?.(event)
          }}
          onLoad={onLoad}
          src={src}
        />
      )}
    </button>
  )
}
