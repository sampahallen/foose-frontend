import { Icon, type IconName } from '../icons/Icon'

export function StatCard({
  icon,
  label,
  value,
  note,
  danger = false,
}: {
  icon: IconName
  label: string
  value: string
  note: string
  danger?: boolean
}) {
  return (
    <article className="stat-card flex min-w-0 flex-col rounded-xl border border-foose-border bg-foose-surface p-4 shadow-sm md:p-5">
      <div className="flex min-w-0 items-center justify-between gap-3">
        <p className="min-w-0 text-xs font-black uppercase tracking-[0.1em] text-foose-muted">{label}</p>
        <span aria-hidden="true" className={`grid size-9 shrink-0 place-items-center rounded-full ${danger ? 'bg-foose-danger-bg text-foose-danger' : 'bg-accent-light text-accent'}`}>
          <Icon name={icon} size={18} />
        </span>
      </div>
      <h3 className={`mt-4 break-words font-display text-2xl font-semibold leading-none sm:text-3xl ${danger ? 'danger-text text-foose-danger' : 'text-foose-text'}`}>{value}</h3>
      <span className="mt-2 text-sm font-medium text-foose-faint">{note}</span>
    </article>
  )
}
