import {
  FloatingCreateButton,
  InlineNotice,
  OrderWorkflowCard,
  RefreshIndicator,
  SectionHeader,
  ShopAccessGate,
  ShopManagementLayout,
  ShopManagementPageHeader,
  StatCard,
  StatePanel,
} from '../components'
import { SellerOverviewSkeleton } from '../components/operational/OperationalStates'
import { useAuth } from '../hooks/useAuth'
import { useApiResource } from '../hooks/useApiResource'
import { useOrderRealtimeRefresh } from '../hooks/useOrderRealtimeRefresh'
import type { Order, Shop } from '../types/api'
import { formatMoney } from '../utils/format'
import { withBasePath } from '../utils/navigation'
import { isHistoricalOrder } from '../utils/orderStatus'

type SellerOrderSummary = {
  activeOrderCount: number
  releasedRevenue: number
}

function SellerOverviewPageBody() {
  const { user } = useAuth()
  const shop = useApiResource<{ shop: Shop }>('/digishops/me', Boolean(user?.hasShop))
  const orders = useApiResource<{ orders: Order[] }>('/orders/me/selling?bucket=active&limit=3&sort=urgency')
  const orderSummary = useApiResource<SellerOrderSummary>('/orders/me/selling/summary')
  useOrderRealtimeRefresh(async () => {
    await Promise.all([orders.refetch(), orderSummary.refetch()])
  }, Boolean(orders.data || orderSummary.data))

  const sellerOrders = orders.data?.orders || []
  const activeSellerOrders = sellerOrders.filter((order) => !isHistoricalOrder(order))
  const previewSellerOrders = activeSellerOrders.slice(0, 3)
  const remainingSellerOrders = Math.max(
    (orderSummary.data?.activeOrderCount || 0) - previewSellerOrders.length,
    0,
  )
  const totalRevenue = orderSummary.data?.releasedRevenue || 0
  const initialLoading = (shop.initialLoading && !shop.data) || (orders.initialLoading && !orders.data) || (orderSummary.initialLoading && !orderSummary.data)
  const unavailable = Boolean(shop.error || orders.error || orderSummary.error) && (!shop.data || !orders.data || !orderSummary.data)
  const refreshing = shop.refreshing || orders.refreshing || orderSummary.refreshing
  const error = shop.error || orders.error || orderSummary.error

  return (
    <ShopManagementLayout activePanel="overview" fab={<FloatingCreateButton href="/listings/new" label="Add listing" />}>
      <ShopManagementPageHeader
        description="A cleaner control room for orders, revenue, shop health, and next actions."
        meta={shop.data?.shop.slug && <a className="inline-flex min-h-11 items-center text-sm font-bold text-accent hover:underline" href={withBasePath(`/shops/${shop.data.shop.slug}`)}>View public shop</a>}
        title={shop.data?.shop.shopName || 'Manage shop'}
      />

      {initialLoading && <SellerOverviewSkeleton label="Loading seller workspace" />}
      <RefreshIndicator active={refreshing} label="Refreshing seller workspace" />
      {unavailable && (
        <StatePanel action={<button className="button inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border px-5 py-2.5 text-center text-sm font-bold transition disabled:pointer-events-none disabled:opacity-50 [&.full]:w-full button-secondary border-foose-border bg-foose-surface text-foose-text hover:border-accent hover:text-accent" onClick={() => void Promise.all([shop.refetch(), orders.refetch(), orderSummary.refetch()])} type="button">Retry</button>} body={error} layout="page" title="Seller workspace unavailable" tone="error" />
      )}
      {error && (shop.data || orders.data || orderSummary.data) && <InlineNotice title="Some seller data could not refresh" tone="warning">{error}</InlineNotice>}

      {!initialLoading && !unavailable && (
        <>
          <div aria-label="Shop summary" className="stats-row -mx-3 mb-6 flex snap-x snap-mandatory gap-3 overflow-x-auto px-3 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:mb-8 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0 sm:pb-0 [&>article]:min-w-[min(78vw,17rem)] [&>article]:snap-start sm:[&>article]:min-w-0">
            <StatCard icon="money" label="Delivered revenue" value={formatMoney(totalRevenue)} note="Completed orders" />
            <StatCard icon="box" label="Active Orders" value={String(orderSummary.data?.activeOrderCount || 0)} note="Seller orders" />
            <StatCard icon="star" label="Shop Rating" value={`${shop.data?.shop.rating || 0} / 5.0`} note={`${shop.data?.shop.totalReviews || 0} reviews`} />
          </div>
          <section className="-mx-3 rounded-none bg-transparent px-3 shadow-none sm:mx-0 sm:rounded-2xl sm:bg-foose-surface sm:p-4 sm:shadow-sm md:p-6">
            <SectionHeader title="Seller Orders" eyebrow="Latest paid items that need seller action." action={<a className="inline-flex min-h-11 items-center" href={withBasePath('/manage-shop/orders')}>{remainingSellerOrders ? `View all (${remainingSellerOrders} more)` : 'View all'}</a>} />
            {!previewSellerOrders.length && <StatePanel body="Paid orders will appear after buyers check out." layout="section" title="No seller orders" tone="empty" />}
            {!!previewSellerOrders.length && (
              <div className="seller-orders space-y-4 [&_article.highlighted]:border-accent [&_article.highlighted]:bg-accent-light">
                {previewSellerOrders.map((order) => (
                  <OrderWorkflowCard key={order._id} order={order} viewer="seller" />
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </ShopManagementLayout>
  )
}

export function SellerOverviewPage() {
  return (
    <ShopAccessGate>
      <SellerOverviewPageBody />
    </ShopAccessGate>
  )
}
