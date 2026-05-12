import type { ReactNode } from 'react'
import { Icon, type IconName } from './icons/Icon'

export function Badge({
  children,
  tone = 'neutral',
}: {
  children: ReactNode
  tone?: 'neutral' | 'accent' | 'danger' | 'success' | 'warning'
}) {
  return <span className={`badge badge-${tone}`}>{children}</span>
}

export function ButtonLink({
  children,
  to,
  variant = 'primary',
  className = '',
}: {
  children: ReactNode
  to: string
  variant?: 'primary' | 'secondary' | 'ghost' | 'dark'
  className?: string
}) {
  return (
    <a className={`button button-${variant} ${className}`} href={to}>
      {children}
    </a>
  )
}

export function SectionHeader({
  title,
  eyebrow,
  action,
}: {
  title: string
  eyebrow?: string
  action?: ReactNode
}) {
  return (
    <div className="section-header">
      <div>
        <h2>{title}</h2>
        {eyebrow && <p>{eyebrow}</p>}
      </div>
      {action}
    </div>
  )
}

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
