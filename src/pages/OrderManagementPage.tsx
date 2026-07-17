import { useState, type FormEvent } from 'react'
import { AppShell, Badge, ButtonLink, FloatingCreateButton, Icon, InlineNotice, SectionHeader, ShopManagementMobileNav, ShopManagementSidebar, StatePanel, SubmitButton, TextAreaField, useToast } from '../components'
import { OrderListSkeleton } from '../components/operational/OperationalStates'
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
  const { showToast } = useToast()
  const sellerMode = isSellerRoute()
  const historyMode = isHistoryRoute()
  const orders = useApiResource<{ orders: Order[] }>(sellerMode ? '/orders/me/selling' : '/orders/me/buying')
  const [reviewingOrderId, setReviewingOrderId] = useState('')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true)
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
      showToast({ message: 'Your feedback is now visible on the seller profile.', title: 'Review posted', tone: 'success' })
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
            className="button inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-foose-border bg-foose-surface px-5 py-2.5 text-center text-sm font-bold text-foose-text transition hover:border-accent hover:text-accent sm:w-auto"
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
        <form aria-busy={reviewBusyId === order._id} className="w-full rounded-2xl border border-foose-border bg-foose-surface-low p-3 sm:p-4" noValidate onSubmit={(event) => void submitReview(event, order)}>
          <fieldset className="mb-4 grid gap-2">
            <legend className="text-sm font-bold text-foose-text">Rate this seller</legend>
            <div aria-label="Seller rating" className="flex max-w-64 items-center justify-between gap-0" role="radiogroup">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  aria-checked={reviewRating === star}
                  aria-label={`${star} star rating`}
                  className={`inline-flex min-h-11 min-w-11 items-center justify-center rounded-full transition hover:bg-accent-light focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent ${star <= reviewRating ? 'text-accent [&_svg]:fill-current' : 'text-foose-border'}`}
                  key={star}
                  onClick={() => setReviewRating(star)}
                  role="radio"
                  type="button"
                >
                  <Icon name="star" size={20} />
                </button>
              ))}
            </div>
          </fieldset>
          <TextAreaField
            id={`order-review-${order._id}`}
            label="Review"
            maxLength={500}
            onChange={(event) => setReviewComment(event.target.value)}
            optional
            placeholder="Share how the order went..."
            size="compact"
            value={reviewComment}
          />
          {reviewError && <InlineNotice className="mt-3" title="Could not post your review" tone="error">{reviewError}</InlineNotice>}
          <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-foose-border bg-white px-4 text-sm font-bold text-foose-text transition hover:border-accent hover:text-accent"
              disabled={reviewBusyId === order._id}
              onClick={() => setReviewingOrderId('')}
              type="button"
            >
              Cancel
            </button>
            <SubmitButton loading={reviewBusyId === order._id} loadingLabel="Posting review…">Post review</SubmitButton>
          </div>
        </form>
      )
    }

    return null
  }

  function renderOrder(order: Order) {
    return (
      <article className="flex min-w-0 flex-col rounded-xl border border-foose-border bg-foose-surface p-3 shadow-sm sm:p-4 md:p-5">
        <div className="mb-4 grid min-w-0 gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <Badge tone={order.escrowStatus === 'held' ? 'warning' : order.escrowStatus === 'released' ? 'success' : 'neutral'}>{order.escrowStatus || 'not held'}</Badge>
              <Badge>{order.delivery?.method || 'delivery'}</Badge>
            </div>
            <h2 className="break-words text-lg font-bold text-foose-text">{compactOrderTitle(order)}</h2>
            <p className="break-words text-sm text-foose-muted">#{order._id.slice(-8)} - {order.createdAt ? formatDateTime(order.createdAt) : 'Order date pending'}</p>
          </div>
          <strong className="break-words text-lg text-accent sm:text-right">{formatMoney(order.totalAmount, order.currency)}</strong>
        </div>
        <div className="flex min-w-0 flex-col gap-2 text-sm text-foose-muted [&_p]:min-w-0 [&_p]:break-words [&_p]:[overflow-wrap:anywhere]">
          <p><strong className="text-foose-text">{sellerMode ? 'Buyer:' : 'Shop:'}</strong> {sellerMode ? participantName(order.buyerId, 'Buyer') : shopName(order)}</p>
          {sellerMode && <p><strong className="text-foose-text">Contact:</strong> {participantContact(order.buyerId) || 'No contact saved'}</p>}
          <p><strong className="text-foose-text">{order.delivery?.method === 'pickup' ? 'Pickup:' : 'Delivery:'}</strong> {deliveryLine(order)}</p>
          <p><strong className="text-foose-text">{historyMode ? 'Completed:' : 'Deadline:'}</strong> {historyMode ? formatDateTime(order.buyerConfirmedAt || order.releasedAt || order.updatedAt) : formatDateTime(order.sellerActionDeadline)}</p>
        </div>
        <div className="mt-4 flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
          {!sellerMode && renderBuyerActions(order)}
          <a className="button inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border px-5 py-2.5 text-center text-sm font-bold transition button-secondary border-foose-border bg-foose-surface text-foose-text hover:border-accent hover:text-accent sm:w-auto" href={withBasePath(`/orders/${order._id}`)}>
            Details
          </a>
        </div>
      </article>
    )
  }

  return (
    <AppShell active={sellerMode ? 'shop' : 'profile'} searchPlaceholder="Search orders..." showFooter={!sellerMode}>
      {sellerMode && <ShopManagementSidebar activePanel="orders" collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed((value) => !value)} />}
      <div className={sellerMode ? `${sidebarCollapsed ? 'lg:pl-24' : 'lg:pl-72'} min-w-0 pb-16 lg:pb-0` : ''}>
        {sellerMode && <ShopManagementMobileNav activePanel="orders" />}
      <div className="dashboard-head mb-5 flex min-w-0 flex-col gap-3 border-b border-foose-border pb-5 md:mb-8 md:flex-row md:items-end md:justify-between [&_h1]:break-words [&_h1]:text-2xl [&_h1]:font-black [&_h1]:md:text-4xl [&_p]:text-sm [&_p]:leading-6 [&_p]:text-foose-muted">
        <div className="min-w-0">
          <h1>{historyMode ? 'Order history' : sellerMode ? 'Seller orders' : 'Your orders'}</h1>
          <p>{historyMode ? 'Completed and closed orders stay here permanently.' : sellerMode ? 'Process seller orders and update fulfillment.' : 'Confirm received deliveries, completed pickups, escrow, and payment status.'}</p>
        </div>
        <div className="grid w-full gap-2 sm:w-auto">
          <ButtonLink className="w-full sm:w-auto" to={historyMode ? activeHref : historyHref} variant="secondary">
            {historyMode ? (
              'Active orders'
            ) : (
              <>
                <Icon name="clock" /> Order history
              </>
            )}
          </ButtonLink>
        </div>
      </div>
      {orders.initialLoading && <OrderListSkeleton label="Loading orders" />}
      {orders.error && !orders.data && <StatePanel action={<button className="button button-secondary min-h-11 px-5" onClick={() => void orders.refetch()} type="button">Retry</button>} body={orders.error} layout="section" title="Orders unavailable" tone="error" />}
      {orders.refreshing && orders.data && <InlineNotice tone="info">Refreshing order activity…</InlineNotice>}
      {!orders.loading && !orders.error && !visibleOrders.length && (
        <StatePanel
          action={historyMode ? <ButtonLink to={activeHref}>View active orders</ButtonLink> : !sellerMode ? <ButtonLink to="/browse">Browse listings</ButtonLink> : undefined}
          body={historyMode ? 'Completed orders will appear here after pickup or delivery is confirmed.' : 'Active orders will appear here when there is something to manage.'}
          layout="section"
          title={historyMode ? 'No order history yet' : 'No active orders'}
          tone="empty"
        />
      )}
      {!!visibleOrders.length && (
        <section>
          <SectionHeader title={historyMode ? 'Closed orders' : 'Active order queue'} eyebrow={`${visibleOrders.length} ${visibleOrders.length === 1 ? 'order' : 'orders'}`} />
          <div className="grid gap-4 md:grid-cols-2">
            {visibleOrders.map((order) => (
              <div className="min-w-0" key={order._id}>{renderOrder(order)}</div>
            ))}
          </div>
        </section>
      )}
      </div>
      {sellerMode && <FloatingCreateButton href="/listings/new" label="Add listing" />}
    </AppShell>
  )
}
