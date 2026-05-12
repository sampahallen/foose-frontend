import type { ReactNode } from 'react'
import { Icon, type IconName } from './icons/Icon'

export function LoadingState({ label = 'Loading...' }: { label?: string }) {
  return (
    <div className="state-panel">
      <span className="loading-dot" />
      <p>{label}</p>
    </div>
  )
}

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

export function ErrorState({ message, retry }: { message: string; retry?: () => void }) {
  return (
    <div className="state-panel error-state">
      <Icon name="alert" size={32} />
      <h2>Unable to load this view</h2>
      <p>{message}</p>
      {retry && (
        <button className="button button-secondary" onClick={retry} type="button">
          Retry
        </button>
      )}
    </div>
  )
}
