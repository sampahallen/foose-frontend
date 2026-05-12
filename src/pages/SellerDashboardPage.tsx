import { AppShell, Badge, ButtonLink, EmptyState, ErrorState, LoadingState, SectionHeader, StatCard } from '../components'
import { useAuth } from '../hooks/useAuth'
import { useApiResource } from '../hooks/useApiResource'
import type { Listing, Order, Shop } from '../types/api'
import { formatMoney, getListingImage } from '../utils/format'

export function SellerDashboardPage() {
  const { user } = useAuth()
  const shop = useApiResource<{ shop: Shop }>('/digishops/me', Boolean(user?.hasShop))
  const orders = useApiResource<{ orders: Order[] }>('/orders/me/selling', Boolean(user?.hasShop))
  const listings = useApiResource<{ listings: Listing[] }>(
    shop.data?.shop._id ? `/listings/shop/${shop.data.shop._id}` : null,
    Boolean(shop.data?.shop._id),
  )

  if (!user?.isKycVerified) {
    return (
      <AppShell>
        <EmptyState
          action={<ButtonLink to="/kyc">Start KYC</ButtonLink>}
          body="The backend requires approved KYC before opening or managing a DigiShop."
          icon="shield"
          title="KYC required"
        />
      </AppShell>
    )
  }

  if (!user.hasShop) {
    return (
      <AppShell>
        <EmptyState
          action={<ButtonLink to="/open-shop">Open your DigiShop</ButtonLink>}
          body="Create your shop through the API before managing listings and seller orders."
          title="No DigiShop yet"
        />
      </AppShell>
    )
  }

  const totalRevenue = orders.data?.orders.reduce((sum, order) => (order.status === 'delivered' ? sum + order.totalAmount : sum), 0) || 0

  return (
    <AppShell searchPlaceholder="Search marketplace...">
      <div className="dashboard-head">
        <div>
          <div className="mode-toggle left">
            <a href="/dashboard">Buying</a>
            <button className="active" type="button">
              My Shop
            </button>
          </div>
          <h1>{shop.data?.shop.shopName || 'My DigiShop'}</h1>
          {shop.data?.shop.slug && <a href={`/shops/${shop.data.shop.slug}`}>View shop</a>}
        </div>
        <div className="button-row">
          <ButtonLink to="/listings/new">Add Listing</ButtonLink>
          <ButtonLink to="/wallet" variant="secondary">
            Wallet
          </ButtonLink>
        </div>
      </div>
      {(shop.loading || orders.loading || listings.loading) && <LoadingState label="Loading seller workspace..." />}
      {(shop.error || orders.error || listings.error) && (
        <ErrorState message={shop.error || orders.error || listings.error} retry={() => void Promise.all([shop.refetch(), orders.refetch(), listings.refetch()])} />
      )}
      <div className="stats-row">
        <StatCard icon="money" label="Delivered Revenue" value={formatMoney(totalRevenue)} note="From API orders" />
        <StatCard icon="box" label="Active Orders" value={String(orders.data?.orders.length || 0)} note="Seller orders" />
        <StatCard icon="star" label="Shop Rating" value={`${shop.data?.shop.rating || 0} / 5.0`} note={`${shop.data?.shop.totalReviews || 0} reviews`} />
      </div>
      <div className="seller-grid">
        <section>
          <SectionHeader title="Seller Orders" action={<a href="/orders/selling">View All</a>} />
          {!orders.data?.orders.length && <EmptyState body="Paid orders will appear after buyers check out." title="No seller orders" />}
          {!!orders.data?.orders.length && (
            <div className="seller-orders">
              {orders.data.orders.slice(0, 5).map((order) => (
                <article key={order._id}>
                  <div>
                    <h3>{order.items.map((item) => item.title).join(', ')}</h3>
                    <p>{formatMoney(order.totalAmount, order.currency)}</p>
                    <Badge tone={order.status === 'disputed' ? 'danger' : 'accent'}>{order.status}</Badge>
                  </div>
                </article>
              ))}
            </div>
          )}
          <section className="home-section no-pad">
            <h2>Listings Performance</h2>
            {!listings.data?.listings.length && <EmptyState body="Create listings through the API to see performance." title="No listings yet" />}
            {!!listings.data?.listings.length && (
              <table className="sharp-table">
                <thead>
                  <tr>
                    <th>Listing</th>
                    <th>Views</th>
                    <th>Quantity</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {listings.data.listings.map((listing) => (
                    <tr key={listing._id}>
                      <td>
                        <span className="table-listing">
                          {getListingImage(listing) && <img alt={listing.title} src={getListingImage(listing)} />}
                          {listing.title}
                        </span>
                      </td>
                      <td>{listing.views || 0}</td>
                      <td>{listing.quantity || 0}</td>
                      <td>
                        <Badge tone={listing.status === 'removed' || listing.status === 'sold' ? 'danger' : 'accent'}>{listing.status || 'active'}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </section>
        <aside className="manage-card">
          <h2>Manage Shop</h2>
          <a href="/listings/new">Create Listing</a>
          <a href="/open-shop">Shop Settings</a>
          <a href="/wallet">Wallet</a>
        </aside>
      </div>
    </AppShell>
  )
}
