import type { Order } from '../../types/api'
import { formatDate, formatMoney } from '../../utils/format'
import { Badge } from '../ui/Badge'

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
