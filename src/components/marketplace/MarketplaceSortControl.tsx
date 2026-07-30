import type { ChangeEvent } from 'react'
import { MdOutlineSort } from 'react-icons/md'
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
      className="h-10 w-[6.5rem] rounded-lg border border-foose-border bg-foose-surface px-2.5 text-sm font-bold text-foose-text shadow-sm"
      leadingIcon={<MdOutlineSort className="text-xl" />}
      menuMinWidth={192}
      onChange={changeSort}
      triggerLabel="Sort"
      value={query.get('sort') || 'relevance'}
      variant="sort"
    >
      <option value="relevance">Most relevant</option>
      <option value="newest">Newest</option>
      <option value="price_asc">Low price first</option>
      <option value="price_desc">High price first</option>
    </SelectControl>
  )
}
