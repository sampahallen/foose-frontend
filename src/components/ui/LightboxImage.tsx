import { useImagePreviewStore, type PreviewItem } from '../../stores/imagePreviewStore'

export function LightboxImage({
  alt,
  className,
  index = 0,
  items,
  src,
}: {
  alt: string
  className?: string
  index?: number
  items?: PreviewItem[]
  src: string
}) {
  const openPreview = useImagePreviewStore((store) => store.openPreview)
  const previewItems = items?.length ? items : [{ alt, src }]

  return (
    <button className={`lightbox-trigger block w-full border-0 bg-transparent p-0 ${className || ''} `} onClick={() => openPreview(previewItems, index)} type="button">
      <img alt={alt} src={src} />
    </button>
  )
}
