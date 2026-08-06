import { useDeferredValue, useMemo, useState } from 'react'
import {
  ButtonLink,
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
  useToast,
} from '../components'
import { ConfirmDialog } from '../components/forms/Dialog'
import { useApiResource } from '../hooks/useApiResource'
import { apiDelete } from '../lib/api'
import type { MyListingsResponse } from '../types/api'
import { getErrorMessage } from '../utils/errorMessage'
import type { ListingTypeFilter } from '../utils/listingFilters'
import { withBasePath } from '../utils/navigation'

function SellerListingsPageBody() {
  const { showToast } = useToast()
  const [query, setQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<ListingTypeFilter>('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [page, setPage] = useState(1)
  const [deletingId, setDeletingId] = useState('')
  const [pendingDeleteId, setPendingDeleteId] = useState('')
  const [deleteError, setDeleteError] = useState('')
  const deferredQuery = useDeferredValue(query.trim())
  const hasActiveFilters = Boolean(deferredQuery || typeFilter || dateFrom || dateTo)

  const endpoint = useMemo(() => {
    const parameters = new URLSearchParams({ page: String(page), status: 'active' })
    if (deferredQuery) parameters.set('search', deferredQuery)
    if (typeFilter) parameters.set('type', typeFilter)
    if (dateFrom) parameters.set('dateFrom', dateFrom)
    if (dateTo) parameters.set('dateTo', dateTo)
    return `/listings/me?${parameters.toString()}`
  }, [dateFrom, dateTo, deferredQuery, page, typeFilter])

  const listings = useApiResource<MyListingsResponse>(endpoint)
  const activeListings = listings.data?.listings || []
  const total = listings.data?.total ?? 0

  function clearFilters() {
    setQuery('')
    setTypeFilter('')
    setDateFrom('')
    setDateTo('')
    setPage(1)
  }

  async function deleteListing(id: string) {
    setDeleteError('')
    setDeletingId(id)
    try {
      await apiDelete(`/listings/${id}`)
      setPendingDeleteId('')
      showToast({ message: 'The listing was removed from your shop inventory.', title: 'Listing removed', tone: 'success' })
      if (activeListings.length === 1 && page > 1) {
        setPage((value) => value - 1)
      } else {
        await listings.refetch()
      }
    } catch (requestError) {
      setDeleteError(getErrorMessage(requestError, 'Unable to remove listing'))
    } finally {
      setDeletingId('')
    }
  }

  return (
    <ShopManagementLayout activePanel="listings" fab={<FloatingCreateButton href="/listings/new" label="Add listing" />}>
      <ShopManagementPageHeader
        actions={<ButtonLink className="w-full sm:w-auto" to="/manage-shop/promotions" variant="primary"><Icon name="megaphone" /> Promote listings</ButtonLink>}
        description="Search, filter, promote, edit, and manage the products currently live in your shop."
        title="Active listings"
      />

      <RefreshIndicator active={listings.refreshing} label="Refreshing active listings" />
      {deleteError && <InlineNotice title="Action failed" tone="error">{deleteError}</InlineNotice>}

      <section className="mx-auto w-full max-w-[1280px] rounded-none bg-transparent p-0 shadow-none sm:rounded-2xl sm:bg-foose-surface sm:p-4 sm:shadow-sm md:p-5">
        {listings.initialLoading && !listings.data && <ManagementListingRowsSkeleton label="Loading active shop listings" />}
        {listings.error && !listings.data && (
          <StatePanel
            action={<button className="inline-flex min-h-11 items-center justify-center rounded-lg border border-accent bg-accent px-5 text-sm font-bold text-white" onClick={listings.refetch} type="button">Retry</button>}
            body="Your active shop inventory could not be loaded. Drafts and sold items remain on their own pages."
            layout="section"
            title="Active listings unavailable"
            tone="error"
            visual={<Icon name="grid" size={26} />}
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
            searchAriaLabel="Search active listings"
            typeFilter={typeFilter}
          />
        )}
        {listings.data && total === 0 && !hasActiveFilters && <StatePanel body="Publish a listing with the round + button to start filling your active shop inventory. Saved drafts live on the Drafts page." layout="section" title="No active listings yet" tone="empty" visual={<Icon name="grid" size={26} />} />}
        {listings.data && total === 0 && hasActiveFilters && (
          <StatePanel
            action={<button className="inline-flex min-h-11 items-center justify-center rounded-lg border border-foose-border bg-foose-surface px-5 text-sm font-bold text-foose-text hover:border-accent hover:text-accent" onClick={clearFilters} type="button">Clear filters</button>}
            body="Try a broader search, another listing type, or a wider date range."
            layout="section"
            title="No active listings match"
            tone="empty"
            visual={<Icon name="filter" size={26} />}
          />
        )}
        {listings.data && !!activeListings.length && (
          <ul className="divide-y divide-foose-border overflow-hidden rounded-xl border border-foose-border bg-foose-surface sm:rounded-2xl">
            {activeListings.map((listing) => (
              <ManagementListingRow
                actions={(
                  <>
                    <a aria-label={`Edit ${listing.title}`} className="inline-flex items-center justify-center rounded-lg border border-foose-border bg-foose-surface text-accent transition hover:border-accent hover:bg-accent hover:text-white" href={withBasePath(`/listings/${listing._id}/edit`)}>
                      <Icon name="pencil" size={16} />
                    </a>
                    <button
                      aria-label={deletingId === listing._id ? `Removing ${listing.title}` : `Remove ${listing.title}`}
                      className="inline-flex items-center justify-center rounded-lg border border-foose-border bg-foose-surface text-foose-danger transition hover:border-foose-danger hover:bg-foose-danger-bg disabled:pointer-events-none disabled:opacity-50"
                      disabled={deletingId === listing._id}
                      onClick={() => setPendingDeleteId(listing._id)}
                      type="button"
                    >
                      <Icon name="trash" size={16} />
                    </button>
                  </>
                )}
                href={`/listing/${listing._id}`}
                key={listing._id}
                listing={listing}
              />
            ))}
          </ul>
        )}
        {listings.data && listings.data.pages > 1 && (
          <div className="mt-6 flex flex-col gap-3 border-t border-foose-border pt-4 text-sm text-foose-muted sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <span>
              Page {listings.data.page} of {listings.data.pages} · {total} listings
            </span>
            <div className="grid w-full grid-cols-[1fr_auto_1fr] items-center gap-2 sm:flex sm:w-auto">
              <button className="min-h-11 min-w-11 rounded-lg border border-foose-border bg-foose-surface px-3 py-2 font-bold text-foose-text disabled:opacity-50" disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))} type="button">
                Previous
              </button>
              <span className="font-bold text-foose-text">
                {listings.data.page} / {listings.data.pages}
              </span>
              <button className="min-h-11 min-w-11 rounded-lg border border-foose-border bg-foose-surface px-3 py-2 font-bold text-foose-text disabled:opacity-50" disabled={page >= listings.data.pages} onClick={() => setPage((value) => value + 1)} type="button">
                Next
              </button>
            </div>
          </div>
        )}
      </section>

      <ConfirmDialog
        busy={Boolean(deletingId)}
        confirmLabel="Remove listing"
        description="This removes the listing from active marketplace inventory. This action cannot be undone."
        onCancel={() => setPendingDeleteId('')}
        onConfirm={() => void deleteListing(pendingDeleteId)}
        open={Boolean(pendingDeleteId)}
        title="Remove this listing?"
        tone="destructive"
      />
    </ShopManagementLayout>
  )
}

export function SellerListingsPage() {
  return (
    <ShopAccessGate>
      <SellerListingsPageBody />
    </ShopAccessGate>
  )
}
