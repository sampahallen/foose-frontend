import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { StepIndicator } from './StepIndicator'

describe('StepIndicator', () => {
  it('renders connected workflow progress and allows returning to completed steps', () => {
    const onStepChange = vi.fn()
    const { container } = render(
      <StepIndicator
        current={2}
        label="Listing creation progress"
        onStepChange={onStepChange}
        steps={['Details', 'Pricing', 'Media', 'Review']}
      />,
    )

    expect(screen.getByRole('navigation', { name: 'Listing creation progress' })).toBeInTheDocument()
    expect(container.querySelector('ol')).toHaveStyle({ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' })
    expect(screen.getByRole('button', { name: 'Media, current step' })).toHaveAttribute('aria-current', 'step')
    expect(screen.getByRole('button', { name: 'Review, upcoming step' })).toBeDisabled()

    fireEvent.click(screen.getByRole('button', { name: 'Pricing, completed' }))
    expect(onStepChange).toHaveBeenCalledWith(1)
  })
})
