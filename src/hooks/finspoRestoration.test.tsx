import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiGet } from '../lib/api'
import type { GalleryPost, UnifiedSearchResult } from '../types/api'
import { preloadImageUrls } from '../utils/imageLoading'
import { useExploreFeed, type ExploreFeedMeta, type ExploreFeedSnapshot } from './useExploreFeed'
import { useFinspoFeed, type FinspoFeedSnapshot } from './useFinspoFeed'
import { useUnifiedSearch, type UnifiedSearchSnapshot } from './useUnifiedSearch'

vi.mock('../lib/api', async () => {
  const actual = await vi.importActual<typeof import('../lib/api')>('../lib/api')
  return { ...actual, apiGet: vi.fn() }
})

vi.mock('../utils/imageLoading', () => ({
  preloadImageUrls: vi.fn(async (urls: string[]) => ({ failed: [], loaded: urls })),
}))

const apiGetMock = vi.mocked(apiGet)
const preloadMock = vi.mocked(preloadImageUrls)

function post(id: string, caption = id): GalleryPost {
  return { _id: id, caption, imageUrl: `https://images.test/${id}.jpg` }
}

const feedMeta = {
  allocations: { fallback: 0, new: 2, personalized: 0 },
  newCount: 2,
  pageSize: 50,
  personalized: false,
  personalizedCount: 0,
}

const exploreMeta: ExploreFeedMeta = {
  allocations: { events: 0, finspo: 2, items: 0, users: 0 },
  discoveryCount: 2,
  pageSize: 50,
  personalized: false,
  personalizedCount: 0,
  quotas: { events: 5, finspo: 20, items: 20, users: 5 },
  signalCount: 0,
  signalThreshold: 5,
}

describe('Finspo navigation feed restoration', () => {
  beforeEach(() => {
    apiGetMock.mockReset()
    preloadMock.mockClear()
  })

  it('publishes a restored Finspo feed immediately and refreshes metadata without reordering it', async () => {
    const initialSnapshot: FinspoFeedSnapshot = {
      failedImages: [],
      feed: feedMeta,
      items: [post('a', 'Original A'), post('b', 'Original B')],
      page: 2,
      pages: 3,
      seed: 'stable-feed',
      total: 6,
      version: 1,
    }
    apiGetMock.mockResolvedValueOnce({
      feed: feedMeta,
      page: 1,
      pages: 3,
      posts: [post('b', 'Refreshed B'), post('c', 'New C')],
      total: 6,
    })

    const { result } = renderHook(() => useFinspoFeed({ initialSnapshot }))

    expect(result.current.loading).toBe(false)
    expect(result.current.items.map((item) => item._id)).toEqual(['a', 'b'])
    expect(result.current.seed).toBe('stable-feed')

    await waitFor(() => expect(result.current.items.map((item) => item._id)).toEqual(['a', 'b', 'c']))
    expect(result.current.items.map((item) => item._id)).toEqual(['a', 'b', 'c'])
    expect(result.current.items[1]?.caption).toBe('Refreshed B')
    expect(result.current.snapshot.page).toBe(2)
  })

  it('freezes the accepted snapshot for the hook mount instead of reinitializing on store publications', () => {
    const first: FinspoFeedSnapshot = {
      failedImages: [],
      feed: feedMeta,
      items: [post('a')],
      page: 1,
      pages: 1,
      seed: 'first-seed',
      total: 1,
      version: 1,
    }
    const later: FinspoFeedSnapshot = { ...first, items: [post('replacement')], seed: 'later-seed' }
    apiGetMock.mockImplementationOnce(() => new Promise(() => undefined))

    const { rerender, result } = renderHook(
      ({ snapshot }) => useFinspoFeed({ initialSnapshot: snapshot }),
      { initialProps: { snapshot: first } },
    )
    rerender({ snapshot: later })

    expect(result.current.items.map((item) => item._id)).toEqual(['a'])
    expect(result.current.seed).toBe('first-seed')
  })

  it('keeps unified-search order and its endless-scroll cursor during background revalidation', async () => {
    const originalResults: UnifiedSearchResult[] = [
      { entity: post('a', 'Original A'), type: 'finspo' },
      { entity: post('b', 'Original B'), type: 'finspo' },
    ]
    const initialSnapshot: UnifiedSearchSnapshot = {
      counts: { all: 4, events: 0, finspo: 4, items: 0, users: 0 },
      failedImages: [],
      hasMore: true,
      nextCursor: 'restored-cursor',
      query: 'looks',
      results: originalResults,
      scope: 'all',
      tag: '',
      total: 4,
      version: 1,
    }
    apiGetMock.mockResolvedValueOnce({
      counts: initialSnapshot.counts,
      hasMore: true,
      nextCursor: 'first-page-cursor',
      query: 'looks',
      results: [
        { entity: post('b', 'Refreshed B'), type: 'finspo' },
        { entity: post('c', 'New C'), type: 'finspo' },
      ],
      scope: 'all',
      total: 4,
    })

    const { result } = renderHook(() => useUnifiedSearch({ initialSnapshot, query: 'looks', scope: 'all' }))

    expect(result.current.results.map((item) => item.entity._id)).toEqual(['a', 'b'])
    expect(result.current.nextCursor).toBe('restored-cursor')
    await waitFor(() => expect(result.current.results.map((item) => item.entity._id)).toEqual(['a', 'b', 'c']))
    expect(result.current.results.map((item) => item.entity._id)).toEqual(['a', 'b', 'c'])
    expect(result.current.results[1]?.entity).toMatchObject({ caption: 'Refreshed B' })
    expect(result.current.nextCursor).toBe('restored-cursor')
  })

  it('restores Explore from the Zustand-provided snapshot without reading its former session cache', async () => {
    const initialSnapshot: ExploreFeedSnapshot = {
      failedImages: [],
      feed: exploreMeta,
      feedSeed: 'explore-seed',
      hasMore: true,
      nextCursor: 'explore-cursor',
      results: [
        { entity: post('a', 'Original A'), type: 'finspo' },
        { entity: post('b', 'Original B'), type: 'finspo' },
      ],
      seed: 'explore-seed',
      snapshot: 'visibility-snapshot',
      total: 4,
      version: 1,
    }
    const storageSpy = vi.spyOn(Storage.prototype, 'getItem')
    apiGetMock.mockResolvedValueOnce({
      feed: exploreMeta,
      feedSeed: 'explore-seed',
      hasMore: true,
      nextCursor: 'first-page-cursor',
      results: [
        { entity: post('b', 'Refreshed B'), type: 'finspo' },
        { entity: post('c', 'New C'), type: 'finspo' },
      ],
      seed: 'explore-seed',
      snapshot: 'visibility-snapshot',
      total: 4,
    })

    const { result } = renderHook(() => useExploreFeed({ initialSnapshot, seed: 'explore-seed' }))

    expect(result.current.results.map((item) => item.entity._id)).toEqual(['a', 'b'])
    await waitFor(() => expect(result.current.results.map((item) => item.entity._id)).toEqual(['a', 'b', 'c']))
    expect(result.current.results.map((item) => item.entity._id)).toEqual(['a', 'b', 'c'])
    expect(result.current.nextCursor).toBe('explore-cursor')
    expect(storageSpy).not.toHaveBeenCalled()
    storageSpy.mockRestore()
  })
})
