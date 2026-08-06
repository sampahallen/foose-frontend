import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  AppShell,
  Badge,
  ButtonLink,
  Icon,
  OrderCountdown,
  OrderStatusBadge,
  StatePanel,
  SuccessState,
} from '../components'
import { OrderDetailSkeleton } from '../components/operational/OperationalStates'
import { useCart } from '../hooks/useCart'
import { useApiResource } from '../hooks/useApiResource'
import { useOrderAutoRefresh } from '../hooks/useOrderAutoRefresh'
import { useOrderRealtimeRefresh } from '../hooks/useOrderRealtimeRefresh'
import { apiPost } from '../lib/api'
import type { Order } from '../types/api'
import { getErrorMessage } from '../utils/errorMessage'
import { formatMoney } from '../utils/format'
import { deliveryMethodLabel, orderDeadlineLabel, orderNextStep, orderTitle } from '../utils/orderStatus'
import { getCurrentAppPathname, withBasePath } from '../utils/navigation'

function orderIds() {
  const params = new URLSearchParams(window.location.search)
  const orderPathMatch = getCurrentAppPathname().match(/^\/orders\/([^/]+)/)
  if (orderPathMatch?.[1]) return [decodeURIComponent(orderPathMatch[1])]

  const ids = params.get('orderIds') || params.get('orderId') || ''
  return ids.split(',').map((id) => id.trim()).filter(Boolean)
}

function paymentReference() {
  const params = new URLSearchParams(window.location.search)
  return params.get('reference') || params.get('trxref') || ''
}

function usePaymentConfirmation(reference: string) {
  const [data, setData] = useState<{ order?: Order; orders?: Order[] } | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(Boolean(reference))
  const idempotencyKeyRef = useRef(`payment-verify:${reference || 'none'}`)

  const refetch = useCallback(async () => {
    if (!reference) return
    setLoading(true)
    setError('')
    try {
      const result = await apiPost<{ order?: Order; orders?: Order[] }>(
        `/payments/${encodeURIComponent(reference)}/actions/verify`,
        {},
        { headers: { 'Idempotency-Key': idempotencyKeyRef.current } },
      )
      setData(result)
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Unable to confirm this payment'))
    } finally {
      setLoading(false)
    }
  }, [reference])

  useEffect(() => {
    if (!reference) return undefined
    const timer = window.setTimeout(() => void refetch(), 0)
    return () => window.clearTimeout(timer)
  }, [reference, refetch])

  return {
    data,
    error,
    initialLoading: loading && !data,
    refetch,
    refreshing: loading && Boolean(data),
  }
}

