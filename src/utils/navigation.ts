import {
  createNavigationId,
  findNavigationSnapshot,
  getCurrentNavigationEntry,
  getCurrentNavigationEntryId,
  setNavigationSnapshot,
  useNavigationStore,
  type NavigationEntry,
  type NavigationOrigin,
  type NavigationPresentation,
  type NavigationTrigger,
} from '../stores/navigationMemoryStore'
import { resolveRoute, routeNavigationRegistry } from './routes'

export const APP_NAVIGATION_EVENT = 'foose:app-navigation'

export type NavigationFlashTone = 'success' | 'error' | 'info' | 'warning'

export type NavigationFlashMessage = {
  duration?: number
  id?: string
  message: string
  title?: string
  tone: NavigationFlashTone
}

export type NavigationState = Record<string, unknown> & {
  fooseFlash?: NavigationFlashMessage
  fooseNavigation: true
  fooseNavigationId: string
  fooseNavigationSessionId: string
  fooseNavigationIndex: number
  fooseNavigationOrigin: NavigationOrigin
}

export type NavigationContext = {
  presentation?: NavigationPresentation
  sourceLabel?: string
  trigger?: NavigationTrigger
}

export type NavigateOptions = NavigationContext & {
  flash?: NavigationFlashMessage
  replace?: boolean
  scroll?: 'preserve' | 'top'
  state?: Record<string, unknown>
}

export type NavigationTransition = {
  kind: 'push' | 'replace' | 'pop'
  targetHref: string
  retry: () => void
}

export type NavigationBlocker = (transition: NavigationTransition) => boolean | void

export type NavigationFallback = {
  href: string
  label?: string
}

type AppNavigationEventDetail = {
  action: 'push' | 'replace'
  entry: NavigationEntry
}

const routeSubscribers = new Set<() => void>()
const navigationBlockers = new Set<NavigationBlocker>()
const navigationCaptures = new Set<() => void>()
const scrollRegions = new Map<string, () => HTMLElement | null>()
let initialized = false
let scrollCaptureTimer: number | undefined
let nextContext: NavigationContext | undefined
let bouncingPop = false
let bypassNextPop = false

const SCROLL_CAPTURE_INTERVAL_MS = 120

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? value as Record<string, unknown> : {}
}

function historyMetadata(value: unknown) {
  const state = asRecord(value)
  if (
    state.fooseNavigation !== true
    || typeof state.fooseNavigationId !== 'string'
    || typeof state.fooseNavigationSessionId !== 'string'
    || typeof state.fooseNavigationIndex !== 'number'
    || !Number.isSafeInteger(state.fooseNavigationIndex)
    || state.fooseNavigationIndex < 0
    || (state.fooseNavigationOrigin !== 'initial' && state.fooseNavigationOrigin !== 'internal')
  ) return undefined
  return {
    id: state.fooseNavigationId,
    sessionId: state.fooseNavigationSessionId,
    index: state.fooseNavigationIndex,
    origin: state.fooseNavigationOrigin as NavigationOrigin,
  }
}

export function createNavigationState(
  state: Record<string, unknown> = {},
  flash?: NavigationFlashMessage,
  metadata?: { id?: string; sessionId?: string; index?: number; origin?: NavigationOrigin },
): NavigationState {
  const navigationState = useNavigationStore.getState()
  const current = getCurrentNavigationEntry()
  return {
    ...state,
    fooseNavigation: true,
    fooseNavigationId: metadata?.id ?? createNavigationId(),
    fooseNavigationSessionId: metadata?.sessionId ?? navigationState.sessionId,
    fooseNavigationIndex: metadata?.index ?? (current?.index ?? -1) + 1,
    fooseNavigationOrigin: metadata?.origin ?? 'internal',
    ...(flash ? { fooseFlash: flash } : {}),
  }
}

export function getAppBasePath() {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '')
  return base === '' || base === '/' ? '' : base
}

