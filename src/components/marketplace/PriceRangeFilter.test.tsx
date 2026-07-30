import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PriceRangeFilter } from './PriceRangeFilter'

describe('PriceRangeFilter', () => {
  it('synchronizes sliders with submitted min and max inputs', () => {
    render(<PriceRangeFilter defaultMax="900" defaultMin="100" idPrefix="price" />)

    const minimumInput = screen.getByLabelText('Minimum price')
    const maximumInput = screen.getByLabelText('Maximum price')
    const minimumSlider = screen.getByLabelText('Minimum price slider')
    const maximumSlider = screen.getByLabelText('Maximum price slider')

    expect(minimumInput).toHaveValue(100)
    expect(maximumInput).toHaveValue(900)
    fireEvent.change(minimumSlider, { target: { value: '250' } })
    fireEvent.change(maximumSlider, { target: { value: '700' } })
    expect(minimumInput).toHaveValue(250)
    expect(maximumInput).toHaveValue(700)
  })

  it('prevents handles from crossing and preserves an unset opposite bound', () => {
    render(<PriceRangeFilter idPrefix="price" />)

    const minimumInput = screen.getByLabelText('Minimum price')
    const maximumInput = screen.getByLabelText('Maximum price')
    const minimumSlider = screen.getByLabelText('Minimum price slider')
    const maximumSlider = screen.getByLabelText('Maximum price slider')

    fireEvent.change(minimumSlider, { target: { value: '500' } })
    expect(minimumInput).toHaveValue(500)
    expect(maximumInput).toHaveValue(null)

    fireEvent.change(maximumSlider, { target: { value: '300' } })
    expect(maximumInput).toHaveValue(500)
  })

  it('expands its slider domain for an existing high price', () => {
    render(<PriceRangeFilter defaultMax="7250" idPrefix="price" />)
    expect(screen.getByLabelText('Maximum price slider')).toHaveAttribute('max', '7500')
  })
})
