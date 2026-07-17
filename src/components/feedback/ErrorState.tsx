import type { ReactNode } from 'react'
import type { FeedbackLayout } from './LoadingRegion'
import { StatePanel } from './StatePanel'

export function ErrorState({
  action,
  actions,
  className,
  layout = 'page',
  message,
  retry,
  title = 'Unable to load this view',
}: {
  action?: ReactNode
  actions?: ReactNode
  className?: string
  layout?: FeedbackLayout
  message: ReactNode
  retry?: () => void
  title?: ReactNode
}) {
  const retryAction = retry ? (
    <button
      className="button button-secondary inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-foose-border bg-foose-surface px-5 py-2.5 text-center text-sm font-bold text-foose-text transition hover:border-accent hover:text-accent disabled:pointer-events-none disabled:opacity-50"
      onClick={retry}
      type="button"
    >
      Retry
    </button>
  ) : null

  return (
    <StatePanel
      action={action || retryAction}
      actions={actions}
      body={message}
      className={`error-state ${className || ''}`}
      layout={layout}
      title={title}
      tone="error"
    />
  )
}
