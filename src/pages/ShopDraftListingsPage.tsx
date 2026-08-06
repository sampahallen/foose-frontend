import { useDeferredValue, useMemo, useState } from 'react'
import { RiDraftLine } from 'react-icons/ri'
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
  useToast,
} from '../components'
import { ConfirmDialog } from '../components/forms/Dialog'
import { useAuth } from '../hooks/useAuth'
import { useApiResource } from '../hooks/useApiResource'
import { apiDelete } from '../lib/api'
import type { MyListingsResponse } from '../types/api'
import { getErrorMessage } from '../utils/errorMessage'
import type { ListingTypeFilter } from '../utils/listingFilters'

function ShopDraftListingsPageBody() {
  const { showToast } = useToast()
  const [query, setQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<ListingTypeFilter>('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [page, setPage] = useState(1)
  const [pendingDeleteId, setPendingDeleteId] = useState('')
  const [deletingId, setDeletingId] = useState('')
  const [deleteError, setDeleteError] = useState('')
  const deferredQuery = useDeferredValue(query.trim())
  const hasActiveFilters = Boolean(deferredQuery || typeFilter || dateFrom || dateTo)

  const endpoint = useMemo(() => {
    const parameters = new URLSearchParams({ page: String(page), status: 'draft' })
    if (deferredQuery) parameters.set('search', deferredQuery)
    if (typeFilter) parameters.set('type', typeFilter)
    if (dateFrom) parameters.set('dateFrom', dateFrom)
    if (dateTo) parameters.set('dateTo', dateTo)
    return `/listings/me?${parameters.toString()}`
  }, [dateFrom, dateTo, deferredQuery, page, typeFilter])

  const drafts = useApiResource<MyListingsResponse>(endpoint)
  const draftListings = drafts.data?.listings || []
  const total = drafts.data?.total ?? 0

  function clearFilters() {
    setQuery('')
    setTypeFilter('')
    setDateFrom('')
    setDateTo('')
    setPage(1)
  }

  async function deleteDraft(id: string) {
    setDeleteError('')
    setDeletingId(id)
    try {
      await apiDelete(`/listings/${id}`)
      setPendingDeleteId('')
      showToast({
        message: 'The unpublished listing was removed from your drafts.',
        title: 'Draft deleted',
        tone: 'success',
      })
      if (draftListings.length === 1 && page > 1) {
        setPage((value) => value - 1)
      } else {
        await drafts.refetch()
      }
    } catch (requestError) {
      setDeleteError(getErrorMessage(requestError, 'Unable to delete this draft'))
    } finally {
      setDeletingId('')
    }
  }

  return (
    <ShopManagementLayout activePanel="drafts" fab={<FloatingCreateButton href="/listings/new" label="Add listing" />}>
      <ShopManagementPageHeader description="Finish unpublished products here without mixing them into your live shop inventory." title="Draft listings" />

      <RefreshIndicator active={drafts.refreshing} label="Refreshing listing drafts" />
      {deleteError && <InlineNotice title="Draft was not deleted" tone="error">{deleteError}</InlineNotice>}
      {drafts.error && drafts.data && (
        <InlineNotice
          action={<button className="min-h-11 rounded-lg px-3 font-black text-accent hover:bg-accent-light" onClick={drafts.refetch} type="button">Retry</button>}
          title="Drafts could not refresh"
          tone="warning"
        >
          Your currently loaded drafts are still available below.
        </InlineNotice>
      )}

      <section aria-busy={drafts.initialLoading || undefined} className="rounded-none bg-transparent p-0 shadow-none sm:rounded-2xl sm:bg-foose-surface sm:p-4 sm:shadow-sm md:p-5">
        {drafts.initialLoading && !drafts.data && <ManagementListingRowsSkeleton label="Loading listing drafts" />}

        {drafts.error && !drafts.data && (
          <StatePanel
            action={<button className="inline-flex min-h-11 items-center justify-center rounded-lg border border-accent bg-accent px-5 text-sm font-bold text-white hover:bg-accent-hover" onClick={drafts.refetch} type="button">Retry</button>}
            body="We could not load your unpublished products. Nothing in your live shop was affected."
            layout="section"
            title="Draft listings unavailable"
            tone="error"
            visual={<RiDraftLine size={27} />}
          />
        )}

        {drafts.data && total === 0 && !hasActiveFilters && (
          <StatePanel
            body="Listings you save before publishing will stay here, separate from products shoppers can see. Use the round + button to start one."
            layout="section"
            title="No saved drafts"
            tone="empty"
            visual={<RiDraftLine size={27} />}
          />
        )}

        {drafts.data && (total > 0 || hasActiveFilters) && (
          <ListingFilterBar
            dateFrom={dateFrom}
            dateFromAriaLabel="Filter drafts from date"
            dateTo={dateTo}
            dateToAriaLabel="Filter drafts to date"
            onDateFromChange={(value) => { setDateFrom(value); setPage(1) }}
            onDateToChange={(value) => { setDateTo(value); setPage(1) }}
            onQueryChange={(value) => { setQuery(value); setPage(1) }}
            onTypeFilterChange={(value) => { setTypeFilter(value); setPage(1) }}
            query={query}
            searchAriaLabel="Search draft listings"
            searchLabel="Search drafts"
            typeAriaLabel="Filter drafts by type"
            typeFilter={typeFilter}
          />
        )}

        {drafts.data && total === 0 && hasActiveFilters && (
          <StatePanel
            action={<button className="inline-flex min-h-11 items-center justify-center rounded-lg border border-foose-border bg-foose-surface px-5 text-sm font-bold text-foose-text hover:border-accent hover:text-accent" onClick={clearFilters} type="button">Clear filters</button>}
            body="Try a broader title, product detail, listing type, or date range."
            layout="section"
            title="No drafts match"
            tone="empty"
            visual={<RiDraftLine size={27} />}
          />
        )}

        {drafts.data && !!draftListings.length && (
          <ul className="divide-y divide-foose-border overflow-hidden rounded-xl border border-foose-border bg-foose-surface sm:rounded-2xl">
            {draftListings.map((listing) => (
              <ManagementListingRow
                actions={(
                  <button
                    aria-label={deletingId === listing._id ? `Deleting ${listing.title}` : `Delete ${listing.title}`}
                    className="inline-flex items-center justify-center rounded-lg border border-foose-border bg-foose-surface text-foose-danger transition hover:border-foose-danger hover:bg-foose-danger-bg disabled:pointer-events-none disabled:opacity-50"
                    disabled={deletingId === listing._id}
                    onClick={() => setPendingDeleteId(listing._id)}
                    type="button"
                  >
                    <Icon name="trash" size={16} />
                  </button>
                )}
                href={`/listings/${listing._id}/edit`}
                key={listing._id}
                listing={listing}
              />
            ))}
          </ul>
        )}

        {drafts.data && drafts.data.pages > 1 && (
          <div className="mt-6 flex flex-col gap-3 border-t border-foose-border pt-4 text-sm text-foose-muted sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <span>
              Page {drafts.data.page} of {drafts.data.pages} · {total} drafts
            </span>
            <div className="grid w-full grid-cols-[1fr_auto_1fr] items-center gap-2 sm:flex sm:w-auto">
              <button className="min-h-11 min-w-11 rounded-lg border border-foose-border bg-foose-surface px-3 py-2 font-bold text-foose-text disabled:opacity-50" disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))} type="button">
                Previous
              </button>
              <span className="font-bold text-foose-text">
                {drafts.data.page} / {drafts.data.pages}
              </span>
              <button className="min-h-11 min-w-11 rounded-lg border border-foose-border bg-foose-surface px-3 py-2 font-bold text-foose-text disabled:opacity-50" disabled={page >= drafts.data.pages} onClick={() => setPage((value) => value + 1)} type="button">
                Next
              </button>
            </div>
          </div>
        )}
      </section>

      <ConfirmDialog
        busy={Boolean(deletingId)}
        confirmLabel="Delete draft"
        description="This permanently removes the unpublished listing. It will not affect any active or sold products."
        onCancel={() => setPendingDeleteId('')}
        onConfirm={() => void deleteDraft(pendingDeleteId)}
        open={Boolean(pendingDeleteId)}
        title="Delete this draft?"
        tone="destructive"
      />
    </ShopManagementLayout>
  )
}

export function ShopDraftListingsPage() {
  const { status } = useAuth()
  return (
    <ShopAccessGate
      loading={status === 'checking'}
      loadingContent={<ManagementListingRowsSkeleton label="Loading draft listings" />}
      noShopBody="Open a DigiShop before saving and managing listing drafts."
      noShopVisual={<RiDraftLine size={27} />}
    >
      <ShopDraftListingsPageBody />
    </ShopAccessGate>
  )
}
