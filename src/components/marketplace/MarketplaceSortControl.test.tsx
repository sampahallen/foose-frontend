import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { MarketplaceSortControl } from './MarketplaceSortControl'

describe('MarketplaceSortControl', () => {
  it('defaults marketplace sorting to personalized relevance', () => {
    const { container } = render(<MarketplaceSortControl actionPath="/browse" query={new URLSearchParams('type=retail')} />)
    expect(container.querySelector('select')).toHaveValue('relevance')
  })

  it('reflects the selected result ordering', () => {
    const { container } = render(<MarketplaceSortControl actionPath="/browse" query={new URLSearchParams('type=retail&sort=newest')} />)
    expect(container.querySelector('select')).toHaveValue('newest')
  })
})
