import type { ElementType } from 'react'

export function SkeletonBlock({
  as: Component = 'div',
  className = '',
}: {
  as?: ElementType
  className?: string
}) {
  return (
    <Component
      aria-hidden="true"
      className={`block animate-pulse rounded-lg bg-foose-surface-mid motion-reduce:animate-none ${className}`}
    />
  )
}
