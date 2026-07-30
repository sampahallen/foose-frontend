import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiGet } from '../../lib/api'
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
const apiGetMock = vi.mocked(apiGet)

describe('UnifiedSearchCombobox', () => {
  beforeEach(() => {
    navigateToMock.mockReset()
    apiGetMock.mockReset()
    apiGetMock.mockResolvedValue({ suggestions: [] })
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

  it('offers indexed keywords as full Explore searches', async () => {
    const user = userEvent.setup()
    apiGetMock.mockResolvedValue({
      suggestions: [{
        href: '/search?q=clothing&tab=all',
        id: 'keyword:clothing',
        keyword: 'clothing',
        kind: 'keyword',
        label: 'clothing',
        subtitle: '4 matching results',
        type: 'keyword',
      }],
    })
    render(<UnifiedSearchCombobox />)

    await user.type(screen.getByRole('combobox', { name: 'Search Foose' }), 'clo')
    await user.click(await screen.findByRole('option', { name: /Search “clothing”/ }))

    expect(navigateToMock).toHaveBeenCalledWith(
      '/search?q=clothing&tab=all',
      { state: { unifiedSearchTrack: true } },
    )
  })
})
