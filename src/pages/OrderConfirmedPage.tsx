import { AppShell, ButtonLink, EmptyState, ErrorState, Icon, LoadingState } from '../components'
import { useApiResource } from '../hooks/useApiResource'
import type { Order } from '../types/api'
import { formatMoney } from '../utils/format'

function orderId() {
  return new URLSearchParams(window.location.search).get('orderId')
}

export function OrderConfirmedPage() {
  const id = orderId()
  const order = useApiResource<{ order: Order }>(id ? `/orders/${id}` : null, Boolean(id))

  return (
    <AppShell flush>
      <section className="confirmation-page">
        {!id && (
          <EmptyState
            action={<ButtonLink to="/browse">Continue shopping</ButtonLink>}
            body="Order confirmation needs a real orderId from the order API."
            title="No order selected"
          />
        )}
        {order.loading && <LoadingState label="Loading order..." />}
        {order.error && <ErrorState message={order.error} retry={order.refetch} />}
        {order.data?.order && (
          <div className="confirmation-card">
            <div className="success-icon">
              <Icon name="check" size={56} />
            </div>
            <h1>Order placed!</h1>
            <p>Your order was created by the backend and is ready for payment.</p>
            <div className="order-number">
              <div>
                <span>Order number</span>
                <strong>{order.data.order._id}</strong>
              </div>
              <b>{formatMoney(order.data.order.totalAmount, order.data.order.currency)}</b>
            </div>
            <div className="button-row center">
              <ButtonLink to="/dashboard">View order</ButtonLink>
              <ButtonLink to="/browse" variant="secondary">
                Continue shopping
              </ButtonLink>
            </div>
            <footer>
              <Icon name="truck" /> Status: <strong>{order.data.order.status}</strong>
            </footer>
          </div>
        )}
      </section>
    </AppShell>
  )
}
