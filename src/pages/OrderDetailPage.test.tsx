import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ToastProvider } from '../components/feedback/ToastProvider'
import { ImagePreviewModal } from '../components/ui/ImagePreviewModal'
import { useImagePreviewStore } from '../stores/imagePreviewStore'
import type { Order } from '../types/api'
import { OrderDetailPage } from './OrderDetailPage'

const orderMocks = vi.hoisted(() => ({
  apiGet: vi.fn(),
  order: null as Order | null,
  postOrderAction: vi.fn(),
  refetchEvents: vi.fn(),
  refetchOrder: vi.fn(),
  userId: 'buyer-1',
}))

vi.mock('../components/layout/AppShell', () => ({
  AppShell: ({ children }: { children: ReactNode }) => <main>{children}</main>,
}))
vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({ user: { _id: orderMocks.userId } }),
}))
vi.mock('../hooks/useApiResource', () => ({
  useApiResource: (path: string) => path?.includes('/events')
    ? {
        data: { events: [] },
        error: '',
        initialLoading: false,
        loading: false,
        refetch: orderMocks.refetchEvents,
        refreshing: false,
      }
    : {
        data: orderMocks.order ? { events: [], order: orderMocks.order } : null,
        error: '',
        initialLoading: false,
        loading: false,
        refetch: orderMocks.refetchOrder,
        refreshing: false,
      },
}))
vi.mock('../lib/orderActions', async (importOriginal) => ({
  ...await importOriginal<typeof import('../lib/orderActions')>(),
  postOrderAction: orderMocks.postOrderAction,
}))
vi.mock('../lib/api', async (importOriginal) => ({
  ...await importOriginal<typeof import('../lib/api')>(),
  apiGet: orderMocks.apiGet,
}))

function makeOrder(overrides: Partial<Order> = {}): Order {
  return {
    _id: 'order-12345678',
    buyerId: { _id: 'buyer-1', email: 'buyer@example.com', name: 'Ama Buyer', username: 'ama' } as Order['buyerId'],
    currency: 'GHS',
    delivery: { method: 'shop_pickup' },
    fulfillmentStatus: 'ready_for_pickup',
    items: [{ _id: 'line-1', price: 12000, quantity: 1, title: 'Vintage jacket' }],
    paymentMethod: 'paystack',
    settlementStatus: 'held',
    shopId: {
      _id: 'shop-1',
      location: { city: 'Osu', region: 'Greater Accra' },
      ownerId: {
        _id: 'seller-1',
        email: 'seller@example.com',
        hasShop: true,
        isEmailVerified: true,
        isKycVerified: true,
        name: 'Kojo Seller',
        phone: '0241112222',
        username: 'kojo',
      },
      shopName: 'Archive Shop',
      slug: 'archive',
    },
    totalAmount: 12000,
    workflow: {
      allowedActions: ['confirm_collection', 'report'],
      deadline: { at: '2026-07-27T12:00:00.000Z', type: 'pickup_window' },
      nextActor: 'buyer',
      report: null,
      serverNow: '2026-07-24T12:00:00.000Z',
      settlementExplanation: 'Payment is held until collection is confirmed.',
    },
    ...overrides,
  }
}

