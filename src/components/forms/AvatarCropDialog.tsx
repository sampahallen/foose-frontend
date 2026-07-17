import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
  type PointerEvent,
} from 'react'
import { InlineNotice } from '../feedback/InlineNotice'
import { Icon } from '../icons/Icon'
import { Dialog } from './Dialog'

const ACCEPTED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])
const DEFAULT_MAX_BYTES = 5 * 1024 * 1024
const DEFAULT_OUTPUT_SIZE = 512
const MIN_ZOOM = 1
const MAX_ZOOM = 3

type Point = { x: number; y: number }

type DragState = Point & {
  pan: Point
  pointerId: number
}

export type AvatarCropDialogProps = {
  initialFile?: File | null
  maxBytes?: number
  onApply: (file: File) => Promise<void> | void
  onCancel: () => void
  open: boolean
  outputSize?: number
}

function formatMegabytes(bytes: number) {
  return `${Math.round(bytes / (1024 * 1024))} MB`
}

function validateFile(file: File, maxBytes: number) {
  if (!ACCEPTED_IMAGE_TYPES.has(file.type.toLowerCase())) {
    return 'Choose a JPEG, PNG, or WebP image.'
  }
  if (file.size > maxBytes) {
    return `Choose an image that is ${formatMegabytes(maxBytes)} or smaller.`
  }
  return null
}

function imageMetrics(image: HTMLImageElement, outputSize: number, zoom: number) {
  const baseScale = Math.max(outputSize / image.naturalWidth, outputSize / image.naturalHeight)
  const scale = baseScale * zoom
  const width = image.naturalWidth * scale
  const height = image.naturalHeight * scale
  return {
    height,
    maxX: Math.max((width - outputSize) / 2, 0),
    maxY: Math.max((height - outputSize) / 2, 0),
    scale,
    width,
  }
}

function clampPan(point: Point, image: HTMLImageElement | null, outputSize: number, zoom: number): Point {
  if (!image) return { x: 0, y: 0 }
  const { maxX, maxY } = imageMetrics(image, outputSize, zoom)
  return {
    x: Math.max(-maxX, Math.min(maxX, point.x)),
    y: Math.max(-maxY, Math.min(maxY, point.y)),
  }
}

function drawCrop(
  canvas: HTMLCanvasElement,
  image: HTMLImageElement,
  outputSize: number,
  zoom: number,
  pan: Point,
) {
  const context = canvas.getContext('2d')
  if (!context) return false
  const { height, width } = imageMetrics(image, outputSize, zoom)
  context.clearRect(0, 0, outputSize, outputSize)
  context.imageSmoothingEnabled = true
  context.imageSmoothingQuality = 'high'
  context.drawImage(
    image,
    (outputSize - width) / 2 + pan.x,
    (outputSize - height) / 2 + pan.y,
    width,
    height,
  )
  return true
}

function canvasBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new Error('The cropped image could not be prepared.'))
    }, 'image/jpeg', 0.92)
  })
}

function outputName(file: File | null) {
  const stem = (file?.name || 'profile-photo').replace(/\.[^.]+$/, '').replace(/[^a-z0-9_-]+/gi, '-').replace(/^-|-$/g, '')
  return `${stem || 'profile-photo'}-avatar.jpg`
}

