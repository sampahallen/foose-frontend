import { useState, type FormEvent } from 'react'
import { AppShell, Badge, ButtonLink, EmptyState, ErrorState, Icon, LoadingState, SectionHeader } from '../components'
import { useApiResource } from '../hooks/useApiResource'
import { apiPost } from '../lib/api'
import type { Order } from '../types/api'
import { formatDateTime, formatMoney } from '../utils/format'
import { isHistoricalOrder, orderAddress, participantContact, participantName } from '../utils/orderStatus'
import { getCurrentAppPathname, withBasePath } from '../utils/navigation'

function isSellerRoute() {
  return getCurrentAppPathname().startsWith('/manage-shop/orders')
}

function isHistoryRoute() {
  return getCurrentAppPathname().endsWith('/history')
}

function shopName(order: Order) {
  if (!order.shopId || typeof order.shopId === 'string') return 'Seller'
  return order.shopId.shopName || 'Seller'
}

function deliveryLine(order: Order) {
  if (order.delivery?.method === 'pickup') return orderAddress(order) || 'Pickup details pending'
  return orderAddress(order) || 'Delivery address pending'
}

function compactOrderTitle(order: Order) {
  if (order.items.length > 1) return 'Multiple items'
  return order.items[0]?.title || 'Order item'
}