describe('OrderDetailPage lifecycle actions', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/orders/order-12345678')
    // The waybill dialog persists its text fields to localStorage as a draft;
    // clear it so one test's in-progress upload never leaks into the next.
    window.localStorage.clear()
    orderMocks.order = makeOrder()
    orderMocks.apiGet.mockReset()
    orderMocks.userId = 'buyer-1'
    orderMocks.postOrderAction.mockReset()
    orderMocks.postOrderAction.mockResolvedValue({ order: orderMocks.order })
    orderMocks.refetchEvents.mockReset()
    orderMocks.refetchEvents.mockResolvedValue(undefined)
    orderMocks.refetchOrder.mockReset()
    orderMocks.refetchOrder.mockResolvedValue(undefined)
    useImagePreviewStore.getState().closePreview()
  })

  it('renders only server-authorized buyer actions and warns before releasing funds', async () => {
    const user = userEvent.setup()
    render(<ToastProvider><OrderDetailPage /></ToastProvider>)

    expect(screen.getByRole('button', { name: 'Confirm collection' })).toBeVisible()
    expect(screen.getByRole('link', { name: 'Report a problem' })).toHaveAttribute('href', '/orders/order-12345678/report')
    // Shop pickup genuinely has no delivery fee — this is the one case "Free" still applies.
    expect(screen.getByText('Free')).toBeVisible()
    expect(screen.queryByRole('button', { name: /accept order/i })).not.toBeInTheDocument()
    expect(screen.queryByText(/mark selected received/i)).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Confirm collection' }))
    expect(screen.getByRole('dialog', { name: 'Have you collected the complete order?' })).toHaveTextContent(/immediately releases the protected payment/i)
    await user.click(screen.getByRole('button', { name: 'Confirm & release funds' }))

    await waitFor(() => expect(orderMocks.postOrderAction).toHaveBeenCalledWith(
      'order-12345678',
      'confirm_collection',
      {},
      expect.stringContaining('order:order-12345678:confirm_collection:'),
    ))
  })

  it('requires a waybill image and sends it as multipart data', async () => {
    const user = userEvent.setup()
    orderMocks.userId = 'seller-1'
    orderMocks.order = makeOrder({
      delivery: {
        company: 'Intercity STC',
        destination: {
          recipientName: 'Ama Buyer',
          recipientPhone: '0240000000',
          region: 'Ashanti',
          town: 'Kumasi',
        },
        method: 'station_pickup',
      },
      fulfillmentStatus: 'awaiting_seller',
      workflow: {
        allowedActions: ['dispatch'],
        deadline: { at: '2026-07-27T12:00:00.000Z', type: 'seller_action' },
        nextActor: 'seller',
        report: null,
        serverNow: '2026-07-24T12:00:00.000Z',
        settlementExplanation: 'Payment is held.',
      },
    })

    render(<ToastProvider><OrderDetailPage /></ToastProvider>)
    await user.click(screen.getByRole('button', { name: 'Upload waybill & send' }))
    await user.click(screen.getByRole('button', { name: 'Review details' }))
    expect(screen.getAllByText('Add a clear image of the waybill.')[0]).toBeVisible()

    const bill = new File(['bill-image'], 'station-bill.png', { type: 'image/png' })
    await user.upload(screen.getByLabelText(/^Waybill/), bill)
    await user.type(screen.getByLabelText(/Driver phone number/), '+233 24 111 2222')
    await user.click(screen.getByRole('button', { name: 'Review details' }))
    expect(screen.getAllByText('Enter the bus number.')[0]).toBeVisible()
    expect(screen.getAllByText('Enter the amount to be paid, above zero.')[0]).toBeVisible()

    await user.type(screen.getByLabelText(/Bus number/), 'GT 1234-20')
    await user.type(screen.getByLabelText(/Amount to be paid/), '70.00')
    await user.click(screen.getByRole('button', { name: 'Review details' }))

    expect(screen.getByRole('dialog', { name: 'Review dispatch details' })).toHaveTextContent('Intercity STC')
    expect(screen.getByRole('dialog', { name: 'Review dispatch details' })).toHaveTextContent('GT 1234-20')
    expect(screen.getByRole('dialog', { name: 'Review dispatch details' })).toHaveTextContent('GHS 70.00')
    expect(orderMocks.postOrderAction).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Mark sent & notify buyer' }))

    await waitFor(() => expect(orderMocks.postOrderAction).toHaveBeenCalled())
    const [, action, body] = orderMocks.postOrderAction.mock.calls[0]
    expect(action).toBe('dispatch')
    expect(body).toBeInstanceOf(FormData)
    expect((body as FormData).get('billImage')).toBe(bill)
    expect((body as FormData).get('driverPhone')).toBe('0241112222')
    expect((body as FormData).get('busNumber')).toBe('GT 1234-20')
    expect((body as FormData).get('amount')).toBe('7000')
  }, 15_000)

  it('shows TBD for a station pickup awaiting dispatch, and the seller-reported amount once sent', () => {
    orderMocks.order = makeOrder({
      delivery: { method: 'station_pickup' },
      fulfillmentStatus: 'awaiting_seller',
    })
    const { rerender } = render(<ToastProvider><OrderDetailPage /></ToastProvider>)

    expect(screen.getByText('TBD')).toBeVisible()
    expect(screen.queryByText('Free')).not.toBeInTheDocument()

    orderMocks.order = makeOrder({
      delivery: {
        method: 'station_pickup',
        transit: { amount: 7000, driverPhone: '0241112222' },
      },
      fulfillmentStatus: 'in_transit',
    })
    rerender(<ToastProvider><OrderDetailPage /></ToastProvider>)

    expect(screen.getByText('GHS 70.00')).toBeVisible()
    expect(screen.queryByText('TBD')).not.toBeInTheDocument()
  })

  it('replaces the upload dropzone with a mini preview once a waybill image is chosen', async () => {
    const user = userEvent.setup()
    orderMocks.userId = 'seller-1'
    orderMocks.order = makeOrder({
      delivery: { company: 'Intercity STC', method: 'station_pickup' },
      fulfillmentStatus: 'awaiting_seller',
      workflow: {
        allowedActions: ['dispatch'],
        deadline: { at: '2026-07-27T12:00:00.000Z', type: 'seller_action' },
        nextActor: 'seller',
        report: null,
        serverNow: '2026-07-24T12:00:00.000Z',
        settlementExplanation: 'Payment is held.',
      },
    })

    render(<ToastProvider><OrderDetailPage /></ToastProvider>)
    await user.click(screen.getByRole('button', { name: 'Upload waybill & send' }))
    expect(screen.getByRole('button', { name: 'Choose image' })).toBeVisible()

    const bill = new File(['bill-image'], 'station-bill.png', { type: 'image/png' })
    await user.upload(screen.getByLabelText(/^Waybill/), bill)

    expect(screen.queryByRole('button', { name: 'Choose image' })).not.toBeInTheDocument()
    expect(screen.queryByText('Drop an image here')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Remove selected upload 1' })).toBeVisible()

    await user.click(screen.getByRole('button', { name: 'Remove selected upload 1' }))
    expect(screen.getByRole('button', { name: 'Choose image' })).toBeVisible()
  })

  it('clears the waybill selection when the dialog is cancelled, so reopening it starts blank', async () => {
    const user = userEvent.setup()
    orderMocks.userId = 'seller-1'
    orderMocks.order = makeOrder({
      delivery: { company: 'Intercity STC', method: 'station_pickup' },
      fulfillmentStatus: 'awaiting_seller',
      workflow: {
        allowedActions: ['dispatch'],
        deadline: { at: '2026-07-27T12:00:00.000Z', type: 'seller_action' },
        nextActor: 'seller',
        report: null,
        serverNow: '2026-07-24T12:00:00.000Z',
        settlementExplanation: 'Payment is held.',
      },
    })

    render(<ToastProvider><OrderDetailPage /></ToastProvider>)
    await user.click(screen.getByRole('button', { name: 'Upload waybill & send' }))

    const bill = new File(['bill-image'], 'station-bill.png', { type: 'image/png' })
    await user.upload(screen.getByLabelText(/^Waybill/), bill)
    await user.type(screen.getByLabelText(/Driver phone number/), '0241112222')
    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    await user.click(screen.getByRole('button', { name: 'Upload waybill & send' }))
    expect(screen.getByRole('button', { name: 'Choose image' })).toBeVisible()
    expect(screen.getByLabelText(/Driver phone number/)).toHaveValue('')
  })

  it('shows pickup coordination details and a direct route to the seller', () => {
    render(<ToastProvider><OrderDetailPage /></ToastProvider>)

    expect(screen.getByText('Osu, Greater Accra')).toBeVisible()
    expect(screen.getByRole('link', { name: '0241112222' })).toHaveAttribute('href', 'tel:0241112222')
    expect(screen.getByRole('link', { name: 'View seller shop' })).toHaveAttribute('href', '/shops/archive')
    expect(screen.getByRole('link', { name: 'Message seller' })).toHaveAttribute(
      'href',
      '/inbox?receiverId=seller-1',
    )
  })

  it('does not render an empty transit section before dispatch', () => {
    orderMocks.order = makeOrder({
      delivery: {
        destination: {
          recipientName: 'Ama Buyer',
          recipientPhone: '0240000000',
          region: 'Ashanti',
          town: 'Kumasi',
        },
        method: 'station_pickup',
        transit: {},
      },
      fulfillmentStatus: 'awaiting_seller',
      workflow: {
        allowedActions: [],
        deadline: null,
        nextActor: 'seller',
        report: null,
        serverNow: '2026-07-24T12:00:00.000Z',
        settlementExplanation: 'Payment is held.',
      },
    })

    render(<ToastProvider><OrderDetailPage /></ToastProvider>)

    expect(screen.queryByRole('heading', { name: 'Transit details' })).not.toBeInTheDocument()
  })

  it('sends a courier dispatch as a JSON tracking link, not a waybill upload', async () => {
    const user = userEvent.setup()
    orderMocks.userId = 'seller-1'
    orderMocks.order = makeOrder({
      delivery: {
        destination: {
          deliveryAddress: '12 Ring Road',
          recipientName: 'Ama Buyer',
          recipientPhone: '0240000000',
          region: 'Greater Accra',
          town: 'Accra',
        },
        method: 'intra_city_courier',
        provider: 'bolt_send',
      },
      fulfillmentStatus: 'awaiting_seller',
      workflow: {
        allowedActions: ['dispatchCourier'],
        deadline: { at: '2026-07-27T12:00:00.000Z', type: 'seller_action' },
        nextActor: 'seller',
        report: null,
        serverNow: '2026-07-24T12:00:00.000Z',
        settlementExplanation: 'Payment is held.',
      },
    })

    render(<ToastProvider><OrderDetailPage /></ToastProvider>)
    await user.click(screen.getByRole('button', { name: 'Add tracking link & send' }))
    await user.click(screen.getByRole('button', { name: 'Send & notify buyer' }))
    expect(screen.getAllByText(/valid tracking link/i)[0]).toBeVisible()
    expect(orderMocks.postOrderAction).not.toHaveBeenCalled()

    await user.type(screen.getByLabelText(/Tracking link/), 'https://track.bolt.eu/abc123')
    await user.click(screen.getByRole('button', { name: 'Send & notify buyer' }))

    await waitFor(() => expect(orderMocks.postOrderAction).toHaveBeenCalledWith(
      'order-12345678',
      'dispatchCourier',
      { trackingLink: 'https://track.bolt.eu/abc123' },
      expect.stringContaining('order:order-12345678:dispatchCourier:'),
    ))
  })

  it('shows the buyer a tracking link and the provider-specific notice', () => {
    orderMocks.order = makeOrder({
      delivery: {
        destination: { region: 'Greater Accra', town: 'Accra' },
        method: 'intra_city_courier',
        provider: 'yango_delivery',
        trackingLink: 'https://track.yango.com/xyz',
      },
      fulfillmentStatus: 'in_transit',
    })

    render(<ToastProvider><OrderDetailPage /></ToastProvider>)

    expect(screen.getByRole('link', { name: 'Open tracking link' })).toHaveAttribute('href', 'https://track.yango.com/xyz')
    expect(screen.getByText(/Yango will send you SMS updates directly/)).toBeVisible()
  })

  it('keeps an active report reachable after reporting freezes all actions', () => {
    orderMocks.order = makeOrder({
      activeReportId: 'report-1',
      workflow: {
        allowedActions: [],
        deadline: null,
        nextActor: 'review',
        report: { active: true, id: 'report-1', status: 'submitted' },
        serverNow: '2026-07-24T12:00:00.000Z',
        settlementExplanation: 'Settlement is frozen.',
      },
    })

    render(<ToastProvider><OrderDetailPage /></ToastProvider>)

    expect(screen.getByRole('link', { name: 'View submitted report' })).toHaveAttribute(
      'href',
      '/orders/order-12345678/report',
    )
  })

  it('opens the private waybill in the Zustand preview and closes it with X or backdrop', async () => {
    const user = userEvent.setup()
    orderMocks.order = makeOrder({
      delivery: {
        company: 'Intercity STC',
        method: 'station_pickup',
        transit: {
          billImage: { originalName: 'waybill.png' },
        },
      },
      fulfillmentStatus: 'in_transit',
    })
    orderMocks.apiGet.mockResolvedValue({ url: 'https://private.example/waybill.png' })

    render(<ToastProvider><OrderDetailPage /><ImagePreviewModal /></ToastProvider>)
    await user.click(screen.getByRole('button', { name: 'View private waybill' }))

    expect(orderMocks.apiGet).toHaveBeenCalledWith('/orders/order-12345678/attachments/transit-bill')
    await screen.findByRole('dialog', { name: 'Private waybill for order 12345678' })
    expect(screen.getByRole('img', { name: 'Private waybill for order 12345678' })).toHaveAttribute(
      'src',
      'https://private.example/waybill.png',
    )

    await user.click(screen.getByRole('button', { name: 'Close preview' }))
    expect(screen.queryByRole('dialog', { name: 'Private waybill for order 12345678' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'View private waybill' }))
    await user.click(await screen.findByRole('dialog', { name: 'Private waybill for order 12345678' }))
    expect(screen.queryByRole('dialog', { name: 'Private waybill for order 12345678' })).not.toBeInTheDocument()
  })
})
