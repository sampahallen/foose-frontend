import { act, fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ToastProvider } from './ToastProvider'
import { useToast } from './useToast'

function ToastHarness() {
  const { clearToasts, showToast } = useToast()
  return (
    <>
      <button onClick={() => showToast({ message: 'Saved successfully', tone: 'success' })} type="button">Success</button>
      <button onClick={() => showToast({ message: 'Could not save', tone: 'error' })} type="button">Error</button>
      <button onClick={() => showToast({ message: 'One', tone: 'info' })} type="button">One</button>
      <button onClick={() => showToast({ message: 'Two', tone: 'info' })} type="button">Two</button>
      <button onClick={() => showToast({ message: 'Three', tone: 'info' })} type="button">Three</button>
      <button onClick={() => showToast({ message: 'Four', tone: 'info' })} type="button">Four</button>
      <button onClick={clearToasts} type="button">Clear</button>
    </>
  )
}

describe('ToastProvider', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '/')
  })

  it('deduplicates messages and keeps at most three visible', () => {
    render(<ToastProvider><ToastHarness /></ToastProvider>)
    fireEvent.click(screen.getByRole('button', { name: 'Success' }))
    fireEvent.click(screen.getByRole('button', { name: 'Success' }))
    expect(screen.getAllByText('Saved successfully')).toHaveLength(1)

    for (const name of ['One', 'Two', 'Three', 'Four']) {
      fireEvent.click(screen.getByRole('button', { name }))
    }
    const visibleToastText = [...document.querySelectorAll('article')].map((element) => element.textContent)
    expect(visibleToastText).not.toContain('One')
    expect(visibleToastText).toContain('Four')
    expect(screen.getAllByLabelText('Dismiss notification')).toHaveLength(3)
  })

  it('uses success and error durations and supports manual dismissal', () => {
    vi.useFakeTimers()
    render(<ToastProvider><ToastHarness /></ToastProvider>)
    fireEvent.click(screen.getByRole('button', { name: 'Success' }))
    fireEvent.click(screen.getByRole('button', { name: 'Error' }))

    act(() => vi.advanceTimersByTime(4000))
    expect(screen.queryByText('Saved successfully')).not.toBeInTheDocument()
    expect(screen.getByText('Could not save')).toBeVisible()

    fireEvent.click(screen.getByLabelText('Dismiss notification'))
    expect(screen.queryByText('Could not save')).not.toBeInTheDocument()
    vi.useRealTimers()
  })

  it('pauses dismissal while hovered', () => {
    vi.useFakeTimers()
    render(<ToastProvider><ToastHarness /></ToastProvider>)
    fireEvent.click(screen.getByRole('button', { name: 'Success' }))
    const toast = screen.getByText('Saved successfully').closest('article') as HTMLElement
    fireEvent.mouseEnter(toast)
    act(() => vi.advanceTimersByTime(5000))
    expect(screen.getByText('Saved successfully')).toBeVisible()
    fireEvent.mouseLeave(toast)
    act(() => vi.advanceTimersByTime(4000))
    expect(screen.queryByText('Saved successfully')).not.toBeInTheDocument()
    vi.useRealTimers()
  })

  it('consumes a navigation flash once and clears it from history', () => {
    window.history.replaceState({
      fooseFlash: { message: 'Listing created', tone: 'success' },
      retained: true,
    }, '', '/')

    render(<ToastProvider><div>Destination</div></ToastProvider>)
    expect(screen.getByText('Listing created')).toBeVisible()
    expect(window.history.state).toMatchObject({ retained: true })
    expect(window.history.state.fooseFlash).toBeUndefined()
  })
})
