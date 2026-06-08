import type { Order } from '../../types/api'
import { formatDate, formatMoney } from '../../utils/format'
import { Badge } from '../ui/Badge'

export function RecentOrders({ orders }: { orders: Order[] }) {
  if (!orders.length) {
    return (
      <section className="home-section mx-auto w-full max-w-[1280px] my-8 rounded-xl border border-foose-border bg-foose-surface p-4 md:p-6 [&.no-pad]:p-0 [&>h2]:text-2xl [&>h2]:font-bold [&>h2]:md:text-4xl [&_a]:font-bold [&_a]:text-accent max-lg:rounded-lg max-lg:p-3 max-md:[&>h2]:text-2xl">
        <h2>Recent Orders</h2>
        <p className="muted-copy text-sm leading-6 text-foose-muted md:text-base">No orders yet.</p>
      </section>
    )
  }

  return (
    <section className="home-section mx-auto w-full max-w-[1280px] my-8 rounded-xl border border-foose-border bg-foose-surface p-4 md:p-6 [&.no-pad]:p-0 [&>h2]:text-2xl [&>h2]:font-bold [&>h2]:md:text-4xl [&_a]:font-bold [&_a]:text-accent max-lg:rounded-lg max-lg:p-3 max-md:[&>h2]:text-2xl">
      <h2>Recent Orders</h2>
      <table className="sharp-table w-full border-collapse overflow-hidden rounded-xl border border-foose-border text-left text-sm [&_th]:border-b [&_th]:border-foose-border [&_th]:px-4 [&_th]:py-3 [&_th]:align-middle [&_td]:border-b [&_td]:border-foose-border [&_td]:px-4 [&_td]:py-3 [&_td]:align-middle [&_th]:bg-foose-surface-mid [&_th]:text-xs [&_th]:font-bold [&_th]:uppercase [&_th]:tracking-widest [&_th]:text-foose-muted">
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
              <td className="accent-text font-bold text-accent">{order._id.slice(-8).toUpperCase()}</td>
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
