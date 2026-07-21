import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react'
import { apiGet } from '../../lib/api'
import type { HashtagSuggestion, HashtagSuggestionsResponse } from '../../types/api'
import { Icon } from '../icons/Icon'

const DEFAULT_MAX_TAGS = 10
const MAX_HASHTAG_LENGTH = 32
const SUGGESTION_LIMIT = 10
const SUGGESTION_DEBOUNCE_MS = 200

function normalizeHashtag(value: string) {
  return value
    .normalize('NFKC')
    .trim()
    .replace(/^#+/, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}_-]/gu, '')
    .slice(0, MAX_HASHTAG_LENGTH)
}

function normalizeTags(values: string[], maxTags: number) {
  return Array.from(new Set(values.map(normalizeHashtag).filter(Boolean))).slice(0, maxTags)
}

function formatPostCount(value: number) {
  const count = Number.isFinite(value) ? Math.max(0, value) : 0
  const formatted = new Intl.NumberFormat(undefined, {
    maximumFractionDigits: count >= 1_000 ? 1 : 0,
    notation: count >= 1_000 ? 'compact' : 'standard',
  }).format(count)

  return `${formatted} ${count === 1 ? 'post' : 'posts'}`
}

export type HashtagInputProps = {
  ariaLabel?: string
  disabled?: boolean
  error?: string
  hint?: string
  id?: string
  initialTags?: string[]
  label?: string
  maxTags?: number
  name?: string
  onChange?: (tags: string[]) => void
  placeholder?: string
  required?: boolean
}

export function HashtagInput(props: HashtagInputProps) {
  return <HashtagInputState {...props} />
}

function HashtagInputState({
  ariaLabel = 'Hashtags',
  disabled = false,
  error,
  hint = 'Type a hashtag, then press Enter.',
  id,
  initialTags = [],
  label,
  maxTags = DEFAULT_MAX_TAGS,
  name = 'hashtags',
  onChange,
  placeholder = '#streetwear',
  required = false,
}: HashtagInputProps) {
  const [uncontrolledTags, setUncontrolledTags] = useState<string[]>(() => normalizeTags(initialTags, maxTags))
  const controlledTags = useMemo(() => normalizeTags(initialTags, maxTags), [initialTags, maxTags])
  const tags = onChange ? controlledTags : uncontrolledTags
  const [draft, setDraft] = useState('')
  const [suggestions, setSuggestions] = useState<HashtagSuggestion[]>([])
  const [activeIndex, setActiveIndex] = useState(-1)
  const [loading, setLoading] = useState(false)
  const [suggestionsOpen, setSuggestionsOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const generatedId = useId()
  const inputId = id || `hashtag-input-${generatedId}`
  const listboxId = `${inputId}-suggestions`
  const query = normalizeHashtag(draft)
  const atLimit = tags.length >= maxTags

  useEffect(() => {
    if (!query || atLimit || disabled) {
      return undefined
    }

    const controller = new AbortController()
    const timer = window.setTimeout(() => {
      setLoading(true)
      void apiGet<HashtagSuggestionsResponse>(
        `/hashtags/suggestions?q=${encodeURIComponent(query)}&limit=${SUGGESTION_LIMIT}`,
        { signal: controller.signal },
      )
        .then((result) => {
          const nextSuggestions = Array.isArray(result?.suggestions)
            ? result.suggestions
                .map((suggestion) => ({
                  hashtag: suggestion.hashtag || `#${normalizeHashtag(suggestion.name)}`,
                  name: normalizeHashtag(suggestion.name || suggestion.hashtag),
                  postCount: Number(suggestion.postCount) || 0,
                }))
                .filter((suggestion) => suggestion.name && !tags.includes(suggestion.name))
            : []

          setSuggestions(nextSuggestions)
          setActiveIndex(nextSuggestions.length ? 0 : -1)
        })
        .catch((requestError: unknown) => {
          if (requestError instanceof Error && requestError.name === 'AbortError') return
          setSuggestions([])
          setActiveIndex(-1)
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false)
        })
    }, SUGGESTION_DEBOUNCE_MS)

    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [atLimit, disabled, query, tags])

  function updateTags(nextTags: string[]) {
    const normalized = normalizeTags(nextTags, maxTags)
    if (!onChange) setUncontrolledTags(normalized)
    onChange?.(normalized)
  }

  function commit(value: string) {
    const incoming = value
      .split(/[\s,]+/)
      .map(normalizeHashtag)
      .filter(Boolean)

    if (incoming.length) updateTags([...tags, ...incoming])
    setDraft('')
    setSuggestions([])
    setSuggestionsOpen(false)
    setActiveIndex(-1)
  }

  function selectSuggestion(suggestion: HashtagSuggestion) {
    commit(suggestion.name || suggestion.hashtag)
    window.requestAnimationFrame(() => inputRef.current?.focus())
  }

  function removeTag(tag: string) {
    updateTags(tags.filter((item) => item !== tag))
    window.requestAnimationFrame(() => inputRef.current?.focus())
  }

  function handleKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown' && suggestions.length) {
      event.preventDefault()
      setSuggestionsOpen(true)
      setActiveIndex((current) => (current + 1) % suggestions.length)
      return
    }

    if (event.key === 'ArrowUp' && suggestions.length) {
      event.preventDefault()
      setSuggestionsOpen(true)
      setActiveIndex((current) => (current <= 0 ? suggestions.length - 1 : current - 1))
      return
    }

    if (event.key === 'Escape') {
      setSuggestionsOpen(false)
      setActiveIndex(-1)
      return
    }

    if (event.key === 'Backspace' && !draft && tags.length) {
      event.preventDefault()
      removeTag(tags[tags.length - 1])
      return
    }

    if (event.key === 'Enter' || event.key === ',' || event.key === ' ') {
      event.preventDefault()
      if (event.key === 'Enter' && suggestionsOpen && activeIndex >= 0) {
        const suggestion = suggestions[activeIndex]
        if (suggestion) {
          selectSuggestion(suggestion)
          return
        }
      }
      commit(draft)
    }
  }

  function handleDraftChange(value: string) {
    if (/[\s,]/.test(value)) {
      commit(value)
      return
    }

    setDraft(value)
    setSuggestions([])
    setLoading(false)
    setSuggestionsOpen(Boolean(normalizeHashtag(value)))
    setActiveIndex(-1)
  }

  return (
    <div className="relative">
      {label && (
        <label className="mb-2 block text-sm font-bold text-foose-text" htmlFor={inputId}>
          {label}{required && <span aria-hidden className="ml-1 text-foose-danger">*</span>}
        </label>
      )}
      <div
        className={`rounded-xl border bg-foose-surface px-2 py-1.5 transition focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/15 lg:px-3 lg:py-2 ${
          disabled ? 'cursor-not-allowed border-foose-border opacity-60' : error ? 'border-foose-danger bg-foose-danger-bg/10 focus-within:border-foose-danger focus-within:ring-foose-danger/15' : 'border-foose-border'
        }`}
        onClick={() => inputRef.current?.focus()}
      >
        {/* Keep the empty value in FormData so clearing every tag also clears it on edit. */}
        <input name={name} readOnly type="hidden" value={tags.join(',')} />
        <div className="flex min-h-11 flex-wrap items-center gap-1.5 lg:min-h-12 lg:gap-2">
          {tags.map((tag) => (
            <span
              className="inline-flex min-h-8 max-w-full items-center gap-0.5 rounded-full bg-accent-light py-0.5 pl-2 pr-0.5 text-[11px] font-black leading-4 text-accent lg:min-h-11 lg:gap-1 lg:py-1 lg:pl-3 lg:pr-1 lg:text-xs"
              key={tag}
            >
              #{tag}
              <button
                aria-label={`Remove #${tag}`}
                className="inline-flex size-8 shrink-0 items-center justify-center rounded-full text-accent transition hover:bg-accent hover:text-white focus:outline-none focus:ring-2 focus:ring-accent/30 lg:size-11"
                disabled={disabled}
                onClick={(event) => {
                  event.stopPropagation()
                  removeTag(tag)
                }}
                type="button"
              >
                <Icon name="close" size={11} />
              </button>
            </span>
          ))}
          {!atLimit && (
            <input
              aria-activedescendant={activeIndex >= 0 ? `${listboxId}-${activeIndex}` : undefined}
              aria-autocomplete="list"
              aria-controls={suggestionsOpen ? listboxId : undefined}
              aria-describedby={error ? `${inputId}-error` : `${inputId}-hint`}
              aria-expanded={suggestionsOpen}
              aria-invalid={Boolean(error) || undefined}
              aria-label={ariaLabel}
              autoComplete="off"
              className="!w-auto min-w-24 flex-1 !rounded-none !border-0 !bg-transparent !px-1 !py-1 text-[13px] outline-none placeholder:text-foose-faint focus:!ring-0 lg:min-w-32 lg:text-sm"
              disabled={disabled}
              id={inputId}
              onBlur={() => {
                commit(draft)
              }}
              onChange={(event) => handleDraftChange(event.target.value)}
              onFocus={() => setSuggestionsOpen(Boolean(query))}
              onKeyDown={handleKeyDown}
              placeholder={tags.length ? 'Add another hashtag' : placeholder}
              ref={inputRef}
              role="combobox"
              type="text"
              value={draft}
            />
          )}
        </div>
      </div>

      <div className="mt-1 flex items-start justify-between gap-3 text-xs font-semibold text-foose-muted">
        {error ? <span className="text-foose-danger" id={`${inputId}-error`} role="alert">{error}</span> : <span id={`${inputId}-hint`}>{hint}</span>}
        <span className="shrink-0">{tags.length}/{maxTags}</span>
      </div>

      {suggestionsOpen && query && !atLimit && (
        <div
          className="absolute left-0 right-0 top-[calc(100%+0.35rem)] z-40 max-h-72 overflow-y-auto rounded-xl border border-foose-border bg-white p-1.5 shadow-2xl"
          id={listboxId}
          role="listbox"
        >
          {loading && !suggestions.length && (
            <div className="flex min-h-12 items-center gap-2 px-3 text-sm font-semibold text-foose-muted" role="status">
              <span aria-hidden className="size-4 animate-spin rounded-full border-2 border-foose-border border-t-accent" />
              Finding hashtags...
            </div>
          )}

          {!loading && !suggestions.length && (
            <button
              className="flex min-h-12 w-full items-center justify-between gap-4 rounded-lg px-3 text-left transition hover:bg-accent-light focus:bg-accent-light focus:outline-none"
              onPointerDown={(event) => event.preventDefault()}
              onClick={() => commit(query)}
              type="button"
            >
              <span className="min-w-0 truncate text-sm font-black text-foose-text">#{query}</span>
              <span className="shrink-0 text-xs font-semibold text-foose-muted">New hashtag</span>
            </button>
          )}

          {suggestions.map((suggestion, index) => (
            <button
              aria-selected={activeIndex === index}
              className={`flex min-h-12 w-full items-center justify-between gap-4 rounded-lg px-3 text-left transition hover:bg-accent-light focus:bg-accent-light focus:outline-none ${
                activeIndex === index ? 'bg-accent-light' : ''
              }`}
              id={`${listboxId}-${index}`}
              key={suggestion.name}
              onPointerDown={(event) => event.preventDefault()}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => selectSuggestion(suggestion)}
              role="option"
              type="button"
            >
              <span className="min-w-0 truncate text-sm font-black text-foose-text">
                {suggestion.hashtag || `#${suggestion.name}`}
              </span>
              <span className="shrink-0 text-xs font-semibold text-foose-muted">
                {formatPostCount(suggestion.postCount)}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
