import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { EmptyState } from './EmptyState'
import { ErrorState } from './ErrorState'
import { InlineNotice } from './InlineNotice'
import { LoadingRegion } from './LoadingRegion'
import { RefreshIndicator } from './RefreshIndicator'
import { SkeletonBlock } from './SkeletonBlock'
import { StatePanel } from './StatePanel'
import { SuccessState } from './SuccessState'

describe('feedback primitives', () => {
  it('marks layout-owned loading regions busy and hides skeleton decoration', () => {
    render(
      <LoadingRegion label="Loading orders" layout="pane">
        <SkeletonBlock className="h-8" />
      </LoadingRegion>,
    )

    const region = screen.getByRole('status', { name: 'Loading orders' })
    expect(region).toHaveAttribute('aria-busy', 'true')
    expect(region).toHaveAttribute('data-layout', 'pane')
    expect(region.querySelector('[aria-hidden="true"]')).toBeInTheDocument()
  })

  it('renders explicit state layouts, tones, descriptions, and actions', () => {
    render(
      <StatePanel
        action={<button type="button">Try again</button>}
        description="The service did not respond."
        layout="compact"
        title="Could not refresh"
        tone="error"
      />,
    )

    const panel = screen.getByRole('alert')
    expect(panel).toHaveAttribute('data-layout', 'compact')
    expect(panel).toHaveAttribute('data-tone', 'error')
    expect(screen.getByText('The service did not respond.')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Try again' }).parentElement?.className).toContain('[&_button]:min-h-11')
  })

  it('keeps compatibility wrappers while using contextual panels', () => {
    const { rerender } = render(<EmptyState body="Nothing saved yet" title="No saves" />)
    expect(screen.getByText('No saves').closest('[data-tone]')).toHaveAttribute('data-tone', 'empty')

    rerender(<ErrorState message="Request failed" retry={() => undefined} title="Orders unavailable" />)
    expect(screen.getByRole('alert')).toHaveTextContent('Orders unavailable')
    expect(screen.getByRole('button', { name: 'Retry' })).toBeVisible()

    rerender(<SuccessState message="Your changes are live." title="Saved" />)
    expect(screen.getByRole('status')).toHaveTextContent('Your changes are live.')
  })

  it('uses inline alert semantics only for actionable failures', () => {
    const { rerender } = render(<InlineNotice tone="error">Upload failed</InlineNotice>)
    expect(screen.getByRole('alert')).toHaveTextContent('Upload failed')

    rerender(<InlineNotice tone="info">Drafts save automatically</InlineNotice>)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('announces only active refresh indicators', () => {
    const { rerender } = render(<RefreshIndicator active={false} />)
    expect(screen.queryByRole('status')).not.toBeInTheDocument()

    rerender(<RefreshIndicator active label="Refreshing listings" />)
    expect(screen.getByRole('status')).toHaveTextContent('Refreshing listings')
  })
})
