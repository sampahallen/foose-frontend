import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { MarketplaceFilters } from './MarketplaceFilters'

describe('MarketplaceFilters', () => {
  it('reveals only the selected category fields', async () => {
    const view = render(<MarketplaceFilters actionPath="/browse" hideType key="outerwear" query={new URLSearchParams('type=retail&category=Clothing&subcategory=Outerwear')} />)
    expect(screen.getByLabelText('Material')).toBeInTheDocument()
    expect(screen.getByLabelText('Fit')).toBeInTheDocument()
    expect(screen.queryByLabelText('Bale grade')).not.toBeInTheDocument()

    view.rerender(<MarketplaceFilters actionPath="/browse" hideType key="bales" query={new URLSearchParams('type=wholesale&category=Other')} />)
    expect(await screen.findByLabelText('Bale grade')).toBeInTheDocument()
    expect(screen.getByLabelText('Brand')).toBeInTheDocument()
  })

  it('preserves the search and browse mode in clear links', () => {
    render(<MarketplaceFilters actionPath="/browse" hideType query={new URLSearchParams('q=jacket&type=wholesale&color=red')} />)
    screen.getAllByText('Clear all').forEach((link) => {
      expect(link).toHaveAttribute('href', expect.stringContaining('q=jacket'))
      expect(link).toHaveAttribute('href', expect.stringContaining('type=wholesale'))
      expect(link).not.toHaveAttribute('href', expect.stringContaining('color=red'))
    })
  })

  it('keeps the selected results sort when applying other filters', () => {
    const { container } = render(<MarketplaceFilters actionPath="/browse" hideType query={new URLSearchParams('type=retail&sort=newest')} />)
    expect(container.querySelector('input[name="sort"]')).toHaveValue('newest')
    expect(container.querySelector('select[name="sort"]')).not.toBeInTheDocument()
  })

  it('shows the matching wheel beside color options and selections', async () => {
    const user = userEvent.setup()
    const { container } = render(<MarketplaceFilters actionPath="/browse" hideType query={new URLSearchParams('type=retail')} />)
    const colorButton = container.querySelector<HTMLButtonElement>('#desktop-color')
    expect(colorButton).toBeInTheDocument()
    await user.click(colorButton!)
    await user.click(screen.getByRole('option', { name: 'Blue' }))
    const selectedSwatch = container.querySelector<HTMLElement>('[data-color-swatch="blue"]')
    expect(selectedSwatch).toBeInTheDocument()
    expect(selectedSwatch?.style.background).toBe('rgb(17, 121, 189)')
  })
})