export function OrderManagementPage() {
  const sellerMode = isSellerRoute()
  const historyMode = isHistoryRoute()
  const orders = useApiResource<{ orders: Order[] }>(sellerMode ? '/orders/me/selling' : '/orders/me/buying')
  const [reviewingOrderId, setReviewingOrderId] = useState('')
  const [reviewRating, setReviewRating] = useState(5)
  const [reviewComment, setReviewComment] = useState('')
  const [reviewBusyId, setReviewBusyId] = useState('')
  const [reviewError, setReviewError] = useState('')
  const allOrders = orders.data?.orders || []
  const visibleOrders = allOrders.filter((order) => (historyMode ? isHistoricalOrder(order) : !isHistoricalOrder(order)))
  const historyHref = sellerMode ? '/manage-shop/orders/history' : '/orders/history'
  const activeHref = sellerMode ? '/manage-shop/orders' : '/orders'

  async function submitReview(event: FormEvent<HTMLFormElement>, order: Order) {
    event.preventDefault()
    setReviewBusyId(order._id)
    setReviewError('')
    try {
      await apiPost('/reviews', {
        comment: reviewComment.trim() || undefined,
        orderId: order._id,
        rating: reviewRating,
      })
      setReviewingOrderId('')
      setReviewRating(5)
      setReviewComment('')
      await orders.refetch()
    } catch (error) {
      setReviewError(error instanceof Error ? error.message : 'Unable to save review')
    } finally {
      setReviewBusyId('')
    }
  }

  function renderBuyerActions(order: Order) {
    if (historyMode && order.status === 'delivered') {
      if (reviewingOrderId !== order._id) {
        return (
          <button
            className="button inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-foose-border bg-foose-surface px-5 py-2.5 text-center text-sm font-bold text-foose-text transition hover:border-accent hover:text-accent"
            onClick={() => {
              setReviewingOrderId(order._id)
              setReviewRating(5)
              setReviewComment('')
              setReviewError('')
            }}
            type="button"
          >
            Leave review
          </button>
        )
      }

      return (
        <form className="w-full rounded-xl border border-foose-border bg-foose-surface-low p-4" onSubmit={(event) => void submitReview(event, order)}>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <strong className="text-sm text-foose-text">Rate this seller</strong>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  aria-label={`${star} star rating`}
                  className={star <= reviewRating ? 'inline-flex text-accent [&_svg]:fill-current' : 'inline-flex text-foose-border'}
                  key={star}
                  onClick={() => setReviewRating(star)}
                  type="button"
                >
                  <Icon name="star" size={20} />
                </button>
              ))}
            </div>
          </div>
          <textarea
            className="min-h-24 w-full rounded-lg border border-foose-border bg-white p-3 text-sm text-foose-text outline-none focus:border-accent"
            maxLength={500}
            onChange={(event) => setReviewComment(event.target.value)}
            placeholder="Share how the order went..."
            value={reviewComment}
          />
          {reviewError && <p className="mt-2 text-sm font-semibold text-foose-danger">{reviewError}</p>}
          <div className="mt-3 flex flex-wrap justify-end gap-2">
            <button
              className="inline-flex min-h-10 items-center justify-center rounded-lg border border-foose-border bg-white px-4 text-sm font-bold text-foose-text hover:border-accent hover:text-accent"
              onClick={() => setReviewingOrderId('')}
              type="button"
            >
              Cancel
            </button>
            <button
              className="inline-flex min-h-10 items-center justify-center rounded-lg border border-accent bg-accent px-4 text-sm font-bold text-white hover:bg-accent-hover disabled:pointer-events-none disabled:opacity-50"
              disabled={reviewBusyId === order._id}
              type="submit"
            >
              {reviewBusyId === order._id ? 'Posting...' : 'Post review'}
            </button>
          </div>
        </form>
      )
    }

    return null
  }

  function renderOrder(order: Order) {
    return (
      <article className="flex flex-col rounded-xl border border-foose-border bg-foose-surface p-4 shadow-sm md:p-5">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <Badge tone={order.escrowStatus === 'held' ? 'warning' : order.escrowStatus === 'released' ? 'success' : 'neutral'}>{order.escrowStatus || 'not held'}</Badge>
              <Badge>{order.delivery?.method || 'delivery'}</Badge>
            </div>
            <h2 className="text-lg font-bold text-foose-text">{compactOrderTitle(order)}</h2>
            <p className="text-sm text-foose-muted">#{order._id.slice(-8)} - {order.createdAt ? formatDateTime(order.createdAt) : 'Order date pending'}</p>
          </div>
          <strong className="text-lg text-accent">{formatMoney(order.totalAmount, order.currency)}</strong>
        </div>
        <div className="flex flex-col gap-2 text-sm text-foose-muted">
          <p><strong className="text-foose-text">{sellerMode ? 'Buyer:' : 'Shop:'}</strong> {sellerMode ? participantName(order.buyerId, 'Buyer') : shopName(order)}</p>
          {sellerMode && <p><strong className="text-foose-text">Contact:</strong> {participantContact(order.buyerId) || 'No contact saved'}</p>}
          <p><strong className="text-foose-text">{order.delivery?.method === 'pickup' ? 'Pickup:' : 'Delivery:'}</strong> {deliveryLine(order)}</p>
          <p><strong className="text-foose-text">{historyMode ? 'Completed:' : 'Deadline:'}</strong> {historyMode ? formatDateTime(order.buyerConfirmedAt || order.releasedAt || order.updatedAt) : formatDateTime(order.sellerActionDeadline)}</p>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-end gap-3 self-end">
          {!sellerMode && renderBuyerActions(order)}
          <a className="button inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border px-5 py-2.5 text-center text-sm font-bold transition button-secondary border-foose-border bg-foose-surface text-foose-text hover:border-accent hover:text-accent" href={withBasePath(`/orders/${order._id}`)}>
            Details
          </a>
        </div>
      </article>
    )
  }

  return (
    <AppShell active="profile" searchPlaceholder="Search orders...">
      <div className="dashboard-head mb-8 flex flex-col gap-3 md:flex-row md:items-center md:justify-between [&_h1]:text-2xl [&_h1]:font-black [&_h1]:md:text-4xl [&_p]:text-sm [&_p]:leading-6 [&_p]:text-foose-muted">
        <div>
          <h1>{historyMode ? 'Order history' : sellerMode ? 'Seller orders' : 'Your orders'}</h1>
          <p>{historyMode ? 'Completed and closed orders stay here permanently.' : sellerMode ? 'Process seller orders and update fulfillment.' : 'Confirm received deliveries, completed pickups, escrow, and payment status.'}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <ButtonLink to={historyMode ? activeHref : historyHref} variant="secondary">
            {historyMode ? (
              'Active orders'
            ) : (
              <>
                <Icon name="clock" /> Order history
              </>
            )}
          </ButtonLink>
          {sellerMode && <ButtonLink to="/manage-shop" variant="ghost">Back to shop</ButtonLink>}
        </div>
      </div>
      {orders.loading && <LoadingState label="Loading orders..." />}
      {orders.error && <ErrorState message={orders.error} retry={orders.refetch} />}
      {!orders.loading && !orders.error && !visibleOrders.length && (
        <EmptyState
          action={historyMode ? <ButtonLink to={activeHref}>View active orders</ButtonLink> : !sellerMode ? <ButtonLink to="/browse">Browse listings</ButtonLink> : undefined}
          body={historyMode ? 'Completed orders will appear here after pickup or delivery is confirmed.' : 'Active orders will appear here when there is something to manage.'}
          title={historyMode ? 'No order history yet' : 'No active orders'}
        />
      )}
      {!!visibleOrders.length && (
        <section>
          <SectionHeader title={historyMode ? 'Closed orders' : 'Active order queue'} eyebrow={`${visibleOrders.length} ${visibleOrders.length === 1 ? 'order' : 'orders'}`} />
          <div className="grid gap-4 lg:grid-cols-2">
            {visibleOrders.map((order) => (
              <div key={order._id}>{renderOrder(order)}</div>
            ))}
          </div>
        </section>
      )}
    </AppShell>
  )
}
