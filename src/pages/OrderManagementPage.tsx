import { useDeferredValue, useMemo, useState, type FormEvent } from 'react'
import {
  AppShell,
  ButtonLink,
  Dialog,
  FloatingCreateButton,
  Icon,
  InlineNotice,
  OrderWorkflowCard,
  SectionHeader,
  ShopManagementLayout,
  ShopManagementPageHeader,
  StatePanel,
  SubmitButton,
  TextAreaField,
  useToast,
} from '../components'
import { OrderListSkeleton } from '../components/operational/OperationalStates'
import { useApiResource } from '../hooks/useApiResource'
import { useOrderAutoRefresh } from '../hooks/useOrderAutoRefresh'
import { useOrderRealtimeRefresh } from '../hooks/useOrderRealtimeRefresh'
import { apiGet, apiPost } from '../lib/api'
import type { Order } from '../types/api'
import {
  isHistoricalOrder,
  orderBucket,
  orderTitle,
  type OrderBucket,
  type OrderViewer,
} from '../utils/orderStatus'
import { getCurrentAppPathname } from '../utils/navigation'

type OrdersResponse = {
  nextCursor?: string | null
  orders: Order[]
}

type PaginationState = {
  endpoint: string
  nextCursor: string | null
  orders: Order[]
}

const bucketOptions: Array<{ label: string; value: OrderBucket }> = [
  { label: 'Needs action', value: 'needs_action' },
  { label: 'In progress', value: 'in_progress' },
  { label: 'Under review', value: 'under_review' },
  { label: 'History', value: 'history' },
]

function isSellerRoute() {
  return getCurrentAppPathname().startsWith('/manage-shop/orders')
}

function isHistoryRoute() {
  return getCurrentAppPathname().endsWith('/history')
}

function dedupeOrders(orders: Order[]) {
  return Array.from(new Map(orders.map((order) => [order._id, order])).values())
}

function searchableOrder(order: Order) {
  const shop = typeof order.shopId === 'object' ? order.shopId.shopName : ''
  const shopSlug = typeof order.shopId === 'object' ? order.shopId.slug : ''
  const buyer = typeof order.buyerId === 'object' ? `${order.buyerId.name} ${order.buyerId.email} ${order.buyerId.username}` : ''
  return `${order._id} ${order.paymentRef || ''} ${order.items.map((item) => item.title).join(' ')} ${shop} ${shopSlug} ${buyer}`.toLowerCase()
}

function deadlineTime(order: Order) {
  const value = order.workflow?.deadline?.at
  if (!value) return Number.POSITIVE_INFINITY
  const timestamp = new Date(value).getTime()
  return Number.isFinite(timestamp) ? timestamp : Number.POSITIVE_INFINITY
}

