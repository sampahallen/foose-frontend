import {
  forwardRef,
  useId,
  useState,
  type InputHTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes,
} from 'react'
import { Icon } from '../icons/Icon'
import { fieldDescriptionIds } from './formUtils'

export type FieldSize = 'compact' | 'default'

export type FormFieldProps = {
  children: ReactNode
  className?: string
  counter?: { current: number; max: number }
  error?: ReactNode
  hint?: ReactNode
  htmlFor: string
  label: ReactNode
  labelId?: string
  optional?: boolean
  required?: boolean
}

export function FormField({
  children,
  className = '',
  counter,
  error,
  hint,
  htmlFor,
  label,
  labelId,
  optional = false,
  required = false,
}: FormFieldProps) {
  const labelContent = (
    <>
      {label}
      {required && <span aria-hidden="true" className="ml-1 text-foose-danger">*</span>}
      {optional && !required && <span className="ml-1 font-medium text-foose-faint">(optional)</span>}
    </>
  )
  return (
    <div className={`grid min-w-0 gap-2 ${className}`} data-form-field>
      <div className="flex items-start justify-between gap-3">
        {labelId ? (
          <span className="text-sm font-bold leading-5 text-foose-text" id={labelId}>{labelContent}</span>
        ) : (
          <label className="text-sm font-bold leading-5 text-foose-text" htmlFor={htmlFor}>{labelContent}</label>
        )}
        {counter && (
          <span
            aria-label={`${counter.current} of ${counter.max} characters used`}
            className={`shrink-0 text-xs font-semibold ${counter.current > counter.max ? 'text-foose-danger' : 'text-foose-faint'}`}
          >
            {counter.current}/{counter.max}
          </span>
        )}
      </div>
      {children}
      {hint && (
        <p className="text-sm leading-5 text-foose-muted" id={`${htmlFor}-hint`}>{hint}</p>
      )}
      {error && (
        <p className="flex items-start gap-1.5 text-sm font-semibold leading-5 text-foose-danger" id={`${htmlFor}-error`}>
          <span aria-hidden="true" className="mt-0.5"><Icon name="alert" size={15} /></span>
          <span>{error}</span>
        </p>
      )}
    </div>
  )
}

type SharedFieldProps = {
  error?: ReactNode
  hint?: ReactNode
  label: ReactNode
  optional?: boolean
  prefix?: ReactNode
  size?: FieldSize
  suffix?: ReactNode
  wrapperClassName?: string
}

const controlBase = 'w-full rounded-xl border bg-foose-surface text-foose-text outline-none transition placeholder:text-foose-faint hover:border-accent/60 focus:border-accent focus:ring-2 focus:ring-accent/15 disabled:cursor-not-allowed disabled:bg-foose-surface-low disabled:text-foose-faint disabled:opacity-75'

export type TextFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'size' | 'prefix'> & SharedFieldProps

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField({
  className = '',
  error,
  hint,
  id,
  label,
  optional,
  prefix,
  required,
  size = 'default',
  suffix,
  wrapperClassName = '',
  ...props
}, ref) {
  const generatedId = useId()
  const inputId = id || `field-${generatedId}`
  const describedBy = [props['aria-describedby'], fieldDescriptionIds(inputId, hint, error)].filter(Boolean).join(' ') || undefined

  return (
    <FormField error={error} hint={hint} htmlFor={inputId} label={label} optional={optional} required={required} className={wrapperClassName}>
      <div className="relative">
        {prefix && <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm font-semibold text-foose-muted">{prefix}</span>}
        <input
          {...props}
          aria-describedby={describedBy}
          aria-invalid={error ? true : props['aria-invalid']}
          className={`${controlBase} ${size === 'compact' ? 'min-h-11 px-3 py-2 text-sm' : 'min-h-12 px-4 py-3 text-base'} ${prefix ? 'pl-10' : ''} ${suffix ? 'pr-12' : ''} ${error ? 'border-foose-danger bg-foose-danger-bg/15 focus:border-foose-danger focus:ring-foose-danger/15' : 'border-foose-border'} ${className}`}
          id={inputId}
          ref={ref}
          required={required}
        />
        {suffix && <span className="absolute inset-y-0 right-2 flex items-center">{suffix}</span>}
      </div>
    </FormField>
  )
})

export type TextAreaFieldProps = TextareaHTMLAttributes<HTMLTextAreaElement> & SharedFieldProps & {
  showCounter?: boolean
}

export const TextAreaField = forwardRef<HTMLTextAreaElement, TextAreaFieldProps>(function TextAreaField({
  className = '',
  error,
  hint,
  id,
  label,
  maxLength,
  onChange,
  optional,
  required,
  showCounter = Boolean(maxLength),
  size = 'default',
  value,
  defaultValue,
  wrapperClassName = '',
  ...props
}, ref) {
  const generatedId = useId()
  const inputId = id || `field-${generatedId}`
  const [uncontrolledCount, setUncontrolledCount] = useState(() => String(defaultValue ?? '').length)
  const count = value === undefined ? uncontrolledCount : String(value).length
  const describedBy = [props['aria-describedby'], fieldDescriptionIds(inputId, hint, error)].filter(Boolean).join(' ') || undefined

  return (
    <FormField
      className={wrapperClassName}
      counter={showCounter && maxLength ? { current: count, max: maxLength } : undefined}
      error={error}
      hint={hint}
      htmlFor={inputId}
      label={label}
      optional={optional}
      required={required}
    >
      <textarea
        {...props}
        aria-describedby={describedBy}
        aria-invalid={error ? true : props['aria-invalid']}
        className={`${controlBase} min-h-28 resize-y ${size === 'compact' ? 'px-3 py-2.5 text-sm' : 'px-4 py-3 text-base'} ${error ? 'border-foose-danger bg-foose-danger-bg/15 focus:border-foose-danger focus:ring-foose-danger/15' : 'border-foose-border'} ${className}`}
        defaultValue={defaultValue}
        id={inputId}
        maxLength={maxLength}
        onChange={(event) => {
          if (value === undefined) setUncontrolledCount(event.currentTarget.value.length)
          onChange?.(event)
        }}
        ref={ref}
        required={required}
        value={value}
      />
    </FormField>
  )
})

export type PasswordFieldProps = Omit<TextFieldProps, 'type' | 'suffix'> & {
  showLabel?: string
  hideLabel?: string
}

export const PasswordField = forwardRef<HTMLInputElement, PasswordFieldProps>(function PasswordField({
  hideLabel = 'Hide password',
  showLabel = 'Show password',
  ...props
}, ref) {
  const [visible, setVisible] = useState(false)

  return (
    <TextField
      {...props}
      ref={ref}
      suffix={(
        <button
          aria-label={visible ? hideLabel : showLabel}
          aria-pressed={visible}
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg px-2 text-xs font-black text-accent transition hover:bg-accent-light focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent"
          onClick={() => setVisible((current) => !current)}
          type="button"
        >
          {visible ? 'Hide' : 'Show'}
        </button>
      )}
      type={visible ? 'text' : 'password'}
    />
  )
})
