import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { FinspoMediaCarousel, FinspoMediaBadge } from './FinspoMediaCarousel'

describe('FinspoMediaCarousel', () => {
  const scrollTo = vi.fn()

  beforeEach(() => {
    scrollTo.mockReset()
    Object.defineProperty(HTMLElement.prototype, 'scrollTo', {
      configurable: true,
      value: scrollTo,
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('does not render navigation or progress dots for one image', () => {
    render(<FinspoMediaCarousel alt="Single look" images={['one.jpg']} />)

    expect(screen.queryByRole('button', { name: /Finspo image/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('group', { name: 'Choose a Finspo image' })).not.toBeInTheDocument()
    expect(screen.getByText('Image 1 of 1')).toBeInTheDocument()
  })

  it('synchronizes arrows, dots, keyboard input, and swipe scrolling', () => {
    render(<FinspoMediaCarousel alt="Layered look" images={['one.jpg', 'two.jpg', 'three.jpg']} surface="detail" />)

    expect(screen.getByRole('button', { name: 'Show image 1 of 3' })).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(screen.getByRole('button', { name: 'Next Finspo image' }))
    expect(screen.getByText('Image 2 of 3')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Show image 2 of 3' })).toHaveAttribute('aria-pressed', 'true')
    expect(scrollTo).toHaveBeenCalled()

    const carousel = screen.getByRole('region', { name: 'Layered look photos' })
    fireEvent.keyDown(carousel, { key: 'ArrowRight' })
    expect(screen.getByText('Image 3 of 3')).toBeInTheDocument()

    const track = screen.getByTestId('finspo-media-track')
    Object.defineProperty(track, 'clientWidth', { configurable: true, value: 320 })
    Object.defineProperty(track, 'scrollLeft', { configurable: true, value: 0 })
    fireEvent.scroll(track)
    expect(screen.getByText('Image 1 of 3')).toBeInTheDocument()
  })

  it('does not navigate when a touch gesture moved horizontally', () => {
    const onNavigate = vi.fn((event) => event.preventDefault())
    render(<FinspoMediaCarousel alt="Swipeable look" href="/post" images={['one.jpg', 'two.jpg']} onNavigate={onNavigate} />)
    const carousel = screen.getByRole('region', { name: 'Swipeable look photos' })
    const link = screen.getByRole('link', { name: 'Open Swipeable look, image 1 of 2' })

    fireEvent.pointerDown(carousel, { clientX: 120 })
    fireEvent.pointerUp(carousel, { clientX: 70 })
    fireEvent.click(link)

    expect(onNavigate).not.toHaveBeenCalled()
  })

  it('autoplays feed dots every ten seconds, loops, and never renders arrows', () => {
    vi.useFakeTimers()
    render(<FinspoMediaCarousel alt="Feed look" images={['one.jpg', 'two.jpg']} surface="feed" />)

    expect(screen.queryByRole('button', { name: /Next Finspo image/ })).not.toBeInTheDocument()
    act(() => vi.advanceTimersByTime(10_000))
    expect(screen.getByText('Image 2 of 2')).toBeInTheDocument()
    act(() => vi.advanceTimersByTime(10_000))
    expect(screen.getByText('Image 1 of 2')).toBeInTheDocument()
  })

  it('keeps independent feed timers and resets a full delay after manual navigation', () => {
    vi.useFakeTimers()
    render(
      <>
        <FinspoMediaCarousel alt="First look" autoplayDelay={10_000} images={['one.jpg', 'two.jpg']} surface="feed" />
        <FinspoMediaCarousel alt="Second look" autoplayDelay={15_000} images={['three.jpg', 'four.jpg']} surface="feed" />
      </>,
    )

    act(() => vi.advanceTimersByTime(9_000))
    fireEvent.click(withinCarousel('First look').getByRole('button', { name: 'Show image 2 of 2' }))
    act(() => vi.advanceTimersByTime(6_000))
    expect(withinCarousel('First look').getByText('Image 2 of 2')).toBeInTheDocument()
    expect(withinCarousel('Second look').getByText('Image 2 of 2')).toBeInTheDocument()
    act(() => vi.advanceTimersByTime(4_000))
    expect(withinCarousel('First look').getByText('Image 1 of 2')).toBeInTheDocument()
  })

  it('pauses feed autoplay while hovered or focused and disables it for profiles', () => {
    vi.useFakeTimers()
    render(
      <>
        <FinspoMediaCarousel alt="Paused look" images={['one.jpg', 'two.jpg']} surface="feed" />
        <FinspoMediaCarousel alt="Profile look" images={['three.jpg', 'four.jpg']} surface="profile" />
      </>,
    )
    const paused = screen.getByRole('region', { name: 'Paused look photos' })

    fireEvent.mouseEnter(paused)
    act(() => vi.advanceTimersByTime(20_000))
    expect(withinCarousel('Paused look').getByText('Image 1 of 2')).toBeInTheDocument()
    fireEvent.mouseLeave(paused)
    fireEvent.focus(withinCarousel('Paused look').getByRole('button', { name: 'Open Paused look image 1' }))
    act(() => vi.advanceTimersByTime(20_000))
    expect(withinCarousel('Paused look').getByText('Image 1 of 2')).toBeInTheDocument()
    fireEvent.blur(withinCarousel('Paused look').getByRole('button', { name: 'Open Paused look image 1' }))
    act(() => vi.advanceTimersByTime(10_000))
    expect(withinCarousel('Paused look').getByText('Image 2 of 2')).toBeInTheDocument()
    expect(withinCarousel('Profile look').getByText('Image 1 of 2')).toBeInTheDocument()
    expect(withinCarousel('Profile look').queryByRole('button', { name: /Next Finspo image/ })).not.toBeInTheDocument()
  })

  it('only renders a media badge for multi-image posts', () => {
    const { rerender } = render(<FinspoMediaBadge count={1} />)
    expect(screen.queryByLabelText('1 images')).not.toBeInTheDocument()
    rerender(<FinspoMediaBadge count={4} />)
    expect(screen.getByLabelText('4 images')).toHaveTextContent('4')
  })
})

function withinCarousel(alt: string) {
  const carousel = screen.getByRole('region', { name: `${alt} photos` })
  return within(carousel)
}
