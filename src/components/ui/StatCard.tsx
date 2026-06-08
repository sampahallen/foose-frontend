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
    <article className="stat-card rounded-xl border border-foose-border bg-foose-surface shadow-sm p-4 md:p-5">
      <Icon name={icon} />
      <p>{label}</p>
      <h3 className={danger ? 'danger-text font-semibold text-foose-danger' : ''}>{value}</h3>
      <span>{note}</span>
    </article>
  )
}
