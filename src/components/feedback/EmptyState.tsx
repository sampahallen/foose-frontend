import type { ReactNode } from 'react'
import { Icon, type IconName } from '../icons/Icon'

export function EmptyState({
  action,
  body,
  icon = 'info',
  title,
}: {
  action?: ReactNode
  body: string
  icon?: IconName
  title: string
}) {
  return (
    <div className="state-panel empty-state">
      <Icon name={icon} size={32} />
      <h2>{title}</h2>
      <p>{body}</p>
      {action}
    </div>
  )
}
