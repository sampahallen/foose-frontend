import type { ListingTypeFilter } from '../../utils/listingFilters'
import { SelectControl } from '../ui/SelectControl'

export function ListingFilterBar({
  className = '',
  dateFrom,
  dateFromAriaLabel = 'Filter listings from date',
  dateTo,
  dateToAriaLabel = 'Filter listings to date',
  onDateFromChange,
  onDateToChange,
  onQueryChange,
  onTypeFilterChange,
  query,
  searchAriaLabel = 'Search listings',
  searchLabel = 'Search listings',
  typeAriaLabel = 'Filter by type',
  typeFilter,
}: {
  className?: string
  dateFrom: string
  dateFromAriaLabel?: string
  dateTo: string
  dateToAriaLabel?: string
  onDateFromChange: (value: string) => void
  onDateToChange: (value: string) => void
  onQueryChange: (value: string) => void
  onTypeFilterChange: (value: ListingTypeFilter) => void
  query: string
  searchAriaLabel?: string
  searchLabel?: string
  typeAriaLabel?: string
  typeFilter: ListingTypeFilter
}) {
  return (
    <div className={`mb-5 grid min-w-0 grid-cols-1 gap-3 rounded-xl bg-foose-surface-low p-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_150px_150px_150px] [&_input]:min-h-11 [&_input]:min-w-0 [&_input]:max-w-full [&_input]:w-full [&_input]:rounded-lg [&_input]:border [&_input]:border-foose-border [&_input]:bg-foose-surface [&_input]:px-3 [&_input]:text-base [&_input]:outline-none [&_input]:focus:border-accent sm:[&_input]:text-sm [&_label]:grid [&_label]:min-w-0 [&_label]:gap-1 [&_label_span]:text-xs [&_label_span]:font-bold [&_label_span]:text-foose-muted ${className}`}>
      <label>
        <span>{searchLabel}</span>
        <input aria-label={searchAriaLabel} onChange={(event) => onQueryChange(event.target.value)} placeholder={searchLabel} value={query} />
      </label>
      <div className="grid min-w-0 gap-1">
        <span className="text-xs font-bold text-foose-muted">Listing type</span>
        <SelectControl aria-label={typeAriaLabel} onChange={(event) => onTypeFilterChange(event.target.value as ListingTypeFilter)} value={typeFilter} variant="filter">
          <option value="">All types</option>
          <option value="retail">Retail</option>
          <option value="wholesale">Wholesale</option>
        </SelectControl>
      </div>
      <label>
        <span>Start date</span>
        <input aria-label={dateFromAriaLabel} onChange={(event) => onDateFromChange(event.target.value)} type="date" value={dateFrom} />
      </label>
      <label>
        <span>End date</span>
        <input aria-label={dateToAriaLabel} onChange={(event) => onDateToChange(event.target.value)} type="date" value={dateTo} />
      </label>
    </div>
  )
}
