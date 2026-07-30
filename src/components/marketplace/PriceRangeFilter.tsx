import { useId, useState } from 'react'

const DEFAULT_MAX_PRICE = 5000
const RANGE_STEP = 10

function priceNumber(value: string) {
  const parsed = Number(value)
  return value.trim() && Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined
}

function expandedMaximum(...values: Array<number | undefined>) {
  const highest = Math.max(DEFAULT_MAX_PRICE, ...values.filter((value): value is number => value !== undefined))
  return Math.ceil(highest / 500) * 500
}

export function PriceRangeFilter({
  className = '',
  defaultMax = '',
  defaultMin = '',
  idPrefix,
  variant = 'default',
}: {
  className?: string
  defaultMax?: string
  defaultMin?: string
  idPrefix?: string
  variant?: 'compact' | 'default'
}) {
  const generatedId = useId()
  const id = idPrefix || generatedId
  const [minimum, setMinimum] = useState(defaultMin)
  const [maximum, setMaximum] = useState(defaultMax)
  const minimumNumber = priceNumber(minimum)
  const maximumNumber = priceNumber(maximum)
  const rangeMaximum = expandedMaximum(minimumNumber, maximumNumber)
  const minimumHandle = Math.min(minimumNumber ?? 0, maximumNumber ?? rangeMaximum)
  const maximumHandle = Math.max(maximumNumber ?? rangeMaximum, minimumHandle)
  const minimumPercent = (minimumHandle / rangeMaximum) * 100
  const maximumPercent = (maximumHandle / rangeMaximum) * 100
  const inputClass = variant === 'compact'
    ? 'h-9 min-w-0 rounded-lg border border-foose-border bg-white px-2 text-xs font-bold text-foose-text outline-none focus:border-accent focus:ring-2 focus:ring-accent/15'
    : 'h-11 min-w-0 rounded-xl border border-foose-border bg-white px-3 text-sm font-semibold text-foose-text outline-none transition hover:border-accent focus:border-accent focus:ring-2 focus:ring-accent/15'
  const thumbClass = 'pointer-events-none absolute inset-0 h-6 w-full appearance-none bg-transparent outline-none [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:size-5 [&::-moz-range-thumb]:cursor-grab [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:bg-accent [&::-moz-range-thumb]:shadow-md [&::-webkit-slider-runnable-track]:h-1.5 [&::-webkit-slider-runnable-track]:bg-transparent [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:mt-[-7px] [&::-webkit-slider-thumb]:size-5 [&::-webkit-slider-thumb]:cursor-grab [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:bg-accent [&::-webkit-slider-thumb]:shadow-md active:[&::-moz-range-thumb]:cursor-grabbing active:[&::-webkit-slider-thumb]:cursor-grabbing'

  return (
    <fieldset className={`grid gap-2 ${className}`}>
      <legend className={variant === 'compact' ? 'sr-only' : 'mb-1 text-sm font-bold text-foose-text'}>Price (GHS)</legend>
      <div className="grid grid-cols-2 gap-2">
        <label className="grid gap-1 text-[11px] font-bold text-foose-muted" htmlFor={`${id}-minimum`}>
          Min
          <input
            aria-label="Minimum price"
            className={inputClass}
            id={`${id}-minimum`}
            inputMode="decimal"
            min="0"
            name="minPrice"
            onChange={(event) => setMinimum(event.target.value)}
            placeholder="No min"
            step="0.01"
            type="number"
            value={minimum}
          />
        </label>
        <label className="grid gap-1 text-[11px] font-bold text-foose-muted" htmlFor={`${id}-maximum`}>
          Max
          <input
            aria-label="Maximum price"
            className={inputClass}
            id={`${id}-maximum`}
            inputMode="decimal"
            min="0"
            name="maxPrice"
            onChange={(event) => setMaximum(event.target.value)}
            placeholder="No max"
            step="0.01"
            type="number"
            value={maximum}
          />
        </label>
      </div>
      <div className="relative mt-1 h-6" data-price-range>
        <div className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-foose-surface-mid" />
        <div
          aria-hidden
          className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-accent"
          style={{ left: `${minimumPercent}%`, right: `${100 - maximumPercent}%` }}
        />
        <input
          aria-label="Minimum price slider"
          className={`${thumbClass} ${minimumPercent > 50 ? 'z-30' : 'z-20'}`}
          max={rangeMaximum}
          min="0"
          onChange={(event) => {
            const value = Math.min(Number(event.target.value), maximumNumber ?? rangeMaximum)
            setMinimum(String(value))
          }}
          step={RANGE_STEP}
          type="range"
          value={minimumHandle}
        />
        <input
          aria-label="Maximum price slider"
          className={`${thumbClass} z-20`}
          max={rangeMaximum}
          min="0"
          onChange={(event) => {
            const value = Math.max(Number(event.target.value), minimumNumber ?? 0)
            setMaximum(String(value))
          }}
          step={RANGE_STEP}
          type="range"
          value={maximumHandle}
        />
      </div>
      <div className="flex items-center justify-between text-[11px] font-semibold text-foose-faint" aria-hidden>
        <span>GHS {minimum || '0'}</span>
        <span>{maximum ? `GHS ${maximum}` : `GHS ${rangeMaximum}+`}</span>
      </div>
    </fieldset>
  )
}
