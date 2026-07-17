import { useEffect, useId, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { apiGet } from '../../lib/api'
import type {
  BrowseSearchItemSuggestion,
  BrowseSearchRefinementSuggestion,
  BrowseSearchSuggestionsResponse,
} from '../../types/api'
import { formatMoney, getListingImage } from '../../utils/format'
import { navigateTo, withBasePath } from '../../utils/navigation'
import { Icon } from '../icons/Icon'
import { SafeImage } from '../ui/SafeImage'

const SUGGESTION_FILTERS = [
  'type',
  'category',
  'brand',
  'condition',
  'color',
  'gender',
  'size',
  'minPrice',
  'maxPrice',
  'location',
] as const

type BrowseChoice =
  | { key: string; kind: 'search'; value: string }
  | { key: string; kind: 'refinement'; suggestion: BrowseSearchRefinementSuggestion }
  | { key: string; kind: 'item'; suggestion: BrowseSearchItemSuggestion }

type BrowseSearchComboboxProps = {
  className?: string
  query: URLSearchParams
}

function normalized(value: string) {
  return value.normalize('NFKC').trim()
}

function browseHref(query: URLSearchParams, value: string) {
  const next = new URLSearchParams(query.toString())
  next.delete('page')
  next.delete('limit')

  const searchValue = normalized(value)
  if (searchValue) next.set('q', searchValue)
  else next.delete('q')

  const suffix = next.toString()
  return suffix ? `/browse?${suffix}` : '/browse'
}

function refinementValue(suggestion: BrowseSearchRefinementSuggestion) {
  const value = normalized(suggestion.value || suggestion.label)
  return suggestion.type === 'hashtag' ? `#${value.replace(/^#+/, '')}` : value
}

function itemHref(suggestion: BrowseSearchItemSuggestion) {
  return suggestion.href || `/listing/${encodeURIComponent(suggestion.entity._id || suggestion.sourceId || '')}`
}

function refinementIcon(type: BrowseSearchRefinementSuggestion['type']) {
  if (type === 'brand') return 'store'
  if (type === 'category') return 'grid'
  return 'search'
}

export function BrowseSearchCombobox({ className = '', query }: BrowseSearchComboboxProps) {
  const submittedValue = query.get('q') || ''
  const [value, setValue] = useState(submittedValue)
  const [suggestions, setSuggestions] = useState<BrowseSearchSuggestionsResponse['suggestions']>([])
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [requestNonce, setRequestNonce] = useState(0)
  const rootRef = useRef<HTMLFormElement | null>(null)
  const requestRef = useRef<AbortController | null>(null)
  const dismissedRef = useRef(false)
  const inputId = useId()
  const listId = useId()
  const suggestedHeadingId = useId()
  const itemHeadingId = useId()
  const trimmedValue = normalized(value)
  const changedSinceSubmission = trimmedValue !== normalized(submittedValue)
  const suggestionsEligible = changedSinceSubmission && trimmedValue.length >= 2

  const refinements = useMemo(
    () => suggestions.filter((suggestion): suggestion is BrowseSearchRefinementSuggestion => suggestion.kind === 'term').slice(0, 4),
    [suggestions],
  )
  const items = useMemo(
    () => suggestions.filter((suggestion): suggestion is BrowseSearchItemSuggestion => suggestion.kind === 'entity' && suggestion.type === 'item').slice(0, 5),
    [suggestions],
  )
  const choices = useMemo<BrowseChoice[]>(() => suggestionsEligible ? [
    { key: `search:${trimmedValue}`, kind: 'search', value: trimmedValue },
    ...refinements.map((suggestion) => ({ key: `term:${suggestion.type}:${suggestion.value}`, kind: 'refinement' as const, suggestion })),
    ...items.map((suggestion) => ({ key: `item:${suggestion.entity._id || suggestion.sourceId}`, kind: 'item' as const, suggestion })),
  ] : [], [items, refinements, suggestionsEligible, trimmedValue])

  useEffect(() => {
    if (!suggestionsEligible) {
      requestRef.current?.abort()
      return undefined
    }

    const controller = new AbortController()
    requestRef.current?.abort()
    requestRef.current = controller
    const timeout = window.setTimeout(() => {
      const params = new URLSearchParams({ limit: '9', q: trimmedValue, scope: 'items' })
      SUGGESTION_FILTERS.forEach((name) => {
        const filterValue = query.get(name)?.trim()
        if (filterValue) params.set(name, filterValue)
      })
      setLoading(true)
      void apiGet<BrowseSearchSuggestionsResponse>(`/search/suggestions?${params.toString()}`, {
        signal: controller.signal,
      }).then((response) => {
        if (controller.signal.aborted || dismissedRef.current) return
        setSuggestions((response.suggestions || []).slice(0, 9))
        setActiveIndex(-1)
        setError('')
        setOpen(true)
      }).catch(() => {
        if (controller.signal.aborted) return
        setSuggestions([])
        setActiveIndex(-1)
        setError('Suggestions are unavailable. Press Enter to search the marketplace.')
        setOpen(true)
      }).finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    }, 250)

    return () => {
      window.clearTimeout(timeout)
      controller.abort()
      if (requestRef.current === controller) requestRef.current = null
    }
  }, [query, requestNonce, suggestionsEligible, trimmedValue])

  useEffect(() => {
    function closeOnOutsideClick(event: MouseEvent) {
      if (rootRef.current?.contains(event.target as Node)) return
      dismissedRef.current = true
      requestRef.current?.abort()
      setLoading(false)
      setOpen(false)
      setActiveIndex(-1)
    }

    document.addEventListener('mousedown', closeOnOutsideClick)
    return () => document.removeEventListener('mousedown', closeOnOutsideClick)
  }, [])

  function navigateToSearch(searchValue: string) {
    dismissedRef.current = true
    requestRef.current?.abort()
    setLoading(false)
    setOpen(false)
    setActiveIndex(-1)
    navigateTo(browseHref(query, searchValue))
  }

  function selectChoice(choice: BrowseChoice) {
    if (choice.kind === 'search') {
      navigateToSearch(choice.value)
      return
    }
    if (choice.kind === 'refinement') {
      navigateToSearch(refinementValue(choice.suggestion))
      return
    }

    dismissedRef.current = true
    requestRef.current?.abort()
    setOpen(false)
    navigateTo(itemHref(choice.suggestion))
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const choice = activeIndex >= 0 ? choices[activeIndex] : undefined
    if (choice) selectChoice(choice)
    else navigateToSearch(value)
  }

  function clear() {
    requestRef.current?.abort()
    setValue('')
    setSuggestions([])
    setError('')
    setLoading(false)
    setOpen(false)
    setActiveIndex(-1)
    if (normalized(submittedValue)) navigateToSearch('')
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape') {
      dismissedRef.current = true
      requestRef.current?.abort()
      setLoading(false)
      setOpen(false)
      setActiveIndex(-1)
      return
    }

    if (!choices.length || (event.key !== 'ArrowDown' && event.key !== 'ArrowUp')) return
    event.preventDefault()
    dismissedRef.current = false
    setOpen(true)
    setActiveIndex((current) => {
      if (event.key === 'ArrowDown') return current >= choices.length - 1 ? 0 : current + 1
      return current <= 0 ? choices.length - 1 : current - 1
    })
  }

  function optionClass(index: number) {
    return `flex min-h-12 cursor-pointer items-center gap-3 px-3 py-2 text-left transition ${index === activeIndex ? 'bg-accent-light text-accent' : 'hover:bg-foose-surface-low'}`
  }

  const showDropdown = open && suggestionsEligible
  const liveMessage = loading
    ? 'Loading marketplace suggestions'
    : error || (showDropdown ? `${choices.length} marketplace suggestions available` : '')
  let choiceIndex = 1

  return (
    <form
      action={withBasePath('/browse')}
      className={`relative flex items-center gap-2 rounded-2xl border border-foose-border bg-foose-surface/95 p-2 shadow-sm backdrop-blur ${className}`}
      method="get"
      onSubmit={submit}
      ref={rootRef}
      role="search"
    >
      {Array.from(query.entries())
        .filter(([name]) => name !== 'q' && name !== 'page' && name !== 'limit')
        .map(([name, hiddenValue]) => <input key={`${name}:${hiddenValue}`} name={name} type="hidden" value={hiddenValue} />)}
      <label className="flex min-h-12 min-w-0 flex-1 items-center gap-3 rounded-xl px-3 focus-within:ring-2 focus-within:ring-accent/20" htmlFor={inputId}>
        <Icon name="search" size={20} />
        <span className="sr-only">Search marketplace items</span>
        <input
          aria-activedescendant={showDropdown && activeIndex >= 0 ? `${listId}-option-${activeIndex}` : undefined}
          aria-autocomplete="list"
          aria-controls={listId}
          aria-expanded={showDropdown}
          aria-label="Search marketplace items"
          autoComplete="off"
          className="h-12 min-w-0 flex-1 border-0 bg-transparent p-0 text-sm text-foose-text outline-none placeholder:text-foose-faint focus:ring-0"
          id={inputId}
          name="q"
          onChange={(event) => {
            const nextValue = event.target.value
            if (!nextValue) {
              clear()
              return
            }
            const eligible = normalized(nextValue).length >= 2 && normalized(nextValue) !== normalized(submittedValue)
            requestRef.current?.abort()
            dismissedRef.current = false
            setValue(nextValue)
            setSuggestions([])
            setError('')
            setLoading(false)
            setActiveIndex(-1)
            setOpen(eligible)
          }}
          onFocus={() => {
            if (!suggestionsEligible) return
            dismissedRef.current = false
            setOpen(true)
            if (!suggestions.length && !loading) setRequestNonce((current) => current + 1)
          }}
          onKeyDown={handleKeyDown}
          placeholder="Search clothes, brands and categories"
          role="combobox"
          type="search"
          value={value}
        />
      </label>
      <button className="inline-flex min-h-12 shrink-0 items-center justify-center rounded-xl bg-accent px-4 text-sm font-bold text-white transition hover:bg-accent-hover focus:outline-none focus:ring-2 focus:ring-accent/30 max-sm:px-3" type="submit">
        Search
      </button>

      <span aria-live="polite" className="sr-only" role="status">{liveMessage}</span>
      {showDropdown && (
        <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-[220] max-h-[min(70dvh,28rem)] overflow-y-auto rounded-2xl border border-foose-border bg-foose-surface p-1.5 text-foose-text shadow-2xl [scrollbar-width:thin]" id={listId} role="listbox">
          <div
            aria-selected={activeIndex === 0}
            className={optionClass(0)}
            id={`${listId}-option-0`}
            onClick={() => selectChoice(choices[0])}
            onMouseDown={(event) => event.preventDefault()}
            role="option"
          >
            <span aria-hidden className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent-light text-accent"><Icon name="search" size={18} /></span>
            <span className="min-w-0 flex-1 text-sm font-bold">Search marketplace for &ldquo;{trimmedValue}&rdquo;</span>
            <Icon name="arrow" size={17} />
          </div>

          {refinements.length > 0 && (
            <div aria-labelledby={suggestedHeadingId} role="group">
              <p className="border-t border-foose-border px-3 pb-1 pt-3 text-[10px] font-black uppercase tracking-[0.14em] text-foose-faint" id={suggestedHeadingId}>Suggested searches</p>
              {refinements.map((suggestion) => {
                const index = choiceIndex++
                return (
                  <div
                    aria-selected={activeIndex === index}
                    className={optionClass(index)}
                    id={`${listId}-option-${index}`}
                    key={`term:${suggestion.type}:${suggestion.value}`}
                    onClick={() => selectChoice(choices[index])}
                    onMouseDown={(event) => event.preventDefault()}
                    role="option"
                  >
                    <span aria-hidden className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg bg-foose-surface-low text-accent"><Icon name={refinementIcon(suggestion.type)} size={18} /></span>
                    <span className="min-w-0 flex-1">
                      <strong className="block truncate text-sm">{suggestion.type === 'hashtag' ? `#${suggestion.value.replace(/^#+/, '')}` : suggestion.label}</strong>
                      <small className="block text-xs capitalize text-foose-faint">{suggestion.type}</small>
                    </span>
                    <span className="shrink-0 text-xs font-bold text-foose-muted">{suggestion.count} {suggestion.count === 1 ? 'item' : 'items'}</span>
                  </div>
                )
              })}
            </div>
          )}

          {items.length > 0 && (
            <div aria-labelledby={itemHeadingId} role="group">
              <p className="border-t border-foose-border px-3 pb-1 pt-3 text-[10px] font-black uppercase tracking-[0.14em] text-foose-faint" id={itemHeadingId}>Matching items</p>
              {items.map((suggestion) => {
                const index = choiceIndex++
                const imageUrl = suggestion.imageUrl || getListingImage(suggestion.entity)
                return (
                  <div
                    aria-selected={activeIndex === index}
                    className={optionClass(index)}
                    id={`${listId}-option-${index}`}
                    key={`item:${suggestion.entity._id || suggestion.sourceId}`}
                    onClick={() => selectChoice(choices[index])}
                    onMouseDown={(event) => event.preventDefault()}
                    role="option"
                  >
                    <SafeImage
                      alt=""
                      className="size-11 shrink-0 rounded-xl object-cover"
                      fallback={<Icon name="bag" size={19} />}
                      fallbackClassName="text-foose-faint"
                      loading="lazy"
                      src={imageUrl}
                    />
                    <span className="min-w-0 flex-1">
                      <strong className="block truncate text-sm">{suggestion.label || suggestion.entity.title}</strong>
                      <small className="block truncate text-xs text-foose-faint">{suggestion.subtitle || 'Independent seller'}</small>
                    </span>
                    <strong className="shrink-0 text-xs text-accent">{formatMoney(suggestion.entity.price, suggestion.entity.currency)}</strong>
                  </div>
                )
              })}
            </div>
          )}

          {loading && <p className="border-t border-foose-border px-4 py-2 text-xs text-foose-muted">Loading suggestions...</p>}
          {error && <p className="border-t border-foose-border px-4 py-2 text-xs text-foose-muted">{error}</p>}
        </div>
      )}
    </form>
  )
}
