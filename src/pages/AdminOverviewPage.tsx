import { AdminShell, EmptyState, ErrorState, LoadingState, StatCard } from '../components'
import { useApiResource } from '../hooks/useApiResource'
import type { AdminStats } from '../types/api'
import { formatMoney } from '../utils/format'

export function AdminOverviewPage() {
  const stats = useApiResource<AdminStats>('/admin/stats')

  return (
    <AdminShell section="overview">
      <section className="admin-page">
        <div className="admin-title">
          <div>
            <h1>Marketplace Health</h1>
            <p>Live backend metrics for Foose Marketplace.</p>
          </div>
        </div>
        {stats.loading && <LoadingState label="Loading admin stats..." />}
        {stats.error && <ErrorState message={stats.error} retry={stats.refetch} />}
        {stats.data && (
          <>
            <div className="stats-row">
              <StatCard icon="user" label="Users" value={String(stats.data.users)} note="Registered accounts" />
              <StatCard icon="store" label="DigiShops" value={String(stats.data.shops)} note="Created shops" />
              <StatCard icon="box" label="Active Listings" value={String(stats.data.listings)} note="Marketplace supply" />
              <StatCard icon="money" label="Delivered Revenue" value={formatMoney(stats.data.revenue)} note="Completed orders" />
            </div>
            <EmptyState body="Charts and maps are waiting on analytics endpoints; no static admin visuals are shown." title="Analytics endpoints pending" />
          </>
        )}
      </section>
    </AdminShell>
  )
}
