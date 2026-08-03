import type { ChangeEvent } from 'react'
import { MdOutlineSort } from 'react-icons/md'
import { navigateTo } from '../../utils/navigation'
import { SelectControl } from '../ui/SelectControl'

const SORT_TRIGGER_LABELS: Record<string, string> = {
  relevance: 'Relevance',
  newest: 'Newest',
  price_asc: 'Low price',
  price_desc: 'High price',
}

export function MarketplaceSortControl({
  actionPath,
  query,
}: {
  actionPath: string
  query: URLSearchParams
}) {
  const sortValue = query.get('sort') || 'relevance'

  function changeSort(event: ChangeEvent<HTMLSelectElement>) {
    const next = new URLSearchParams(query.toString())
    next.set('sort', event.target.value || 'relevance')
    next.delete('page')
    navigateTo(`${actionPath}?${next.toString()}`)
  }

  return (
    <SelectControl
      aria-label="Sort listings"
      className="h-10 rounded-lg border border-foose-border bg-foose-surface font-bold text-foose-text shadow-sm"
      leadingIcon={<MdOutlineSort className="text-base" />}
      menuMinWidth={192}
      onChange={changeSort}
      triggerLabel={SORT_TRIGGER_LABELS[sortValue] || SORT_TRIGGER_LABELS.relevance}
      value={sortValue}
      variant="sort"
    >
      <option value="relevance">Most relevant</option>
      <option value="newest">Newest</option>
      <option value="price_asc">Low price first</option>
      <option value="price_desc">High price first</option>
    </SelectControl>
  )
}
