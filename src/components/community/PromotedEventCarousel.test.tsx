import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Event } from '../../types/api'
import { PromotedEventCarousel } from './PromotedEventCarousel'

const events: Event[] = [
  { _id: 'event-one', date: '2026-07-23', title: 'First event', type: 'in-person-pop-up' },
  { _id: 'event-two', date: '2026-07-24', title: 'Second event', type: 'online-pop-up' },
]

describe('PromotedEventCarousel', () => {
  afterEach(() => vi.useRealTimers())

  it('uses dots without arrow buttons and slides to the selected event', () => {
    const { container } = render(<PromotedEventCarousel events={events} />)
    expect(screen.queryByRole('button', { name: /previous featured event/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /next featured event/i })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Show Second event' }))
    expect(screen.getByRole('link', { name: /Second event/i })).toHaveAttribute('tabindex', '0')
    expect(container.querySelector('[aria-live="polite"]')).toHaveStyle({ transform: 'translate3d(-100%, 0, 0)' })
    expect(screen.getByRole('button', { name: 'Show Second event' })).toHaveClass('min-h-9', 'min-w-9')
  })

  it('restarts auto-rotation after a dot selection', () => {
    vi.useFakeTimers()
    render(<PromotedEventCarousel events={events} />)
    act(() => vi.advanceTimersByTime(6500))
    fireEvent.click(screen.getByRole('button', { name: 'Show Second event' }))
    act(() => vi.advanceTimersByTime(1000))
    expect(screen.getByRole('link', { name: /Second event/i })).toHaveAttribute('tabindex', '0')
  })

  it('changes slides after a horizontal swipe', () => {
    const { container } = render(<PromotedEventCarousel events={events} />)
    const carousel = container.querySelector<HTMLElement>('[aria-roledescription="carousel"]')
    expect(carousel).not.toBeNull()

    fireEvent.pointerDown(carousel!, { button: 0, clientX: 220, clientY: 80, isPrimary: true, pointerId: 1 })
    fireEvent.pointerUp(carousel!, { button: 0, clientX: 100, clientY: 85, isPrimary: true, pointerId: 1 })

    expect(screen.getByRole('link', { name: /Second event/i })).toHaveAttribute('tabindex', '0')
  })
})
