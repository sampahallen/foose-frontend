import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { apiGet } from '../lib/api'
import { useUsernameAvailability } from './useUsernameAvailability'

vi.mock('../lib/api', () => ({ apiGet: vi.fn() }))

const mockedApiGet = vi.mocked(apiGet)

describe('useUsernameAvailability', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    mockedApiGet.mockReset()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('waits before checking and reports an available username', async () => {
    mockedApiGet.mockResolvedValue({ available: true, username: 'fresh_name' })
    const { result } = renderHook(() => useUsernameAvailability('current_name', 500))

    act(() => result.current.check('Fresh_Name'))
    expect(result.current.state.status).toBe('waiting')
    expect(mockedApiGet).not.toHaveBeenCalled()

    await act(async () => vi.advanceTimersByTimeAsync(500))

    expect(mockedApiGet).toHaveBeenCalledWith('/users/username-availability?username=fresh_name', expect.objectContaining({ signal: expect.any(AbortSignal) }))
    expect(result.current.state).toMatchObject({ status: 'available', username: 'fresh_name' })
  })

  it('reports an unavailable username and skips unchanged or invalid values', async () => {
    mockedApiGet.mockResolvedValue({ available: false, username: 'taken_name' })
    const { result } = renderHook(() => useUsernameAvailability('current_name', 300))

    act(() => result.current.check('current_name'))
    expect(result.current.state.status).toBe('idle')
    act(() => result.current.check('no spaces'))
    expect(result.current.state.status).toBe('idle')

    act(() => result.current.check('taken_name'))
    await act(async () => vi.advanceTimersByTimeAsync(300))
    expect(result.current.state.status).toBe('unavailable')
  })
})
