import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { SafeImage } from './SafeImage'

describe('SafeImage', () => {
  it('replaces a failed image with a labelled, correctly sized fallback', () => {
    render(
      <SafeImage
        alt="Vintage jacket"
        className="aspect-[4/5] w-full"
        fallback="Image unavailable"
        src="https://media.example/jacket.jpg"
      />,
    )

    fireEvent.error(screen.getByRole('img', { name: 'Vintage jacket' }))
    const fallback = screen.getByRole('img', { name: 'Media unavailable' })
    expect(fallback).toHaveTextContent('Image unavailable')
    expect(fallback).toHaveClass('aspect-[4/5]', 'w-full')
  })

  it('recovers when the source changes after a failure', () => {
    const { rerender } = render(<SafeImage alt="Listing" src="/broken.jpg" />)
    fireEvent.error(screen.getByRole('img', { name: 'Listing' }))

    rerender(<SafeImage alt="Listing" src="/replacement.jpg" />)
    expect(screen.getByRole('img', { name: 'Listing' })).toHaveAttribute('src', '/replacement.jpg')
  })
})
