import { useDeferredValue, useMemo, useState } from 'react'
import { IoReceiptOutline } from 'react-icons/io5'
import {
  FloatingCreateButton,
  Icon,
  InlineNotice,
  ListingFilterBar,
  ManagementListingRow,
  ManagementListingRowsSkeleton,
  RefreshIndicator,
  ShopAccessGate,
  ShopManagementLayout,
  ShopManagementPageHeader,
  StatePanel,
} from '../components'
import { useApiResource } from '../hooks/useApiResource'
import type { Listing, MyListingsResponse, Order } from '../types/api'
import { formatDateTime } from '../utils/format'
import type { ListingTypeFilter } from '../utils/listingFilters'
import { orderProgressLabel, participantName } from '../utils/orderStatus'

function listingIdValue(value: Listing | string | undefined) {
  if (!value) return ''
  return typeof value === 'string' ? value : value._id
}

function orderForListing(orders: Order[], listing: Listing) {
  return orders.find((order) => order.items.some((item) => listingIdValue(item.listingId) === listing._id || item.title === listing.title))
}

function SellerSoldListingsPageBody() {
  const [query, setQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<ListingTypeFilter>('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [page, setPage] = useState(1)
  const deferredQuery = useDeferredValue(query.trim())
  const hasActiveFilters = Boolean(deferredQuery || typeFilter || dateFrom || dateTo)

  const endpoint = useMemo(() => {
    const parameters = new URLSearchParams({ page: String(page), status: 'sold' })
    if (deferredQuery) parameters.set('search', deferredQuery)
    if (typeFilter) parameters.set('type', typeFilter)
    if (dateFrom) parameters.set('dateFrom', dateFrom)
    if (dateTo) parameters.set('dateTo', dateTo)
    return `/listings/me?${parameters.toString()}`
  }, [dateFrom, dateTo, deferredQuery, page, typeFilter])

  const listings = useApiResource<MyListingsResponse>(endpoint)
  const orders = useApiResource<{ orders: Order[] }>('/orders/me/selling?limit=100&sort=newest')

  const soldListings = listings.data?.listings || []
  const total = listings.data?.total ?? 0
  const sellerOrders = orders.data?.orders || []

  function clearFilters() {
    setQuery('')
    setTypeFilter('')
    setDateFrom('')
    setDateTo('')
    setPage(1)
  }

  return (
    <ShopManagementLayout activePanel="sold" fab={<FloatingCreateButton href="/listings/new" label="Add listing" />}>
      <ShopManagementPageHeader description="Review sold listings and the orders attached to them." title="Sold items" />

      <RefreshIndicator active={listings.refreshing || orders.refreshing} label="Refreshing sold items" />

      <section className="rounded-none bg-transparent p-0 shadow-none sm:rounded-2xl sm:bg-foose-surface sm:p-4 sm:shadow-sm md:p-5">
        {((listings.initialLoading && !listings.data) || (listings.data && soldListings.length > 0 && orders.initialLoading && !orders.data)) && <ManagementListingRowsSkeleton label="Loading sold listings and order details" />}
        {listings.error && !listings.data && (
          <StatePanel
            action={<button className="inline-flex min-h-11 items-center justify-center rounded-lg border border-accent bg-accent px-5 text-sm font-bold text-white" onClick={listings.refetch} type="button">Retry</button>}
            body="Your sold inventory could not be loaded. Order management remains available."
            layout="section"
            title="Sold listings unavailable"
            tone="error"
            visual={<IoReceiptOutline size={26} />}
          />
        )}
        {listings.data && (total > 0 || hasActiveFilters) && (
          <ListingFilterBar
            dateFrom={dateFrom}
            dateTo={dateTo}
            onDateFromChange={(value) => { setDateFrom(value); setPage(1) }}
            onDateToChange={(value) => { setDateTo(value); setPage(1) }}
            onQueryChange={(value) => { setQuery(value); setPage(1) }}
            onTypeFilterChange={(value) => { setTypeFilter(value); setPage(1) }}
            query={query}
            searchAriaLabel="Search sold listings"
            searchLabel="Search sold items"
            typeFilter={typeFilter}
          />
        )}
        {listings.data && total === 0 && !hasActiveFilters && <StatePanel body="Sold listings will appear here after checkout." layout="section" title="No sold items yet" tone="empty" visual={<IoReceiptOutline size={26} />} />}
        {listings.data && total === 0 && hasActiveFilters && (
          <StatePanel
            action={<button className="inline-flex min-h-11 items-center justify-center rounded-lg border border-foose-border bg-white px-5 text-sm font-bold text-foose-text hover:border-accent hover:text-accent" onClick={clearFilters} type="button">Clear filters</button>}
            body="Try a broader search, another listing type, or a wider date range."
            layout="section"
            title="No sold items match"
            tone="empty"
            visual={<Icon name="filter" size={26} />}
          />
        )}
        {orders.error && !orders.data && listings.data && !!soldListings.length && (
          <InlineNotice className="mb-4" title="Order details could not load" tone="warning">Sold products remain visible below. Retry from the notice above to restore buyer and order information.</InlineNotice>
        )}
        {listings.data && !!soldListings.length && (!orders.initialLoading || Boolean(orders.error)) && (
          <ul className="divide-y divide-foose-border overflow-hidden rounded-xl border border-foose-border bg-foose-surface sm:rounded-2xl">
            {soldListings.map((listing) => {
              const order = orderForListing(sellerOrders, listing)
              const orderLine = order?.items.find((item) => listingIdValue(item.listingId) === listing._id || item.title === listing.title)
              const buyer = order ? participantName(order.buyerId, 'Buyer') : 'Order pending'
              const status = order ? orderProgressLabel(order) : 'Sold'
              const soldOn = formatDateTime(order?.createdAt || listing.updatedAt)

              return (
                <ManagementListingRow
                  href={order ? `/orders/${order._id}` : undefined}
                  key={listing._id}
                  listing={listing}
                  meta={`${buyer} · ${status} · ${soldOn}`}
                  price={orderLine?.price ?? listing.price}
                />
              )
            })}
          </ul>
        )}
        {listings.data && listings.data.pages > 1 && (
          <div className="mt-6 flex flex-col gap-3 border-t border-foose-border pt-4 text-sm text-foose-muted sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <span>
              Page {listings.data.page} of {listings.data.pages} · {total} sold items
            </span>
            <div className="grid w-full grid-cols-[1fr_auto_1fr] items-center gap-2 sm:flex sm:w-auto">
              <button className="min-h-11 min-w-11 rounded-lg border border-foose-border bg-white px-3 py-2 font-bold text-foose-text disabled:opacity-50" disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))} type="button">
                Previous
              </button>
              <span className="font-bold text-foose-text">
                {listings.data.page} / {listings.data.pages}
              </span>
              <button className="min-h-11 min-w-11 rounded-lg border border-foose-border bg-white px-3 py-2 font-bold text-foose-text disabled:opacity-50" disabled={page >= listings.data.pages} onClick={() => setPage((value) => value + 1)} type="button">
                Next
              </button>
            </div>
          </div>
        )}
      </section>
    </ShopManagementLayout>
  )
}

export function SellerSoldListingsPage() {
  return (
    <ShopAccessGate>
      <SellerSoldListingsPageBody />
    </ShopAccessGate>
  )
}
