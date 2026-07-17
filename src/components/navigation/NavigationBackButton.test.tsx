import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useNavigationStore } from '../../stores/navigationMemoryStore'
import { initializeNavigation, navigateTo, resetNavigationForTests } from '../../utils/navigation'
import { NavigationBackButton } from './NavigationBackButton'

describe('NavigationBackButton', () => {
  beforeEach(() => {
    resetNavigationForTests()
    window.sessionStorage.clear()
    useNavigationStore.getState().resetSession('button-test')
    window.history.replaceState({}, '', '/search')
    initializeNavigation()
  })

  it('derives an accessible source label and uses native Back for tracked entries', async () => {
    navigateTo('/community/finspo/post-1', { sourceLabel: 'Explore' })
    const back = vi.spyOn(window.history, 'back').mockImplementation(() => undefined)
    render(<NavigationBackButton variant="icon" />)
    await userEvent.click(screen.getByRole('button', { name: 'Back to Explore' }))
    expect(back).toHaveBeenCalledOnce()
  })

  it('renders the derived label in the inline variant', () => {
    navigateTo('/community/finspo/post-1', { sourceLabel: 'Saved' })
    render(<NavigationBackButton />)
    expect(screen.getByRole('button', { name: 'Back to Saved' })).toBeVisible()
  })
})
