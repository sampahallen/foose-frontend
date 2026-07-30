import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { ListingCategoryPicker } from './ListingCategoryPicker'

function PickerHarness() {
  const [selection, setSelection] = useState({ category: '', subcategory: '' })
  return (
    <ListingCategoryPicker
      category={selection.category}
      id="category-picker"
      onChange={setSelection}
      subcategory={selection.subcategory}
    />
  )
}

describe('ListingCategoryPicker', () => {
  it('opens each category into an indented right-side subcategory menu', async () => {
    const user = userEvent.setup()
    const { container } = render(<PickerHarness />)

    await user.click(screen.getByRole('button', { name: 'Select category' }))
    expect(screen.queryByRole('menuitem', { name: 'Outerwear' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('menuitem', { name: 'Clothing' }))

    const outerwear = screen.getByRole('menuitem', { name: 'Outerwear' })
    expect(outerwear).toHaveClass('pl-7')
    expect(outerwear.parentElement).toHaveClass('left-full')

    await user.click(outerwear)
    expect(screen.getByRole('button', { name: 'Clothing ← Outerwear' })).toBeInTheDocument()
    expect(container.querySelector<HTMLInputElement>('input[name="category"]')?.value).toBe('Clothing')
    expect(container.querySelector<HTMLInputElement>('input[name="subcategory"]')?.value).toBe('Outerwear')
  })

  it('allows selecting a parent category without requiring a subcategory', async () => {
    const user = userEvent.setup()
    render(<PickerHarness />)

    await user.click(screen.getByRole('button', { name: 'Select category' }))
    await user.click(screen.getByRole('menuitem', { name: 'Footwear' }))
    await user.click(screen.getByRole('menuitem', { name: 'All Footwear' }))

    expect(screen.getByRole('button', { name: 'Footwear' })).toBeInTheDocument()
  })
})
