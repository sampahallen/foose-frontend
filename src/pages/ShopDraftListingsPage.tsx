import { useState } from 'react'
import { RiDraftLine } from 'react-icons/ri'
import {
  AppShell,
  ButtonLink,
  FloatingCreateButton,
  Icon,
  InlineNotice,
  ManagementListingCard,
  ManagementListingMasonry,
  ManagementListingMasonrySkeleton,
  RefreshIndicator,
  SelectControl,
  ShopManagementMobileNav,
  ShopManagementSidebar,
  StatePanel,
  useToast,
} from '../components'
import { ConfirmDialog } from '../components/forms/Dialog'
import { NavigationBackButton } from '../components/navigation'
import { useAuth } from '../hooks/useAuth'
import { useApiResource } from '../hooks/useApiResource'
import { apiDelete } from '../lib/api'
import type { Listing } from '../types/api'
import { getErrorMessage } from '../utils/errorMessage'
import { withBasePath } from '../utils/navigation'

export function ShopDraftListingsPage() {
  const { status, user } = useAuth()
  const { showToast } = useToast()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true)
  const [query, setQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [pendingDeleteId, setPendingDeleteId] = useState('')
  const [deletingId, setDeletingId] = useState('')
  const [deleteError, setDeleteError] = useState('')
  const drafts = useApiResource<{ listings: Listing[] }>('/listings/me?status=draft', Boolean(user?.hasShop))
  const draftListings = (drafts.data?.listings || []).filter((listing) => listing.status === 'draft')
  const normalizedQuery = query.trim().toLocaleLowerCase()
  const filteredDrafts = draftListings.filter((listing) => {
    const haystack = [listing.title, listing.category, listing.brand, listing.type, listing.size, listing.gender, listing.color]
      .filter(Boolean)
      .join(' ')
      .toLocaleLowerCase()
    const createdAt = listing.createdAt ? new Date(listing.createdAt).getTime() : 0
    const fromTimestamp = dateFrom ? new Date(`${dateFrom}T00:00:00`).getTime() : 0
    const toTimestamp = dateTo ? new Date(`${dateTo}T23:59:59`).getTime() : 0

    return (!normalizedQuery || haystack.includes(normalizedQuery))
      && (!typeFilter || listing.type === typeFilter)
      && (!fromTimestamp || Boolean(createdAt && createdAt >= fromTimestamp))
      && (!toTimestamp || Boolean(createdAt && createdAt <= toTimestamp))
  })

  function clearFilters() {
    setQuery('')
    setTypeFilter('')
    setDateFrom('')
    setDateTo('')
  }

  async function deleteDraft(id: string) {
    setDeleteError('')
    setDeletingId(id)
    try {
      await apiDelete(`/listings/${id}`)
      await drafts.refetch()
      setPendingDeleteId('')
      showToast({
        message: 'The unpublished listing was removed from your drafts.',
        title: 'Draft deleted',
        tone: 'success',
      })
    } catch (requestError) {
      setDeleteError(getErrorMessage(requestError, 'Unable to delete this draft'))
    } finally {
      setDeletingId('')
    }
  }

  if (status === 'checking' || !user) {
    return (
      <AppShell active="profile" showFooter={false}>
        <NavigationBackButton className="mb-5" fallback={{ href: '/manage-shop/listings', label: 'Active listings' }} />
        <ManagementListingMasonrySkeleton label="Loading draft listings" />
      </AppShell>
    )
  }

  if (!user.isKycVerified) {
    return (
      <AppShell active="profile">
        <NavigationBackButton className="mb-5" fallback={{ href: '/manage-shop/listings', label: 'Active listings' }} />
        <StatePanel
          action={<ButtonLink to="/kyc">Start KYC</ButtonLink>}
          body="Approved identity verification is required before managing DigiShop listing drafts."
          layout="page"
          title="KYC required"
          tone="permission"
        />
      </AppShell>
    )
  }

  if (!user.hasShop) {
    return (
      <AppShell active="profile">
        <NavigationBackButton className="mb-5" fallback={{ href: '/manage-shop/listings', label: 'Active listings' }} />
        <StatePanel
          action={<ButtonLink to="/open-shop">Open your DigiShop</ButtonLink>}
          body="Open a DigiShop before saving and managing listing drafts."
          layout="page"
          title="No DigiShop yet"
          tone="empty"
          visual={<RiDraftLine size={27} />}
        />
      </AppShell>
    )
  }

  return (
    <AppShell active="shop" searchPlaceholder="Search marketplace..." showFooter={false}>
      <ShopManagementSidebar activePanel="drafts" collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed((value) => !value)} />
      <div className={`${sidebarCollapsed ? 'lg:pl-24' : 'lg:pl-72'} min-w-0 pb-16 lg:pb-0`}>
        <ShopManagementMobileNav activePanel="drafts" />
        <NavigationBackButton className="mb-4" fallback={{ href: '/manage-shop/listings', label: 'Active listings' }} />

        <header className="mb-5 flex min-w-0 flex-col gap-3 border-b border-foose-border pb-5 sm:mb-6">
          <div className="min-w-0">
            <span aria-hidden="true" className="mb-3 inline-flex size-10 items-center justify-center rounded-full bg-accent-light text-xl text-accent sm:size-11 sm:text-2xl">
              <RiDraftLine />
            </span>
            <h1 className="break-words font-display text-2xl font-semibold text-foose-text md:text-4xl">Draft listings</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-foose-muted md:text-base">Finish unpublished products here without mixing them into your live shop inventory.</p>
          </div>
        </header>

        <RefreshIndicator active={drafts.refreshing} label="Refreshing listing drafts" />
        {deleteError && <InlineNotice title="Draft was not deleted" tone="error">{deleteError}</InlineNotice>}
        {drafts.error && drafts.data && (
          <InlineNotice
            action={<button className="min-h-11 rounded-lg px-3 font-black text-accent hover:bg-white" onClick={drafts.refetch} type="button">Retry</button>}
            title="Drafts could not refresh"
            tone="warning"
          >
            Your currently loaded drafts are still available below.
          </InlineNotice>
        )}

        <section aria-busy={drafts.initialLoading || undefined} className="rounded-none bg-transparent p-0 shadow-none sm:rounded-2xl sm:bg-foose-surface sm:p-4 sm:shadow-sm md:p-5">
          {drafts.initialLoading && !drafts.data && <ManagementListingMasonrySkeleton label="Loading listing drafts" />}

          {drafts.error && !drafts.data && (
            <StatePanel
              actions={(
                <>
                  <button className="inline-flex min-h-11 items-center justify-center rounded-lg border border-accent bg-accent px-5 text-sm font-bold text-white hover:bg-accent-hover" onClick={drafts.refetch} type="button">Retry</button>
                  <ButtonLink to="/manage-shop/listings" variant="secondary">View active listings</ButtonLink>
                </>
              )}
              body="We could not load your unpublished products. Nothing in your live shop was affected."
              layout="section"
              title="Draft listings unavailable"
              tone="error"
              visual={<RiDraftLine size={27} />}
            />
          )}

          {drafts.data && !draftListings.length && (
            <StatePanel
              body="Listings you save before publishing will stay here, separate from products shoppers can see. Use the round + button to start one."
              layout="section"
              title="No saved drafts"
              tone="empty"
              visual={<RiDraftLine size={27} />}
            />
          )}

          {drafts.data && !!draftListings.length && (
            <div className="mb-5 grid min-w-0 grid-cols-1 gap-3 rounded-xl bg-foose-surface-low p-3 min-[360px]:grid-cols-2 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_150px_150px_150px] [&_input]:h-11 [&_input]:min-w-0 [&_input]:w-full [&_input]:rounded-lg [&_input]:border [&_input]:border-foose-border [&_input]:bg-white [&_input]:px-3 [&_input]:text-sm [&_input]:outline-none [&_input]:focus:border-accent [&_label]:grid [&_label]:min-w-0 [&_label]:gap-1 [&_label_span]:text-xs [&_label_span]:font-bold [&_label_span]:text-foose-muted">
              <label className="col-span-full sm:col-span-1">
                <span>Search drafts</span>
                <input aria-label="Search draft listings" onChange={(event) => setQuery(event.target.value)} placeholder="Search drafts" value={query} />
              </label>
              <div className="col-span-full grid min-w-0 gap-1 sm:col-span-1">
                <span className="text-xs font-bold text-foose-muted">Listing type</span>
                <SelectControl aria-label="Filter drafts by type" onChange={(event) => setTypeFilter(event.target.value)} value={typeFilter} variant="filter">
                  <option value="">All types</option>
                  <option value="retail">Retail</option>
                  <option value="wholesale">Wholesale</option>
                </SelectControl>
              </div>
              <label>
                <span>Start date</span>
                <input aria-label="Filter drafts from date" onChange={(event) => setDateFrom(event.target.value)} type="date" value={dateFrom} />
              </label>
              <label>
                <span>End date</span>
                <input aria-label="Filter drafts to date" onChange={(event) => setDateTo(event.target.value)} type="date" value={dateTo} />
              </label>
            </div>
          )}

          {drafts.data && !!draftListings.length && !filteredDrafts.length && (
            <StatePanel
              action={<button className="inline-flex min-h-11 items-center justify-center rounded-lg border border-foose-border bg-white px-5 text-sm font-bold text-foose-text hover:border-accent hover:text-accent" onClick={clearFilters} type="button">Clear filters</button>}
              body="Try a broader title, product detail, listing type, or date range."
              layout="section"
              title="No drafts match"
              tone="empty"
              visual={<RiDraftLine size={27} />}
            />
          )}

          {drafts.data && !!filteredDrafts.length && (
            <ManagementListingMasonry>
              {filteredDrafts.map((listing) => (
                <ManagementListingCard
                  actions={(
                    <>
                      <a className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-accent bg-accent px-4 text-sm font-bold text-white transition hover:bg-accent-hover sm:flex-none" href={withBasePath(`/listings/${listing._id}/edit`)}>
                        <Icon name="pencil" size={16} /> Continue editing
                      </a>
                      <button
                        aria-label={deletingId === listing._id ? `Deleting ${listing.title}` : `Delete ${listing.title}`}
                        className="inline-flex size-11 items-center justify-center rounded-lg border border-foose-border bg-white text-foose-danger transition hover:border-foose-danger hover:bg-foose-danger-bg disabled:pointer-events-none disabled:opacity-50"
                        disabled={deletingId === listing._id}
                        onClick={() => setPendingDeleteId(listing._id)}
                        type="button"
                      >
                        <Icon name="trash" size={17} />
                      </button>
                    </>
                  )}
                  key={listing._id}
                  listing={listing}
                />
              ))}
            </ManagementListingMasonry>
          )}
        </section>
      </div>

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
      <FloatingCreateButton href="/listings/new" label="Add listing" />
    </AppShell>
  )
}
