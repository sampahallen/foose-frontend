import { Icon } from './icons/Icon'
import { Badge, ButtonLink } from './ui'
import type { CartItem } from '../hooks/useCart'
import type { Order } from '../types/api'
import { formatDate, formatMoney } from '../utils/format'

export function RecentOrders({ orders }: { orders: Order[] }) {
  if (!orders.length) {
    return (
      <section className="home-section">
        <h2>Recent Orders</h2>
        <p className="muted-copy">No orders yet.</p>
      </section>
    )
  }

  return (
    <section className="home-section">
      <h2>Recent Orders</h2>
      <table className="sharp-table">
        <thead>
          <tr>
            <th>Order #</th>
            <th>Items</th>
            <th>Total</th>
            <th>Status</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr key={order._id}>
              <td className="accent-text">{order._id.slice(-8).toUpperCase()}</td>
              <td>{order.items.map((item) => item.title).join(', ')}</td>
              <td>
                <strong>{formatMoney(order.totalAmount, order.currency)}</strong>
              </td>
              <td>
                <Badge tone={order.status === 'cancelled' || order.status === 'disputed' ? 'danger' : 'success'}>
                  {order.status}
                </Badge>
              </td>
              <td>{formatDate(order.createdAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}

export function OrderSummary({
  action,
  href,
  deliveryFee = 0,
  items,
  onAction,
  serviceFee = 0,
}: {
  action: string
  href?: string
  deliveryFee?: number
  items: CartItem[]
  onAction?: () => void
  serviceFee?: number
}) {
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const total = subtotal + deliveryFee + serviceFee
  const actionContent = (
    <>
      {action} <Icon name="arrow" />
    </>
  )

  return (
    <aside className="order-summary">
      <h2>Order summary</h2>
      <div className="summary-row">
        <span>Subtotal</span>
        <strong>{formatMoney(subtotal)}</strong>
      </div>
      <div className="summary-row">
        <span>Delivery Fee</span>
        <strong>{formatMoney(deliveryFee)}</strong>
      </div>
      <div className="summary-row">
        <span>Service Fee</span>
        <strong>{formatMoney(serviceFee)}</strong>
      </div>
      <div className="summary-total">
        <span>Total</span>
        <strong>{formatMoney(total)}</strong>
      </div>
      <label className="promo-field">
        Promo code
        <span>
          <input placeholder="Enter code" />
          <button type="button">Apply</button>
        </span>
      </label>
      {href ? (
        <ButtonLink className="full" to={href}>
          {actionContent}
        </ButtonLink>
      ) : (
        <button className="button button-primary full" onClick={onAction} type="button">
          {actionContent}
        </button>
      )}
      <div className="payment-icons">
        <Icon name="money" />
        <Icon name="wallet" />
        <Icon name="shield" />
      </div>
    </aside>
  )
}

export function StepIndicator() {
  return (
    <div className="stepper">
      {['Delivery', 'Payment', 'Confirm'].map((step, index) => (
        <div className={index === 0 ? 'active' : ''} key={step}>
          <span>{index + 1}</span>
          <strong>{step}</strong>
        </div>
      ))}
    </div>
  )
}
