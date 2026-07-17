import { beforeEach, describe, expect, it } from 'vitest'
import {
  MAX_MEDIA_SNAPSHOTS,
  MAX_NAVIGATION_ENTRIES,
  MAX_SNAPSHOT_BYTES,
  createNavigationId,
  getNavigationSnapshot,
  setNavigationSnapshot,
  useNavigationStore,
  type NavigationEntry,
} from './navigationMemoryStore'

function entry(index: number, sessionId = useNavigationStore.getState().sessionId): NavigationEntry {
  return {
    id: `entry-${index}`,
    sessionId,
    index,
    href: index ? `/listing/${index}` : '/browse',
    route: index ? 'retailDetail' : 'browse',
    origin: index ? 'internal' : 'initial',
    scroll: { window: { x: 0, y: index * 100 }, regions: {} },
    timestamp: index,
    snapshotKeys: [],
  }
}

describe('useNavigationStore', () => {
  beforeEach(() => {
    window.sessionStorage.clear()
    useNavigationStore.getState().resetSession('test-session')
    useNavigationStore.getState().initializeEntry(entry(0, 'test-session'))
  })

  it('caps history while keeping the current entry', () => {
    for (let index = 1; index <= MAX_NAVIGATION_ENTRIES + 8; index += 1) {
      useNavigationStore.getState().pushEntry(entry(index, 'test-session'))
    }
    const state = useNavigationStore.getState()
    expect(state.entries).toHaveLength(MAX_NAVIGATION_ENTRIES)
    expect(state.entries[0]?.index).toBe(9)
    expect(state.currentEntryId).toBe(`entry-${MAX_NAVIGATION_ENTRIES + 8}`)
  })

  it('truncates the forward branch after a new push', () => {
    useNavigationStore.getState().pushEntry(entry(1, 'test-session'))
    useNavigationStore.getState().pushEntry(entry(2, 'test-session'))
    useNavigationStore.getState().setCurrentEntry(entry(1, 'test-session'))
    useNavigationStore.getState().pushEntry({ ...entry(2, 'test-session'), id: 'replacement-2' })
    expect(useNavigationStore.getState().entries.map((candidate) => candidate.id)).toEqual([
      'entry-0',
      'entry-1',
      'replacement-2',
    ])
  })

  it('keeps an older POP destination current when it had already fallen outside the cap', () => {
    for (let index = 1; index <= MAX_NAVIGATION_ENTRIES + 8; index += 1) {
      useNavigationStore.getState().pushEntry(entry(index, 'test-session'))
    }
    setNavigationSnapshot('future-feed', { ids: ['future'] })

    useNavigationStore.getState().setCurrentEntry(entry(8, 'test-session'))

    const state = useNavigationStore.getState()
    expect(state.entries).toHaveLength(MAX_NAVIGATION_ENTRIES)
    expect(state.currentEntryId).toBe('entry-8')
    expect(state.entries.some((candidate) => candidate.id === 'entry-8')).toBe(true)
    expect(state.snapshots).toEqual({})
  })

  it('stores serializable snapshots and links them to their entry', () => {
    const saved = setNavigationSnapshot('feed', { ids: ['one', 'two'] })
    expect(saved?.data).toEqual({ ids: ['one', 'two'] })
    expect(getNavigationSnapshot<{ ids: string[] }>('feed')?.data.ids).toEqual(['one', 'two'])
    expect(useNavigationStore.getState().entries[0]?.snapshotKeys).toContain('entry-0:feed')
  })

  it('rejects non-serializable and individually oversized snapshots', () => {
    const cyclic: { self?: unknown } = {}
    cyclic.self = cyclic
    expect(setNavigationSnapshot('cyclic', cyclic)).toBeUndefined()
    expect(setNavigationSnapshot('oversized', 'x'.repeat(MAX_SNAPSHOT_BYTES + 1))).toBeUndefined()
  })

  it('does not persist a snapshot for an entry that is no longer tracked', () => {
    expect(setNavigationSnapshot('stale', { safe: true }, { entryId: 'missing-entry' })).toBeUndefined()
    expect(useNavigationStore.getState().snapshots).toEqual({})
  })

  it('evicts least-recently-used media snapshots above the media cap', () => {
    for (let index = 0; index < MAX_MEDIA_SNAPSHOTS + 2; index += 1) {
      setNavigationSnapshot(`media-${index}`, { index }, { mediaHeavy: true })
    }
    const snapshots = Object.values(useNavigationStore.getState().snapshots)
    expect(snapshots).toHaveLength(MAX_MEDIA_SNAPSHOTS)
    expect(snapshots.some((snapshot) => snapshot.namespace === 'media-0')).toBe(false)
    expect(snapshots.some((snapshot) => snapshot.namespace === `media-${MAX_MEDIA_SNAPSHOTS + 1}`)).toBe(true)
  })

  it('creates collision-resistant ids with the requested prefix', () => {
    const first = createNavigationId('session')
    const second = createNavigationId('session')
    expect(first).toMatch(/^session-/)
    expect(second).not.toBe(first)
  })
})
