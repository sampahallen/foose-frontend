import { AppShell, Badge, ButtonLink, EmptyState, ErrorState, LoadingState, RecentOrders, SectionHeader } from '../components'
import { useAuth } from '../hooks/useAuth'
import { useApiResource } from '../hooks/useApiResource'
import type { Order } from '../types/api'
import { formatMoney } from '../utils/format'

export function BuyerDashboardPage() {
  const { user } = useAuth()
  const orders = useApiResource<{ orders: Order[] }>('/orders/me/buying')

  return (
    <AppShell>
      <div className="dashboard-head">
        <div>
          <h1>Hey, {user?.name || user?.username}</h1>
          <p>{user?.isKycVerified ? 'Your identity is verified.' : 'Complete KYC to unlock seller trust.'}</p>
        </div>
        <div className="mode-toggle">
          <button className="active" type="button">
            Buying
          </button>
          <a href="/dashboard?view=shop">My Shop</a>
        </div>
      </div>
      {!user?.isKycVerified && (
        <div className="notice">
          <div>
            <strong>Get verified to unlock seller trust</strong>
            <p>Complete your KYC to start listing items and reach more buyers.</p>
          </div>
          <ButtonLink to="/kyc">Complete KYC</ButtonLink>
        </div>
      )}
      <section className="home-section">
        <SectionHeader title="Active Orders" action={<a href="/orders">View All &gt;</a>} />
        {orders.loading && <LoadingState label="Loading orders..." />}
        {orders.error && <ErrorState message={orders.error} retry={orders.refetch} />}
        {!orders.loading && !orders.error && !orders.data?.orders.length && (
          <EmptyState
            action={<ButtonLink to="/browse">Browse listings</ButtonLink>}
            body="Orders you place will appear here."
            title="No active orders"
          />
        )}
        {!!orders.data?.orders.length && (
          <div className="order-card-grid">
            {orders.data.orders.slice(0, 3).map((order) => (
              <article className="order-card" key={order._id}>
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
      <section className="home-section">
        <h2>Quick Actions</h2>
        <div className="quick-grid">
          {[
            ['Browse listings', '/browse'],
            ['Inbox', '/inbox'],
            ['KYC status', '/kyc'],
            ['Wallet', '/wallet'],
          ].map(([label, href]) => (
            <a href={href} key={label}>
              {label}
            </a>
          ))}
        </div>
      </section>
      <RecentOrders orders={orders.data?.orders || []} />
    </AppShell>
  )
}
