import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { formatOrderCountdown } from '../../utils/orderCountdown'
import { OrderCountdown } from './OrderWorkflow'

describe('order deadline countdown', () => {
  it('uses the server clock instead of trusting the client clock', () => {
    const clientNow = new Date('2026-07-24T08:00:00.000Z').getTime()
    expect(formatOrderCountdown(
      '2026-07-24T14:30:00.000Z',
      '2026-07-24T12:00:00.000Z',
      clientNow,
    )).toBe('2h 30m remaining')
    expect(formatOrderCountdown(
      '2026-07-24T14:30:00.000Z',
      '2026-07-24T12:00:00.000Z',
      clientNow + 30 * 60_000,
      clientNow,
    )).toBe('2h 0m remaining')
  })

  it('announces when the server-defined window has been reached', () => {
    render(
      <OrderCountdown
        at="2026-07-24T11:00:00.000Z"
        serverNow="2026-07-24T12:00:00.000Z"
      />,
    )
    expect(screen.getByText('Window reached')).toBeVisible()
  })
})