function OrderManagementContent({
  historyMode,
  sellerMode,
}: {
  historyMode: boolean
  sellerMode: boolean
}) {
  const { showToast } = useToast()
  const viewer: OrderViewer = sellerMode ? 'seller' : 'buyer'
  const [bucket, setBucket] = useState<OrderBucket>(historyMode ? 'history' : 'needs_action')
  const [method, setMethod] = useState<'all' | 'station_pickup' | 'shop_pickup' | 'airport_to_airport'>('all')
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<'urgent' | 'newest'>('urgent')
  const deferredQuery = useDeferredValue(query.trim())
  const endpoint = useMemo(() => {
    const base = sellerMode ? '/orders/me/selling' : '/orders/me/buying'
    const parameters = new URLSearchParams({
      bucket,
      limit: '30',
      sort: sort === 'urgent' ? 'urgency' : 'newest',
    })
    if (method !== 'all') parameters.set('method', method)
    if (deferredQuery) parameters.set('search', deferredQuery)
    return `${base}?${parameters.toString()}`
  }, [bucket, deferredQuery, method, sellerMode, sort])
  const orders = useApiResource<OrdersResponse>(endpoint)
  const [pagination, setPagination] = useState<PaginationState>({
    endpoint: '',
    nextCursor: null,
    orders: [],
  })
  const [loadingMore, setLoadingMore] = useState(false)
  const [reviewingOrder, setReviewingOrder] = useState<Order | null>(null)
  const [reviewRating, setReviewRating] = useState(5)
  const [reviewComment, setReviewComment] = useState('')
  const [reviewBusy, setReviewBusy] = useState(false)
  const [reviewError, setReviewError] = useState('')
  const activePagination = pagination.endpoint === endpoint ? pagination : null
  const allOrders = useMemo(
    () => dedupeOrders([...(orders.data?.orders || []), ...(activePagination?.orders || [])]),
    [activePagination?.orders, orders.data?.orders],
  )

  useOrderAutoRefresh(orders.refetch, Boolean(orders.data))
  useOrderRealtimeRefresh(orders.refetch, Boolean(orders.data))

  const effectiveCursor = activePagination ? activePagination.nextCursor : orders.data?.nextCursor
  const visibleOrders = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    return allOrders
      .filter((order) => orderBucket(order, viewer) === bucket)
      .filter((order) => method === 'all' || order.delivery?.method === method)
      .filter((order) => !normalizedQuery || searchableOrder(order).includes(normalizedQuery))
      .sort((left, right) => {
        if (sort === 'urgent') {
          const urgency = deadlineTime(left) - deadlineTime(right)
          if (urgency) return urgency
        }
        return new Date(right.createdAt || 0).getTime() - new Date(left.createdAt || 0).getTime()
      })
  }, [allOrders, bucket, method, query, sort, viewer])

  async function loadMore() {
    if (!effectiveCursor || loadingMore) return
    setLoadingMore(true)
    try {
      const joiner = endpoint.includes('?') ? '&' : '?'
      const response = await apiGet<OrdersResponse>(
        `${endpoint}${joiner}cursor=${encodeURIComponent(effectiveCursor)}`,
      )
      setPagination((current) => {
        const priorOrders = current.endpoint === endpoint ? current.orders : []
        return {
          endpoint,
          nextCursor: response.nextCursor || null,
          orders: dedupeOrders([...priorOrders, ...(response.orders || [])]),
        }
      })
    } catch (error) {
      showToast({
        message: error instanceof Error ? error.message : 'Unable to load more orders',
        title: 'More orders unavailable',
        tone: 'error',
      })
    } finally {
      setLoadingMore(false)
    }
  }

  async function submitReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!reviewingOrder) return
    setReviewBusy(true)
    setReviewError('')
    try {
      await apiPost('/reviews', {
        comment: reviewComment.trim() || undefined,
        orderId: reviewingOrder._id,
        rating: reviewRating,
      })
      setReviewingOrder(null)
      setReviewComment('')
      setReviewRating(5)
      showToast({
        message: 'Your feedback is now visible on the seller profile.',
        title: 'Review posted',
        tone: 'success',
      })
    } catch (error) {
      setReviewError(error instanceof Error ? error.message : 'Unable to save review')
    } finally {
      setReviewBusy(false)
    }
  }

  function reviewAction(order: Order) {
    if (sellerMode || bucket !== 'history' || !isHistoricalOrder(order) || order.fulfillmentStatus === 'cancelled') {
      return undefined
    }
    return (
      <button
        className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-foose-border bg-white px-4 text-sm font-black text-foose-text transition hover:border-accent hover:text-accent sm:w-auto"
        onClick={() => {
          setReviewingOrder(order)
          setReviewComment('')
          setReviewError('')
          setReviewRating(5)
        }}
        type="button"
      >
        Leave review
      </button>
    )
  }

  const pageContent = (
    <>
      <ShopManagementPageHeader
        actions={(
          <ButtonLink
            className="w-full sm:w-auto"
            to={historyMode ? (sellerMode ? '/manage-shop/orders' : '/orders') : (sellerMode ? '/manage-shop/orders/history' : '/orders/history')}
            variant="secondary"
          >
            <Icon name={historyMode ? 'arrow' : 'clock'} />
            {historyMode ? 'Active orders' : 'Order history'}
          </ButtonLink>
        )}
        description={sellerMode
          ? 'See what needs you now, upload waybills, and follow every payment through settlement.'
          : 'Track station pickup, shop pickup, express delivery, protected payments, refunds, and reports from one place.'}
        eyebrow={sellerMode ? 'Seller fulfilment' : 'Buying activity'}
        title={historyMode ? 'Order history' : sellerMode ? 'Seller orders' : 'Your orders'}
      />

      {orders.initialLoading && <OrderListSkeleton label="Loading orders" />}
        {orders.error && !orders.data && (
          <StatePanel
            action={<button className="button button-secondary min-h-11 px-5" onClick={() => void orders.refetch()} type="button">Retry</button>}
            body={orders.error}
            layout="section"
            title="Orders unavailable"
            tone="error"
          />
        )}
        {orders.refreshing && orders.data && <InlineNotice tone="info">Refreshing order activity…</InlineNotice>}

        {orders.data && (
          <>
            <nav aria-label="Order status groups" className="-mx-3 mb-5 overflow-x-auto px-3 pb-1 [scrollbar-width:none] sm:mx-0 sm:px-0">
              <div className="inline-flex min-w-max gap-2 rounded-2xl border border-foose-border bg-foose-surface-low p-1.5">
                {bucketOptions.map((option) => (
                  <button
                    aria-current={bucket === option.value ? 'page' : undefined}
                    className={`inline-flex min-h-11 items-center gap-2 rounded-xl px-3.5 text-sm font-black transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${bucket === option.value ? 'bg-accent text-white shadow-sm' : 'text-foose-muted hover:bg-white hover:text-foose-text'}`}
                    key={option.value}
                    onClick={() => setBucket(option.value)}
                    type="button"
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </nav>

            <section aria-label="Filter orders" className="mb-6 grid gap-3 rounded-2xl border border-foose-border bg-white p-3 shadow-sm sm:grid-cols-[minmax(0,1fr)_180px_180px] sm:p-4">
              <label className="relative min-w-0">
                <span className="sr-only">Search orders</span>
                <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-foose-faint"><Icon name="search" size={18} /></span>
                <input
                  className="min-h-11 w-full rounded-xl border border-foose-border bg-white py-2 pl-10 pr-3 text-base text-foose-text outline-none placeholder:text-foose-faint focus:border-accent focus:ring-2 focus:ring-accent/15 sm:text-sm"
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search item titles"
                  type="search"
                  value={query}
                />
              </label>
              <label className="grid gap-1">
                <span className="sr-only">Fulfilment method</span>
                <select
                  className="min-h-11 rounded-xl border border-foose-border bg-white px-3 text-sm font-bold text-foose-text outline-none focus:border-accent focus:ring-2 focus:ring-accent/15"
                  onChange={(event) => setMethod(event.target.value as typeof method)}
                  value={method}
                >
                  <option value="all">All methods</option>
                  <option value="station_pickup">Station pickup</option>
                  <option value="shop_pickup">Shop pickup</option>
                  <option value="airport_to_airport">Express delivery</option>
                </select>
              </label>
              <label className="grid gap-1">
                <span className="sr-only">Sort orders</span>
                <select
                  className="min-h-11 rounded-xl border border-foose-border bg-white px-3 text-sm font-bold text-foose-text outline-none focus:border-accent focus:ring-2 focus:ring-accent/15"
                  onChange={(event) => setSort(event.target.value as typeof sort)}
                  value={sort}
                >
                  <option value="urgent">Most urgent</option>
                  <option value="newest">Newest first</option>
                </select>
              </label>
            </section>

            {!visibleOrders.length ? (
              <StatePanel
                action={query || method !== 'all'
                  ? <button className="button button-secondary min-h-11 px-5" onClick={() => { setQuery(''); setMethod('all') }} type="button">Clear filters</button>
                  : bucket === 'history' && !sellerMode
                    ? <ButtonLink to="/browse">Browse listings</ButtonLink>
                    : undefined}
                body={query || method !== 'all'
                  ? 'No orders in this group match the current filters.'
                  : bucket === 'needs_action'
                    ? 'You are all caught up. New actions will appear here.'
                    : bucket === 'under_review'
                      ? 'Orders with a submitted report will appear here while funds are frozen.'
                      : bucket === 'history'
                        ? 'Completed, cancelled, and refunded orders will appear here.'
                        : 'Orders waiting on another person or the system will appear here.'}
                layout="section"
                title={query || method !== 'all' ? 'No matching orders' : `No ${bucketOptions.find((option) => option.value === bucket)?.label.toLowerCase()} orders`}
                tone="empty"
              />
            ) : (
              <section>
                <SectionHeader
                  eyebrow={`${visibleOrders.length} ${visibleOrders.length === 1 ? 'order' : 'orders'}`}
                  title={bucketOptions.find((option) => option.value === bucket)?.label || 'Orders'}
                />
                <div className="grid gap-4 lg:grid-cols-2">
                  {visibleOrders.map((order) => (
                    <OrderWorkflowCard action={reviewAction(order)} key={order._id} order={order} viewer={viewer} />
                  ))}
                </div>
              </section>
            )}

            {effectiveCursor && (
              <div className="mt-6 flex justify-center">
                <button
                  className="inline-flex min-h-11 items-center justify-center rounded-xl border border-foose-border bg-white px-5 text-sm font-black text-foose-text transition hover:border-accent hover:text-accent disabled:opacity-60"
                  disabled={loadingMore}
                  onClick={() => void loadMore()}
                  type="button"
                >
                  {loadingMore ? 'Loading more…' : 'Load more orders'}
                </button>
              </div>
            )}
          </>
        )}
    </>
  )

  const reviewDialog = (
      <Dialog
        description={reviewingOrder ? `Share feedback for ${orderTitle(reviewingOrder)}.` : undefined}
        footer={(
          <>
            <button
              className="rounded-xl border border-foose-border bg-white px-5 text-sm font-bold text-foose-text"
              disabled={reviewBusy}
              onClick={() => setReviewingOrder(null)}
              type="button"
            >
              Cancel
            </button>
            <SubmitButton form="order-review-form" loading={reviewBusy} loadingLabel="Posting review…">Post review</SubmitButton>
          </>
        )}
        onClose={() => setReviewingOrder(null)}
        open={Boolean(reviewingOrder)}
        size="sm"
        title="Review this seller"
      >
        <form className="space-y-4" id="order-review-form" onSubmit={(event) => void submitReview(event)}>
          <fieldset>
            <legend className="text-sm font-black text-foose-text">Rating</legend>
            <div aria-label="Seller rating" className="mt-2 flex" role="radiogroup">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  aria-checked={reviewRating === star}
                  aria-label={`${star} star rating`}
                  className={`grid min-h-11 min-w-11 place-items-center rounded-full transition hover:bg-accent-light ${star <= reviewRating ? 'text-accent [&_svg]:fill-current' : 'text-foose-border'}`}
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
            id="order-review-comment"
            label="Review"
            maxLength={500}
            onChange={(event) => setReviewComment(event.target.value)}
            optional
            placeholder="Share how the order went…"
            value={reviewComment}
          />
          {reviewError && <InlineNotice title="Could not post your review" tone="error">{reviewError}</InlineNotice>}
        </form>
      </Dialog>
  )

  if (sellerMode) {
    return (
      <ShopManagementLayout activePanel="orders" fab={<FloatingCreateButton href="/listings/new" label="Add listing" />}>
        {pageContent}
        {reviewDialog}
      </ShopManagementLayout>
    )
  }

  return (
    <AppShell active="profile" searchPlaceholder="Search marketplace…">
      {pageContent}
      {reviewDialog}
    </AppShell>
  )
}

export function OrderManagementPage() {
  const sellerMode = isSellerRoute()
  const historyMode = isHistoryRoute()
  const routeIdentity = `${sellerMode ? 'seller' : 'buyer'}:${historyMode ? 'history' : 'active'}`
  return <OrderManagementContent historyMode={historyMode} key={routeIdentity} sellerMode={sellerMode} />
}
