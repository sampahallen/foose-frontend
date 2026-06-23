import { AppShell, Badge, ButtonLink, EmptyState, ErrorState, LoadingState, RecentOrders, SectionHeader } from '../components'
import { useAuth } from '../hooks/useAuth'
import { useApiResource } from '../hooks/useApiResource'
import type { Order } from '../types/api'
import { formatMoney } from '../utils/format'
import { isHistoricalOrder } from '../utils/orderStatus'

export function BuyerDashboardPage() {
  const { user } = useAuth()
  const orders = useApiResource<{ orders: Order[] }>('/orders/me/buying')
  const activeOrders = (orders.data?.orders || []).filter((order) => !isHistoricalOrder(order))
  const historyOrders = (orders.data?.orders || []).filter(isHistoricalOrder)

  return (
    <AppShell>
      <div className="dashboard-head mb-5 flex flex-col gap-2 md:flex-row md:items-center md:justify-between [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:md:text-4xl [&_p]:text-sm [&_p]:leading-6 [&_p]:text-foose-muted [&_p]:md:text-base max-md:[&_h1]:text-2xl">
        <div>
          <h1>Hey, {user?.name || user?.username}</h1>
          <p>{user?.isKycVerified ? 'Your identity is verified.' : 'Complete KYC to unlock seller trust.'}</p>
        </div>
        <div className="mode-toggle inline-flex rounded-full border border-foose-border bg-foose-surface-mid p-1 [&_button]:rounded-full [&_button]:px-4 [&_button]:py-2 [&_button]:text-sm [&_button]:font-bold [&_button]:text-foose-muted [&_a]:rounded-full [&_a]:px-4 [&_a]:py-2 [&_a]:text-sm [&_a]:font-bold [&_a]:text-foose-muted [&_.active]:bg-accent [&_.active]:text-white">
          <button className="active" type="button">
            Buying
          </button>
          <a href="/dashboard?view=shop">My Shop</a>
        </div>
      </div>
      {!user?.isKycVerified && (
        <div className="notice rounded-xl border border-foose-border bg-foose-surface shadow-sm p-4 md:p-5 flex items-center justify-between gap-4 bg-accent-light">
          <div>
            <strong>Get verified to unlock seller trust</strong>
            <p>Complete your KYC to start listing items and reach more buyers.</p>
          </div>
          <ButtonLink to="/kyc">Complete KYC</ButtonLink>
        </div>
      )}
      <section className="home-section mx-auto w-full max-w-[1280px] my-8 rounded-xl border border-foose-border bg-foose-surface p-4 md:p-6 [&.no-pad]:p-0 [&>h2]:text-2xl [&>h2]:font-bold [&>h2]:md:text-4xl [&_a]:font-bold [&_a]:text-accent max-lg:rounded-lg max-lg:p-3 max-md:[&>h2]:text-2xl">
        <SectionHeader title="Active Orders" action={<a href="/orders">View All &gt;</a>} />
        {orders.loading && <LoadingState label="Loading orders..." />}
        {orders.error && <ErrorState message={orders.error} retry={orders.refetch} />}
        {!orders.loading && !orders.error && !activeOrders.length && (
          <EmptyState
            action={<ButtonLink to="/browse">Browse listings</ButtonLink>}
            body="Orders you place will appear here."
            title="No active orders"
          />
        )}
        {!!activeOrders.length && (
          <div className="order-card-grid grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {activeOrders.slice(0, 3).map((order) => (
              <article className="order-card [&_img]:h-full [&_img]:w-full [&_img]:object-cover overflow-hidden rounded-xl border border-foose-border bg-foose-surface [&_img]:aspect-[16/9] [&_div]:p-4" key={order._id}>
                <div>
                  <Badge>{order.status}</Badge>
                  <strong>{formatMoney(order.totalAmount, order.currency)}</strong>
                </div>
                <h3>{order.items.map((item) => item.title).join(', ')}</h3>
                <p>{order.delivery?.trackingInfo || order.delivery?.method || 'Order created'}</p>
              </article>
            ))}
          </div>
        )}
      </section>
      <section className="home-section mx-auto w-full max-w-[1280px] my-8 rounded-xl border border-foose-border bg-foose-surface p-4 md:p-6 [&.no-pad]:p-0 [&>h2]:text-2xl [&>h2]:font-bold [&>h2]:md:text-4xl [&_a]:font-bold [&_a]:text-accent max-lg:rounded-lg max-lg:p-3 max-md:[&>h2]:text-2xl">
        <h2>Quick Actions</h2>
        <div className="quick-grid grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 [&_a]:flex [&_a]:min-h-28 [&_a]:flex-col [&_a]:items-center [&_a]:justify-center [&_a]:gap-3 [&_a]:rounded-xl [&_a]:border [&_a]:border-foose-border [&_a]:bg-foose-surface [&_a]:p-4 [&_a]:text-center [&_a]:font-semibold [&_a]:hover:border-accent [&_a]:hover:text-accent">
          {[
            ['Browse listings', '/browse'],
            ['Inbox', '/inbox'],
            [`Order history (${historyOrders.length})`, '/orders/history'],
            ['KYC status', '/kyc'],
            ['Wallet', '/wallet'],
          ].map(([label, href]) => (
            <a href={href} key={label}>
              {label}
            </a>
          ))}
        </div>
      </section>
      <RecentOrders orders={historyOrders} />
    </AppShell>
  )
}
