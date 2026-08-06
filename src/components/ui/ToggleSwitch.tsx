import type { ReactNode } from 'react'

export function ToggleSwitch({
  checked,
  description,
  disabled = false,
  id,
  label,
  onChange,
}: {
  checked: boolean
  description?: ReactNode
  disabled?: boolean
  id?: string
  label?: ReactNode
  onChange: (checked: boolean) => void
}) {
  const switchButton = (
    <button
      aria-checked={checked}
      aria-disabled={disabled || undefined}
      className={`toggle-switch relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border transition disabled:pointer-events-none disabled:opacity-50 ${checked ? 'border-accent bg-accent' : 'border-foose-border bg-foose-surface-mid'}`}
      disabled={disabled}
      id={id}
      onClick={() => onChange(!checked)}
      role="switch"
      type="button"
    >
      <span
        aria-hidden="true"
        className={`inline-block size-5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`}
      />
    </button>
  )

  if (!label && !description) return switchButton

  return (
    <div className="toggle-switch-row flex items-center justify-between gap-4">
      <div className="min-w-0">
        {label && <label className="block text-sm font-bold text-foose-text" htmlFor={id}>{label}</label>}
        {description && <p className="mt-0.5 text-sm leading-6 text-foose-muted">{description}</p>}
      </div>
      {switchButton}
    </div>
  )
}
