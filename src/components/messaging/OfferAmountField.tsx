import { useId, useState } from 'react'
import { formatMoney, parseGhsToPesewas } from '../../utils/format'

/**
 * Shared money entry for opening an offer and for countering. Amounts are
 * typed in GHS and submitted as integer pesewas; the server re-checks every
 * rule, this only stops the obvious mistakes before a round is spent.
 */
export function OfferAmountField({
  busy = false,
  currency = 'GHS',
  listPrice,
  onCancel,
  onSubmit,
  submitLabel = 'Send offer',
}: {
  busy?: boolean
  currency?: string
  listPrice?: number
  onCancel?: () => void
  onSubmit: (amount: number) => void
  submitLabel?: string
}) {
  const fieldId = useId()
  const [value, setValue] = useState('')
  const [error, setError] = useState('')

  const amount = parseGhsToPesewas(value)
  const invalid = value.trim() !== '' && (amount === null || amount <= 0)
  const tooHigh = amount !== null && listPrice !== undefined && amount >= listPrice

  function submit() {
    if (amount === null || amount <= 0) {
      setError('Enter an amount like 70 or 70.50')
      return
    }
    if (listPrice !== undefined && amount >= listPrice) {
      setError(`Offer something below the listed ${formatMoney(listPrice, currency)}`)
      return
    }
    setError('')
    onSubmit(amount)
  }

  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs font-bold text-foose-text" htmlFor={fieldId}>
        Your price ({currency})
      </label>
      <div className="flex flex-wrap items-center gap-2">
        <input
          aria-describedby={error ? `${fieldId}-error` : undefined}
          aria-invalid={invalid || tooHigh || Boolean(error) ? true : undefined}
          autoFocus
          className="h-11 min-w-0 flex-1 rounded-xl border border-foose-border bg-foose-surface-low px-3 text-sm outline-none transition focus:border-accent focus:bg-foose-surface"
          id={fieldId}
          inputMode="decimal"
          onChange={(event) => {
            setValue(event.target.value)
            if (error) setError('')
          }}
          onKeyDown={(event) => {
            if (event.key !== 'Enter') return
            event.preventDefault()
            submit()
          }}
          placeholder="70.00"
          value={value}
        />
        <button
          className="min-h-11 rounded-full bg-accent px-4 text-xs font-black text-white transition hover:bg-accent-strong disabled:opacity-50"
          disabled={busy}
          onClick={submit}
          type="button"
        >
          {submitLabel}
        </button>
        {onCancel && (
          <button
            className="min-h-11 rounded-full border border-foose-border px-4 text-xs font-black text-foose-text transition hover:bg-foose-surface-high"
            disabled={busy}
            onClick={onCancel}
            type="button"
          >
            Cancel
          </button>
        )}
      </div>
      {error && (
        <p className="text-xs font-semibold text-foose-danger" id={`${fieldId}-error`} role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
