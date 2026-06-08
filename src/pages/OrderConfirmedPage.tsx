import { useEffect, useMemo } from 'react'
import { AppShell, ButtonLink, EmptyState, ErrorState, Icon, LoadingState } from '../components'
import { useCart } from '../hooks/useCart'
import { useApiResource } from '../hooks/useApiResource'
import { apiPut } from '../lib/api'
import type { Order } from '../types/api'
import { formatMoney } from '../utils/format'
import { getCurrentAppPathname } from '../utils/navigation'

function orderIds() {
  const params = new URLSearchParams(window.location.search)
  const orderPathMatch = getCurrentAppPathname().match(/^\/orders\/([^/]+)/)
  if (orderPathMatch?.[1]) return [decodeURIComponent(orderPathMatch[1])]

  const ids = params.get('orderIds') || params.get('orderId') || ''
  return ids
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean)
}

function paymentReference() {
  const params = new URLSearchParams(window.location.search)
  return params.get('reference') || params.get('trxref') || ''
}

export function OrderConfirmedPage() {
  const ids = orderIds()
  const reference = paymentReference()
  const { clearCart } = useCart()
  const orders = useApiResource<{ order?: Order; orders?: Order[] }>(
    reference
      ? `/payments/verify/${encodeURIComponent(reference)}`
      : ids.length
        ? `/orders?ids=${encodeURIComponent(ids.join(','))}`
        : null,
    Boolean(reference || ids.length),
  )
  const displayedOrders = useMemo(
    () => orders.data?.orders || (orders.data?.order ? [orders.data.order] : []),
    [orders.data],
  )

  async function confirmReceived(id: string) {
    await apiPut(`/orders/${id}/confirm-delivery`)
    await orders.refetch()
  }

  useEffect(() => {
    if (displayedOrders.length && displayedOrders.some((order) => order.paymentStatus === 'paid' || order.paymentStatus === 'cash_on_pickup')) {
      clearCart()
    }
  }, [clearCart, displayedOrders])

  const firstOrder = displayedOrders[0]
  const total = displayedOrders.reduce((sum, order) => sum + order.totalAmount, 0)

  return (
    <AppShell flush>
      <section className="confirmation-page min-h-dvh bg-foose-bg">
        {!ids.length && !reference && (
          <EmptyState
            action={<ButtonLink to="/browse">Continue shopping</ButtonLink>}
            body="Open this page from checkout with a valid order link."
            title="No order selected"
          />
        )}
        {orders.loading && <LoadingState label="Loading order..." />}
        {orders.error && <ErrorState message={orders.error} retry={orders.refetch} />}
        {!!displayedOrders.length && (
          <div className="confirmation-card mx-auto mt-16 flex w-full max-w-3xl flex-col items-center gap-6 rounded-xl border border-foose-border bg-foose-surface p-6 text-center shadow-lg md:p-10 [&_h1]:text-4xl [&_h1]:font-bold">
            <div className="success-icon inline-flex size-11 items-center justify-center rounded-full border border-foose-border bg-foose-surface font-bold border-accent bg-accent text-white">
              <Icon name="check" size={56} />
            </div>
            <h1>Order placed!</h1>
            <p>
              {firstOrder?.paymentStatus === 'cash_on_pickup'
                ? 'Your pickup request was sent to the seller.'
                : 'Payment confirmed. Funds are held in escrow until delivery is confirmed.'}
            </p>
            <div className="order-number flex flex-wrap items-center justify-between gap-4 rounded-lg border border-foose-border bg-foose-surface-low p-4 [&_img]:size-12 [&_img]:rounded-lg [&_img]:object-cover [&_b]:size-12 [&_b]:rounded-lg [&_b]:object-cover">
              <div>
                <span>Order records</span>
                <strong>{displayedOrders.map((order) => `#${order._id.slice(-6)}`).join(', ')}</strong>
              </div>
              <b>{formatMoney(total, firstOrder?.currency)}</b>
            </div>
            <div className="order-confirm-list w-full space-y-3">
              {displayedOrders.map((order) => (
                <article key={order._id}>
                  <div>
                    <strong>{order.items[0]?.title || 'Order item'}</strong>
                    <span>
                      {order.delivery?.method || 'delivery'} / {order.status} / escrow {order.escrowStatus || 'not held'}
                    </span>
                  </div>
                  {['processing', 'shipped'].includes(order.status) && (
                    <button className="button inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border px-5 py-2.5 text-center text-sm font-bold transition disabled:pointer-events-none disabled:opacity-50 [&.full]:w-full button-secondary border-foose-border bg-foose-surface text-foose-text hover:border-accent hover:text-accent" onClick={() => void confirmReceived(order._id)} type="button">
                      Confirm received
                    </button>
                  )}
                </article>
              ))}
            </div>
            <div className="button-row flex flex-wrap items-center gap-3 center">
              <ButtonLink to="/profile">View profile orders</ButtonLink>
              <ButtonLink to="/browse" variant="secondary">
                Continue shopping
              </ButtonLink>
            </div>
            <footer>
              <Icon name="truck" /> Seller action window: <strong>48 hours</strong>
            </footer>
          </div>
        )}
      </section>
    </AppShell>
  )
}
