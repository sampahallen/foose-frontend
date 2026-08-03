import type { ReactNode } from 'react'

export function ShopManagementPageHeader({
  actions,
  description,
  eyebrow,
  meta,
  title,
}: {
  actions?: ReactNode
  description?: ReactNode
  eyebrow?: string
  meta?: ReactNode
  title: ReactNode
}) {
  return (
    <header className="mb-5 flex min-w-0 flex-col gap-4 border-b border-foose-border pb-5 sm:mb-6 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0">
        {eyebrow && <p className="text-xs font-black uppercase tracking-[0.18em] text-accent">{eyebrow}</p>}
        <h1 className="mt-1 break-words font-display text-2xl font-semibold leading-tight text-foose-text md:text-4xl">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-sm leading-6 text-foose-muted md:text-base">{description}</p>}
        {meta && <div className="mt-1">{meta}</div>}
      </div>
      {actions && <div className="button-row grid w-full gap-2 sm:w-auto sm:flex sm:shrink-0">{actions}</div>}
    </header>
  )
}
