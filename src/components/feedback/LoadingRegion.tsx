import type { ReactNode } from 'react'

export type FeedbackLayout = 'page' | 'section' | 'pane' | 'compact' | 'immersive'

const layoutClasses: Record<FeedbackLayout, string> = {
  compact: 'w-full',
  immersive: 'flex min-h-[60dvh] w-full items-center justify-center py-8',
  page: 'my-6 w-full',
  pane: 'min-h-0 w-full',
  section: 'my-4 w-full',
}

export function LoadingRegion({
  children,
  className = '',
  label,
  layout = 'section',
}: {
  children: ReactNode
  className?: string
  label: string
  layout?: FeedbackLayout
}) {
  return (
    <section
      aria-busy="true"
      aria-label={label}
      className={`${layoutClasses[layout]} ${className}`}
      data-layout={layout}
      role="status"
    >
      <span className="sr-only">{label}</span>
      <div aria-hidden="true">{children}</div>
    </section>
  )
}
