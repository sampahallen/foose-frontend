import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ImagePreviewInput } from './ImagePreviewInput'

describe('ImagePreviewInput', () => {
  beforeEach(() => {
    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL: vi.fn(() => 'blob:preview'),
      revokeObjectURL: vi.fn(),
    })
  })

  it('renders a labelled dropzone and validates type and size', () => {
    render(<ImagePreviewInput accept="image/png" label="Listing photos" maxBytes={10} maxFiles={2} multiple name="photos" />)
    const input = screen.getByLabelText(/listing photos/i)
    fireEvent.change(input, { target: { files: [new File(['not-an-image'], 'notes.txt', { type: 'text/plain' })] } })
    expect(screen.getByRole('alert')).toHaveTextContent('not an accepted image type')

    fireEvent.change(input, { target: { files: [new File(['this is too large'], 'large.png', { type: 'image/png' })] } })
    expect(screen.getByRole('alert')).toHaveTextContent('larger than 10 B')
  })

  it('shows file metadata and accessible preview controls', () => {
    render(<ImagePreviewInput accept="image/*" label="Photo" maxBytes={1024} maxFiles={1} name="photo" />)
    fireEvent.change(screen.getByLabelText('Photo'), {
      target: { files: [new File(['image'], 'jacket.png', { type: 'image/png' })] },
    })
    expect(screen.getByText('jacket.png')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Remove selected upload 1' })).toHaveClass('min-h-11')
    expect(screen.getByText('Maximum of 1 image reached.')).toBeVisible()
  })
})
