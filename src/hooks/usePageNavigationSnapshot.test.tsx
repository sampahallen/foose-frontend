import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { setNavigationSnapshot, useNavigationStore } from '../stores/navigationMemoryStore'
import { initializeNavigation, resetNavigationForTests } from '../utils/navigation'
import { usePageNavigationSnapshot } from './usePageNavigationSnapshot'

function Harness({ ready, restore }: { ready: boolean; restore: (value: { page: number }) => void }) {
  const snapshot = usePageNavigationSnapshot({
    namespace: 'finspo-feed',
    capture: () => ({ page: 3 }),
    mediaHeavy: true,
    ready,
    restore,
  })
  return (
    <>
      <span>{snapshot.restoredSnapshot?.page ?? 'none'}</span>
      <button onClick={() => snapshot.saveSnapshot({ page: 4 })} type="button">Save current</button>
    </>
  )
}

describe('usePageNavigationSnapshot', () => {
  beforeEach(() => {
    resetNavigationForTests()
    window.sessionStorage.clear()
    useNavigationStore.getState().resetSession('snapshot-hook')
    window.history.replaceState({}, '', '/community?tab=finspo')
    initializeNavigation()
    setNavigationSnapshot('finspo-feed', { page: 2 }, { mediaHeavy: true })
  })

  it('publishes cached data immediately but waits for readiness before restoring once', async () => {
    const restore = vi.fn()
    const view = render(<Harness ready={false} restore={restore} />)
    expect(screen.getByText('2')).toBeVisible()
    expect(restore).not.toHaveBeenCalled()

    view.rerender(<Harness ready restore={restore} />)
    expect(restore).toHaveBeenCalledOnce()
    expect(restore).toHaveBeenLastCalledWith({ page: 2 })

    await userEvent.click(screen.getByRole('button', { name: 'Save current' }))
    expect(screen.getByText('4')).toBeVisible()
    expect(restore).toHaveBeenCalledOnce()
  })
})
