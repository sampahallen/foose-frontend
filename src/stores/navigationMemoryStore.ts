import { create } from 'zustand'
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware'
import type { AppRoute } from '../utils/routes'

export const NAVIGATION_STORE_VERSION = 1
export const MAX_NAVIGATION_ENTRIES = 50
export const MAX_MEDIA_SNAPSHOTS = 10
export const MAX_SNAPSHOT_BYTES = 3 * 1024 * 1024

export type NavigationOrigin = 'initial' | 'internal'
export type NavigationPresentation = 'page' | 'modal'

export type NavigationTrigger = {
  elementId?: string
  viewportOffset?: number
}

export type NavigationScrollPosition = {
  x: number
  y: number
}

export type NavigationEntry = {
  id: string
  sessionId: string
  index: number
  href: string
  route: AppRoute
  origin: NavigationOrigin
  presentation?: NavigationPresentation
  sourceLabel?: string
  scroll: {
    window: NavigationScrollPosition
    regions: Record<string, NavigationScrollPosition>
  }
  trigger?: NavigationTrigger
  timestamp: number
  snapshotKeys: string[]
}

export type NavigationPageSnapshot<T = unknown> = {
  key: string
  entryId: string
  namespace: string
  data: T
  byteSize: number
  mediaHeavy: boolean
  createdAt: number
  accessedAt: number
}

type PersistedNavigationState = Pick<
  NavigationStoreState,
  'sessionId' | 'entries' | 'currentEntryId' | 'snapshots'
>

export type NavigationStoreState = {
  sessionId: string
  entries: NavigationEntry[]
  currentEntryId?: string
  snapshots: Record<string, NavigationPageSnapshot>
  initializeEntry: (entry: NavigationEntry) => void
  pushEntry: (entry: NavigationEntry) => void
  replaceEntry: (entry: NavigationEntry) => void
  setCurrentEntry: (entry: NavigationEntry) => void
  updateEntry: (entryId: string, updates: Partial<NavigationEntry>) => void
  saveSnapshot: <T>(entryId: string, namespace: string, data: T, mediaHeavy?: boolean) => NavigationPageSnapshot<T> | undefined
  removeSnapshot: (entryId: string, namespace: string) => void
  touchSnapshot: (key: string) => void
  clearSnapshots: () => void
  resetSession: (sessionId?: string) => void
}

let idSequence = 0

export function createNavigationId(prefix = 'nav') {
  idSequence += 1
  const random = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID().slice(0, 8)
    : Math.random().toString(36).slice(2, 10)
  return `${prefix}-${Date.now().toString(36)}-${idSequence.toString(36)}-${random}`
}

function snapshotKey(entryId: string, namespace: string) {
  return `${entryId}:${namespace}`
}

function serializedByteSize(value: unknown) {
  try {
    const serialized = JSON.stringify(value)
    if (serialized === undefined) return undefined
    return new TextEncoder().encode(serialized).byteLength
  } catch {
    return undefined
  }
}

function pruneSnapshots(
  snapshots: Record<string, NavigationPageSnapshot>,
  entries: NavigationEntry[],
) {
  const next = { ...snapshots }
  const sorted = () => Object.values(next).sort((left, right) => left.accessedAt - right.accessedAt)

  while (true) {
    const values = Object.values(next)
    const totalBytes = values.reduce((total, snapshot) => total + snapshot.byteSize, 0)
    const mediaSnapshots = values.filter((snapshot) => snapshot.mediaHeavy)
    if (totalBytes <= MAX_SNAPSHOT_BYTES && mediaSnapshots.length <= MAX_MEDIA_SNAPSHOTS) break

    const victim = mediaSnapshots.length > MAX_MEDIA_SNAPSHOTS
      ? mediaSnapshots.sort((left, right) => left.accessedAt - right.accessedAt)[0]
      : sorted()[0]
    if (!victim) break
    delete next[victim.key]
  }

  const liveKeys = new Set(Object.keys(next))
  const nextEntries = entries.map((entry) => ({
    ...entry,
    snapshotKeys: entry.snapshotKeys.filter((key) => liveKeys.has(key)),
  }))
  return { entries: nextEntries, snapshots: next }
}