export function stripBasePath(pathname: string) {
  const base = getAppBasePath()
  if (!base) return pathname || '/'
  if (pathname === base) return '/'
  if (pathname.startsWith(`${base}/`)) return pathname.slice(base.length) || '/'
  return pathname || '/'
}

export function getCurrentAppPathname() {
  if (typeof window === 'undefined') return '/'
  if (window.location.hash.startsWith('#/')) return window.location.hash.slice(1).split('?')[0] || '/'
  return stripBasePath(window.location.pathname)
}

export function getCurrentAppHref() {
  if (typeof window === 'undefined') return '/'
  if (window.location.hash.startsWith('#/')) return window.location.hash.slice(1) || '/'
  return `${stripBasePath(window.location.pathname)}${window.location.search}${window.location.hash}`
}

export function withBasePath(path: string) {
  const base = getAppBasePath()
  if (!base || !path || path.startsWith('#') || /^[a-z][a-z0-9+.-]*:/i.test(path)) return path
  if (path === base || path.startsWith(`${base}/`)) return path
  if (path === '/') return `${base}/`
  return path.startsWith('/') ? `${base}${path}` : `${base}/${path}`
}

function routeParts(href: string) {
  const url = new URL(withBasePath(href), window.location.origin)
  if (url.hash.startsWith('#/')) {
    const hashUrl = new URL(url.hash.slice(1), window.location.origin)
    return { href: `${hashUrl.pathname}${hashUrl.search}${hashUrl.hash}`, pathname: hashUrl.pathname, search: hashUrl.search }
  }
  const pathname = stripBasePath(url.pathname)
  return { href: `${pathname}${url.search}${url.hash}`, pathname, search: url.search }
}

/**
 * History entries are session-persisted, so credential-bearing routes must
 * never retain their query, hash, or path token. The live browser URL is left
 * untouched for the owning page to consume and clear.
 */
function safeStoredHref(parts: ReturnType<typeof routeParts>, route: ReturnType<typeof resolveRoute>) {
  if (route === 'authCallback') return '/auth/callback'
  if (route === 'resetPassword') return '/reset-password'
  return parts.href
}

function emptyScroll() {
  return { window: { x: 0, y: 0 }, regions: {} }
}

function entryFromLocation({
  id,
  index,
  origin,
  sessionId,
  context,
}: {
  id: string
  index: number
  origin: NavigationOrigin
  sessionId: string
  context?: NavigationContext
}): NavigationEntry {
  const parts = routeParts(getCurrentAppHref())
  const route = resolveRoute(parts.pathname, parts.search)
  return {
    id,
    sessionId,
    index,
    href: safeStoredHref(parts, route),
    route,
    origin,
    presentation: context?.presentation,
    sourceLabel: context?.sourceLabel,
    scroll: emptyScroll(),
    trigger: context?.trigger,
    timestamp: Date.now(),
    snapshotKeys: [],
  }
}

function createDestinationEntry(
  href: string,
  metadata: { id: string; index: number; sessionId: string },
  context: NavigationContext,
  existing?: NavigationEntry,
): NavigationEntry {
  const parts = routeParts(href)
  const route = resolveRoute(parts.pathname, parts.search)
  return {
    id: metadata.id,
    sessionId: metadata.sessionId,
    index: metadata.index,
    href: safeStoredHref(parts, route),
    route,
    origin: 'internal',
    presentation: context.presentation ?? existing?.presentation,
    sourceLabel: context.sourceLabel ?? existing?.sourceLabel,
    scroll: existing?.scroll ?? emptyScroll(),
    trigger: existing?.trigger,
    timestamp: Date.now(),
    snapshotKeys: existing?.snapshotKeys ?? [],
  }
}

