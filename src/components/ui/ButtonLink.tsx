import type { ReactNode } from 'react'
import { withBasePath } from '../../utils/navigation'

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
    <a className={`button button-${variant} ${className}`} href={withBasePath(to)}>
      {children}
    </a>
  )
}
