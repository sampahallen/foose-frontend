import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { apiGet } from '../../lib/api'
import type { GalleryPost, UnifiedSearchSuggestion, UnifiedSearchSuggestionsResponse } from '../../types/api'
import { getErrorMessage } from '../../utils/errorMessage'
import { recordFinspoSearchClick } from '../../utils/finspoSearchSignals'
import { navigateTo } from '../../utils/navigation'
import { Icon } from '../icons/Icon'
import { SafeImage } from '../ui/SafeImage'

type UnifiedSearchComboboxProps = {
  autoFocus?: boolean
  className?: string
  defaultValue?: string
  label?: string
  onClear?: () => void
  placeholder?: string
  suggestionsEnabled?: boolean
  variant?: 'dark' | 'light'
}

function normalizedTag(value: string) {
  return value.normalize('NFKC').trim().replace(/^#+/, '').toLocaleLowerCase()
}

function searchHref(value: string) {
  const query = value.trim()
  if (/^#[^\s#]+$/.test(query)) {
    return `/search?tag=${encodeURIComponent(normalizedTag(query))}&tab=all`
  }
  return query ? `/search?q=${encodeURIComponent(query)}&tab=all` : '/search'
}

function entityId(suggestion: UnifiedSearchSuggestion) {
  return suggestion.id || suggestion.sourceId || suggestion.entity?._id || ''
}

function suggestionHref(suggestion: UnifiedSearchSuggestion) {
  if (suggestion.type === 'hashtag' || suggestion.kind === 'hashtag' || suggestion.hashtag) {
    return `/search?tag=${encodeURIComponent(normalizedTag(suggestion.hashtag || suggestion.label))}&tab=all`
  }
  if (suggestion.href) return suggestion.href

  const id = entityId(suggestion)
  if (suggestion.type === 'item') return `/listing/${encodeURIComponent(id)}`
  if (suggestion.type === 'finspo') return `/community/finspo/${encodeURIComponent(id)}`
  if (suggestion.type === 'event') return `/community/events/${encodeURIComponent(id)}`
  const username = suggestion.username
    || (suggestion.entity && 'username' in suggestion.entity ? suggestion.entity.username : '')
  return username ? `/profile/${encodeURIComponent(username)}` : `/profile/${encodeURIComponent(id)}`
}

function suggestionIcon(type: UnifiedSearchSuggestion['type']) {
  if (type === 'item') return 'bag'
  if (type === 'event') return 'calendar'
  if (type === 'user') return 'user'
  return type === 'hashtag' ? 'search' : 'grid'
}

export function UnifiedSearchCombobox({
  autoFocus = false,
  className = '',
  defaultValue = '',
  label = 'Search Foose',
  onClear,
  placeholder = 'Search items, Finspo, events and people',
  suggestionsEnabled = true,
  variant = 'light',
}: UnifiedSearchComboboxProps) {
  const { user } = useAuth()
  const [value, setValue] = useState(defaultValue)
  const [suggestions, setSuggestions] = useState<UnifiedSearchSuggestion[]>([])
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const [error, setError] = useState('')
  const dismissedRef = useRef(false)
  const requestRef = useRef<AbortController | null>(null)
  const rootRef = useRef<HTMLFormElement | null>(null)
  const listId = useId()

  useEffect(() => {
    const query = value.trim()
    if (!suggestionsEnabled || query.length < 2) {
      requestRef.current?.abort()
      return undefined
    }

    const controller = new AbortController()
    requestRef.current = controller
    const timeout = window.setTimeout(() => {
      void apiGet<UnifiedSearchSuggestionsResponse>(`/search/suggestions?q=${encodeURIComponent(query)}`, {
        signal: controller.signal,
      }).then((response) => {
        if (controller.signal.aborted || dismissedRef.current) return
        setSuggestions((response.suggestions || []).slice(0, 10))
        setActiveIndex(-1)
        setError('')
        setOpen(true)
      }).catch((requestError) => {
        if (controller.signal.aborted) return
        setSuggestions([])
        setError(getErrorMessage(requestError, 'Suggestions are unavailable'))
      })
    }, 250)

    return () => {
      window.clearTimeout(timeout)
      controller.abort()
      if (requestRef.current === controller) requestRef.current = null
    }
  }, [suggestionsEnabled, value])

  useEffect(() => {
    function closeOnOutsideClick(event: MouseEvent) {
      if (rootRef.current?.contains(event.target as Node)) return
      dismissedRef.current = true
      requestRef.current?.abort()
      setOpen(false)
    }
    document.addEventListener('mousedown', closeOnOutsideClick)
    return () => document.removeEventListener('mousedown', closeOnOutsideClick)
  }, [])

  function selectSuggestion(suggestion: UnifiedSearchSuggestion) {
    if (suggestion.type === 'finspo' && suggestion.entity) {
      recordFinspoSearchClick(suggestion.entity as GalleryPost, user?._id)
    }
    requestRef.current?.abort()
    setOpen(false)
    const opensSearch = suggestion.type === 'hashtag' || suggestion.kind === 'hashtag' || Boolean(suggestion.hashtag)
    navigateTo(suggestionHref(suggestion), opensSearch ? { state: { unifiedSearchTrack: true } } : undefined)
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (activeIndex >= 0 && suggestions[activeIndex]) {
      selectSuggestion(suggestions[activeIndex])
      return
    }
    dismissedRef.current = true
    requestRef.current?.abort()
    setOpen(false)
    navigateTo(searchHref(value), value.trim() ? { state: { unifiedSearchTrack: true } } : undefined)
  }

  function clear() {
    requestRef.current?.abort()
    dismissedRef.current = true
    setValue('')
    setSuggestions([])
    setActiveIndex(-1)
    setError('')
    setOpen(false)
    onClear?.()
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape') {
      dismissedRef.current = true
      requestRef.current?.abort()
      setOpen(false)
      setActiveIndex(-1)
      return
    }
    if (!suggestions.length || (event.key !== 'ArrowDown' && event.key !== 'ArrowUp')) return
    event.preventDefault()
    setOpen(true)
    setActiveIndex((current) => {
      if (event.key === 'ArrowDown') return current >= suggestions.length - 1 ? 0 : current + 1
      return current <= 0 ? suggestions.length - 1 : current - 1
    })
  }

  const dark = variant === 'dark'
  return (
    <form className={`relative min-w-0 ${className}`} onSubmit={submit} ref={rootRef} role="search">
      <label className={`flex h-12 min-w-0 items-center gap-3 rounded-2xl border px-4 shadow-sm transition focus-within:ring-2 ${dark
        ? 'border-white/20 bg-white/10 text-white focus-within:border-white/60 focus-within:ring-white/20'
        : 'border-foose-border bg-foose-surface text-foose-text focus-within:border-accent focus-within:ring-accent/15'}`}>
        <Icon name="search" />
        <span className="sr-only">{label}</span>
        <input
          aria-activedescendant={activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined}
          aria-autocomplete="list"
          aria-controls={listId}
          aria-expanded={suggestionsEnabled && open && Boolean(suggestions.length)}
          aria-label={label}
          autoComplete="off"
          autoFocus={autoFocus}
          className={`h-full min-w-0 flex-1 border-0 bg-transparent p-0 text-sm outline-none focus:ring-0 ${dark ? 'text-white placeholder:text-white/70' : 'text-foose-text placeholder:text-foose-faint'}`}
          onChange={(event) => {
            const nextValue = event.target.value
            dismissedRef.current = false
            setValue(nextValue)
            if (nextValue.trim().length < 2) {
              setSuggestions([])
              setActiveIndex(-1)
              setError('')
            }
            setOpen(suggestionsEnabled)
          }}
          onFocus={() => {
            if (!suggestionsEnabled) return
            dismissedRef.current = false
            setOpen(true)
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          role="combobox"
          value={value}
        />
        {value && (
          <button
            aria-label="Clear search"
            className={`inline-flex size-11 shrink-0 items-center justify-center rounded-full border-0 bg-transparent transition focus:outline-none focus:ring-2 ${dark ? 'text-white/80 hover:bg-white/15 focus:ring-white/30' : 'text-foose-muted hover:bg-foose-surface-low hover:text-accent focus:ring-accent/25'}`}
            onClick={clear}
            type="button"
          >
            <Icon name="close" size={16} />
          </button>
        )}
      </label>
      {suggestionsEnabled && open && (suggestions.length > 0 || error) && (
        <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-[120] overflow-hidden rounded-2xl border border-foose-border bg-foose-surface p-1.5 text-foose-text shadow-2xl">
          {error ? (
            <p className="px-4 py-3 text-xs text-foose-muted" role="status">{error}</p>
          ) : (
            <ul aria-label="Search suggestions" id={listId} role="listbox">
              {suggestions.map((suggestion, index) => (
                <li
                  aria-selected={index === activeIndex}
                  className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${index === activeIndex ? 'bg-accent-light text-accent' : 'hover:bg-foose-surface-low'}`}
                  id={`${listId}-${index}`}
                  key={`${suggestion.type}:${entityId(suggestion) || suggestion.hashtag || suggestion.label}:${index}`}
                  onClick={() => selectSuggestion(suggestion)}
                  onMouseDown={(event) => event.preventDefault()}
                  role="option"
                >
                  <SafeImage
                    alt=""
                    className="size-10 shrink-0 rounded-xl object-cover"
                    fallback={<Icon name={suggestionIcon(suggestion.type)} size={17} />}
                    fallbackClassName="bg-accent-light text-accent"
                    src={suggestion.imageUrl}
                  />
                  <span className="min-w-0 flex-1">
                    <strong className="block truncate text-sm">{suggestion.type === 'hashtag' ? `#${normalizedTag(suggestion.hashtag || suggestion.label)}` : suggestion.label}</strong>
                    {suggestion.subtitle && <small className="block truncate text-xs text-foose-faint">{suggestion.subtitle}</small>}
                  </span>
                  <span className="rounded-full bg-foose-surface-low px-2 py-1 text-[10px] font-black uppercase text-foose-faint">{suggestion.type}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </form>
  )
}
