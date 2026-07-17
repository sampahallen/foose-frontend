import type { ButtonHTMLAttributes } from 'react'
import { FaArrowLeft } from 'react-icons/fa'
import { usePageBack, type UsePageBackOptions } from '../../hooks/usePageBack'

export type NavigationBackButtonProps = UsePageBackOptions & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onClick'> & {
  variant?: 'inline' | 'icon' | 'floating'
}

const variantClasses = {
  inline: 'inline-flex min-h-11 items-center gap-2 rounded-lg px-1 text-sm font-bold text-foose-muted transition hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2',
  icon: 'inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-foose-surface text-foose-text shadow-sm transition hover:bg-accent-light hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2',
  floating: 'absolute left-3 top-3 z-20 inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-foose-surface/95 text-foose-text shadow-md backdrop-blur transition hover:bg-accent-light hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2',
} as const

export function NavigationBackButton({
  className = '',
  fallback,
  label,
  variant = 'inline',
  ...buttonProps
}: NavigationBackButtonProps) {
  const back = usePageBack({ fallback, label })
  const iconOnly = variant !== 'inline'
  return (
    <button
      {...buttonProps}
      aria-label={iconOnly ? back.label : buttonProps['aria-label']}
      className={`${variantClasses[variant]} ${className}`}
      onClick={back.goBack}
      title={iconOnly ? back.label : buttonProps.title}
      type="button"
    >
      <FaArrowLeft aria-hidden className="size-4" />
      {!iconOnly && <span>{back.label}</span>}
    </button>
  )
}
