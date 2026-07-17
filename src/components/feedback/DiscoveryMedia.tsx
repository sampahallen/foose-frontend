import { SafeImage } from '../ui/SafeImage'

export function DiscoveryImage({
  alt = '',
  className = '',
  fallback = 'Media unavailable',
  fallbackClassName = '',
  loading = 'lazy',
  src,
}: {
  alt?: string
  className?: string
  fallback?: string
  fallbackClassName?: string
  loading?: 'eager' | 'lazy'
  src?: string
}) {
  return (
    <SafeImage
      alt={alt}
      className={className}
      fallback={fallback}
      fallbackClassName={`px-3 text-xs font-bold text-foose-muted ${fallbackClassName}`}
      fallbackLabel={alt ? `${alt} unavailable` : fallback}
      loading={loading}
      src={src}
    />
  )
}
