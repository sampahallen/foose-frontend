import type { ChangeEvent } from 'react'
import { navigateTo } from '../../utils/navigation'
import { SelectControl } from '../ui/SelectControl'

export function MarketplaceSortControl({
  actionPath,
  query,
}: {
  actionPath: string
  query: URLSearchParams
}) {
  function changeSort(event: ChangeEvent<HTMLSelectElement>) {
    const next = new URLSearchParams(query.toString())
    next.set('sort', event.target.value || 'relevance')
    next.delete('page')
    navigateTo(`${actionPath}?${next.toString()}`)
  }

  return (
    <SelectControl
      aria-label="Sort listings"
      className="h-10 w-[10.5rem] rounded-xl border border-foose-border bg-foose-surface px-3 text-sm font-bold text-foose-text shadow-sm"
      onChange={changeSort}
      value={query.get('sort') || 'relevance'}
    >
      <option value="relevance">Relevance</option>
      <option value="newest">Newest</option>
      <option value="price_desc">Price high</option>
      <option value="price_asc">Price low</option>
      <option value="popular">Popular</option>
    </SelectControl>
  )
}
