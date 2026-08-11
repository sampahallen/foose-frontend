import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { FaInfoCircle } from 'react-icons/fa'
import {
  AppShell,
  ConfirmDialog,
  Dialog,
  ErrorSummary,
  Icon,
  ImagePreviewInput,
  InlineNotice,
  OrderCountdown,
  OrderStatusBadge,
  OrderTimeline,
  SafeImage,
  StatePanel,
  SubmitButton,
  TextField,
  useToast,
} from '../components'
import { OrderDetailSkeleton } from '../components/operational/OperationalStates'
import { NavigationBackButton } from '../components/navigation'
import { clearDraftImages, loadDraftImages, saveDraftImages } from '../components/forms/draftImageStore'
import { useLocalDraft } from '../components/forms/useLocalDraft'
import { useAuth } from '../hooks/useAuth'
import { useApiResource } from '../hooks/useApiResource'
import { useOrderAutoRefresh } from '../hooks/useOrderAutoRefresh'
import { useOrderRealtimeRefresh } from '../hooks/useOrderRealtimeRefresh'
import { ApiError, apiGet } from '../lib/api'
import { createOrderIdempotencyKey, postOrderAction } from '../lib/orderActions'
import { useImagePreviewStore } from '../stores/imagePreviewStore'
import type { Listing, Order, OrderAllowedAction, OrderEvent, User } from '../types/api'
import { formatDateTime, formatMoney, getListingImage, parseGhsToPesewas } from '../utils/format'
import { normalizePhone } from '../utils/formValidation'
import {
  deliveryMethodLabel,
  orderActionCopy,
  orderAddress,
  orderAllowedActions,
  orderDeadlineLabel,
  orderDeliveryFee,
  orderNextStep,
  orderRecipient,
  orderSettlementLabel,
  orderTitle,
  participantContact,
  participantName,
  type OrderViewer,
} from '../utils/orderStatus'
import { getCurrentAppPathname, withBasePath } from '../utils/navigation'

type OrderEventsResponse = {
  events: OrderEvent[]
  hasMore?: boolean
  nextCursor?: string | null
}

function orderIdFromPath() {
  const match = getCurrentAppPathname().match(/^\/orders\/([^/]+)/)
  return match ? decodeURIComponent(match[1]).trim() : ''
}

function idValue(value: User | string | undefined) {
  if (!value) return ''
  return typeof value === 'string' ? value : value._id
}

function shopName(order: Order) {
  if (!order.shopId || typeof order.shopId === 'string') return 'Seller'
  return order.shopId.shopName || 'Seller'
}

function shopLocation(order: Order) {
  if (!order.shopId || typeof order.shopId === 'string') return ''
  return [order.shopId.location?.city, order.shopId.location?.region].filter(Boolean).join(', ')
}

function shopOwner(order: Order) {
  if (!order.shopId || typeof order.shopId === 'string') return undefined
  return order.shopId.ownerId && typeof order.shopId.ownerId === 'object'
    ? order.shopId.ownerId
    : undefined
}

function listingFromLine(item: Order['items'][number]): Listing | undefined {
  return item.listingId && typeof item.listingId === 'object' ? item.listingId : undefined
}

function itemImage(item: Order['items'][number]) {
  const listing = listingFromLine(item)
  return listing ? getListingImage(listing) : undefined
}

function itemId(item: Order['items'][number], index: number) {
  if (item._id) return item._id
  if (typeof item.listingId === 'string') return item.listingId
  return item.listingId?._id || String(index)
}

const COURIER_PROVIDER_COPY: Record<string, { name: string; notice: string }> = {
  bolt_send: { name: 'Bolt Send', notice: 'Track your delivery in real-time via the link above.' },
  shaq_express: { name: 'ShaQ Express', notice: 'Track your ShaQ Express delivery via the link above.' },
  yango_delivery: { name: 'Yango Delivery', notice: 'Yango will send you SMS updates directly. You can also track via the link above.' },
}

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  if (!value) return null
  return (
    <div className="flex items-start justify-between gap-4 py-2.5 text-sm">
      <dt className="shrink-0 text-foose-muted">{label}</dt>
      <dd className="max-w-[65%] break-words text-right font-semibold text-foose-text">{value}</dd>
    </div>
  )
}

function actionMessage(action: Exclude<OrderAllowedAction, 'report' | 'dispatch' | 'dispatchCourier'>) {
  const messages: Record<typeof action, string> = {
    cancel_cash_pickup: 'The pickup request was cancelled and its inventory was restored.',
    mark_pickup_ready: 'The buyer was notified and their 72-hour collection window has started.',
    complete_cash_pickup: 'The cash pickup is complete.',
    release_unclaimed_pickup: 'The unclaimed items are available in inventory again.',
    confirm_collection: 'Collection was confirmed and payment was released to the seller.',
    confirm_receipt: 'Receipt was confirmed and payment was released to the seller.',
    close_no_action: 'The order was closed and a full refund was requested.',
  }
  return messages[action]
}

