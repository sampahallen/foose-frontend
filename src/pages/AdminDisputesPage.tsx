import { AdminShell, EmptyState, ErrorState, LoadingState, StatCard } from '../components'
import { apiPut } from '../lib/api'
import { useApiResource } from '../hooks/useApiResource'
import type { Order, Shop, User } from '../types/api'
import { formatMoney } from '../utils/format'

type DisputeOrder = Order & {
  buyerId?: User
  shopId?: Shop
}

export function AdminDisputesPage() {
  const disputes = useApiResource<{ orders: DisputeOrder[] }>('/admin/disputes')

  async function resolve(orderId: string, resolveFor: 'seller' | 'buyer') {
    await apiPut(`/admin/disputes/${orderId}/resolve`, { resolveFor })
    await disputes.refetch()
  }

  return (
    <AdminShell section="disputes">
      <section className="admin-page">
        <div className="admin-title">
          <div>
            <h1>Dispute Center</h1>
            <p>Disputed orders loaded from the admin API.</p>
          </div>
        </div>
        <div className="stats-row">
          <StatCard icon="alert" label="Active Disputes" value={String(disputes.data?.orders.length || 0)} note="Disputed orders" />
        </div>
        {disputes.loading && <LoadingState label="Loading disputes..." />}
        {disputes.error && <ErrorState message={disputes.error} retry={disputes.refetch} />}
        {!disputes.loading && !disputes.error && !disputes.data?.orders.length && (
          <EmptyState body="No disputed orders are currently open." title="Dispute queue is clear" />
        )}
        {!!disputes.data?.orders.length && (
          <table className="sharp-table admin-table">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Buyer</th>
                <th>Shop</th>
                <th>Reason</th>
                <th>Total</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {disputes.data.orders.map((order) => (
                <tr key={order._id}>
                  <td>{order._id}</td>
                  <td>{order.buyerId?.name || 'Buyer'}</td>
                  <td>{order.shopId?.shopName || 'Shop'}</td>
                  <td>
                    <strong>{order.items.map((item) => item.title).join(', ')}</strong>
                    <small>{order.status}</small>
                  </td>
                  <td>{formatMoney(order.totalAmount, order.currency)}</td>
                  <td>
                    <div className="table-actions">
                      <button className="button button-secondary" onClick={() => void resolve(order._id, 'buyer')} type="button">
                        Refund buyer
                      </button>
                      <button className="button button-primary" onClick={() => void resolve(order._id, 'seller')} type="button">
                        Release seller
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </AdminShell>
  )
}
