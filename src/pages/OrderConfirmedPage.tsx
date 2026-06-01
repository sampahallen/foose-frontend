import { AppShell, ButtonLink, EmptyState, ErrorState, Icon, LoadingState } from '../components'
import { useApiResource } from '../hooks/useApiResource'
import { apiPut } from '../lib/api'
import type { Order } from '../types/api'
import { formatMoney } from '../utils/format'

function orderIds() {
  const params = new URLSearchParams(window.location.search)
  const orderPathMatch = window.location.pathname.match(/^\/orders\/([^/]+)/)
  if (orderPathMatch?.[1]) return [decodeURIComponent(orderPathMatch[1])]

  const ids = params.get('orderIds') || params.get('orderId') || ''
  return ids
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean)
}

export function OrderConfirmedPage() {
  const ids = orderIds()
  const orders = useApiResource<{ orders: Order[] }>(
    ids.length ? `/orders?ids=${encodeURIComponent(ids.join(','))}` : null,
    Boolean(ids.length),
  )

  async function confirmReceived(id: string) {
    await apiPut(`/orders/${id}/confirm-delivery`)
    await orders.refetch()
  }

  const firstOrder = orders.data?.orders[0]
  const total = orders.data?.orders.reduce((sum, order) => sum + order.totalAmount, 0) || 0

  return (
    <AppShell flush>
      <section className="confirmation-page">
        {!ids.length && (
          <EmptyState
            action={<ButtonLink to="/browse">Continue shopping</ButtonLink>}
            body="Open this page from checkout with a valid order link."
            title="No order selected"
          />
        )}
        {orders.loading && <LoadingState label="Loading order..." />}
        {orders.error && <ErrorState message={orders.error} retry={orders.refetch} />}
        {!!orders.data?.orders.length && (
          <div className="confirmation-card">
            <div className="success-icon">
              <Icon name="check" size={56} />
            </div>
            <h1>Order placed!</h1>
            <p>
              {firstOrder?.paymentStatus === 'cash_on_pickup'
                ? 'Your pickup request was sent to the seller.'
                : 'Mock payment succeeded. Funds are held in escrow until delivery is confirmed.'}
            </p>
            <div className="order-number">
              <div>
                <span>Order records</span>
                <strong>{orders.data.orders.map((order) => `#${order._id.slice(-6)}`).join(', ')}</strong>
              </div>
              <b>{formatMoney(total, firstOrder?.currency)}</b>
            </div>
            <div className="order-confirm-list">
              {orders.data.orders.map((order) => (
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