export function OrderConfirmedPage() {
  const ids = orderIds()
  const reference = paymentReference()
  const { clearCart } = useCart()
  const paymentConfirmation = usePaymentConfirmation(reference)
  const loadedOrders = useApiResource<{ order?: Order; orders?: Order[] }>(
    !reference && ids.length ? `/orders?ids=${encodeURIComponent(ids.join(','))}` : null,
    Boolean(!reference && ids.length),
  )
  const orders = reference ? paymentConfirmation : loadedOrders
  const displayedOrders = useMemo(
    () => orders.data?.orders || (orders.data?.order ? [orders.data.order] : []),
    [orders.data],
  )

  useOrderAutoRefresh(orders.refetch, Boolean(displayedOrders.length && !reference), 45_000)
  useOrderRealtimeRefresh(orders.refetch, Boolean(displayedOrders.length && !reference))

  useEffect(() => {
    if (displayedOrders.length && displayedOrders.some((order) => (
      order.paymentStatus === 'paid'
      || order.paymentStatus === 'cash_on_pickup'
      || order.settlementStatus === 'held'
      || order.settlementStatus === 'cash_due'
    ))) {
      clearCart()
    }
  }, [clearCart, displayedOrders])

  const firstOrder = displayedOrders[0]
  const total = displayedOrders.reduce((sum, order) => sum + order.totalAmount, 0)
  const cashPickup = displayedOrders.every((order) => order.paymentMethod === 'cash_on_pickup' || order.settlementStatus === 'cash_due')

  return (
    <AppShell flush>
      <section className="min-h-dvh bg-foose-bg px-3 py-12 sm:px-5 sm:py-16">
        {!ids.length && !reference && (
          <StatePanel
            action={<ButtonLink to="/browse">Continue shopping</ButtonLink>}
            body="Open this page from checkout with a valid order link."
            layout="page"
            title="Order link unavailable"
            tone="unavailable"
          />
        )}
        {orders.initialLoading && <OrderDetailSkeleton label="Confirming your order" />}
        {orders.error && !orders.data && (
          <StatePanel
            action={<button className="button inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border px-5 py-2.5 text-center text-sm font-bold transition disabled:pointer-events-none disabled:opacity-50 [&.full]:w-full button-secondary border-foose-border bg-foose-surface text-foose-text hover:border-accent hover:text-accent" onClick={() => void orders.refetch()} type="button">Retry</button>}
            body={orders.error}
            layout="page"
            title="Order confirmation unavailable"
            tone="error"
          />
        )}

        {!!displayedOrders.length && (
          <div className="mx-auto w-full max-w-4xl">
            <div className="overflow-hidden rounded-3xl border border-foose-border bg-foose-surface shadow-xl">
              <div className="bg-gradient-to-br from-accent-light via-foose-surface to-foose-surface-low px-5 py-8 text-center sm:px-8 sm:py-10">
                <SuccessState
                  layout="compact"
                  message={cashPickup
                    ? 'Each seller has your pickup request. You will pay only when collecting the complete order.'
                    : 'Your payment is confirmed and protected while each seller fulfils their parcel.'}
                  title="Order placed"
                />
                <div className="mx-auto mt-5 flex w-fit flex-wrap items-center justify-center gap-2">
                  <Badge>{displayedOrders.length} seller {displayedOrders.length === 1 ? 'order' : 'orders'}</Badge>
                  <Badge tone={cashPickup ? 'warning' : 'success'}>{cashPickup ? 'Cash at pickup' : 'Payment protected'}</Badge>
                </div>
                <strong className="mt-5 block font-display text-3xl font-semibold text-accent">{formatMoney(total, firstOrder?.currency)}</strong>
              </div>

              <div className="p-4 sm:p-6">
                <div className="space-y-3">
                  {displayedOrders.map((order) => {
                    const deadline = order.workflow?.deadline
                    return (
                      <article className="rounded-2xl border border-foose-border bg-foose-surface p-4 shadow-sm sm:p-5" key={order._id}>
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <div className="mb-2 flex flex-wrap items-center gap-2">
                              <OrderStatusBadge order={order} />
                              <span className="self-end text-[11px] font-semibold text-foose-faint">{deliveryMethodLabel(order.delivery?.method)}</span>
                            </div>
                            <h2 className="font-display text-lg font-semibold text-foose-text">{orderTitle(order)}</h2>
                            <p className="mt-1 text-xs font-bold uppercase tracking-wide text-foose-faint">Order #{order._id.slice(-8).toUpperCase()}</p>
                          </div>
                          <strong className="shrink-0 text-lg font-black text-accent">{formatMoney(order.totalAmount, order.currency)}</strong>
                        </div>
                        <p className="mt-4 rounded-xl bg-foose-surface-low p-3 text-sm font-semibold leading-6 text-foose-text">
                          {orderNextStep(order, 'buyer')}
                        </p>
                        {deadline?.at && (
                          <div className="mt-3 text-xs text-foose-muted">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span>{orderDeadlineLabel(deadline.type)}</span>
                              <OrderCountdown at={deadline.at} serverNow={order.workflow?.serverNow} />
                            </div>
                            {deadline.consequence && <p className="mt-1.5 leading-5">{deadline.consequence}</p>}
                          </div>
                        )}
                        <a
                          className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-accent bg-foose-surface px-4 text-sm font-black text-accent transition hover:bg-accent-light sm:w-auto"
                          href={withBasePath(`/orders/${order._id}`)}
                        >
                          View this order <Icon name="arrow" size={16} />
                        </a>
                      </article>
                    )
                  })}
                </div>

                <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
                  <ButtonLink to="/orders">View all orders</ButtonLink>
                  <ButtonLink to="/browse" variant="secondary">Continue shopping</ButtonLink>
                </div>

                <p className="mt-6 flex items-start justify-center gap-2 border-t border-foose-border pt-5 text-center text-xs leading-5 text-foose-muted">
                  <Icon name="bell" size={16} />
                  Foose will notify you when a seller marks a pickup ready or sends a waybill.
                </p>
              </div>
            </div>
          </div>
        )}
      </section>
    </AppShell>
  )
}
