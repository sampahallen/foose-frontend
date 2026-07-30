import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { navigateTo } from '../../utils/navigation'
import { UnifiedSearchCombobox } from './UnifiedSearchCombobox'

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({ user: null }),
}))

vi.mock('../../lib/api', () => ({
  apiGet: vi.fn().mockResolvedValue({ suggestions: [] }),
}))

vi.mock('../../utils/navigation', () => ({
  navigateTo: vi.fn(),
}))

const navigateToMock = vi.mocked(navigateTo)

describe('UnifiedSearchCombobox', () => {
  beforeEach(() => {
    navigateToMock.mockReset()
  })

  it('submits a typed Explore query with Enter', async () => {
    const user = userEvent.setup()
    render(<UnifiedSearchCombobox />)

    await user.type(screen.getByRole('combobox', { name: 'Search Foose' }), 'street')
    await user.keyboard('{Enter}')

    expect(navigateToMock).toHaveBeenCalledWith(
      '/search?q=street&tab=all',
      { state: { unifiedSearchTrack: true } },
    )
  })

  it('submits hashtags through the visible search button', async () => {
    const user = userEvent.setup()
    render(<UnifiedSearchCombobox defaultValue="#summer" />)

    await user.click(screen.getByRole('button', { name: 'Search' }))

    expect(navigateToMock).toHaveBeenCalledWith(
      '/search?tag=summer&tab=all',
      { state: { unifiedSearchTrack: true } },
    )
  })
})
