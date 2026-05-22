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
    <article className="stat-card">
      <Icon name={icon} />
      <p>{label}</p>
      <h3 className={danger ? 'danger-text' : ''}>{value}</h3>
      <span>{note}</span>
    </article>
  )
}
