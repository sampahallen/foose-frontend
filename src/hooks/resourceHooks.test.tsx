import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError, apiGet } from '../lib/api'
import { toResourceErrorMeta, useApiResource } from './useApiResource'
import { useInfiniteApiResource } from './useInfiniteApiResource'

vi.mock('../lib/api', async () => {
  const actual = await vi.importActual<typeof import('../lib/api')>('../lib/api')
  return { ...actual, apiGet: vi.fn() }
})

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })
  return { promise, reject, resolve }
}

const apiGetMock = vi.mocked(apiGet)

describe('resource error metadata', () => {
  beforeEach(() => {
    apiGetMock.mockReset()
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: true })
  })

  it('classifies permission, missing, validation, server, and network failures', () => {
    expect(toResourceErrorMeta(new ApiError('Forbidden', 403))).toMatchObject({ kind: 'permission', retryable: false, status: 403 })
    expect(toResourceErrorMeta(new ApiError('Missing', 404))).toMatchObject({ kind: 'not-found', retryable: false, status: 404 })
    expect(toResourceErrorMeta(new ApiError('Invalid', 422))).toMatchObject({ kind: 'validation', retryable: false, status: 422 })
    expect(toResourceErrorMeta(new ApiError('Down', 503))).toMatchObject({ kind: 'server', retryable: true, status: 503 })
    expect(toResourceErrorMeta(new TypeError('Failed to fetch'))).toMatchObject({ kind: 'network', retryable: true, status: null })
  })

  it('prioritizes the browser offline signal', () => {
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: false })
    expect(toResourceErrorMeta(new TypeError('Failed to fetch'))).toMatchObject({ kind: 'offline', retryable: true })
  })
})

describe('useApiResource', () => {
  beforeEach(() => {
    apiGetMock.mockReset()
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: true })
  })

  it('distinguishes initial loading and preserves stale data when refresh fails', async () => {
    apiGetMock.mockResolvedValueOnce({ name: 'Current profile' })
    const { result } = renderHook(() => useApiResource<{ name: string }>('/profile'))
    expect(result.current.initialLoading).toBe(true)

    await waitFor(() => expect(result.current.data).toEqual({ name: 'Current profile' }))
    expect(result.current.initialLoading).toBe(false)

    const refresh = deferred<{ name: string }>()
    apiGetMock.mockReturnValueOnce(refresh.promise)
    let refreshPromise!: Promise<void>
    act(() => { refreshPromise = result.current.refetch() })
    expect(result.current.refreshing).toBe(true)
    expect(result.current.data).toEqual({ name: 'Current profile' })

    refresh.reject(new ApiError('Service unavailable', 503))
    await act(async () => refreshPromise)
    expect(result.current.data).toEqual({ name: 'Current profile' })
    expect(result.current.errorMeta).toMatchObject({ kind: 'server', retryable: true })
    expect(result.current.refreshing).toBe(false)
  })
})

describe('useInfiniteApiResource', () => {
  beforeEach(() => apiGetMock.mockReset())

  it('separates refresh and append failures without discarding loaded items', async () => {
    type Page = { page: number; pages: number; total: number; results: Array<{ _id: string }> }
    const buildPath = (page: number) => `/items?page=${page}`
    const extractItems = (page: Page) => page.results
    apiGetMock.mockResolvedValueOnce({ page: 1, pages: 2, total: 2, results: [{ _id: 'one' }] })

    const { result } = renderHook(() => useInfiniteApiResource(buildPath, extractItems, []))
    expect(result.current.initialLoading).toBe(true)
    await waitFor(() => expect(result.current.items).toEqual([{ _id: 'one' }]))

    const refresh = deferred<Page>()
    apiGetMock.mockReturnValueOnce(refresh.promise)
    let refreshPromise!: Promise<void>
    act(() => { refreshPromise = result.current.refetch() })
    expect(result.current.refreshing).toBe(true)
    refresh.reject(new ApiError('Refresh failed', 503))
    await act(async () => refreshPromise)
    expect(result.current.items).toEqual([{ _id: 'one' }])
    expect(result.current.error).toBe('Refresh failed')

    apiGetMock.mockRejectedValueOnce(new TypeError('Failed to fetch'))
    await act(async () => result.current.retryLoadMore())
    expect(result.current.items).toEqual([{ _id: 'one' }])
    expect(result.current.loadMoreErrorMeta).toMatchObject({ kind: 'network', retryable: true })

    apiGetMock.mockResolvedValueOnce({ page: 2, pages: 2, total: 2, results: [{ _id: 'two' }] })
    await act(async () => result.current.retryLoadMore())
    expect(result.current.items).toEqual([{ _id: 'one' }, { _id: 'two' }])
    expect(result.current.loadMoreError).toBe('')
  })
})
