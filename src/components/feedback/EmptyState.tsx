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
    <div className="state-panel mx-auto my-10 flex max-w-xl flex-col items-center gap-4 rounded-xl border border-foose-border bg-foose-surface p-8 text-center empty-state [&_.icon]:text-accent">
      <Icon name={icon} size={32} />
      <h2>{title}</h2>
      <p>{body}</p>
      {action}
    </div>
  )
}