function ensureTriggerElementId(element: Element) {
  if (element.id) {
    element.setAttribute('data-foose-navigation-trigger-id', element.id)
    return element.id
  }
  const existing = element.getAttribute('data-foose-navigation-trigger-id')
  if (existing) return existing
  const id = createNavigationId('trigger')
  element.setAttribute('data-foose-navigation-trigger-id', id)
  return id
}

export function captureNavigationTrigger(
  element: Element | null = typeof document === 'undefined' ? null : document.activeElement,
): NavigationTrigger | undefined {
  if (!(element instanceof Element)) return undefined
  const rect = element.getBoundingClientRect()
  return {
    elementId: ensureTriggerElementId(element),
    viewportOffset: rect.top,
  }
}

export function setNextNavigationContext(context: NavigationContext) {
  nextContext = context
}

export function registerNavigationCapture(capture: () => void) {
  navigationCaptures.add(capture)
  return () => {
    navigationCaptures.delete(capture)
  }
}

export function registerNavigationScrollRegion(name: string, getElement: () => HTMLElement | null) {
  scrollRegions.set(name, getElement)
  return () => {
    if (scrollRegions.get(name) === getElement) scrollRegions.delete(name)
  }
}

export function captureCurrentNavigationState(
  trigger?: NavigationTrigger,
  options: { capturePageSnapshot?: boolean } = {},
) {
  const current = getCurrentNavigationEntry()
  if (!current || typeof window === 'undefined') return
  if (options.capturePageSnapshot !== false) {
    if (scrollCaptureTimer !== undefined) {
      window.clearTimeout(scrollCaptureTimer)
      scrollCaptureTimer = undefined
    }
    navigationCaptures.forEach((capture) => capture())
  }
  const regions = Object.fromEntries(Array.from(scrollRegions.entries()).flatMap(([name, getElement]) => {
    const element = getElement()
    return element ? [[name, { x: element.scrollLeft, y: element.scrollTop }]] : []
  }))
  useNavigationStore.getState().updateEntry(current.id, {
    scroll: {
      window: { x: window.scrollX, y: window.scrollY },
      regions,
    },
    trigger: trigger ?? current.trigger,
    timestamp: Date.now(),
  })
}

function triggerSelector(id: string) {
  const escape = globalThis.CSS?.escape
  return escape
    ? `#${escape(id)},[data-foose-navigation-trigger-id="${escape(id)}"]`
    : `[data-foose-navigation-trigger-id="${id.replace(/["\\]/g, '\\$&')}"]`
}

export function restoreNavigationPosition(entry = getCurrentNavigationEntry()) {
  if (!entry || typeof window === 'undefined') return
  window.scrollTo({ left: entry.scroll.window.x, top: entry.scroll.window.y })
  Object.entries(entry.scroll.regions).forEach(([name, position]) => {
    const element = scrollRegions.get(name)?.()
    element?.scrollTo({ left: position.x, top: position.y })
  })

  const trigger = entry.trigger
  if (!trigger?.elementId) return
  const element = document.querySelector<HTMLElement>(triggerSelector(trigger.elementId))
  if (!element) return
  element.focus({ preventScroll: true })
  if (trigger.viewportOffset === undefined) return
  const delta = element.getBoundingClientRect().top - trigger.viewportOffset
  if (Math.abs(delta) > 1) window.scrollTo({ left: window.scrollX, top: window.scrollY + delta })
}

function scheduleRestoration(entry: NavigationEntry) {
  const snapshots = useNavigationStore.getState().snapshots
  if (entry.snapshotKeys.some((key) => snapshots[key]?.mediaHeavy)) return
  window.requestAnimationFrame(() => window.requestAnimationFrame(() => {
    if (getCurrentNavigationEntryId() === entry.id) restoreNavigationPosition(entry)
  }))
}

function emitRouteChange() {
  routeSubscribers.forEach((subscriber) => subscriber())
}