export function AvatarCropDialog({
  initialFile = null,
  maxBytes = DEFAULT_MAX_BYTES,
  onApply,
  onCancel,
  open,
  outputSize = DEFAULT_OUTPUT_SIZE,
}: AvatarCropDialogProps) {
  const inputId = `avatar-file-${useId()}`
  const instructionsId = `avatar-crop-instructions-${useId()}`
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const previewUrlRef = useRef<string | null>(null)
  const loadVersionRef = useRef(0)
  const dragRef = useRef<DragState | null>(null)
  const selectedFileRef = useRef<File | null>(null)
  const imageRef = useRef<HTMLImageElement | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [image, setImage] = useState<HTMLImageElement | null>(null)
  const [pan, setPan] = useState<Point>({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(MIN_ZOOM)
  const [loadingImage, setLoadingImage] = useState(false)
  const [applying, setApplying] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const releasePreviewUrl = useCallback(() => {
    if (!previewUrlRef.current) return
    URL.revokeObjectURL(previewUrlRef.current)
    previewUrlRef.current = null
  }, [])

  const resetEditor = useCallback(() => {
    loadVersionRef.current += 1
    dragRef.current = null
    releasePreviewUrl()
    selectedFileRef.current = null
    imageRef.current = null
    setSelectedFile(null)
    setImage(null)
    setPan({ x: 0, y: 0 })
    setZoom(MIN_ZOOM)
    setLoadingImage(false)
    setApplying(false)
    setError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }, [releasePreviewUrl])

  const loadFile = useCallback((file: File) => {
    const validationError = validateFile(file, maxBytes)
    if (validationError) {
      setError(validationError)
      return
    }

    const version = loadVersionRef.current + 1
    loadVersionRef.current = version
    releasePreviewUrl()
    selectedFileRef.current = file
    imageRef.current = null
    setError(null)
    setLoadingImage(true)
    setSelectedFile(file)
    setImage(null)
    setPan({ x: 0, y: 0 })
    setZoom(MIN_ZOOM)

    const url = URL.createObjectURL(file)
    previewUrlRef.current = url
    const nextImage = new Image()
    nextImage.onload = () => {
      if (loadVersionRef.current !== version) return
      imageRef.current = nextImage
      setImage(nextImage)
      setLoadingImage(false)
    }
    nextImage.onerror = () => {
      if (loadVersionRef.current !== version) return
      imageRef.current = null
      setImage(null)
      setLoadingImage(false)
      setError('This image could not be opened. Choose another image and try again.')
    }
    nextImage.src = url
  }, [maxBytes, releasePreviewUrl])

  useEffect(() => {
    if (!open) return undefined
    const timer = window.setTimeout(() => {
      if (initialFile) loadFile(initialFile)
      else resetEditor()
    }, 0)
    return () => window.clearTimeout(timer)
  }, [initialFile, loadFile, open, resetEditor])

  useEffect(() => () => {
    loadVersionRef.current += 1
    releasePreviewUrl()
  }, [releasePreviewUrl])

  useEffect(() => {
    if (!image || !canvasRef.current) return
    drawCrop(canvasRef.current, image, outputSize, zoom, pan)
  }, [image, outputSize, pan, zoom])

  function chooseFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (file) loadFile(file)
  }

  function moveImage(nextPoint: Point) {
    setPan(clampPan(nextPoint, image, outputSize, zoom))
  }

  function finishDrag(event: PointerEvent<HTMLCanvasElement>) {
    if (dragRef.current?.pointerId !== event.pointerId) return
    dragRef.current = null
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  function handleCropKeyDown(event: KeyboardEvent<HTMLCanvasElement>) {
    const amount = event.shiftKey ? 24 : 8
    const delta: Record<string, Point> = {
      ArrowDown: { x: 0, y: amount },
      ArrowLeft: { x: -amount, y: 0 },
      ArrowRight: { x: amount, y: 0 },
      ArrowUp: { x: 0, y: -amount },
    }
    const movement = delta[event.key]
    if (!movement) return
    event.preventDefault()
    moveImage({ x: pan.x + movement.x, y: pan.y + movement.y })
  }

  async function applyCrop() {
    const canvas = canvasRef.current
    const currentImage = imageRef.current
    const currentFile = selectedFileRef.current
    if (!currentFile) {
      setError('Choose an image before applying your profile photo.')
      return
    }
    if (!currentImage) {
      setError('The selected image is still loading. Wait a moment and try again.')
      return
    }
    if (!canvas) {
      setError('Your browser could not prepare this image. Choose another image and try again.')
      return
    }

    setApplying(true)
    setError(null)
    try {
      if (!drawCrop(canvas, currentImage, outputSize, zoom, pan)) {
        throw new Error('Your browser could not prepare this image.')
      }
      const blob = await canvasBlob(canvas)
      const croppedFile = new File([blob], outputName(currentFile), {
        lastModified: Date.now(),
        type: 'image/jpeg',
      })
      await onApply(croppedFile)
    } catch (applyError) {
      setError(applyError instanceof Error ? applyError.message : 'The profile photo could not be prepared. Try again.')
    } finally {
      setApplying(false)
    }
  }

  function cancel() {
    if (applying) return
    resetEditor()
    onCancel()
  }

  const footer = (
    <>
      <button
        className="inline-flex min-h-11 items-center justify-center rounded-xl border border-foose-border bg-white px-5 py-2.5 text-sm font-bold text-foose-text transition hover:border-accent hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50"
        disabled={applying}
        onClick={cancel}
        type="button"
      >
        Cancel
      </button>
      <button
        aria-busy={applying || undefined}
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-accent bg-accent px-5 py-2.5 text-sm font-black text-white shadow-sm shadow-accent/15 transition hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:border-foose-border disabled:bg-foose-surface-mid disabled:text-foose-faint disabled:shadow-none"
        disabled={!image || loadingImage || applying}
        onClick={applyCrop}
        type="button"
      >
        {applying && <span aria-hidden="true" className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent motion-reduce:animate-none" />}
        {applying ? 'Preparing photo...' : 'Apply photo'}
      </button>
    </>
  )

  return (
    <Dialog
      description="Choose a photo, then move and zoom it until it fits the frame."
      dismissible={!applying}
      footer={footer}
      onClose={cancel}
      open={open}
      size="md"
      title="Change profile photo"
    >
      <div aria-busy={loadingImage || applying || undefined} className="space-y-4">
        <input
          accept="image/jpeg,image/png,image/webp"
          aria-label="Choose profile photo"
          className="sr-only"
          disabled={applying}
          id={inputId}
          onChange={chooseFile}
          ref={fileInputRef}
          type="file"
        />

        {error && <InlineNotice title="Profile photo not ready" tone="error">{error}</InlineNotice>}

        {!selectedFile && !loadingImage && (
          <div className="flex min-h-64 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-foose-border bg-foose-surface-low/60 px-6 py-10 text-center">
            <span aria-hidden="true" className="grid size-12 place-items-center rounded-full bg-accent-light text-accent"><Icon name="camera" size={23} /></span>
            <p className="mt-4 font-display text-lg font-semibold text-foose-text">Choose your best square-friendly photo</p>
            <p className="mt-1 max-w-sm text-sm leading-6 text-foose-muted">JPEG, PNG, or WebP, up to {formatMegabytes(maxBytes)}. You can reposition and zoom it next.</p>
            <button
              className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-accent bg-white px-5 py-2.5 text-sm font-black text-accent transition hover:bg-accent-light focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              onClick={() => fileInputRef.current?.click()}
              type="button"
            >
              <Icon name="upload" size={18} />
              Choose photo
            </button>
          </div>
        )}

        {(selectedFile || loadingImage) && (
          <>
            <div className="relative mx-auto aspect-square w-full max-w-[27rem] overflow-hidden rounded-2xl bg-slate-950 shadow-inner">
              <canvas
                aria-describedby={instructionsId}
                aria-label="Profile photo crop area"
                className={`block size-full touch-none select-none ${image ? 'cursor-grab active:cursor-grabbing' : 'opacity-40'}`}
                height={outputSize}
                onKeyDown={handleCropKeyDown}
                onPointerCancel={finishDrag}
                onPointerDown={(event) => {
                  if (!image || applying) return
                  dragRef.current = {
                    pan,
                    pointerId: event.pointerId,
                    x: event.clientX,
                    y: event.clientY,
                  }
                  event.currentTarget.setPointerCapture?.(event.pointerId)
                }}
                onPointerMove={(event) => {
                  const drag = dragRef.current
                  if (!drag || drag.pointerId !== event.pointerId || !image) return
                  const rect = event.currentTarget.getBoundingClientRect()
                  const scale = outputSize / (rect.width || outputSize)
                  moveImage({
                    x: drag.pan.x + (event.clientX - drag.x) * scale,
                    y: drag.pan.y + (event.clientY - drag.y) * scale,
                  })
                }}
                onPointerUp={finishDrag}
                ref={canvasRef}
                role="img"
                tabIndex={image ? 0 : -1}
                width={outputSize}
              />
              <div aria-hidden="true" className="pointer-events-none absolute inset-1 rounded-full border-2 border-white/90 shadow-[0_0_0_999px_rgba(2,6,23,0.38)]" />
              <div aria-hidden="true" className="pointer-events-none absolute inset-0 grid grid-cols-3 grid-rows-3 opacity-35 [&>span]:border-white/70">
                <span className="border-r border-b" /><span className="border-r border-b" /><span className="border-b" />
                <span className="border-r border-b" /><span className="border-r border-b" /><span className="border-b" />
                <span className="border-r" /><span className="border-r" /><span />
              </div>
              {loadingImage && (
                <div className="absolute inset-0 grid place-items-center bg-slate-950/75 text-white" role="status">
                  <span className="flex items-center gap-2 text-sm font-bold">
                    <span aria-hidden="true" className="size-5 animate-spin rounded-full border-2 border-current border-t-transparent motion-reduce:animate-none" />
                    Preparing image...
                  </span>
                </div>
              )}
            </div>

            <p className="text-center text-sm leading-6 text-foose-muted" id={instructionsId}>Drag the image to reposition it. Keyboard users can use the arrow keys; hold Shift for larger movements.</p>

            <div className="rounded-2xl border border-foose-border bg-foose-surface-low/55 p-4">
              <div className="flex items-center gap-3">
                <span aria-hidden="true" className="text-lg font-black text-foose-muted">-</span>
                <label className="sr-only" htmlFor={`${inputId}-zoom`}>Zoom image</label>
                <input
                  className="h-11 min-w-0 flex-1 cursor-pointer accent-accent disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={!image || applying}
                  id={`${inputId}-zoom`}
                  max={MAX_ZOOM}
                  min={MIN_ZOOM}
                  onChange={(event) => {
                    const nextZoom = Number(event.target.value)
                    setZoom(nextZoom)
                    setPan((current) => clampPan(current, image, outputSize, nextZoom))
                  }}
                  step="0.01"
                  type="range"
                  value={zoom}
                />
                <span aria-hidden="true" className="text-xl font-black text-foose-muted">+</span>
              </div>
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                <p className="min-w-0 flex-1 truncate text-xs font-semibold text-foose-muted" title={selectedFile?.name}>{selectedFile?.name}</p>
                <div className="flex gap-1">
                  <button
                    className="inline-flex min-h-11 items-center justify-center rounded-xl px-3 text-sm font-bold text-foose-muted transition hover:bg-white hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent disabled:opacity-50"
                    disabled={!image || applying}
                    onClick={() => {
                      setPan({ x: 0, y: 0 })
                      setZoom(MIN_ZOOM)
                    }}
                    type="button"
                  >
                    Reset
                  </button>
                  <button
                    className="inline-flex min-h-11 items-center justify-center rounded-xl px-3 text-sm font-black text-accent transition hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent disabled:opacity-50"
                    disabled={applying}
                    onClick={() => fileInputRef.current?.click()}
                    type="button"
                  >
                    Replace
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </Dialog>
  )
}
