import { useEffect, useMemo, useRef, useState } from 'react'
import { LightboxImage } from './LightboxImage'

type PreviewFile = {
  file: File
  id: string
  name: string
  url: string
}

function fileId(file: File, index: number) {
  return `${file.name}-${file.lastModified}-${file.size}-${Date.now()}-${index}`
}

export function ImagePreviewInput({
  accept,
  existingImages = [],
  keptName,
  keptTouchedName,
  maxFiles,
  multiple = false,
  name,
  required = false,
}: {
  accept: string
  existingImages?: string[]
  keptName?: string
  keptTouchedName?: string
  maxFiles?: number
  multiple?: boolean
  name: string
  required?: boolean
}) {
  const existingImagesKey = existingImages.join('\n')
  const [files, setFiles] = useState<PreviewFile[]>([])
  const [keptImages, setKeptImages] = useState(() => (existingImagesKey ? existingImagesKey.split('\n') : []))
  const inputRef = useRef<HTMLInputElement | null>(null)
  const filesRef = useRef<PreviewFile[]>([])
  const hasExistingImages = Boolean(existingImagesKey)
  const visibleFiles = useMemo(() => (maxFiles ? files.slice(0, maxFiles) : files), [files, maxFiles])
  const remainingSlots = Math.max((maxFiles || Number.POSITIVE_INFINITY) - keptImages.length - visibleFiles.length, 0)

  function syncInputFiles(nextFiles: PreviewFile[]) {
    const input = inputRef.current
    if (!input || typeof DataTransfer === 'undefined') return

    const transfer = new DataTransfer()
    nextFiles.forEach((item) => transfer.items.add(item.file))
    input.files = transfer.files
  }

  useEffect(() => {
    const nextExistingImages = existingImagesKey ? existingImagesKey.split('\n') : []
    const timer = window.setTimeout(() => setKeptImages(nextExistingImages), 0)
    return () => window.clearTimeout(timer)
  }, [existingImagesKey])

  useEffect(() => {
    filesRef.current = files
  }, [files])

  useEffect(() => {
    return () => {
      filesRef.current.forEach((file) => URL.revokeObjectURL(file.url))
    }
  }, [])

  function addFiles(fileList: FileList | null) {
    const selected = Array.from(fileList || [])
      .slice(0, remainingSlots)
      .map((file, index) => ({ file, id: fileId(file, index), name: file.name, url: URL.createObjectURL(file) }))

    setFiles((currentFiles) => {
      const nextFiles = [...currentFiles, ...selected].slice(0, maxFiles ? Math.max(maxFiles - keptImages.length, 0) : undefined)
      syncInputFiles(nextFiles)
      return nextFiles
    })
  }

  function removeSelectedFile(id: string) {
    setFiles((currentFiles) => {
      const nextFiles = currentFiles.filter((file) => {
        if (file.id !== id) return true
        URL.revokeObjectURL(file.url)
        return false
      })
      syncInputFiles(nextFiles)
      return nextFiles
    })
  }

  return (
    <>
      <input
        accept={accept}
        multiple={multiple}
        name={name}
        ref={inputRef}
        onChange={(event) => {
          addFiles(event.target.files)
        }}
        required={required && !keptImages.length && !visibleFiles.length}
        type="file"
      />
      {keptName &&
        keptImages.map((image) => (
          <input key={image} name={keptName} type="hidden" value={image} />
        ))}
      {keptTouchedName && hasExistingImages && <input name={keptTouchedName} type="hidden" value="1" />}
      {!!keptImages.length && (
        <div className="image-preview-grid mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 [&_img]:aspect-square [&_img]:h-full [&_img]:w-full [&_img]:object-cover [&_.lightbox-trigger]:aspect-square [&_.lightbox-trigger]:h-full [&_.lightbox-trigger]:w-full [&_.lightbox-trigger]:object-cover">
          {keptImages.map((image, index) => (
            <div className="image-preview-item relative overflow-hidden rounded-lg border border-foose-border" key={image}>
              <LightboxImage alt={`Current upload ${index + 1}`} src={image} />
              <button
                aria-label={`Remove current upload ${index + 1}`}
                className="image-preview-remove absolute right-2 top-2 inline-flex size-9 items-center justify-center rounded-full border border-white/30 bg-black/60 text-white hover:bg-black"
                onClick={() => setKeptImages((currentImages) => currentImages.filter((currentImage) => currentImage !== image))}
                type="button"
              >
                x
              </button>
            </div>
          ))}
        </div>
      )}
      {!!visibleFiles.length && (
        <div className="image-preview-grid mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 [&_img]:aspect-square [&_img]:h-full [&_img]:w-full [&_img]:object-cover [&_.lightbox-trigger]:aspect-square [&_.lightbox-trigger]:h-full [&_.lightbox-trigger]:w-full [&_.lightbox-trigger]:object-cover">
          {visibleFiles.map((file, index) => (
            <div className="image-preview-item relative overflow-hidden rounded-lg border border-foose-border" key={file.id}>
              <LightboxImage alt={`${file.name || 'Selected upload'} ${index + 1}`} src={file.url} />
              <button
                aria-label={`Remove selected upload ${index + 1}`}
                className="image-preview-remove absolute right-2 top-2 inline-flex size-9 items-center justify-center rounded-full border border-white/30 bg-black/60 text-white hover:bg-black"
                onClick={() => removeSelectedFile(file.id)}
                type="button"
              >
                x
              </button>
            </div>
          ))}
        </div>
      )}
      {maxFiles && (
        <span className="muted-copy text-sm leading-6 text-foose-muted md:text-base">
          {remainingSlots > 0
            ? `Add ${remainingSlots} more image${remainingSlots === 1 ? '' : 's'}.`
            : `Maximum of ${maxFiles} image${maxFiles === 1 ? '' : 's'} reached.`}
        </span>
      )}
    </>
  )
}