function emitAppNavigation(action: 'push' | 'replace', entry: NavigationEntry) {
  window.dispatchEvent(new CustomEvent<AppNavigationEventDetail>(APP_NAVIGATION_EVENT, {
    detail: { action, entry },
  }))
  emitRouteChange()
}

function askBlockers(kind: NavigationTransition['kind'], targetHref: string, retry: () => void) {
  for (const blocker of navigationBlockers) {
    if (blocker({ kind, targetHref, retry }) === false) return false
  }
  return true
}

export function registerNavigationBlocker(blocker: NavigationBlocker) {
  initializeNavigation()
  navigationBlockers.add(blocker)
  return () => {
    navigationBlockers.delete(blocker)
  }
}

function performNavigate(path: string, options: NavigateOptions, bypassBlockers: boolean) {
  initializeNavigation()
  const target = withBasePath(path)
  const targetUrl = new URL(target, window.location.origin)
  const targetHref = `${targetUrl.pathname}${targetUrl.search}${targetUrl.hash}`
  const queuedContext = nextContext
  nextContext = undefined
  const resolvedOptions: NavigateOptions = {
    ...options,
    presentation: options.presentation ?? queuedContext?.presentation,
    sourceLabel: options.sourceLabel ?? queuedContext?.sourceLabel,
    trigger: options.trigger ?? queuedContext?.trigger,
  }
  const kind = resolvedOptions.replace ? 'replace' : 'push'
  const retry = () => performNavigate(path, resolvedOptions, true)
  if (!bypassBlockers && !askBlockers(kind, targetHref, retry)) return false

  const current = getCurrentNavigationEntry()
  const context: NavigationContext = {
    presentation: resolvedOptions.presentation,
    sourceLabel: resolvedOptions.sourceLabel
      ?? (current ? routeNavigationRegistry[current.route].label : undefined),
    trigger: resolvedOptions.trigger,
  }
  captureCurrentNavigationState(context.trigger ?? captureNavigationTrigger())

  const sessionId = useNavigationStore.getState().sessionId
  const id = resolvedOptions.replace && current ? current.id : createNavigationId()
  const index = resolvedOptions.replace && current ? current.index : (current?.index ?? -1) + 1
  const entry = createDestinationEntry(path, { id, index, sessionId }, context, resolvedOptions.replace ? current : undefined)
  const existingState = resolvedOptions.replace ? asRecord(window.history.state) : {}
  const state = createNavigationState(
    { ...existingState, ...resolvedOptions.state },
    resolvedOptions.flash,
    { id, index, sessionId, origin: 'internal' },
  )

  if (resolvedOptions.replace) {
    window.history.replaceState(state, '', target)
    useNavigationStore.getState().replaceEntry(entry)
  } else {
    window.history.pushState(state, '', target)
    useNavigationStore.getState().pushEntry(entry)
  }
  if ((resolvedOptions.scroll ?? 'top') === 'top') window.scrollTo({ top: 0, left: 0 })
  emitAppNavigation(kind, entry)
  return true
}

export function navigateTo(path: string, options: NavigateOptions = {}) {
  return performNavigate(path, options, false)
}

export function canNavigateBack() {
  const state = useNavigationStore.getState()
  const current = getCurrentNavigationEntry()
  return Boolean(current && state.entries.some((entry) => (
    entry.sessionId === current.sessionId && entry.index < current.index
  )))
}

export function getPreviousNavigationEntry() {
  const state = useNavigationStore.getState()
  const current = getCurrentNavigationEntry()
  if (!current) return undefined
  return state.entries
    .filter((entry) => entry.sessionId === current.sessionId && entry.index < current.index)
    .sort((left, right) => right.index - left.index)[0]
}

export function navigateBack(options: { fallback?: string | NavigationFallback } = {}) {
  initializeNavigation()
  if (canNavigateBack()) {
    window.history.back()
    return true
  }
  const current = getCurrentNavigationEntry()
  const routeDefinition = current ? routeNavigationRegistry[current.route] : undefined
  const registryFallback = routeDefinition && 'fallback' in routeDefinition ? routeDefinition.fallback : undefined
  const fallback = typeof options.fallback === 'string'
    ? options.fallback
    : options.fallback?.href ?? registryFallback?.href ?? '/'
  return navigateTo(fallback, { replace: true })
}

