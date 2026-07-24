import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useApiResource } from '../hooks/useApiResource'
import { BuyerDashboardPage } from './BuyerDashboardPage'

vi.mock('../components/layout/AppShell', () => ({
  AppShell: ({ children }: { children: ReactNode }) => <main>{children}</main>,
}))

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    user: {
      _id: 'buyer-1',
      isKycVerified: true,
      name: 'Ama Buyer',
      username: 'ama',
    },
  }),
}))

vi.mock('../hooks/useApiResource', () => ({
  useApiResource: vi.fn(() => ({
    data: { orders: [] },
    error: '',
    errorMeta: null,
    initialLoading: false,
    loading: false,
    refetch: vi.fn().mockResolvedValue(undefined),
    refreshing: false,
  })),
}))

describe('BuyerDashboardPage order previews', () => {
  beforeEach(() => {
    vi.mocked(useApiResource).mockClear()
  })

  it('uses separate server buckets for active and historical previews', () => {
    render(<BuyerDashboardPage />)

    expect(useApiResource).toHaveBeenCalledWith('/orders/me/buying?bucket=active&limit=3&sort=urgency')
    expect(useApiResource).toHaveBeenCalledWith('/orders/me/buying?bucket=history&limit=3&sort=newest')
    expect(useApiResource).not.toHaveBeenCalledWith('/orders/me/buying')
    expect(screen.getByRole('link', { name: 'Order history' })).toBeVisible()
    expect(screen.queryByText(/Order history \(\d+\)/)).not.toBeInTheDocument()
  })
})
