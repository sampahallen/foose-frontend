import { useState } from 'react'
import { AppShell, Badge, ButtonLink, EmptyState, ErrorState, LoadingState, SectionHeader, StatCard } from '../components'
import { useAuth } from '../hooks/useAuth'
import { useApiResource } from '../hooks/useApiResource'
import { apiDelete, apiPut } from '../lib/api'
import type { Listing, Order, Shop } from '../types/api'
import { getErrorMessage } from '../utils/errorMessage'
import { formatDateTime, formatMoney, getListingImage } from '../utils/format'
import { withBasePath } from '../utils/navigation'

function buyerName(order: Order) {
  if (typeof order.buyerId !== 'object') return 'Buyer'
  return order.buyerId.name || order.buyerId.username || 'Buyer'
}

function buyerContact(order: Order) {
  if (typeof order.buyerId !== 'object') return ''
  return [order.buyerId.phone, order.buyerId.email].filter(Boolean).join(' / ')
}

function orderAddress(order: Order) {
  const address = order.delivery?.address
  return [address?.street, address?.city, address?.region].filter(Boolean).join(', ')
}

export function SellerDashboardPage() {
  const { user } = useAuth()
  const [deleteError, setDeleteError] = useState('')
  const [deletingId, setDeletingId] = useState('')
  const [orderActionId, setOrderActionId] = useState('')
  const [listingQuery, setListingQuery] = useState('')
  const [listingStatus, setListingStatus] = useState('')
  const [listingTypeFilter, setListingTypeFilter] = useState('')
  const shop = useApiResource<{ shop: Shop }>('/digishops/me', Boolean(user?.hasShop))
  const orders = useApiResource<{ orders: Order[] }>('/orders/me/selling', Boolean(user?.hasShop))
  const listings = useApiResource<{ listings: Listing[] }>('/listings/me', Boolean(user?.hasShop))

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
          body="Open a DigiShop to manage listings and seller orders."
          title="No DigiShop yet"
        />
      </AppShell>
    )
  }

  const totalRevenue = orders.data?.orders.reduce((sum, order) => (order.status === 'delivered' ? sum + order.totalAmount : sum), 0) || 0
  const filteredListings =
    listings.data?.listings.filter((listing) => {
      const haystack = [listing.title, listing.category, listing.brand, listing.status, listing.type].filter(Boolean).join(' ').toLowerCase()
      const matchesQuery = !listingQuery || haystack.includes(listingQuery.toLowerCase())
      const matchesStatus = !listingStatus || listing.status === listingStatus
      const matchesType = !listingTypeFilter || listing.type === listingTypeFilter
      return matchesQuery && matchesStatus && matchesType
    }) || []

  async function deleteListing(id: string) {
    if (!window.confirm('Remove this listing from the marketplace?')) return
    setDeleteError('')
    setDeletingId(id)
    try {
      await apiDelete(`/listings/${id}`)
      await listings.refetch()
    } catch (requestError) {
      setDeleteError(getErrorMessage(requestError, 'Unable to remove listing'))
    } finally {
      setDeletingId('')
    }
  }

  async function updateOrder(id: string, action: 'process' | 'shipped' | 'pickup-ready') {
    setOrderActionId(`${id}-${action}`)
    try {
      await apiPut(`/orders/${id}/${action}`, {})
      await orders.refetch()
    } catch (requestError) {
      setDeleteError(getErrorMessage(requestError, 'Unable to update order'))
    } finally {
      setOrderActionId('')
    }
  }

  return (
    <AppShell active="profile" searchPlaceholder="Search marketplace...">
      <div className="dashboard-head mb-5 flex flex-col gap-2 md:flex-row md:items-center md:justify-between [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:md:text-4xl [&_p]:text-sm [&_p]:leading-6 [&_p]:text-foose-muted [&_p]:md:text-base max-md:[&_h1]:text-2xl">
        <div>
          <h1>{shop.data?.shop.shopName || 'Manage shop'}</h1>
          <p>Orders, listings, inventory controls, and shop actions.</p>
          {shop.data?.shop.slug && <a href={withBasePath(`/shops/${shop.data.shop.slug}`)}>View public shop</a>}
        </div>
        <div className="button-row flex flex-wrap items-center gap-3">
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
      {deleteError && <ErrorState message={deleteError} />}
      <div className="stats-row grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon="money" label="Delivered revenue" value={formatMoney(totalRevenue)} note="Completed orders" />
        <StatCard icon="box" label="Active Orders" value={String(orders.data?.orders.length || 0)} note="Seller orders" />
        <StatCard icon="star" label="Shop Rating" value={`${shop.data?.shop.rating || 0} / 5.0`} note={`${shop.data?.shop.totalReviews || 0} reviews`} />
      </div>
      <div className="seller-grid grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] max-lg:grid-cols-1">
        <section>
          <SectionHeader title="Seller Orders" action={<a href="/manage-shop#orders">View All</a>} />
          {!orders.data?.orders.length && <EmptyState body="Paid orders will appear after buyers check out." title="No seller orders" />}
          {!!orders.data?.orders.length && (
            <div className="seller-orders space-y-4 [&_article.highlighted]:border-accent [&_article.highlighted]:bg-accent-light">
              {orders.data.orders.map((order) => (
                <article className="seller-order-card rounded-xl border border-foose-border bg-foose-surface p-4" id={`order-${order._id}`} key={order._id}>
                  <div>
                    <div className="badge-row flex flex-wrap items-center gap-3">
                      <Badge tone={order.status === 'disputed' ? 'danger' : 'accent'}>{order.status}</Badge>
                      <Badge tone={order.paymentStatus === 'paid' ? 'success' : 'warning'}>{order.paymentStatus || 'unpaid'}</Badge>
                      <Badge>{order.delivery?.method || 'delivery'}</Badge>
                    </div>
                    <h3>{order.items[0]?.title || 'Order item'}</h3>
                    <p>
                      {formatMoney(order.totalAmount, order.currency)}
                      {order.deliveryFee ? ` incl. ${formatMoney(order.deliveryFee, order.currency)} delivery` : ''}
                    </p>
                    <dl className="seller-order-meta grid gap-3 sm:grid-cols-2 [&_div]:rounded-lg [&_div]:bg-foose-surface-low [&_div]:p-3 [&_dt]:text-xs [&_dt]:font-bold [&_dt]:uppercase [&_dt]:tracking-widest [&_dt]:text-foose-faint [&_dd]:mt-1 [&_dd]:text-sm [&_dd]:font-semibold [&_dd]:text-foose-text">
                      <div>
                        <dt>Buyer</dt>
                        <dd>{buyerName(order)}</dd>
                      </div>
                      <div>
                        <dt>Contact</dt>
                        <dd>{buyerContact(order) || 'No contact saved'}</dd>
                      </div>
                      <div>
                        <dt>Address / pickup</dt>
                        <dd>{order.delivery?.method === 'delivery' ? orderAddress(order) || 'Address not provided' : orderAddress(order) || 'Pickup details pending'}</dd>
                      </div>
                      <div>
                        <dt>Action deadline</dt>
                        <dd>{formatDateTime(order.sellerActionDeadline)}</dd>
                      </div>
                    </dl>
                  </div>
                  <div className="table-actions flex flex-wrap items-center gap-3 justify-end">
                    {['pending', 'paid'].includes(order.status) && (
                      <button
                        className="button inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border px-5 py-2.5 text-center text-sm font-bold transition disabled:pointer-events-none disabled:opacity-50 [&.full]:w-full button-secondary border-foose-border bg-foose-surface text-foose-text hover:border-accent hover:text-accent"
                        disabled={orderActionId === `${order._id}-process`}
                        onClick={() => void updateOrder(order._id, 'process')}
                        type="button"
                      >
                        {orderActionId === `${order._id}-process` ? 'Processing...' : 'Accept'}
                      </button>
                    )}
                    {order.delivery?.method === 'delivery' && ['paid', 'processing'].includes(order.status) && (
                      <button
                        className="button inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border px-5 py-2.5 text-center text-sm font-bold transition disabled:pointer-events-none disabled:opacity-50 [&.full]:w-full button-primary border-accent bg-accent text-white shadow-md shadow-accent/15 hover:bg-accent-hover"
                        disabled={orderActionId === `${order._id}-shipped`}
                        onClick={() => void updateOrder(order._id, 'shipped')}
                        type="button"
                      >
                        {orderActionId === `${order._id}-shipped` ? 'Sending...' : 'Mark sent'}
                      </button>
                    )}
                    {order.delivery?.method === 'pickup' && ['pending', 'paid', 'processing'].includes(order.status) && (
                      <button
                        className="button inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border px-5 py-2.5 text-center text-sm font-bold transition disabled:pointer-events-none disabled:opacity-50 [&.full]:w-full button-primary border-accent bg-accent text-white shadow-md shadow-accent/15 hover:bg-accent-hover"
                        disabled={orderActionId === `${order._id}-pickup-ready`}
                        onClick={() => void updateOrder(order._id, 'pickup-ready')}
                        type="button"
                      >
                        {orderActionId === `${order._id}-pickup-ready` ? 'Updating...' : 'Pickup ready'}
                      </button>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
          <section className="home-section mx-auto w-full max-w-[1280px] my-8 rounded-xl border border-foose-border bg-foose-surface p-4 md:p-6 [&.no-pad]:p-0 [&>h2]:text-2xl [&>h2]:font-bold [&>h2]:md:text-4xl [&_a]:font-bold [&_a]:text-accent max-lg:rounded-lg max-lg:p-3 max-md:[&>h2]:text-2xl no-pad">
            <SectionHeader title="Shop listings" eyebrow="Search, filter, edit, or remove your inventory." />
            <div className="listing-manager-toolbar flex flex-col gap-3 sm:flex-row [&_input]:h-11 [&_input]:flex-1 [&_input]:px-3 [&_select]:h-11 [&_select]:flex-1 [&_select]:px-3">
              <input
                aria-label="Search shop listings"
                onChange={(event) => setListingQuery(event.target.value)}
                placeholder="Search your listings..."
                value={listingQuery}
              />
              <select aria-label="Filter by type" onChange={(event) => setListingTypeFilter(event.target.value)} value={listingTypeFilter}>
                <option value="">All types</option>
                <option value="retail">Retail</option>
                <option value="wholesale">Wholesale</option>
              </select>
              <select aria-label="Filter by status" onChange={(event) => setListingStatus(event.target.value)} value={listingStatus}>
                <option value="">All statuses</option>
                <option value="active">Active</option>
                <option value="draft">Draft</option>
                <option value="sold">Sold</option>
              </select>
            </div>
            {!listings.data?.listings.length && <EmptyState body="Create listings to manage inventory here." title="No listings yet" />}
            {!!listings.data?.listings.length && !filteredListings.length && (
              <EmptyState body="Adjust your listing search or filters." title="No listings match" />
            )}
            {!!filteredListings.length && (
              <div className="listing-manager-grid grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                {filteredListings.map((listing) => (
                  <article className="listing-manager-card rounded-xl border border-foose-border bg-foose-surface shadow-sm p-4 md:p-5 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:leading-tight [&_h3]:md:text-lg [&_small]:text-xs [&_small]:uppercase [&_small]:tracking-wide [&_small]:text-foose-faint flex flex-col gap-3 max-lg:rounded-lg max-lg:p-3" key={listing._id}>
                    <div className="listing-manager-image overflow-hidden rounded-lg bg-foose-surface-mid [&_img]:h-full [&_img]:w-full [&_img]:object-cover aspect-[4/3] image-frame">
                      {getListingImage(listing) ? <img alt={listing.title} src={getListingImage(listing)} /> : <span className="image-placeholder flex min-h-32 items-center justify-center bg-foose-surface-mid text-sm font-semibold text-foose-faint">No image</span>}
                    </div>
                    <div>
                      <div className="badge-row flex flex-wrap items-center gap-3">
                        <Badge tone={listing.type === 'wholesale' ? 'warning' : 'accent'}>{listing.type}</Badge>
                        <Badge tone={listing.status === 'sold' ? 'danger' : 'neutral'}>{listing.status || 'active'}</Badge>
                      </div>
                      <h3>{listing.title}</h3>
                      <p>{formatMoney(listing.price, listing.currency)}</p>
                      <small>
                        {listing.type === 'retail'
                          ? 'Single retail item'
                          : `${listing.quantity || 0} available / min ${listing.bulkMinQty || 1}`}
                      </small>
                    </div>
                    <div className="table-actions flex flex-wrap items-center gap-3 justify-end">
                      <a className="button inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border px-5 py-2.5 text-center text-sm font-bold transition disabled:pointer-events-none disabled:opacity-50 [&.full]:w-full button-secondary border-foose-border bg-foose-surface text-foose-text hover:border-accent hover:text-accent" href={withBasePath(`/listing/${listing._id}`)}>
                        View
                      </a>
                      <a className="button inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border px-5 py-2.5 text-center text-sm font-bold transition disabled:pointer-events-none disabled:opacity-50 [&.full]:w-full button-primary border-accent bg-accent text-white shadow-md shadow-accent/15 hover:bg-accent-hover" href={withBasePath(`/listings/${listing._id}/edit`)}>
                        Edit
                      </a>
                      <button className="button inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border px-5 py-2.5 text-center text-sm font-bold transition disabled:pointer-events-none disabled:opacity-50 [&.full]:w-full button-secondary border-foose-border bg-foose-surface text-foose-text hover:border-accent hover:text-accent" disabled={deletingId === listing._id} onClick={() => void deleteListing(listing._id)} type="button">
                        {deletingId === listing._id ? 'Removing...' : 'Remove'}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </section>
        <aside className="manage-card rounded-xl border border-foose-border bg-foose-surface shadow-sm p-4 md:p-5 [&_p]:text-xs [&_p]:uppercase [&_p]:tracking-wide [&_p]:text-foose-faint [&_a]:flex [&_a]:min-h-28 [&_a]:flex-col [&_a]:items-center [&_a]:justify-center [&_a]:gap-3 [&_a]:rounded-xl [&_a]:border [&_a]:border-foose-border [&_a]:bg-foose-surface [&_a]:p-4 [&_a]:text-center [&_a]:font-semibold [&_a]:hover:border-accent [&_a]:hover:text-accent">
          <h2>Manage Shop</h2>
          <a href="/listings/new">Create Listing</a>
          <a href="/open-shop">Shop Settings</a>
          <a href="/wallet">Wallet</a>
          <a href="/profile">Back to Profile</a>
        </aside>
      </div>
    </AppShell>
  )
}
