import { useId, useState, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { FormField } from './FormField'
import { fieldDescriptionIds } from './formUtils'

export type ChoiceCardOption<Value extends string = string> = {
  description?: ReactNode
  disabled?: boolean
  label: ReactNode
  value: Value
  visual?: ReactNode
}

export function ChoiceCardGroup<Value extends string = string>({
  className = '',
  defaultValue,
  disabled = false,
  error,
  hint,
  label,
  name,
  onChange,
  options,
  required = false,
  value,
}: {
  className?: string
  defaultValue?: Value
  disabled?: boolean
  error?: ReactNode
  hint?: ReactNode
  label: ReactNode
  name: string
  onChange?: (value: Value) => void
  options: ChoiceCardOption<Value>[]
  required?: boolean
  value?: Value
}) {
  const id = useId()
  const groupId = `choice-${id}`
  const [uncontrolledValue, setUncontrolledValue] = useState<Value | ''>(defaultValue || '')
  const selected = value === undefined ? uncontrolledValue : value
  const describedBy = fieldDescriptionIds(groupId, hint, error)

  return (
    <FormField className={className} error={error} hint={hint} htmlFor={groupId} label={label} labelId={`${groupId}-label`} required={required}>
      <div aria-describedby={describedBy} aria-invalid={error ? true : undefined} aria-labelledby={`${groupId}-label`} className="grid min-w-0 gap-2.5 sm:grid-cols-2 sm:gap-3" id={groupId} role="radiogroup">
        {options.map((option, index) => {
          const optionId = `${groupId}-${index}`
          const active = selected === option.value
          return (
            <label
              className={`group relative flex min-h-16 min-w-0 cursor-pointer items-start gap-2.5 rounded-xl border p-3 outline-none transition focus-within:ring-2 focus-within:ring-accent/20 sm:min-h-20 sm:gap-3 sm:p-4 ${active ? 'border-accent bg-accent-light/55 shadow-sm' : 'border-foose-border bg-white hover:border-accent/60 hover:bg-accent-light/20'} ${(disabled || option.disabled) ? 'cursor-not-allowed opacity-55' : ''}`}
              htmlFor={optionId}
              key={option.value}
            >
              <input
                aria-describedby={option.description ? `${optionId}-description` : undefined}
                aria-labelledby={`${optionId}-label`}
                checked={active}
                className="mt-0.5 size-5 shrink-0 accent-accent"
                disabled={disabled || option.disabled}
                id={optionId}
                name={name}
                onChange={() => {
                  if (value === undefined) setUncontrolledValue(option.value)
                  onChange?.(option.value)
                }}
                required={required}
                type="radio"
                value={option.value}
              />
              {option.visual && <span aria-hidden="true" className="grid size-8 shrink-0 place-items-center rounded-lg bg-white text-accent sm:size-9">{option.visual}</span>}
              <span className="min-w-0">
                <span className="block text-sm font-bold text-foose-text" id={`${optionId}-label`}>{option.label}</span>
                {option.description && <span className="mt-1 block text-sm leading-5 text-foose-muted" id={`${optionId}-description`}>{option.description}</span>}
              </span>
            </label>
          )
        })}
      </div>
    </FormField>
  )
}

export function SubmitButton({
  children,
  className = '',
  loading = false,
  loadingLabel = 'Saving…',
  disabled,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  loading?: boolean
  loadingLabel?: ReactNode
}) {
  return (
    <button
      {...props}
      aria-busy={loading || undefined}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-accent bg-accent px-4 py-2.5 text-sm font-black text-white shadow-md shadow-accent/15 transition hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:border-foose-border disabled:bg-foose-surface-mid disabled:text-foose-faint disabled:shadow-none sm:min-h-12 sm:px-5 sm:py-3 ${className}`}
      disabled={disabled || loading}
      type={props.type || 'submit'}
    >
      {loading && <span aria-hidden="true" className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent motion-reduce:animate-none" />}
      <span>{loading ? loadingLabel : children}</span>
    </button>
  )
}

export type FormError = { fieldId?: string; message: ReactNode }

export function ErrorSummary({
  className = '',
  errors,
  focus = false,
  title = 'Please check the form',
}: {
  className?: string
  errors: FormError[] | Record<string, string | undefined>
  focus?: boolean
  title?: ReactNode
}) {
  const generatedId = useId()
  const titleId = `form-error-summary-${generatedId}`
  const normalized = Array.isArray(errors)
    ? errors
    : Object.entries(errors).flatMap(([fieldId, message]) => message ? [{ fieldId, message }] : [])

  if (!normalized.length) return null

  return (
    <div
      aria-labelledby={titleId}
      className={`rounded-xl border border-foose-danger/30 bg-foose-danger-bg/35 p-4 text-sm text-foose-text outline-none ${className}`}
      data-form-error-summary
      ref={(node) => {
        if (focus && node && document.activeElement !== node) node.focus()
      }}
      role="alert"
      tabIndex={-1}
    >
      <h2 className="font-display text-lg font-semibold text-foose-danger" id={titleId}>{title}</h2>
      <ul className="mt-2 list-disc space-y-1 pl-5">
        {normalized.map((error, index) => (
          <li key={`${error.fieldId || 'form'}-${index}`}>
            {error.fieldId ? (
              <a
                className="font-semibold underline decoration-foose-danger/40 underline-offset-2 hover:text-foose-danger"
                href={`#${error.fieldId}`}
                onClick={(event) => {
                  event.preventDefault()
                  document.getElementById(error.fieldId || '')?.focus()
                }}
              >
                {error.message}
              </a>
            ) : error.message}
          </li>
        ))}
      </ul>
    </div>
  )
}
