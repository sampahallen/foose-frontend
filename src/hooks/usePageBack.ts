import { useCallback, useMemo } from 'react'
import { useNavigationStore } from '../stores/navigationMemoryStore'
import {
  navigateBack,
  type NavigationFallback,
} from '../utils/navigation'
import { routeNavigationRegistry } from '../utils/routes'

export type UsePageBackOptions = {
  fallback?: string | NavigationFallback
  label?: string
}

export function usePageBack(options: UsePageBackOptions = {}) {
  const currentEntryId = useNavigationStore((state) => state.currentEntryId)
  const entries = useNavigationStore((state) => state.entries)
  const currentEntry = useMemo(
    () => entries.find((entry) => entry.id === currentEntryId),
    [currentEntryId, entries],
  )
  const previousEntry = useMemo(() => currentEntry
    ? entries
      .filter((entry) => entry.sessionId === currentEntry.sessionId && entry.index < currentEntry.index)
      .sort((left, right) => right.index - left.index)[0]
    : undefined, [currentEntry, entries])

  const routeDefinition = currentEntry ? routeNavigationRegistry[currentEntry.route] : undefined
  const configuredFallback = routeDefinition && 'fallback' in routeDefinition ? routeDefinition.fallback : undefined
  const fallbackLabel = typeof options.fallback === 'string'
    ? undefined
    : options.fallback?.label
  const destinationLabel = currentEntry?.sourceLabel
    ?? (previousEntry ? routeNavigationRegistry[previousEntry.route].label : undefined)
    ?? fallbackLabel
    ?? configuredFallback?.label
    ?? 'Home'
  const label = options.label ?? `Back to ${destinationLabel}`
  const goBack = useCallback(() => navigateBack({ fallback: options.fallback }), [options.fallback])

  return {
    canGoBack: Boolean(previousEntry),
    currentEntry,
    fallback: options.fallback ?? configuredFallback,
    goBack,
    label,
    previousEntry,
  }
}
