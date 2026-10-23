import { LISTING_COLORS, type ListingColor } from '../../utils/listingTaxonomy'

export function ListingColorPicker({ onChange, value }: { onChange: (colors: ListingColor[]) => void; value: ListingColor[] }) {
  function toggle(color: ListingColor) {
    if (value.includes(color)) {
      if (value.length > 1) onChange(value.filter((item) => item !== color))
      return
    }
    if (color === 'multi') {
      onChange(['multi'])
    } else {
      onChange([...value.filter((item) => item !== 'multi'), color])
    }
  }

  const selected = LISTING_COLORS.filter((color) => value.includes(color.value))

  return (
    <details aria-labelledby="listing-color-label" className="group rounded-xl border border-foose-border bg-foose-surface">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 px-3 text-sm font-semibold text-foose-text [&::-webkit-details-marker]:hidden" id="listing-color">
        <span className="flex min-w-0 flex-wrap items-center gap-1.5 py-2">
          {selected.map((color) => (
            <span className="inline-flex items-center gap-1 rounded-full border border-foose-border px-2 py-0.5 text-xs" key={color.value}>
              <span aria-hidden className="size-3 rounded-full border border-black/10" style={{ background: color.hex }} />
              {color.label}
            </span>
          ))}
        </span>
        <span aria-hidden className="shrink-0 text-foose-muted group-open:rotate-180">⌄</span>
      </summary>
      <div className="grid max-h-64 grid-cols-2 gap-1 overflow-y-auto border-t border-foose-border p-2 [scrollbar-width:thin]">
        {LISTING_COLORS.map((color) => {
          const active = value.includes(color.value)
          const disabled = !active && color.value !== 'multi' && value.length >= 5
          return (
            <button aria-pressed={active} className={`flex min-h-10 items-center gap-2 rounded-lg px-2 text-left text-xs font-semibold transition ${active ? 'bg-accent-light text-accent' : 'text-foose-text hover:bg-foose-surface-low'} disabled:cursor-not-allowed disabled:opacity-40`} disabled={disabled} key={color.value} onClick={() => toggle(color.value)} type="button">
              <span aria-hidden className="size-4 shrink-0 rounded-full border border-black/10" style={{ background: color.hex }} />
              {color.label}
              {active && <span aria-hidden className="ml-auto">✓</span>}
            </button>
          )
        })}
      </div>
    </details>
  )
}
