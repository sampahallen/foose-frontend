import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { WalletPage } from './WalletPage'

const walletMocks = vi.hoisted(() => ({
  path: vi.fn(),
  refetch: vi.fn(),
}))

vi.mock('../components/layout/AppShell', () => ({
  AppShell: ({ children }: { children: ReactNode }) => <main>{children}</main>,
}))
vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    user: {
      _id: 'seller-1',
      hasShop: true,
      wallet: { balance: 45000, escrow: 12000 },
    },
  }),
}))
vi.mock('../hooks/useApiResource', () => ({
  useApiResource: (path: string) => {
    walletMocks.path(path)
    return {
      data: {
        entries: [{
          amount: 12000,
          balanceAfter: 45000,
          balanceDelta: 12000,
          createdAt: '2026-07-24T12:00:00.000Z',
          currency: 'GHS',
          description: 'Funds released after the buyer confirmed collection.',
          entryType: 'escrow_release',
          escrowAfter: 0,
          escrowDelta: -12000,
          id: 'ledger-1',
          order: {
            currency: 'GHS',
            deliveryMethod: 'shop_pickup',
            fulfillmentStatus: 'completed',
            id: 'order-12345678',
            itemCount: 1,
            itemSummary: 'Vintage jacket',
            settlementStatus: 'released',
            shortReference: '#12345678',
            totalAmount: 12000,
            workflow: {
              allowedActions: [],
              deadline: null,
              nextActor: 'none',
              report: null,
              serverNow: '2026-07-24T12:00:00.000Z',
              settlementExplanation: 'The full order total is available in the seller wallet.',
            },
          },
        }],
        hasMore: false,
        nextCursor: null,
        serverNow: '2026-07-24T12:00:00.000Z',
      },
      error: '',
      initialLoading: false,
      loading: false,
      refetch: walletMocks.refetch,
      refreshing: false,
    }
  },
}))

describe('WalletPage ledger', () => {
  it('shows immutable order settlement activity with an order link', () => {
    render(<WalletPage />)

    expect(walletMocks.path).toHaveBeenCalledWith('/payments/wallet/ledger?limit=20')
    expect(screen.getByText('Funds released')).toBeVisible()
    expect(screen.getByText('Vintage jacket')).toBeVisible()
    expect(screen.getByText((_, element) => (
      element?.tagName === 'P' && Boolean(element.textContent?.includes('Released to seller'))
    ))).toBeVisible()
    expect(screen.getByRole('link', { name: /View order/ })).toHaveAttribute('href', '/orders/order-12345678')
    expect(screen.queryByText(/Transaction history is coming soon/i)).not.toBeInTheDocument()
  })
})
