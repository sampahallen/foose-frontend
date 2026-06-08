import type { ReactNode } from 'react'

const badgeBase = 'inline-flex w-fit items-center rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide'

const badgeTones = {
  neutral: 'bg-foose-surface-high text-foose-muted',
  accent: 'bg-accent-light text-accent',
  danger: 'bg-foose-danger-bg text-foose-danger',
  success: 'bg-foose-success-bg text-foose-success',
  warning: 'bg-foose-warning-bg text-foose-warning',
}

export function Badge({
  children,
  tone = 'neutral',
}: {
  children: ReactNode
  tone?: 'neutral' | 'accent' | 'danger' | 'success' | 'warning'
}) {
  return <span className={`${badgeBase} ${badgeTones[tone]}`}>{children}</span>
}