function capEntriesAround(entries: NavigationEntry[], current: NavigationEntry) {
  const unique = [...new Map(entries.map((entry) => [entry.id, entry])).values()]
  if (unique.length <= MAX_NAVIGATION_ENTRIES) {
    return unique.sort((left, right) => left.index - right.index)
  }
  return unique
    .sort((left, right) => (
      Math.abs(left.index - current.index) - Math.abs(right.index - current.index)
      || left.index - right.index
    ))
    .slice(0, MAX_NAVIGATION_ENTRIES)
    .sort((left, right) => left.index - right.index)
}

function retainLiveSnapshots(
  snapshots: Record<string, NavigationPageSnapshot>,
  entries: NavigationEntry[],
) {
  const liveEntryIds = new Set(entries.map((entry) => entry.id))
  return Object.fromEntries(
    Object.entries(snapshots).filter(([, snapshot]) => liveEntryIds.has(snapshot.entryId)),
  )
}

function safeSessionStorage(): StateStorage {
  const memory = new Map<string, string>()
  return {
    getItem: (name) => {
      try {
        return window.sessionStorage.getItem(name) ?? memory.get(name) ?? null
      } catch {
        return memory.get(name) ?? null
      }
    },
    removeItem: (name) => {
      memory.delete(name)
      try {
        window.sessionStorage.removeItem(name)
      } catch {
        // The in-memory fallback remains authoritative for this tab.
      }
    },
    setItem: (name, value) => {
      memory.set(name, value)
      try {
        window.sessionStorage.setItem(name, value)
      } catch {
        // Private browsing and quota errors fall back to memory.
      }
    },
  }
}

function initialState(sessionId = createNavigationId('session')) {
  return {
    sessionId,
    entries: [] as NavigationEntry[],
    currentEntryId: undefined as string | undefined,
    snapshots: {} as Record<string, NavigationPageSnapshot>,
  }
}

