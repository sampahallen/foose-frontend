import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Order } from '../types/api'
import { OrderReportPage } from './OrderReportPage'

const reportMocks = vi.hoisted(() => ({
  apiGet: vi.fn(),
  order: null as Order | null,
  postOrderReport: vi.fn(),
  refetch: vi.fn(),
  userId: 'buyer-1',
}))

vi.mock('../components/layout/AppShell', () => ({
  AppShell: ({ children }: { children: ReactNode }) => <main>{children}</main>,
}))
vi.mock('../hooks/useApiResource', () => ({
  useApiResource: () => ({
    data: reportMocks.order ? { order: reportMocks.order } : null,
    error: '',
    initialLoading: false,
    loading: false,
    refetch: reportMocks.refetch,
    refreshing: false,
  }),
}))
vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({ user: { _id: reportMocks.userId } }),
}))
vi.mock('../lib/api', async (importOriginal) => ({
  ...await importOriginal<typeof import('../lib/api')>(),
  apiGet: reportMocks.apiGet,
}))
vi.mock('../lib/orderActions', async (importOriginal) => ({
  ...await importOriginal<typeof import('../lib/orderActions')>(),
  postOrderReport: reportMocks.postOrderReport,
}))

function reportableOrder(overrides: Partial<Order> = {}): Order {
  return {
    _id: 'order-12345678',
    buyerId: 'buyer-1',
    currency: 'GHS',
    delivery: { method: 'delivery' },
    fulfillmentStatus: 'in_transit',
    items: [{ _id: 'line-1', price: 12000, quantity: 1, title: 'Vintage jacket' }],
    settlementStatus: 'held',
    totalAmount: 12000,
    workflow: {
      allowedActions: ['confirm_receipt', 'report'],
      deadline: { at: '2026-07-26T00:00:00.000Z', type: 'delivery_confirmation' },
      nextActor: 'buyer',
      report: null,
      serverNow: '2026-07-24T12:00:00.000Z',
      settlementExplanation: 'Payment is protected.',
    },
    ...overrides,
  }
}

describe('OrderReportPage', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/orders/order-12345678/report')
    reportMocks.order = reportableOrder()
    reportMocks.userId = 'buyer-1'
    reportMocks.apiGet.mockReset()
    reportMocks.postOrderReport.mockReset()
    reportMocks.postOrderReport.mockResolvedValue({ order: reportMocks.order })
    reportMocks.refetch.mockReset()
    reportMocks.refetch.mockResolvedValue(undefined)
    vi.stubGlobal('matchMedia', vi.fn(() => ({
      addEventListener: vi.fn(),
      addListener: vi.fn(),
      dispatchEvent: vi.fn(),
      matches: false,
      media: '',
      onchange: null,
      removeEventListener: vi.fn(),
      removeListener: vi.fn(),
    })))
  })

  it('submits the guided report using canonical backend fields', async () => {
    const user = userEvent.setup()
    render(<OrderReportPage />)

    await user.click(screen.getByRole('radio', { name: /Order not received/ }))
    await user.click(screen.getByRole('checkbox', { name: /Vintage jacket/ }))
    await user.click(screen.getByRole('button', { name: 'Continue' }))

    await user.click(screen.getByRole('radio', { name: /Full refund/ }))
    await user.type(
      screen.getByRole('textbox', { name: 'Detailed account' }),
      'The parcel did not arrive and I could not reach the listed driver after several attempts.',
    )
    await user.click(screen.getByRole('button', { name: 'Continue' }))
    await user.click(screen.getByRole('button', { name: 'Continue' }))

    await user.click(screen.getByRole('checkbox', { name: /I confirm this account is truthful/ }))
    await user.click(screen.getByRole('button', { name: 'Submit report & freeze funds' }))

    await waitFor(() => expect(reportMocks.postOrderReport).toHaveBeenCalled())
    const [orderId, body, idempotencyKey] = reportMocks.postOrderReport.mock.calls[0]
    expect(orderId).toBe('order-12345678')
    expect(body).toBeInstanceOf(FormData)
    expect((body as FormData).get('category')).toBe('not_received')
    expect((body as FormData).get('requestedOutcome')).toBe('refund')
    expect((body as FormData).get('detailedAccount')).toMatch(/parcel did not arrive/)
    expect((body as FormData).get('declarationAccepted')).toBe('true')
    expect(idempotencyKey).toContain('order:order-12345678:report:')
    expect(await screen.findByRole('heading', { name: /Funds frozen/ })).toBeVisible()
  }, 15_000)

  it('renders a populated report read-only and requests a short-lived evidence link', async () => {
    const user = userEvent.setup()
    const replace = vi.fn()
    const previewWindow = {
      close: vi.fn(),
      location: { replace },
      opener: window,
    } as unknown as Window
    const open = vi.spyOn(window, 'open').mockImplementation(() => previewWindow)
    reportMocks.apiGet.mockResolvedValue({ url: 'https://private.example/evidence' })
    reportMocks.order = reportableOrder({
      activeReportId: {
        _id: 'report-1',
        affectedItemIds: ['line-1'],
        category: 'wrong_or_missing_items',
        declarationAccepted: true,
        detailedAccount: 'The parcel was missing the jacket shown in the order.',
        evidence: [{ originalName: 'parcel.jpg' }],
        frozenAt: '2026-07-24T12:00:00.000Z',
        requestedOutcome: 'refund',
        status: 'submitted',
        submittedAt: '2026-07-24T12:00:00.000Z',
      },
      workflow: {
        allowedActions: [],
        deadline: null,
        nextActor: 'review',
        report: { active: true, id: 'report-1', status: 'submitted' },
        serverNow: '2026-07-24T12:00:00.000Z',
        settlementExplanation: 'Settlement is frozen.',
      },
    })

    render(<OrderReportPage />)
    expect(screen.getByRole('heading', { name: 'Read-only account' })).toBeVisible()
    expect(screen.getByText('Wrong or missing items')).toBeVisible()
    expect(screen.getByText(/parcel was missing the jacket/i)).toBeVisible()

    await user.click(screen.getByRole('button', { name: 'View parcel.jpg' }))
    await waitFor(() => expect(reportMocks.apiGet).toHaveBeenCalledWith(
      '/orders/order-12345678/attachments/report-evidence/0',
    ))
    expect(open).toHaveBeenCalledWith('about:blank', '_blank')
    expect(previewWindow.opener).toBeNull()
    expect(replace).toHaveBeenCalledWith('https://private.example/evidence')
    open.mockRestore()
  })

  it('uses seller-facing copy when the seller reviews the immutable buyer report', () => {
    reportMocks.userId = 'seller-1'
    reportMocks.order = reportableOrder({
      activeReportId: {
        _id: 'report-1',
        affectedItemIds: ['line-1'],
        category: 'not_received',
        declarationAccepted: true,
        detailedAccount: 'The buyer says the parcel did not arrive at the agreed destination.',
        evidence: [],
        frozenAt: '2026-07-24T12:00:00.000Z',
        requestedOutcome: 'refund',
        status: 'submitted',
        submittedAt: '2026-07-24T12:00:00.000Z',
      },
      workflow: {
        allowedActions: [],
        deadline: null,
        nextActor: 'review',
        report: { active: true, id: 'report-1', status: 'submitted' },
        serverNow: '2026-07-24T12:00:00.000Z',
        settlementExplanation: 'Settlement is frozen.',
      },
    })

    render(<OrderReportPage />)

    expect(screen.getByRole('heading', { name: /Buyer report/ })).toBeVisible()
    expect(screen.getByText(/buyer.s report and evidence are read-only/i)).toBeVisible()
  })
})
