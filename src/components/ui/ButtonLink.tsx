import type { ReactNode } from 'react'

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
