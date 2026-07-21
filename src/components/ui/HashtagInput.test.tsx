import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { HashtagInput } from './HashtagInput'

vi.mock('../../lib/api', async (importOriginal) => ({
  ...await importOriginal<typeof import('../../lib/api')>(),
  apiGet: vi.fn().mockResolvedValue({ suggestions: [] }),
}))

function ControlledHashtags() {
  const [tags, setTags] = useState<string[]>([])
  return <HashtagInput initialTags={tags} onChange={setTags} />
}

describe('HashtagInput focus', () => {
  it('keeps the same text input focused while committing consecutive hashtags', async () => {
    const user = userEvent.setup()
    render(<ControlledHashtags />)
    const input = screen.getByRole('combobox', { name: 'Hashtags' })

    await user.type(input, 'streetwear{Enter}')
    expect(input).toHaveFocus()
    expect(input).toHaveValue('')
    expect(screen.getByText('#streetwear')).toBeVisible()

    await user.type(input, 'vintage,')
    expect(input).toHaveFocus()
    expect(input).toHaveValue('')
    expect(screen.getByText('#vintage')).toBeVisible()
    expect(screen.getByRole('combobox', { name: 'Hashtags' })).toBe(input)
  })

  it('uses compact pills through tablet sizes and restores the larger desktop target', async () => {
    const user = userEvent.setup()
    render(<ControlledHashtags />)
    await user.type(screen.getByRole('combobox', { name: 'Hashtags' }), 'streetwear{Enter}')

    const pill = screen.getByText('#streetwear').closest('span')
    const remove = screen.getByRole('button', { name: 'Remove #streetwear' })
    expect(pill).toHaveClass('min-h-8', 'text-[11px]', 'lg:min-h-11', 'lg:text-xs')
    expect(remove).toHaveClass('size-8', 'lg:size-11')
  })
})
