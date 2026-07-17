import { useState, type ImgHTMLAttributes, type ReactNode } from 'react'

type SafeImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> & {
  fallback?: ReactNode
  fallbackClassName?: string
  fallbackLabel?: string
  src?: string | null
}

export function SafeImage({
  alt = '',
  className = '',
  fallback = 'Media unavailable',
  fallbackClassName = '',
  fallbackLabel = 'Media unavailable',
  onError,
  src,
  ...imageProps
}: SafeImageProps) {
  const [failedSrc, setFailedSrc] = useState('')
  const failed = !src || failedSrc === src

  if (failed) {
    const decorative = alt === ''
    return (
      <span
        aria-hidden={decorative || undefined}
        aria-label={decorative ? undefined : fallbackLabel}
        className={`flex items-center justify-center bg-foose-surface-mid px-2 text-center text-xs font-semibold text-foose-faint ${className} ${fallbackClassName}`}
        role={decorative ? undefined : 'img'}
      >
        {fallback}
      </span>
    )
  }

  return (
    <img
      {...imageProps}
      alt={alt}
      className={className}
      onError={(event) => {
        setFailedSrc(src)
        onError?.(event)
      }}
      src={src}
    />
  )
}
