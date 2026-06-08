import type { ReactNode } from 'react'
import { withBasePath } from '../../utils/navigation'

const buttonBase =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border px-5 py-2.5 text-center text-sm font-bold transition disabled:pointer-events-none disabled:opacity-50 [&.full]:w-full'

const buttonVariants = {
  primary: 'border-accent bg-accent text-white shadow-md shadow-accent/15 hover:bg-accent-hover',
  secondary: 'border-foose-border bg-foose-surface text-foose-text hover:border-accent hover:text-accent',
  ghost: 'border-transparent bg-transparent text-accent hover:bg-accent-light',
  dark: 'border-foose-text bg-foose-text text-white',
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
    <a className={`${buttonBase} ${buttonVariants[variant]} ${className}`} href={withBasePath(to)}>
      {children}
    </a>
  )
}
