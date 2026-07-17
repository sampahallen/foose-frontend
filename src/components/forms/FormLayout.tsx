import type { HTMLAttributes, ReactNode } from 'react'

export function FormPage({
  actions,
  aside,
  children,
  className = '',
  description,
  eyebrow,
  title,
  width = 'standard',
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  actions?: ReactNode
  aside?: ReactNode
  description?: ReactNode
  eyebrow?: ReactNode
  title?: ReactNode
  width?: 'compact' | 'standard' | 'wide'
}) {
  const widthClass = width === 'compact' ? 'max-w-2xl' : width === 'wide' ? 'max-w-7xl' : 'max-w-5xl'

  return (
    <div {...props} className={`mx-auto w-full ${widthClass} px-4 py-6 sm:px-6 sm:py-8 lg:px-8 ${className}`}>
      {(title || description || eyebrow || actions) && (
        <header className="mb-6 flex flex-col gap-4 border-b border-foose-border/70 pb-6 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0 max-w-3xl">
            {eyebrow && <p className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-accent">{eyebrow}</p>}
            {title && <h1 className="font-display text-3xl font-semibold leading-tight text-foose-text sm:text-4xl">{title}</h1>}
            {description && <div className="mt-2 max-w-2xl text-sm leading-6 text-foose-muted sm:text-base">{description}</div>}
          </div>
          {actions && <div className="flex shrink-0 flex-wrap gap-2 [&_a]:min-h-11 [&_button]:min-h-11">{actions}</div>}
        </header>
      )}
      <div className={aside ? 'grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]' : ''}>
        <div className="min-w-0 space-y-5 sm:space-y-6">{children}</div>
        {aside && <aside className="min-w-0 lg:sticky lg:top-24">{aside}</aside>}
      </div>
    </div>
  )
}

export function FormSection({
  actions,
  children,
  className = '',
  columns = 1,
  description,
  title,
  ...props
}: HTMLAttributes<HTMLElement> & {
  actions?: ReactNode
  columns?: 1 | 2
  description?: ReactNode
  title?: ReactNode
}) {
  return (
    <section {...props} className={`rounded-2xl border border-foose-border/80 bg-foose-surface p-4 shadow-sm shadow-black/[0.025] sm:p-6 ${className}`}>
      {(title || description || actions) && (
        <div className="mb-5 flex flex-col gap-3 border-b border-foose-border/60 pb-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            {title && <h2 className="font-display text-xl font-semibold text-foose-text sm:text-2xl">{title}</h2>}
            {description && <div className="mt-1 text-sm leading-6 text-foose-muted">{description}</div>}
          </div>
          {actions && <div className="flex shrink-0 flex-wrap gap-2 [&_button]:min-h-11">{actions}</div>}
        </div>
      )}
      <div className={`grid gap-5 ${columns === 2 ? 'md:grid-cols-2 md:[&_.form-field-wide]:col-span-2' : ''}`}>{children}</div>
    </section>
  )
}

export function FormActions({
  children,
  className = '',
  pageInset = false,
  sticky = false,
}: {
  children: ReactNode
  className?: string
  pageInset?: boolean
  sticky?: boolean
}) {
  const mobileInset = pageInset
    ? '-mx-3 px-3 md:-mx-6 md:px-6'
    : '-mx-4 px-4 sm:-mx-6 sm:px-6'

  return (
    <div className={`${sticky ? `sticky bottom-[var(--foose-bottom-nav-inset)] z-20 border-t border-foose-border bg-white/95 py-3 backdrop-blur lg:static lg:mx-0 lg:border-0 lg:bg-transparent lg:px-0 lg:py-0 ${mobileInset}` : 'pt-2'} flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end [&_a]:min-h-11 [&_button]:min-h-11 ${className}`}>
      {children}
    </div>
  )
}