function OrderDetailContent({ orderId }: { orderId: string }) {
  const { showToast } = useToast()
  const { user } = useAuth()
  const orderResource = useApiResource<{ events?: OrderEvent[]; order: Order }>(
    orderId ? `/orders/${encodeURIComponent(orderId)}` : null,
    Boolean(orderId),
  )
  const eventsResource = useApiResource<OrderEventsResponse>(
    orderId ? `/orders/${encodeURIComponent(orderId)}/events?limit=50` : null,
    Boolean(orderId),
  )
  const order = orderResource.data?.order
  const viewer: OrderViewer = order && user?._id && idValue(order.buyerId) === user._id ? 'buyer' : 'seller'
  const sellerMode = viewer === 'seller'
  const allowedActions = order ? orderAllowedActions(order) : []
  const [actionId, setActionId] = useState<OrderAllowedAction | ''>('')
  const [actionError, setActionError] = useState('')
  const [pendingConfirmation, setPendingConfirmation] = useState<Exclude<OrderAllowedAction, 'report' | 'dispatch' | 'dispatchCourier'> | null>(null)
  const [selectedItem, setSelectedItem] = useState<Order['items'][number] | null>(null)
  const [dispatchOpen, setDispatchOpen] = useState(false)
  const [courierDispatchOpen, setCourierDispatchOpen] = useState(false)
  const [trackingLinkValue, setTrackingLinkValue] = useState('')
  const [trackingLinkAttempted, setTrackingLinkAttempted] = useState(false)
  const [billImage, setBillImage] = useState<File | null>(null)
  const [billPreviewUrl, setBillPreviewUrl] = useState('')
  const [driverPhone, setDriverPhone] = useState('')
  const [busNumber, setBusNumber] = useState('')
  const [amountValue, setAmountValue] = useState('')
  const [dispatchAttempted, setDispatchAttempted] = useState(false)
  const [dispatchReviewing, setDispatchReviewing] = useState(false)
  const [billLoading, setBillLoading] = useState(false)
  const [additionalEvents, setAdditionalEvents] = useState<OrderEvent[]>([])
  const [nextEventsCursor, setNextEventsCursor] = useState<string | null | undefined>(undefined)
  const [eventsLoadingMore, setEventsLoadingMore] = useState(false)
  const openImagePreview = useImagePreviewStore((state) => state.openPreview)
  const actionKeysRef = useRef(new Map<OrderAllowedAction, string>())
  const billReadRevisionRef = useRef(0)
  const dispatchDraftResumedRef = useRef(false)
  // The waybill image itself lives in IndexedDB (see draftImageStore), keyed by
  // the same storageKey as this text draft, so a refresh mid-upload does not
  // lose either. orderId is read straight from the URL, so the key is stable
  // before the order document has finished loading.
  const dispatchDraftValue = useMemo(
    () => ({ amountValue, busNumber, driverPhone }),
    [amountValue, busNumber, driverPhone],
  )
  const dispatchDraft = useLocalDraft({
    enabled: Boolean(orderId),
    formId: 'order-dispatch',
    onRestore: (saved) => {
      if (typeof saved.driverPhone === 'string') setDriverPhone(saved.driverPhone)
      if (typeof saved.busNumber === 'string') setBusNumber(saved.busNumber)
      if (typeof saved.amountValue === 'string') setAmountValue(saved.amountValue)
    },
    resourceId: orderId,
    userId: user?._id,
    value: dispatchDraftValue,
  })
  const visibleEvents = useMemo(() => {
    const initial = eventsResource.data?.events || orderResource.data?.events || order?.events || []
    return Array.from(new Map(
      [...initial, ...additionalEvents].map((event, index) => [
        event._id || `${event.eventType || event.type || 'event'}:${event.createdAt}:${index}`,
        event,
      ]),
    ).values())
  }, [additionalEvents, eventsResource.data?.events, order?.events, orderResource.data?.events])
  const eventsCursor = nextEventsCursor === undefined ? eventsResource.data?.nextCursor : nextEventsCursor

  useOrderAutoRefresh(
    async () => {
      await Promise.all([orderResource.refetch(), eventsResource.refetch()])
    },
    Boolean(order),
  )
  useOrderRealtimeRefresh(
    async () => {
      await Promise.all([orderResource.refetch(), eventsResource.refetch()])
    },
    Boolean(order),
    orderId,
  )

  // Resume an in-progress waybill upload after a refresh. Runs once: an image
  // in storage is what makes the draft meaningful, so a text-only leftover
  // (e.g. from a much older visit whose image already expired) is discarded
  // rather than reopening an empty dialog.
  useEffect(() => {
    if (dispatchDraftResumedRef.current || !dispatchDraft.hasRecoverableDraft) return
    dispatchDraftResumedRef.current = true
    void loadDraftImages(dispatchDraft.storageKey).then((files) => {
      if (!files.length) {
        dispatchDraft.discardDraft()
        return
      }
      dispatchDraft.resumeDraft()
      updateBillImage(files)
      setDispatchOpen(true)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once per mount, keyed on the draft becoming available
  }, [dispatchDraft.hasRecoverableDraft])

  async function refreshOrder() {
    await Promise.all([orderResource.refetch(), eventsResource.refetch()])
  }

  async function loadMoreEvents() {
    if (!order || !eventsCursor || eventsLoadingMore) return
    setEventsLoadingMore(true)
    try {
      const response = await apiGet<OrderEventsResponse>(
        `/orders/${encodeURIComponent(order._id)}/events?limit=50&cursor=${encodeURIComponent(eventsCursor)}`,
      )
      setAdditionalEvents((current) => {
        const existing = new Set(current.map((event) => event._id).filter(Boolean))
        return [...current, ...(response.events || []).filter((event) => !event._id || !existing.has(event._id))]
      })
      setNextEventsCursor(response.nextCursor || null)
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Unable to load older order activity')
    } finally {
      setEventsLoadingMore(false)
    }
  }

  async function executeAction(action: Exclude<OrderAllowedAction, 'report' | 'dispatch' | 'dispatchCourier'>) {
    if (!order) return
    setActionId(action)
    setActionError('')
    try {
      const idempotencyKey = actionKeysRef.current.get(action) || createOrderIdempotencyKey(order._id, action)
      actionKeysRef.current.set(action, idempotencyKey)
      await postOrderAction(order._id, action, {}, idempotencyKey)
      actionKeysRef.current.delete(action)
      await refreshOrder()
      setPendingConfirmation(null)
      showToast({ message: actionMessage(action), title: 'Order updated', tone: 'success' })
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Unable to update this order')
      setPendingConfirmation(null)
      if (error instanceof ApiError && [409, 410].includes(error.status)) {
        await refreshOrder()
        showToast({
          message: 'Someone else updated this order first. The latest available actions are now shown.',
          title: 'Order changed',
          tone: 'info',
        })
      }
    } finally {
      setActionId('')
    }
  }

  function reviewDispatch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!order) return
    setDispatchAttempted(true)
    const amountPesewas = parseGhsToPesewas(amountValue)
    if (!billImage || !/^0\d{9}$/.test(normalizePhone(driverPhone)) || !busNumber.trim() || amountPesewas === null || amountPesewas <= 0) {
      return
    }
    setActionError('')
    setDispatchReviewing(true)
  }

  function updateBillImage(files: File[]) {
    const file = files[0] || null
    billReadRevisionRef.current += 1
    const revision = billReadRevisionRef.current
    setBillImage(file)
    setBillPreviewUrl('')
    // Removing the image (files === []) clears the persisted copy too, since
    // saveDraftImages treats an empty list as a delete.
    void saveDraftImages(dispatchDraft.storageKey, files)
    if (!file) return
    const reader = new FileReader()
    reader.addEventListener('load', () => {
      if (billReadRevisionRef.current === revision && typeof reader.result === 'string') {
        setBillPreviewUrl(reader.result)
      }
    }, { once: true })
    reader.readAsDataURL(file)
  }

  // The waybill dialog is fully abandoned: clear both the text draft and the
  // persisted image so reopening it — this session or after a refresh —
  // starts blank.
  function exitDispatchDialog() {
    setDispatchOpen(false)
    setDispatchReviewing(false)
    setDispatchAttempted(false)
    setBillImage(null)
    setBillPreviewUrl('')
    billReadRevisionRef.current += 1
    setDriverPhone('')
    setBusNumber('')
    setAmountValue('')
    dispatchDraft.clearDraft()
    void clearDraftImages(dispatchDraft.storageKey)
  }

  async function confirmDispatch() {
    const normalizedDriverPhone = normalizePhone(driverPhone)
    const amountPesewas = parseGhsToPesewas(amountValue)
    if (!order || !billImage || !/^0\d{9}$/.test(normalizedDriverPhone) || !busNumber.trim() || amountPesewas === null || amountPesewas <= 0) {
      return
    }
    const body = new FormData()
    body.set('billImage', billImage)
    body.set('driverPhone', normalizedDriverPhone)
    body.set('busNumber', busNumber.trim())
    body.set('amount', String(amountPesewas))

    setActionId('dispatch')
    setActionError('')
    try {
      const idempotencyKey = actionKeysRef.current.get('dispatch') || createOrderIdempotencyKey(order._id, 'dispatch')
      actionKeysRef.current.set('dispatch', idempotencyKey)
      await postOrderAction(order._id, 'dispatch', body, idempotencyKey)
      actionKeysRef.current.delete('dispatch')
      await refreshOrder()
      exitDispatchDialog()
      showToast({
        message: 'The buyer can now see the waybill and delivery release window.',
        title: 'Order marked as sent',
        tone: 'success',
      })
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Unable to send the waybill')
      if (error instanceof ApiError && [409, 410].includes(error.status)) {
        exitDispatchDialog()
        await refreshOrder()
        showToast({
          message: 'Someone else updated this order first. The latest order state is now shown.',
          title: 'Order changed',
          tone: 'info',
        })
      }
    } finally {
      setActionId('')
    }
  }

  function exitCourierDispatchDialog() {
    setCourierDispatchOpen(false)
    setTrackingLinkAttempted(false)
    setTrackingLinkValue('')
  }

  async function confirmCourierDispatch() {
    if (!order) return
    setTrackingLinkAttempted(true)
    const trackingLink = trackingLinkValue.trim()
    if (!trackingLink || !/^https?:\/\//i.test(trackingLink)) return

    setActionId('dispatchCourier')
    setActionError('')
    try {
      const idempotencyKey = actionKeysRef.current.get('dispatchCourier') || createOrderIdempotencyKey(order._id, 'dispatchCourier')
      actionKeysRef.current.set('dispatchCourier', idempotencyKey)
      await postOrderAction(order._id, 'dispatchCourier', { trackingLink }, idempotencyKey)
      actionKeysRef.current.delete('dispatchCourier')
      await refreshOrder()
      exitCourierDispatchDialog()
      showToast({
        message: 'The buyer can now see the tracking link and delivery release window.',
        title: 'Order marked as sent',
        tone: 'success',
      })
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Unable to save the tracking link')
      if (error instanceof ApiError && [409, 410].includes(error.status)) {
        exitCourierDispatchDialog()
        await refreshOrder()
        showToast({
          message: 'Someone else updated this order first. The latest order state is now shown.',
          title: 'Order changed',
          tone: 'info',
        })
      }
    } finally {
      setActionId('')
    }
  }

  async function openTransitBill() {
    if (!order || billLoading) return
    setBillLoading(true)
    setActionError('')
    try {
      const attachment = await apiGet<{ signedUrl?: string; url?: string }>(
        `/orders/${encodeURIComponent(order._id)}/attachments/transit-bill`,
      )
      const url = attachment.signedUrl || attachment.url
      if (!url) throw new Error('The private bill link could not be created')
      openImagePreview([
        {
          alt: `Private waybill for order ${order._id.slice(-8).toUpperCase()}`,
          src: url,
          type: 'image',
        },
      ])
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Unable to open the private bus bill')
    } finally {
      setBillLoading(false)
    }
  }

  function actionButton(action: OrderAllowedAction, primary: boolean) {
    const copy = orderActionCopy(action)
    const base = primary
      ? 'border-accent bg-accent text-white shadow-md shadow-accent/15 hover:bg-accent-hover focus-visible:outline-accent'
      : action === 'report' || copy.tone === 'destructive'
        ? 'border-foose-danger/35 bg-foose-surface text-foose-danger hover:bg-foose-danger-bg focus-visible:outline-foose-danger'
        : 'border-foose-border bg-foose-surface text-foose-text hover:border-accent hover:text-accent focus-visible:outline-accent'

    if (action === 'report') {
      return (
        <a
          className={`inline-flex min-h-12 w-full items-center justify-center rounded-xl border px-5 text-sm font-black transition focus-visible:outline-2 focus-visible:outline-offset-2 sm:w-auto ${base}`}
          href={withBasePath(`/orders/${orderId}/report`)}
          key={action}
        >
          {copy.label}
        </a>
      )
    }

    return (
      <button
        className={`inline-flex min-h-12 w-full items-center justify-center rounded-xl border px-5 text-sm font-black transition focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto ${base}`}
        disabled={Boolean(actionId)}
        key={action}
        onClick={() => {
          if (action === 'dispatch') {
            setDispatchOpen(true)
            setDispatchReviewing(false)
            setDispatchAttempted(false)
            setActionError('')
          } else if (action === 'dispatchCourier') {
            setCourierDispatchOpen(true)
            setTrackingLinkAttempted(false)
            setActionError('')
          } else {
            setPendingConfirmation(action)
          }
        }}
        type="button"
      >
        {actionId === action ? copy.busyLabel : copy.label}
      </button>
    )
  }

  const deadline = order?.workflow?.deadline
  const cashSettlement = order?.paymentMethod === 'cash_on_pickup' || order?.settlementStatus === 'cash_due'
  const escrowHeading = order ? (cashSettlement ? 'Pay at pickup' : orderSettlementLabel(order.settlementStatus, order.paymentMethod)) : ''
  const transit = order?.delivery?.transit
  const company = order?.delivery?.company || transit?.serviceName || transit?.transitServiceName
  const transitAvailable = Boolean(
    company
    || transit?.driverPhone
    || transit?.billImage,
  )
  const billAvailable = Boolean(transit?.billImage)
  const normalizedDriverPhone = normalizePhone(driverPhone)
  const driverPhoneInvalid = dispatchAttempted && !/^0\d{9}$/.test(normalizedDriverPhone)
  const busNumberInvalid = dispatchAttempted && !busNumber.trim()
  const amountPesewas = parseGhsToPesewas(amountValue)
  const amountInvalid = dispatchAttempted && (amountPesewas === null || amountPesewas <= 0)
  const confirmCopy = pendingConfirmation ? orderActionCopy(pendingConfirmation) : null
  const deliveryFeeAmount = order ? orderDeliveryFee(order) : null
  const isCourierMethod = order?.delivery?.method === 'intra_city_courier' || order?.delivery?.method === 'inter_city_courier'
  const courierProvider = order?.delivery?.provider ? COURIER_PROVIDER_COPY[order.delivery.provider] : undefined
  const trackingLinkInvalid = trackingLinkAttempted && !/^https?:\/\//i.test(trackingLinkValue.trim())

  return (
    <AppShell active={sellerMode ? 'shop' : 'profile'} searchPlaceholder="Search orders…" showFooter={false}>
      <NavigationBackButton
        className="mb-5"
        fallback={sellerMode
          ? { href: '/manage-shop/orders', label: 'Seller orders' }
          : { href: '/orders', label: 'Your orders' }}
      />

      {!orderId && (
        <StatePanel
          action={<a className="button inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border px-5 py-2.5 text-center text-sm font-bold transition disabled:pointer-events-none disabled:opacity-50 [&.full]:w-full button-secondary border-foose-border bg-foose-surface text-foose-text hover:border-accent hover:text-accent" href={withBasePath('/orders')}>View orders</a>}
          body="This order link is missing an order id."
          layout="page"
          title="Order unavailable"
          tone="unavailable"
        />
      )}
      {orderResource.initialLoading && <OrderDetailSkeleton />}
      {orderResource.error && !orderResource.data && (
        <StatePanel
          action={<button className="button inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border px-5 py-2.5 text-center text-sm font-bold transition disabled:pointer-events-none disabled:opacity-50 [&.full]:w-full button-secondary border-foose-border bg-foose-surface text-foose-text hover:border-accent hover:text-accent" onClick={() => void orderResource.refetch()} type="button">Retry</button>}
          body={orderResource.error}
          layout="page"
          title="Order unavailable"
          tone="unavailable"
        />
      )}

      {order && (
        <div className="mx-auto max-w-3xl space-y-5 pb-28 sm:pb-10">
          <header className="rounded-2xl border border-foose-border bg-foose-surface p-5 shadow-sm sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
                  <OrderStatusBadge order={order} />
                  <span className="text-[11px] font-semibold text-foose-faint">{deliveryMethodLabel(order.delivery?.method)}</span>
                </div>
                <p className="text-xs font-bold uppercase tracking-wide text-foose-faint">Order #{order._id.slice(-8).toUpperCase()}</p>
                <h1 className="mt-1 font-display text-2xl font-semibold leading-tight text-foose-text sm:text-3xl">{orderTitle(order)}</h1>
                <p className="mt-1.5 text-sm text-foose-muted">{order.createdAt ? `Placed ${formatDateTime(order.createdAt)}` : 'Order date pending'}</p>
              </div>
              <div className="shrink-0 sm:text-right">
                <strong className="block font-display text-2xl font-semibold text-accent">{formatMoney(order.totalAmount, order.currency)}</strong>
                <p className="mt-1.5 flex items-center gap-1.5 text-xs font-bold text-accent sm:justify-end">
                  <Icon name={cashSettlement ? 'money' : 'shield'} size={14} />
                  {escrowHeading}
                </p>
                <p className="mt-0.5 text-xs font-semibold text-foose-faint">{order.paymentMethod === 'cash_on_pickup' ? 'Cash on pickup' : 'Online payment'}</p>
              </div>
            </div>

            <div className="mt-5 rounded-xl bg-accent-light/60 p-4">
              <p className="text-xs font-black uppercase tracking-wide text-accent">
                {[viewer, 'buyer_or_seller'].includes(order.workflow?.nextActor || '') ? 'Your next step' : 'What happens next'}
              </p>
              <p className="mt-1.5 text-base font-semibold leading-6 text-foose-text">{orderNextStep(order, viewer)}</p>
              {deadline?.at && (
                <>
                  <div className="mt-3 flex flex-col gap-1 border-t border-accent/15 pt-3 sm:flex-row sm:items-center sm:justify-between">
                    <span className="text-sm font-bold text-foose-muted">{orderDeadlineLabel(deadline.type)} · {formatDateTime(deadline.at)}</span>
                    <OrderCountdown at={deadline.at} className="text-sm" serverNow={order.workflow?.serverNow} />
                  </div>
                  {deadline.consequence && <p className="mt-1.5 text-sm leading-6 text-foose-muted">{deadline.consequence}</p>}
                </>
              )}
            </div>
          </header>

          {actionError && <InlineNotice title="Order was not updated" tone="error">{actionError}</InlineNotice>}
          {order.workflow?.report?.active && (
            <InlineNotice title="Funds frozen — awaiting review" tone="warning">
              <span>Automatic settlement is paused. The submitted report is read-only, and no deadline can release funds while it remains active.</span>{' '}
              <a className="font-black text-accent underline underline-offset-2" href={withBasePath(`/orders/${order._id}/report`)}>
                View submitted report
              </a>
            </InlineNotice>
          )}
          {order.reportResolution?.awardedTo && (
            <InlineNotice title="Order report resolved" tone="success">
              Foose settled this report for the {order.reportResolution.awardedTo}. {order.workflow?.settlementExplanation}
            </InlineNotice>
          )}
          {order.settlementStatus === 'refund_attention' && (
            <InlineNotice title="Refund needs attention" tone="error">
              The payment provider needs additional action. Your order remains financially unresolved; Foose support has been notified.
            </InlineNotice>
          )}
          {order.settlementStatus === 'refund_failed' && (
            <InlineNotice title="Refund was not completed" tone="error">
              No wallet credit was substituted. Foose support has been notified to continue the original-payment refund.
            </InlineNotice>
          )}

          <section className="rounded-2xl border border-foose-border bg-foose-surface p-4 shadow-sm sm:p-6">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="font-display text-lg font-semibold text-foose-text">Order contents</h2>
              <span className="text-xs font-bold text-foose-faint">{order.items.length} {order.items.length === 1 ? 'item' : 'items'}</span>
            </div>
            <div className="divide-y divide-foose-border overflow-hidden rounded-xl border border-foose-border">
              {order.items.map((item, index) => (
                <button
                  className="flex min-w-0 w-full items-center gap-3 bg-foose-surface p-3 text-left transition hover:bg-accent-light/30 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent sm:p-4"
                  key={itemId(item, index)}
                  onClick={() => setSelectedItem(item)}
                  type="button"
                >
                  <SafeImage
                    alt=""
                    className="size-14 shrink-0 rounded-xl object-cover sm:size-16"
                    fallback="No image"
                    fallbackClassName="text-[9px] font-bold"
                    src={itemImage(item)}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-black text-foose-text sm:text-base">{item.title}</span>
                    <span className="mt-1 block text-xs font-semibold text-foose-muted">Quantity {item.quantity} · {formatMoney(item.price, order.currency)} each</span>
                  </span>
                  <strong className="shrink-0 text-sm font-black text-accent">{formatMoney(item.price * item.quantity, order.currency)}</strong>
                </button>
              ))}
            </div>
            <dl className="mt-4 space-y-1.5 text-sm">
              <div className="flex items-center justify-between text-foose-muted"><dt>Items</dt><dd className="font-bold text-foose-text">{formatMoney(order.subtotalAmount ?? order.totalAmount - (order.deliveryFee || 0), order.currency)}</dd></div>
              <div className="flex items-center justify-between text-foose-muted"><dt>Delivery</dt><dd className="font-bold text-foose-text">{deliveryFeeAmount === null ? 'TBD' : deliveryFeeAmount ? formatMoney(deliveryFeeAmount, order.currency) : 'Free'}</dd></div>
              <div className="flex items-center justify-between border-t border-foose-border pt-2 text-base"><dt className="font-black text-foose-text">Total</dt><dd className="font-black text-accent">{formatMoney(order.totalAmount, order.currency)}</dd></div>
            </dl>
          </section>

          <section className="rounded-2xl border border-foose-border bg-foose-surface p-4 shadow-sm sm:p-6">
            <h2 className="mb-1 font-display text-lg font-semibold text-foose-text">{order.delivery?.method === 'shop_pickup' ? 'Pickup details' : 'Delivery details'}</h2>
            <dl className="divide-y divide-foose-border">
              <DetailRow label={sellerMode ? 'Buyer' : 'Seller'} value={sellerMode ? participantName(order.buyerId, 'Buyer') : shopName(order)} />
              {sellerMode && (
                <DetailRow label="Buyer contact" value={participantContact(order.buyerId) || orderRecipient(order) || 'Not provided'} />
              )}
              {order.delivery?.method !== 'shop_pickup' && (
                <>
                  <DetailRow label="Recipient" value={orderRecipient(order) || 'Recipient details pending'} />
                  <DetailRow label="Destination" value={orderAddress(order) || 'Destination pending'} />
                </>
              )}
              {order.delivery?.method === 'shop_pickup' && (
                <DetailRow label="Pickup location" value={orderAddress(order) || shopLocation(order) || 'Collect from the seller’s shop'} />
              )}
              {order.delivery?.method === 'shop_pickup' && !sellerMode && (
                <DetailRow
                  label="Seller contact"
                  value={shopOwner(order)?.phone
                    ? <a className="text-accent underline underline-offset-2" href={`tel:${shopOwner(order)?.phone}`}>{shopOwner(order)?.phone}</a>
                    : participantContact(shopOwner(order)) || 'Message the seller to coordinate collection'}
                />
              )}
              {transitAvailable && transit && (
                <>
                  <DetailRow label="Company" value={company || 'Not provided'} />
                  <DetailRow label="Driver phone" value={transit.driverPhone || 'Not provided'} />
                  {transit.busNumber && <DetailRow label="Bus number" value={transit.busNumber} />}
                </>
              )}
              {isCourierMethod && (
                <>
                  <DetailRow label="Delivery provider" value={courierProvider?.name || order?.delivery?.provider || 'Not provided'} />
                  <DetailRow
                    label="Tracking"
                    value={order?.delivery?.trackingLink
                      ? <a className="text-accent underline underline-offset-2" href={order.delivery.trackingLink} rel="noreferrer" target="_blank">Open tracking link</a>
                      : sellerMode ? 'Add a tracking link when you mark this order as sent' : 'Tracking link pending'}
                  />
                </>
              )}
            </dl>

            {isCourierMethod && !sellerMode && order.delivery?.trackingLink && courierProvider && (
              <InlineNotice className="mt-4" tone="info">{courierProvider.notice}</InlineNotice>
            )}

            {order.delivery?.method === 'shop_pickup' && !sellerMode && typeof order.shopId === 'object' && (
              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                {order.shopId.slug && (
                  <a className="inline-flex min-h-11 items-center justify-center rounded-xl border border-foose-border bg-foose-surface px-4 text-sm font-black text-foose-text hover:border-accent hover:text-accent sm:flex-1" href={withBasePath(`/shops/${order.shopId.slug}`)}>
                    View seller shop
                  </a>
                )}
                {shopOwner(order)?._id && (
                  <a className="inline-flex min-h-11 items-center justify-center rounded-xl border border-accent bg-accent px-4 text-sm font-black text-white hover:bg-accent-hover sm:flex-1" href={withBasePath(`/inbox?receiverId=${encodeURIComponent(shopOwner(order)?._id || '')}`)}>
                    Message seller
                  </a>
                )}
              </div>
            )}

            {billAvailable && (
              <button
                className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-foose-border bg-foose-surface px-4 text-sm font-black text-accent transition hover:border-accent hover:bg-accent-light disabled:opacity-60 sm:w-auto"
                disabled={billLoading}
                onClick={() => void openTransitBill()}
                type="button"
              >
                {billLoading ? 'Creating private link…' : 'View private waybill'}
              </button>
            )}
          </section>

          <section className="rounded-2xl border border-foose-border bg-foose-surface p-4 shadow-sm sm:p-6">
            <h2 className="mb-3 font-display text-lg font-semibold text-foose-text">Order timeline</h2>
            {eventsResource.error && <InlineNotice tone="warning">Live activity could not refresh. The saved order timestamps are shown instead.</InlineNotice>}
            <OrderTimeline events={visibleEvents} fallbackOrder={order} />
            {eventsCursor && (
              <button
                className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-foose-border bg-foose-surface px-4 text-sm font-black text-foose-text transition hover:border-accent hover:text-accent disabled:opacity-60 sm:w-auto"
                disabled={eventsLoadingMore}
                onClick={() => void loadMoreEvents()}
                type="button"
              >
                {eventsLoadingMore ? 'Loading more activity…' : 'Load more activity'}
              </button>
            )}
          </section>

          {allowedActions.length > 0 && (
            <section
              aria-label="Available order actions"
              className="fixed inset-x-0 bottom-0 z-30 border-t border-foose-border bg-foose-surface/95 px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 shadow-[0_-10px_30px_rgba(15,23,42,0.08)] backdrop-blur sm:static sm:flex sm:flex-wrap sm:items-center sm:justify-end sm:gap-2 sm:rounded-2xl sm:border sm:p-4 sm:shadow-sm"
            >
              <div className="mx-auto flex max-w-3xl flex-col-reverse gap-2 sm:mx-0 sm:flex-row sm:flex-wrap sm:justify-end">
                {allowedActions.map((action, index) => actionButton(action, index === 0))}
              </div>
            </section>
          )}
        </div>
      )}

      <ConfirmDialog
        busy={Boolean(pendingConfirmation && actionId === pendingConfirmation)}
        confirmLabel={confirmCopy?.confirmLabel || 'Confirm'}
        description={confirmCopy?.confirmDescription || 'Confirm this order action.'}
        onCancel={() => {
          if (!actionId) setPendingConfirmation(null)
        }}
        onConfirm={() => {
          if (pendingConfirmation) void executeAction(pendingConfirmation)
        }}
        open={Boolean(pendingConfirmation)}
        title={confirmCopy?.confirmTitle || 'Confirm order action'}
        tone={confirmCopy?.tone}
      />

      <Dialog
        description={dispatchReviewing
          ? 'Confirm the waybill image before notifying the buyer.'
          : 'Upload a clear photo of the waybill. The buyer will use it to identify and collect the parcel.'}
        dismissible={actionId !== 'dispatch'}
        footer={(
          dispatchReviewing ? (
            <>
              <button
                className="rounded-xl border border-foose-border bg-foose-surface px-5 text-sm font-bold text-foose-text"
                disabled={actionId === 'dispatch'}
                onClick={() => setDispatchReviewing(false)}
                type="button"
              >
                Back to edit
              </button>
              <button
                aria-busy={actionId === 'dispatch' || undefined}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-accent bg-accent px-5 text-sm font-black text-white transition hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
                disabled={actionId === 'dispatch'}
                onClick={() => void confirmDispatch()}
                type="button"
              >
                {actionId === 'dispatch' && <span aria-hidden="true" className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent motion-reduce:animate-none" />}
                {actionId === 'dispatch' ? 'Marking as sent…' : 'Mark sent & notify buyer'}
              </button>
            </>
          ) : (
            <>
              <button
                className="rounded-xl border border-foose-border bg-foose-surface px-5 text-sm font-bold text-foose-text"
                onClick={exitDispatchDialog}
                type="button"
              >
                Cancel
              </button>
              <SubmitButton form="dispatch-order-form">Review details</SubmitButton>
            </>
          )
        )}
        onClose={exitDispatchDialog}
        open={dispatchOpen}
        size="lg"
        title={dispatchReviewing ? 'Review dispatch details' : 'Upload waybill'}
      >
        <div className={dispatchReviewing ? 'grid gap-5' : 'hidden'}>
            {actionError && <InlineNotice title="Waybill was not saved" tone="error">{actionError}</InlineNotice>}
            <InlineNotice icon={<FaInfoCircle size={18} />} title="This starts the delivery clock" tone="info">
              The buyer is notified immediately. Unless they confirm receipt or submit a report, the protected payment releases after 36 hours.
            </InlineNotice>
            <dl className="divide-y divide-foose-border rounded-xl border border-foose-border px-3">
              {company && <DetailRow label="Company" value={company} />}
              <DetailRow label="Driver phone" value={normalizedDriverPhone} />
              <DetailRow label="Bus number" value={busNumber.trim()} />
              <DetailRow label="Amount to be paid" value={amountPesewas !== null ? formatMoney(amountPesewas, order?.currency) : ''} />
              <DetailRow label="Private waybill" value={billImage?.name} />
            </dl>
            <div className="overflow-hidden rounded-2xl border border-foose-border bg-foose-surface-low p-3">
              <p className="mb-2 text-xs font-black uppercase tracking-wide text-foose-faint">Waybill preview</p>
              <SafeImage
                alt={`Preview of ${billImage?.name || 'waybill'}`}
                className="max-h-80 w-full rounded-xl bg-foose-surface object-contain"
                fallback="Preparing waybill preview…"
                fallbackClassName="min-h-40 text-sm font-bold"
                src={billPreviewUrl}
              />
            </div>
        </div>
        <form className={dispatchReviewing ? 'hidden' : 'relative z-0 grid gap-5'} id="dispatch-order-form" noValidate onSubmit={reviewDispatch}>
          {actionError && <InlineNotice title="Waybill was not saved" tone="error">{actionError}</InlineNotice>}
          {dispatchAttempted && (!billImage || driverPhoneInvalid || busNumberInvalid || amountInvalid) && (
            <ErrorSummary
              errors={[
                ...(!billImage ? [{ fieldId: 'dispatch-bill', message: 'Add a clear image of the waybill.' }] : []),
                ...(driverPhoneInvalid ? [{ fieldId: 'dispatch-driver-phone', message: 'Enter a valid 10-digit driver phone number.' }] : []),
                ...(busNumberInvalid ? [{ fieldId: 'dispatch-bus-number', message: 'Enter the bus number.' }] : []),
                ...(amountInvalid ? [{ fieldId: 'dispatch-amount', message: 'Enter the amount to be paid, above zero.' }] : []),
              ]}
              focus
            />
          )}
          <InlineNotice title="Check before sending" tone="info">
            You will review this before the buyer is notified and the 36-hour confirmation window begins.
          </InlineNotice>
          {company && <InlineNotice tone="info">Company: {company}</InlineNotice>}
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              autoComplete="tel"
              error={driverPhoneInvalid ? 'Enter a valid 10-digit driver phone number.' : undefined}
              id="dispatch-driver-phone"
              inputMode="tel"
              label="Driver phone number"
              name="driverPhone"
              onBlur={() => setDriverPhone((current) => normalizePhone(current))}
              onChange={(event) => setDriverPhone(event.target.value)}
              placeholder="0240000000"
              required
              type="tel"
              value={driverPhone}
            />
            <TextField
              error={busNumberInvalid ? 'Enter the bus number.' : undefined}
              id="dispatch-bus-number"
              label="Bus number"
              maxLength={120}
              name="busNumber"
              onChange={(event) => setBusNumber(event.target.value)}
              placeholder="e.g. GT 1234-20"
              required
              value={busNumber}
            />
            <TextField
              error={amountInvalid ? 'Enter the amount to be paid, above zero.' : undefined}
              id="dispatch-amount"
              inputMode="decimal"
              label="Amount to be paid"
              name="amount"
              onChange={(event) => setAmountValue(event.target.value)}
              placeholder="70.00"
              prefix="GHS"
              required
              value={amountValue}
            />
          </div>
          <ImagePreviewInput
            accept="image/jpeg,image/png,image/webp"
            aspect="original"
            error={dispatchAttempted && !billImage ? 'Add a clear image of the waybill.' : undefined}
            hint="JPEG, PNG or WebP only. Maximum 5 MB. This image stays private to order participants and authorized staff."
            id="dispatch-bill"
            label="Waybill"
            maxBytes={5 * 1024 * 1024}
            maxFiles={1}
            name="billImage"
            onFilesChange={updateBillImage}
            presentation="preview"
            required
          />
        </form>
      </Dialog>

      <Dialog
        description="Paste the tracking link from the Bolt/Yango/ShaQ app after you've booked the delivery. The buyer is notified immediately."
        dismissible={actionId !== 'dispatchCourier'}
        footer={(
          <>
            <button
              className="rounded-xl border border-foose-border bg-foose-surface px-5 text-sm font-bold text-foose-text"
              disabled={actionId === 'dispatchCourier'}
              onClick={exitCourierDispatchDialog}
              type="button"
            >
              Cancel
            </button>
            <SubmitButton form="courier-dispatch-form" loading={actionId === 'dispatchCourier'} loadingLabel="Sending…">
              Send & notify buyer
            </SubmitButton>
          </>
        )}
        onClose={exitCourierDispatchDialog}
        open={courierDispatchOpen}
        title="Add tracking link"
      >
        <form className="grid gap-5" id="courier-dispatch-form" noValidate onSubmit={(event) => { event.preventDefault(); void confirmCourierDispatch() }}>
          {actionError && <InlineNotice title="Tracking link was not saved" tone="error">{actionError}</InlineNotice>}
          {trackingLinkInvalid && (
            <ErrorSummary errors={[{ fieldId: 'courier-tracking-link', message: 'Enter a valid tracking link (starting with https://).' }]} focus />
          )}
          <TextField
            error={trackingLinkInvalid ? 'Enter a valid tracking link (starting with https://).' : undefined}
            id="courier-tracking-link"
            label="Tracking link"
            onChange={(event) => setTrackingLinkValue(event.target.value)}
            placeholder="https://track.bolt.eu/..."
            required
            type="url"
            value={trackingLinkValue}
          />
        </form>
      </Dialog>

      <Dialog
        description="Item details from this order"
        onClose={() => setSelectedItem(null)}
        open={Boolean(selectedItem)}
        size="sm"
        title={selectedItem?.title || 'Order item'}
      >
        {selectedItem && order && (
          <div className="grid gap-4">
            <SafeImage
              alt={selectedItem.title}
              className="aspect-square w-full rounded-2xl object-cover"
              fallback="No image"
              fallbackClassName="text-sm font-bold"
              src={itemImage(selectedItem)}
            />
            <div className="grid gap-2 rounded-xl bg-foose-surface-low p-4 text-sm text-foose-muted">
              <p><strong className="text-foose-text">Quantity:</strong> {selectedItem.quantity}</p>
              <p><strong className="text-foose-text">Unit price:</strong> {formatMoney(selectedItem.price, order.currency)}</p>
              <p><strong className="text-foose-text">Total:</strong> {formatMoney(selectedItem.price * selectedItem.quantity, order.currency)}</p>
            </div>
          </div>
        )}
      </Dialog>
    </AppShell>
  )
}

export function OrderDetailPage() {
  const orderId = orderIdFromPath()
  return <OrderDetailContent key={orderId || 'missing-order'} orderId={orderId} />
}