function commitPop(state: unknown) {
  const metadata = historyMetadata(state)
  const store = useNavigationStore.getState()
  if (!metadata || metadata.sessionId !== store.sessionId) {
    const sessionId = createNavigationId('session')
    store.resetSession(sessionId)
    const entry = entryFromLocation({ id: createNavigationId(), index: 0, origin: 'initial', sessionId })
    useNavigationStore.getState().initializeEntry(entry)
    window.history.replaceState(createNavigationState(asRecord(state), undefined, {
      id: entry.id,
      index: 0,
      sessionId,
      origin: 'initial',
    }), '', window.location.href)
    emitRouteChange()
    scheduleRestoration(entry)
    return
  }

  const existing = store.entries.find((entry) => entry.id === metadata.id)
  const parts = routeParts(getCurrentAppHref())
  const route = resolveRoute(parts.pathname, parts.search)
  const entry = existing
    ? { ...existing, href: safeStoredHref(parts, route), route, timestamp: Date.now() }
    : entryFromLocation(metadata)
  store.setCurrentEntry(entry)
  emitRouteChange()
  scheduleRestoration(entry)
}

function handlePopState(event: PopStateEvent) {
  if (bouncingPop) {
    bouncingPop = false
    return
  }
  const current = getCurrentNavigationEntry()
  const target = historyMetadata(event.state)
  const delta = current && target?.sessionId === current.sessionId ? target.index - current.index : 0

  if (!bypassNextPop && delta !== 0 && navigationBlockers.size) {
    const retry = () => {
      bypassNextPop = true
      window.history.go(delta)
    }
    if (!askBlockers('pop', getCurrentAppHref(), retry)) {
      // The URL has already moved at this point. Stop downstream listeners
      // (notably telemetry) from observing the transient, cancelled target;
      // the compensating POP is allowed through and reports the retained page.
      event.stopImmediatePropagation()
      bouncingPop = true
      window.history.go(-delta)
      return
    }
  }
  bypassNextPop = false
  commitPop(event.state)
}

