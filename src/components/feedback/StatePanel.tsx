import type { ReactNode } from 'react'
import { Icon, type IconName } from '../icons/Icon'
import type { FeedbackLayout } from './LoadingRegion'

export type StatePanelTone = 'empty' | 'error' | 'success' | 'unavailable' | 'permission' | 'info'

export type StatePanelProps = {
  action?: ReactNode
  actions?: ReactNode
  body?: ReactNode
  className?: string
  description?: ReactNode
  layout?: FeedbackLayout
  title: ReactNode
  tone?: StatePanelTone
  visual?: ReactNode
}

const layoutClasses: Record<FeedbackLayout, string> = {
  compact: 'gap-2 p-4 text-left sm:flex-row sm:items-center sm:justify-between',
  immersive: 'min-h-[60dvh] gap-4 p-6 text-center sm:p-10',
  page: 'mx-auto my-8 min-h-72 max-w-2xl gap-4 p-6 text-center sm:p-10',
  pane: 'min-h-full gap-3 p-4 text-center sm:p-6',
  section: 'my-4 min-h-44 gap-3 p-5 text-center sm:p-7',
}

const toneClasses: Record<StatePanelTone, string> = {
  empty: 'border-foose-border bg-foose-surface text-foose-text',
  error: 'border-foose-danger/30 bg-foose-danger-bg/30 text-foose-text',
  info: 'border-accent/20 bg-accent-light/35 text-foose-text',
  permission: 'border-foose-warning/25 bg-foose-warning-bg/30 text-foose-text',
  success: 'border-foose-success/25 bg-foose-success-bg/35 text-foose-text',
  unavailable: 'border-foose-border bg-foose-surface-low text-foose-text',
}

const visualClasses: Record<StatePanelTone, string> = {
  empty: 'bg-foose-surface-mid text-accent',
  error: 'bg-foose-danger-bg text-foose-danger',
  info: 'bg-accent-light text-accent',
  permission: 'bg-foose-warning-bg text-foose-warning',
  success: 'bg-foose-success-bg text-foose-success',
  unavailable: 'bg-foose-surface-mid text-foose-muted',
}

const toneIcon: Record<StatePanelTone, IconName> = {
  empty: 'info',
  error: 'alert',
  info: 'info',
  permission: 'shield',
  success: 'check',
  unavailable: 'box',
}

export function StatePanel({
  action,
  actions,
  body,
  className = '',
  description,
  layout = 'section',
  title,
  tone = 'empty',
  visual,
}: StatePanelProps) {
  const content = body ?? description
  const role = tone === 'error' ? 'alert' : tone === 'success' ? 'status' : undefined
  const resolvedVisual = visual === undefined
    ? <Icon name={toneIcon[tone]} size={28} />
    : visual

  return (
    <section
      className={`state-panel flex w-full flex-col items-center rounded-2xl border ${layoutClasses[layout]} ${toneClasses[tone]} ${className}`}
      data-layout={layout}
      data-tone={tone}
      role={role}
    >
      {resolvedVisual !== null && (
        <div aria-hidden="true" className={`grid size-12 shrink-0 place-items-center rounded-full ${visualClasses[tone]}`}>
          {resolvedVisual}
        </div>
      )}
      <div className={layout === 'compact' ? 'min-w-0 flex-1' : 'grid max-w-xl gap-2'}>
        <h2 className="font-display text-xl font-semibold leading-tight text-foose-text">{title}</h2>
        {content && <div className="text-sm leading-6 text-foose-muted sm:text-base">{content}</div>}
      </div>
      {(action || actions) && (
        <div className="flex w-full flex-col items-stretch justify-center gap-2 sm:w-auto sm:flex-row sm:items-center [&_a]:min-h-11 [&_button]:min-h-11">
          {action}
          {actions}
        </div>
      )}
    </section>
  )
}
