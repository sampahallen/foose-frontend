import { AdminShell, EmptyState, ErrorState, LoadingState, StatCard } from '../components'
import { getAppName } from '../config/env'
import { useApiResource } from '../hooks/useApiResource'
import type { AdminStats } from '../types/api'
import { formatMoney } from '../utils/format'

export function AdminOverviewPage() {
  const brand = getAppName()
  const stats = useApiResource<AdminStats>('/admin/stats')

  return (
    <AdminShell section="overview">
      <section className="admin-page p-4 md:p-6 lg:p-8">
        <div className="admin-title mb-5 flex flex-col gap-2 md:flex-row md:items-center md:justify-between [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:md:text-4xl [&_p]:text-sm [&_p]:leading-6 [&_p]:text-foose-muted [&_p]:md:text-base max-md:[&_h1]:text-2xl">
          <div>
            <h1>Marketplace health</h1>
            <p>Live metrics for {brand}.</p>
          </div>
        </div>
        {stats.loading && <LoadingState label="Loading admin stats…" />}
        {stats.error && <ErrorState message={stats.error} retry={stats.refetch} />}
        {stats.data && (
          <>
            <div className="stats-row grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard icon="user" label="Users" value={String(stats.data.users)} note="Registered accounts" />
              <StatCard icon="store" label="DigiShops" value={String(stats.data.shops)} note="Created shops" />
              <StatCard icon="box" label="Active listings" value={String(stats.data.listings)} note="Marketplace supply" />
              <StatCard icon="money" label="Delivered revenue" value={formatMoney(stats.data.revenue)} note="Completed orders" />
            </div>
            <EmptyState body="Charts can plug in when analytics endpoints are added." title="Analytics" />
          </>
        )}
      </section>
    </AdminShell>
  )
}
