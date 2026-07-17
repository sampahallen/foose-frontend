import { useState } from 'react'
import { AdminShell, InlineNotice, StatePanel, StatCard, useToast } from '../components'
import { AdminTableSkeleton } from '../components/operational/OperationalStates'
import { apiPut } from '../lib/api'
import { useApiResource } from '../hooks/useApiResource'
import type { Order, Shop, User } from '../types/api'
import { formatMoney } from '../utils/format'
import { getErrorMessage } from '../utils/errorMessage'

type DisputeOrder = Order & {
  buyerId?: User
  shopId?: Shop
}

export function AdminDisputesPage() {
  const disputes = useApiResource<{ orders: DisputeOrder[] }>('/admin/disputes')
  const { showToast } = useToast()
  const [busyId, setBusyId] = useState('')
  const [actionError, setActionError] = useState('')

  async function resolve(orderId: string, resolveFor: 'seller' | 'buyer') {
    setBusyId(`${orderId}:${resolveFor}`)
    setActionError('')
    try {
      await apiPut(`/admin/disputes/${orderId}/resolve`, { resolveFor })
      await disputes.refetch()
      showToast({ message: resolveFor === 'seller' ? 'Escrow was released to the seller.' : 'The buyer refund was approved.', title: 'Dispute resolved', tone: 'success' })
    } catch (error) {
      setActionError(getErrorMessage(error, 'Unable to resolve dispute'))
    } finally {
      setBusyId('')
    }
  }

  return (
    <AdminShell section="disputes">
      <section className="admin-page p-4 md:p-6 lg:p-8">
        <div className="admin-title mb-5 flex flex-col gap-2 md:flex-row md:items-center md:justify-between [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:md:text-4xl [&_p]:text-sm [&_p]:leading-6 [&_p]:text-foose-muted [&_p]:md:text-base max-md:[&_h1]:text-2xl">
          <div>
            <h1>Dispute center</h1>
            <p>Open disputed orders from the admin API.</p>
          </div>
        </div>
        <div className="stats-row grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard icon="alert" label="Active Disputes" value={String(disputes.data?.orders.length || 0)} note="Disputed orders" />
        </div>
        {disputes.initialLoading && <AdminTableSkeleton label="Loading disputes" />}
        {disputes.error && !disputes.data && <StatePanel action={<button className="button button-secondary min-h-11 px-5" onClick={() => void disputes.refetch()} type="button">Retry</button>} body={disputes.error} layout="section" title="Disputes unavailable" tone="error" />}
        {actionError && <InlineNotice title="Dispute was not resolved" tone="error">{actionError}</InlineNotice>}
        {!disputes.loading && !disputes.error && !disputes.data?.orders.length && (
          <StatePanel body="No disputed orders are currently open." layout="section" title="Dispute queue is clear" tone="success" />
        )}
        {!!disputes.data?.orders.length && (
          <table className="sharp-table w-full border-collapse overflow-hidden rounded-xl border border-foose-border text-left text-sm [&_th]:border-b [&_th]:border-foose-border [&_th]:px-4 [&_th]:py-3 [&_th]:align-middle [&_td]:border-b [&_td]:border-foose-border [&_td]:px-4 [&_td]:py-3 [&_td]:align-middle [&_th]:bg-foose-surface-mid [&_th]:text-xs [&_th]:font-bold [&_th]:uppercase [&_th]:tracking-widest [&_th]:text-foose-muted admin-table [&_td:first-child]:font-bold">
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
                    <div className="table-actions flex flex-wrap items-center gap-3 justify-end">
                      <button className="button inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border px-5 py-2.5 text-center text-sm font-bold transition disabled:pointer-events-none disabled:opacity-50 [&.full]:w-full button-secondary border-foose-border bg-foose-surface text-foose-text hover:border-accent hover:text-accent" disabled={Boolean(busyId)} onClick={() => void resolve(order._id, 'buyer')} type="button">
                        {busyId === `${order._id}:buyer` ? 'Refunding…' : 'Refund buyer'}
                      </button>
                      <button className="button inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border px-5 py-2.5 text-center text-sm font-bold transition disabled:pointer-events-none disabled:opacity-50 [&.full]:w-full button-primary border-accent bg-accent text-white shadow-md shadow-accent/15 hover:bg-accent-hover" disabled={Boolean(busyId)} onClick={() => void resolve(order._id, 'seller')} type="button">
                        {busyId === `${order._id}:seller` ? 'Releasing…' : 'Release seller'}
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