export const useNavigationStore = create<NavigationStoreState>()(persist((set, get) => ({
  ...initialState(),
  initializeEntry: (entry) => set({
    sessionId: entry.sessionId,
    entries: [entry],
    currentEntryId: entry.id,
    snapshots: {},
  }),
  pushEntry: (entry) => set((state) => {
    const current = state.entries.find((candidate) => candidate.id === state.currentEntryId)
    const retained = current
      ? state.entries.filter((candidate) => candidate.index <= current.index)
      : state.entries
    const capped = [...retained.filter((candidate) => candidate.id !== entry.id), entry]
      .sort((left, right) => left.index - right.index)
      .slice(-MAX_NAVIGATION_ENTRIES)
    const liveEntryIds = new Set(capped.map((candidate) => candidate.id))
    const retainedSnapshots = Object.fromEntries(
      Object.entries(state.snapshots).filter(([, snapshot]) => liveEntryIds.has(snapshot.entryId)),
    )
    const pruned = pruneSnapshots(retainedSnapshots, capped)
    return {
      entries: pruned.entries,
      snapshots: pruned.snapshots,
      currentEntryId: entry.id,
    }
  }),
  replaceEntry: (entry) => set((state) => {
    const found = state.entries.some((candidate) => candidate.id === entry.id)
    const entries = capEntriesAround(found
      ? state.entries.map((candidate) => candidate.id === entry.id ? entry : candidate)
      : [...state.entries, entry], entry)
    const pruned = pruneSnapshots(retainLiveSnapshots(state.snapshots, entries), entries)
    return { entries: pruned.entries, snapshots: pruned.snapshots, currentEntryId: entry.id }
  }),
  setCurrentEntry: (entry) => set((state) => {
    const found = state.entries.some((candidate) => candidate.id === entry.id)
    const entries = capEntriesAround(found
      ? state.entries.map((candidate) => candidate.id === entry.id ? { ...candidate, ...entry } : candidate)
      : [...state.entries, entry], entry)
    const pruned = pruneSnapshots(retainLiveSnapshots(state.snapshots, entries), entries)
    return { entries: pruned.entries, snapshots: pruned.snapshots, currentEntryId: entry.id }
  }),
  updateEntry: (entryId, updates) => set((state) => ({
    entries: state.entries.map((entry) => entry.id === entryId ? { ...entry, ...updates } : entry),
  })),
  saveSnapshot: <T,>(entryId: string, namespace: string, data: T, mediaHeavy = false) => {
    if (!get().entries.some((entry) => entry.id === entryId)) return undefined
    const byteSize = serializedByteSize(data)
    if (byteSize === undefined || byteSize > MAX_SNAPSHOT_BYTES) return undefined
    const now = Date.now()
    const key = snapshotKey(entryId, namespace)
    const previous = get().snapshots[key]
    const snapshot: NavigationPageSnapshot<T> = {
      key,
      entryId,
      namespace,
      data,
      byteSize,
      mediaHeavy,
      createdAt: previous?.createdAt ?? now,
      accessedAt: now,
    }
    set((state) => {
      const entries = state.entries.map((entry) => entry.id === entryId
        ? { ...entry, snapshotKeys: [...new Set([...entry.snapshotKeys, key])] }
        : entry)
      return pruneSnapshots({ ...state.snapshots, [key]: snapshot }, entries)
    })
    return get().snapshots[key] as NavigationPageSnapshot<T> | undefined
  },
  removeSnapshot: (entryId, namespace) => set((state) => {
    const key = snapshotKey(entryId, namespace)
    const snapshots = { ...state.snapshots }
    delete snapshots[key]
    return {
      snapshots,
      entries: state.entries.map((entry) => ({
        ...entry,
        snapshotKeys: entry.snapshotKeys.filter((candidate) => candidate !== key),
      })),
    }
  }),
  touchSnapshot: (key) => set((state) => {
    const snapshot = state.snapshots[key]
    if (!snapshot) return state
    return { snapshots: { ...state.snapshots, [key]: { ...snapshot, accessedAt: Date.now() } } }
  }),
  clearSnapshots: () => set((state) => ({
    snapshots: {},
    entries: state.entries.map((entry) => ({ ...entry, snapshotKeys: [] })),
  })),
  resetSession: (sessionId) => set(initialState(sessionId)),
}), {
  name: 'foose-navigation',
  version: NAVIGATION_STORE_VERSION,
  storage: createJSONStorage(safeSessionStorage),
  partialize: (state): PersistedNavigationState => ({
    sessionId: state.sessionId,
    entries: state.entries,
    currentEntryId: state.currentEntryId,
    snapshots: state.snapshots,
  }),
  migrate: (persisted) => {
    const candidate = persisted as Partial<PersistedNavigationState> | undefined
    if (!candidate?.sessionId || !Array.isArray(candidate.entries)) return initialState()
    return {
      ...initialState(candidate.sessionId),
      ...candidate,
      entries: candidate.entries.slice(-MAX_NAVIGATION_ENTRIES),
      snapshots: candidate.snapshots ?? {},
    }
  },
}))

export function getCurrentNavigationEntry() {
  const state = useNavigationStore.getState()
  return state.entries.find((entry) => entry.id === state.currentEntryId)
}

export function getCurrentNavigationEntryId() {
  return useNavigationStore.getState().currentEntryId
}

export function getNavigationSnapshot<T>(namespace: string, entryId = getCurrentNavigationEntryId()) {
  if (!entryId) return undefined
  const key = snapshotKey(entryId, namespace)
  const snapshot = useNavigationStore.getState().snapshots[key] as NavigationPageSnapshot<T> | undefined
  if (snapshot) useNavigationStore.getState().touchSnapshot(key)
  return snapshot
}

export function findNavigationSnapshot<T>(namespace: string) {
  const snapshot = Object.values(useNavigationStore.getState().snapshots)
    .filter((candidate) => candidate.namespace === namespace)
    .sort((left, right) => right.accessedAt - left.accessedAt)[0] as NavigationPageSnapshot<T> | undefined
  if (snapshot) useNavigationStore.getState().touchSnapshot(snapshot.key)
  return snapshot
}

export function setNavigationSnapshot<T>(
  namespace: string,
  data: T,
  options: { entryId?: string; mediaHeavy?: boolean } = {},
) {
  const entryId = options.entryId ?? getCurrentNavigationEntryId()
  if (!entryId) return undefined
  return useNavigationStore.getState().saveSnapshot(entryId, namespace, data, options.mediaHeavy)
}

export function removeNavigationSnapshot(namespace: string, entryId = getCurrentNavigationEntryId()) {
  if (entryId) useNavigationStore.getState().removeSnapshot(entryId, namespace)
}
