import { withBasePath } from '../../utils/navigation'
import { Icon } from '../icons/Icon'

export function FloatingCreateButton({
  className = '',
  href,
  label,
}: {
  className?: string
  href: string
  label: string
}) {
  return (
    <a
      aria-label={label}
      className={`group fixed bottom-[var(--foose-fab-inset)] right-4 z-50 inline-flex size-14 items-center justify-center rounded-full border border-white/20 bg-accent/95 text-white shadow-xl shadow-accent/25 backdrop-blur transition hover:bg-accent-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/35 focus-visible:ring-offset-2 lg:bottom-6 lg:right-6 lg:size-12 ${className}`}
      href={withBasePath(href)}
    >
      <Icon name="plus" size={24} />
      <span className="pointer-events-none absolute right-full mr-3 hidden whitespace-nowrap rounded-lg bg-foose-text px-3 py-2 text-xs font-bold text-white opacity-0 shadow-lg transition group-hover:opacity-100 group-focus-visible:opacity-100 lg:block" role="tooltip">
        {label}
      </span>
    </a>
  )
}
