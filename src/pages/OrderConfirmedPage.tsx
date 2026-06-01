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
      <section className="confirmation-page">
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
          <div className="confirmation-card">
            <div className="success-icon">
              <Icon name="check" size={56} />
            </div>
            <h1>Order placed!</h1>
            <p>
              {firstOrder?.paymentStatus === 'cash_on_pickup'
                ? 'Your pickup request was sent to the seller.'
                : 'Payment confirmed. Funds are held in escrow until delivery is confirmed.'}
            </p>
            <div className="order-number">
              <div>
                <span>Order records</span>
                <strong>{displayedOrders.map((order) => `#${order._id.slice(-6)}`).join(', ')}</strong>
              </div>
              <b>{formatMoney(total, firstOrder?.currency)}</b>
            </div>
            <div className="order-confirm-list">
              {displayedOrders.map((order) => (
                <article key={order._id}>
                  <div>
                    <strong>{order.items[0]?.title || 'Order item'}</strong>
                    <span>
                      {order.delivery?.method || 'delivery'} / {order.status} / escrow {order.escrowStatus || 'not held'}
                    </span>
                  </div>
                  {['processing', 'shipped'].includes(order.status) && (
                    <button className="button button-secondary" onClick={() => void confirmReceived(order._id)} type="button">
                      Confirm received
                    </button>
                  )}
                </article>
              ))}
            </div>
            <div className="button-row center">
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
