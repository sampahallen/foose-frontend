import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { ListingColorPicker } from './ListingColorPicker'
import type { ListingColor } from '../../utils/listingTaxonomy'

function Picker() {
  const [value, setValue] = useState<ListingColor[]>(['multi'])
  return <ListingColorPicker onChange={setValue} value={value} />
}

describe('ListingColorPicker', () => {
  it('replaces Multi with named colors, allows five, and keeps Multi exclusive', async () => {
    const user = userEvent.setup()
    render(<Picker />)
    await user.click(document.querySelector('summary')!)
    for (const color of ['Red', 'Blue', 'Green', 'Black', 'White']) {
      await user.click(screen.getByRole('button', { name: color }))
    }
    expect(screen.getByRole('button', { name: 'Yellow' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Multi' })).toHaveAttribute('aria-pressed', 'false')
    await user.click(screen.getByRole('button', { name: 'Multi' }))
    expect(screen.getByRole('button', { name: 'Multi' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Red' })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('button', { name: 'Yellow' })).toBeEnabled()
  })
})