function handleDocumentClick(event: MouseEvent) {
  if (event.defaultPrevented || event.button !== 0 || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return
  const target = event.target
  if (!(target instanceof Element)) return
  const anchor = target.closest('a[href]')
  if (!(anchor instanceof HTMLAnchorElement)) return
  if (anchor.target && anchor.target !== '_self' || anchor.hasAttribute('download')) return

  const url = new URL(anchor.href, window.location.href)
  if (url.origin !== window.location.origin || url.href === window.location.href) return
  const base = getAppBasePath()
  if (base && url.pathname !== base && !url.pathname.startsWith(`${base}/`)) return
  if (
    url.pathname === window.location.pathname
    && url.search === window.location.search
    && url.hash
    && !url.hash.startsWith('#/')
  ) return

  event.preventDefault()
  const presentation = anchor.dataset.navigationPresentation === 'modal' ? 'modal' : undefined
  navigateTo(`${url.pathname}${url.search}${url.hash}`, {
    presentation,
    sourceLabel: anchor.dataset.navigationSourceLabel,
    trigger: captureNavigationTrigger(anchor),
  })
}

function handleScroll() {
  if (scrollCaptureTimer !== undefined) return
  scrollCaptureTimer = window.setTimeout(() => {
    scrollCaptureTimer = undefined
    captureCurrentNavigationState(undefined, { capturePageSnapshot: false })
  }, SCROLL_CAPTURE_INTERVAL_MS)
}

function handlePageHide() {
  captureCurrentNavigationState(undefined)
}

export function initializeNavigation() {
  if (typeof window === 'undefined' || initialized) return
  initialized = true
  window.history.scrollRestoration = 'manual'

  const store = useNavigationStore.getState()
  // Sanitize entries written by an earlier app version before they are
  // persisted again. This also covers forward entries not currently visible.
  store.entries.forEach((entry) => {
    const safeHref = entry.route === 'authCallback'
      ? '/auth/callback'
      : entry.route === 'resetPassword'
        ? '/reset-password'
        : entry.href
    if (safeHref !== entry.href) store.updateEntry(entry.id, { href: safeHref })
  })
  const metadata = historyMetadata(window.history.state)
  const matchingEntry = metadata?.sessionId === store.sessionId
    ? store.entries.find((entry) => entry.id === metadata.id)
    : undefined
  if (matchingEntry && metadata) {
    const parts = routeParts(getCurrentAppHref())
    const route = resolveRoute(parts.pathname, parts.search)
    const restoredEntry = {
      ...matchingEntry,
      href: safeStoredHref(parts, route),
      route,
      timestamp: Date.now(),
    }
    store.setCurrentEntry(restoredEntry)
    scheduleRestoration(restoredEntry)
  } else {
    const sessionId = createNavigationId('session')
    store.resetSession(sessionId)
    const entry = entryFromLocation({ id: createNavigationId(), index: 0, origin: 'initial', sessionId })
    useNavigationStore.getState().initializeEntry(entry)
    window.history.replaceState(createNavigationState(asRecord(window.history.state), undefined, {
      id: entry.id,
      index: 0,
      sessionId,
      origin: 'initial',
    }), '', window.location.href)
  }

  window.addEventListener('popstate', handlePopState, true)
  document.addEventListener('click', handleDocumentClick)
  window.addEventListener('scroll', handleScroll, { passive: true })
  window.addEventListener('pagehide', handlePageHide)
}

export function subscribeToNavigation(subscriber: () => void) {
  initializeNavigation()
  routeSubscribers.add(subscriber)
  return () => {
    routeSubscribers.delete(subscriber)
  }
}

export function clearNavigationSession() {
  if (typeof window === 'undefined') return
  initializeNavigation()
  const sessionId = createNavigationId('session')
  useNavigationStore.getState().resetSession(sessionId)
  const entry = entryFromLocation({ id: createNavigationId(), index: 0, origin: 'initial', sessionId })
  useNavigationStore.getState().initializeEntry(entry)
  const oldState = asRecord(window.history.state)
  window.history.replaceState(createNavigationState(oldState, undefined, {
    id: entry.id,
    index: entry.index,
    sessionId,
    origin: 'initial',
  }), '', window.location.href)
}

/** Test-only cleanup for module-global event listeners and registries. */
export function resetNavigationForTests() {
  if (typeof window !== 'undefined' && initialized) {
    window.removeEventListener('popstate', handlePopState, true)
    document.removeEventListener('click', handleDocumentClick)
    window.removeEventListener('scroll', handleScroll)
    window.removeEventListener('pagehide', handlePageHide)
    if (scrollCaptureTimer !== undefined) window.clearTimeout(scrollCaptureTimer)
  }
  initialized = false
  scrollCaptureTimer = undefined
  nextContext = undefined
  bouncingPop = false
  bypassNextPop = false
  routeSubscribers.clear()
  navigationBlockers.clear()
  navigationCaptures.clear()
  scrollRegions.clear()
}

export function cacheFinspoPreview<T extends { _id: string }>(post: T) {
  initializeNavigation()
  setNavigationSnapshot(`finspo-preview:${post._id}`, post, { mediaHeavy: true })
}

export function readFinspoPreview<T>(postId: string): T | null {
  initializeNavigation()
  return findNavigationSnapshot<T>(`finspo-preview:${postId}`)?.data ?? null
}

export { getCurrentNavigationEntry, getCurrentNavigationEntryId }
