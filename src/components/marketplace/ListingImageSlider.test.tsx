import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ListingImageSlider } from './ListingImageSlider'

describe('ListingImageSlider', () => {
  const scrollTo = vi.fn()

  beforeEach(() => {
    scrollTo.mockReset()
    Object.defineProperty(HTMLElement.prototype, 'scrollTo', {
      configurable: true,
      value: scrollTo,
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('provides desktop controls and keeps thumbnails synchronized', () => {
    render(<ListingImageSlider images={['one.jpg', 'two.jpg', 'three.jpg']} title="Blue jacket" />)

    expect(screen.getByText('Image 1 of 3')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Previous listing image' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Next listing image' }))
    expect(screen.getByText('Image 2 of 3')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Previous listing image' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Next listing image' })).toBeInTheDocument()
    expect(scrollTo).toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Show image 3 of 3' }))
    expect(screen.getByText('Image 3 of 3')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Next listing image' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Previous listing image' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Show image 3 of 3' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('tracks native mobile swipe scrolling through the snap carousel', () => {
    render(<ListingImageSlider images={['one.jpg', 'two.jpg']} title="Blue jacket" />)
    const track = screen.getByTestId('listing-image-track')
    Object.defineProperty(track, 'clientWidth', { configurable: true, value: 320 })
    Object.defineProperty(track, 'scrollLeft', { configurable: true, value: 320 })

    fireEvent.scroll(track)

    expect(track).toHaveClass('snap-mandatory', 'overflow-x-auto')
    expect(screen.getByText('Image 2 of 2')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Next listing image' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Previous listing image' })).toBeInTheDocument()
  })
})
