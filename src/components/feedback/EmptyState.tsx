import type { ReactNode } from 'react'
import { Icon, type IconName } from '../icons/Icon'
import type { FeedbackLayout } from './LoadingRegion'
import { StatePanel } from './StatePanel'

export function EmptyState({
  action,
  actions,
  body,
  className,
  icon = 'info',
  layout = 'page',
  title,
}: {
  action?: ReactNode
  actions?: ReactNode
  body?: ReactNode
  className?: string
  icon?: IconName
  layout?: FeedbackLayout
  title: ReactNode
}) {
  return (
    <StatePanel
      action={action}
      actions={actions}
      body={body}
      className={`empty-state ${className || ''}`}
      layout={layout}
      title={title}
      tone="empty"
      visual={<Icon name={icon} size={28} />}
    />
  )
}
