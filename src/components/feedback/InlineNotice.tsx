import type { ReactNode } from 'react'
import { Icon, type IconName } from '../icons/Icon'

export type InlineNoticeTone = 'success' | 'error' | 'info' | 'warning'

const toneClasses: Record<InlineNoticeTone, string> = {
  error: 'border-foose-danger/25 bg-foose-danger-bg/45 text-foose-danger',
  info: 'border-accent/20 bg-accent-light/45 text-accent-strong',
  success: 'border-foose-success/25 bg-foose-success-bg/55 text-foose-success',
  warning: 'border-foose-warning/25 bg-foose-warning-bg/45 text-foose-warning',
}

const toneIcon: Record<InlineNoticeTone, IconName> = {
  error: 'alert',
  info: 'info',
  success: 'check',
  warning: 'alert',
}

export function InlineNotice({
  action,
  children,
  className = '',
  title,
  tone = 'info',
}: {
  action?: ReactNode
  children: ReactNode
  className?: string
  title?: ReactNode
  tone?: InlineNoticeTone
}) {
  return (
    <div
      aria-live={tone === 'error' ? 'assertive' : 'polite'}
      className={`flex w-full items-start gap-3 rounded-xl border px-4 py-3 text-sm ${toneClasses[tone]} ${className}`}
      role={tone === 'error' ? 'alert' : 'status'}
    >
      <span aria-hidden="true" className="mt-0.5 shrink-0"><Icon name={toneIcon[tone]} size={18} /></span>
      <div className="min-w-0 flex-1 text-foose-text">
        {title && <p className="font-bold">{title}</p>}
        <div className={title ? 'mt-0.5 text-foose-muted' : 'text-foose-muted'}>{children}</div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}
