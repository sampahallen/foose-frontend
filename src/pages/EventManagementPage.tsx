import { useMemo, useState } from 'react'
import { IoMegaphone } from 'react-icons/io5'
import { AppShell, Badge, ButtonLink, ConfirmDialog, Dialog, EventPromotionDialog, Icon, InlineNotice, LightboxImage, ProductCard, SafeImage, SectionHeader, SkeletonBlock, StatePanel, useToast } from '../components'
import { ManagementSkeleton } from '../components/operational/OperationalStates'
import { PRODUCT_GRID_CLASS } from '../components/marketplace/ProductCard'
import { NavigationBackButton } from '../components/navigation'
import { useApiResource } from '../hooks/useApiResource'
import { apiDelete, apiPost } from '../lib/api'
import type { Event, Listing } from '../types/api'
import { concreteEventListings, eventHostName, eventTimeLabel, eventTimeTerm, eventTypeLabel, eventWindowHasClosed, eventWindowHasOpened, isOnlinePopUp } from '../utils/events'
import { getErrorMessage } from '../utils/errorMessage'
import { formatDate, formatMoney, getListingImage } from '../utils/format'
import { getCurrentAppPathname, withBasePath } from '../utils/navigation'
import { navigateWithFlash } from '../utils/navigationFlash'
import { isActiveEventPromotion } from '../utils/promotions'

function eventIdFromPath() {
  const match = getCurrentAppPathname().match(/^\/community\/events\/([^/]+)\/manage/)
  return match ? decodeURIComponent(match[1]).trim() : ''
}

function attachedListingIds(listings: Listing[]) {
  return new Set(listings.map((listing) => listing._id))
}

function isPromoted(event: Event) {
  return isActiveEventPromotion(event.promotionTags, event.promotionExpiresAt, event.status)
}

export function EventManagementPage() {
  const { showToast } = useToast()
  const eventId = eventIdFromPath()
  const eventResource = useApiResource<{ event: Event }>(eventId ? `/community/events/${eventId}/manage` : null, Boolean(eventId))
  const event = eventResource.data?.event
  const onlineEvent = event ? isOnlinePopUp(event) : false
  // Only active listings make sense to offer for a live pop-up — a draft
  // isn't published yet and a sold item has no stock left to sell again.
  const sellerListings = useApiResource<{ listings: Listing[] }>('/listings/me?status=active&limit=100', Boolean(event && onlineEvent))
  const catalogListings = useMemo(() => (event ? concreteEventListings(event) : []), [event])
  const attachedIds = useMemo(() => attachedListingIds(catalogListings), [catalogListings])
  const availableListings = (sellerListings.data?.listings || []).filter((listing) => !attachedIds.has(listing._id))
  const [actionError, setActionError] = useState('')
  const [actionStatus, setActionStatus] = useState('')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [promotionDialogOpen, setPromotionDialogOpen] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [pickerQuery, setPickerQuery] = useState('')
  const [pendingListingId, setPendingListingId] = useState('')
  const catalogOpen = event ? eventWindowHasOpened(event) && !eventWindowHasClosed(event) : false
  const pickerListings = useMemo(() => {
    const query = pickerQuery.trim().toLowerCase()
    if (!query) return availableListings
    return availableListings.filter((listing) => listing.title.toLowerCase().includes(query))
  }, [availableListings, pickerQuery])

  async function refreshEvent() {
    await Promise.all([eventResource.refetch(), sellerListings.refetch()])
  }

  async function attachListing(listingId: string) {
    if (pendingListingId) return
    setActionError('')
    setActionStatus('')
    setPendingListingId(listingId)
    try {
      await apiPost(`/community/events/${eventId}/listings`, { listingId })
      setActionStatus('Listing added to the pop-up catalog.')
      await refreshEvent()
      showToast({ message: 'The listing is now part of this online pop-up.', title: 'Listing attached', tone: 'success' })
    } catch (err) {
      setActionError(getErrorMessage(err, 'Could not add listing to this event'))
    } finally {
      setPendingListingId('')
    }
  }

  async function removeListing(listingId: string) {
    setActionError('')
    setActionStatus('')
    try {
      await apiDelete(`/community/events/${eventId}/listings/${listingId}`)
      setActionStatus('Listing removed from the pop-up catalog.')
      await refreshEvent()
      showToast({ message: 'The listing was removed from this pop-up only.', title: 'Listing detached', tone: 'success' })
    } catch (err) {
      setActionError(getErrorMessage(err, 'Could not remove listing from this event'))
    }
  }

  async function deleteEvent() {
    if (!event) return
    setDeleteError('')
    setDeleteBusy(true)
    try {
      await apiDelete(`/community/events/${eventId}`)
      navigateWithFlash('/profile?tab=events', { message: 'The event was removed from your event list.', title: 'Event deleted', tone: 'success' })
    } catch (err) {
      setDeleteError(getErrorMessage(err, 'Could not delete this event'))
    } finally {
      setDeleteBusy(false)
    }
  }

  // Clicking the card itself already goes to the listing (same as Browse), so
  // the only extra action this view needs is detaching it from the pop-up.
  function renderCatalogCard(listing: Listing) {
    return (
      <div className="flex flex-col gap-2" key={listing._id}>
        <ProductCard listing={listing} manageHref={`/listings/${listing._id}/edit`} />
        <button className="button inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border px-5 py-2.5 text-center text-sm font-bold transition disabled:pointer-events-none disabled:opacity-50 [&.full]:w-full button-secondary border-foose-border bg-foose-surface text-foose-text hover:border-accent hover:text-accent" onClick={() => void removeListing(listing._id)} type="button">
          Remove from pop-up
        </button>
      </div>
    )
  }

  function renderPickerCard(listing: Listing) {
    const image = getListingImage(listing)
    const busy = pendingListingId === listing._id
    return (
      <button
        className="group flex flex-col overflow-hidden rounded-xl border-2 border-foose-border bg-foose-surface text-left transition hover:border-accent disabled:pointer-events-none disabled:opacity-60"
        disabled={Boolean(pendingListingId)}
        key={listing._id}
        onClick={() => void attachListing(listing._id)}
        type="button"
      >
        <div className="relative aspect-square w-full overflow-hidden bg-foose-surface-mid">
          <SafeImage alt="" className="h-full w-full object-cover" fallback="No image" fallbackClassName="text-xs" src={image} />
          <span className="absolute right-2 top-2 grid size-8 place-items-center rounded-full border-2 border-white bg-white/95 text-accent shadow transition group-hover:bg-accent group-hover:text-white">
            {busy ? <span aria-hidden className="size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" /> : <Icon name="plus" size={15} />}
          </span>
        </div>
        <div className="flex flex-1 flex-col gap-0.5 p-2.5">
          <span className="truncate text-xs font-bold text-foose-text">{listing.title}</span>
          <span className="text-xs font-black text-accent">{formatMoney(listing.price, listing.currency)}</span>
        </div>
      </button>
    )
  }

  return (
    <AppShell active="community" searchPlaceholder="Search events...">
      <div className="dashboard-head mb-5 flex flex-col gap-2 md:flex-row md:items-center md:justify-between [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:md:text-4xl [&_p]:text-sm [&_p]:leading-6 [&_p]:text-foose-muted [&_p]:md:text-base max-md:[&_h1]:text-2xl">
        <div>
          <NavigationBackButton className="mb-6" fallback={{ href: '/profile?tab=events', label: 'Profile events' }} />
          <h1>{event?.title || 'Event management'}</h1>
          {event && <p>{eventTimeLabel(event)} - {eventTypeLabel(event)}</p>}
        </div>
      </div>

      {!eventId && <StatePanel action={<ButtonLink to="/profile?tab=events">View profile events</ButtonLink>} body="This management link is missing an event id." layout="page" title="Event unavailable" tone="unavailable" />}
      {eventResource.initialLoading && <ManagementSkeleton label="Loading event workspace" />}
      {eventResource.error && !eventResource.data && <StatePanel action={<button className="button inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border px-5 py-2.5 text-center text-sm font-bold transition disabled:pointer-events-none disabled:opacity-50 [&.full]:w-full button-secondary border-foose-border bg-foose-surface text-foose-text hover:border-accent hover:text-accent" onClick={() => void eventResource.refetch()} type="button">Retry</button>} body={eventResource.error} layout="page" title="Event unavailable" tone="unavailable" />}
      {actionError && <InlineNotice title="Event action failed" tone="error">{actionError}</InlineNotice>}
      {actionStatus && <InlineNotice tone="success">{actionStatus}</InlineNotice>}

      {event && (
        <>
          <section className="event-management-summary grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px] max-lg:grid-cols-1">
            <div className="event-management-cover overflow-hidden rounded-xl border border-foose-border bg-foose-surface-mid [&_.lightbox-trigger]:h-full [&_.lightbox-trigger]:w-full [&_img]:h-full [&_img]:w-full [&_img]:object-contain aspect-[16/10]">
              {event.coverImage ? <LightboxImage alt={event.title} src={event.coverImage} /> : <span className="image-placeholder flex min-h-32 items-center justify-center bg-foose-surface-mid text-sm font-semibold text-foose-faint">No event banner</span>}
            </div>
            <div className="event-management-panel flex flex-col gap-5 rounded-xl border border-foose-border bg-foose-surface p-5 shadow-sm md:p-6 [&>h2]:text-2xl [&>h2]:font-bold [&>p]:text-sm [&>p]:leading-6 [&>p]:text-foose-muted">
              <div className="badge-row flex flex-wrap items-center gap-3">
                <Badge tone={event.status === 'ongoing' ? 'warning' : event.status === 'past' ? 'neutral' : 'accent'}>{event.status || 'upcoming'}</Badge>
                <Badge>{eventTypeLabel(event)}</Badge>
              </div>
              <h2>{event.title}</h2>
              <p>{event.description || 'No description added yet.'}</p>
              <dl className="event-detail-list grid gap-3 sm:grid-cols-2 [&_div]:rounded-lg [&_div]:bg-foose-surface-low [&_div]:p-3 [&_dt]:text-xs [&_dt]:font-bold [&_dt]:uppercase [&_dt]:tracking-widest [&_dt]:text-foose-faint [&_dd]:mt-1 [&_dd]:text-sm [&_dd]:font-semibold [&_dd]:text-foose-text">
                <div>
                  <dt>Host</dt>
                  <dd>{eventHostName(event)}</dd>
                </div>
                <div>
                  <dt>{eventTimeTerm(event)}</dt>
                  <dd>{eventTimeLabel(event)}</dd>
                </div>
                <div>
                  <dt>Location</dt>
                  <dd>{onlineEvent ? 'Hosted on Foose' : event.location || 'Location pending'}</dd>
                </div>
              </dl>
              <div className="table-actions flex flex-wrap items-center gap-3 justify-end">
                <ButtonLink to={`/community/events/${event._id}/edit`} variant="secondary">
                  Edit details
                </ButtonLink>
                {isPromoted(event) && <Badge tone="success">Promoted until {event.promotionExpiresAt ? formatDate(event.promotionExpiresAt) : 'event end'}</Badge>}
                {event.status !== 'past' && (
                  <button className="button inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border px-5 py-2.5 text-center text-sm font-bold transition disabled:pointer-events-none disabled:opacity-50 [&.full]:w-full button-secondary border-foose-border bg-foose-surface text-foose-text hover:border-accent hover:text-accent" onClick={() => setPromotionDialogOpen(true)} type="button">
                    <IoMegaphone /> {isPromoted(event) ? 'Extend promotion' : 'Promote event'}
                  </button>
                )}
                <button
                  className="button inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border px-5 py-2.5 text-center text-sm font-bold transition disabled:pointer-events-none disabled:opacity-50 [&.full]:w-full button-secondary border-foose-border bg-foose-surface text-foose-text hover:border-accent hover:text-accent"
                  onClick={() => {
                    setActionError('')
                    setDeleteError('')
                    setDeleteDialogOpen(true)
                  }}
                  type="button"
                >
                  Delete
                </button>
              </div>
            </div>
          </section>

          {onlineEvent ? (
            <section className="event-management-section rounded-xl border border-foose-border bg-foose-surface p-5">
              <SectionHeader
                action={(
                  <button className="button inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border px-5 py-2.5 text-center text-sm font-bold transition disabled:pointer-events-none disabled:opacity-50 [&.full]:w-full button-primary border-accent bg-accent text-white shadow-md shadow-accent/15 hover:bg-accent-hover" onClick={() => setPickerOpen(true)} type="button">
                    <Icon name="plus" size={16} /> Add items
                  </button>
                )}
                eyebrow={catalogOpen ? 'Shopping window is open' : 'Buyers can preview and cart these items before checkout opens'}
                title="Online pop-up catalog"
              />
              {!catalogListings.length && <StatePanel action={<button className="button inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border px-5 py-2.5 text-center text-sm font-bold transition disabled:pointer-events-none disabled:opacity-50 [&.full]:w-full button-secondary border-foose-border bg-foose-surface text-foose-text hover:border-accent hover:text-accent" onClick={() => setPickerOpen(true)} type="button">Add items</button>} body="Pick items from your catalog or create something new for this pop-up." layout="section" title="No pop-up listings yet" tone="empty" />}
              {!!catalogListings.length && <div className={PRODUCT_GRID_CLASS}>{catalogListings.map(renderCatalogCard)}</div>}
            </section>
          ) : (
            <section className="info-card rounded-xl border border-foose-border bg-foose-surface shadow-sm p-4 md:p-5 event-management-section p-5">
              <Icon name="calendar" />
              <div>
                <strong>In-person pop-up management</strong>
                <p>Edit the event details, promote it, or remove it from your event list.</p>
              </div>
            </section>
          )}
        </>
      )}
      {event && (
        <ConfirmDialog
          busy={deleteBusy}
          confirmLabel="Delete event"
          description={(
            <span className="grid gap-3">
              <span><strong>{event.title}</strong> will be removed from your event list and Community. This action cannot be undone.</span>
              {deleteError && <span className="rounded-xl border border-foose-danger/30 bg-foose-danger-bg/40 p-3 font-semibold text-foose-danger" role="alert">{deleteError}</span>}
            </span>
          )}
          onCancel={() => {
            if (!deleteBusy) {
              setDeleteDialogOpen(false)
              setDeleteError('')
            }
          }}
          onConfirm={() => void deleteEvent()}
          open={deleteDialogOpen}
          title="Delete this event?"
          tone="destructive"
        />
      )}
      <EventPromotionDialog event={promotionDialogOpen ? event || null : null} onClose={() => setPromotionDialogOpen(false)} />
      {event && (
        <Dialog
          description="Pick items from your catalog, or create something new just for this pop-up."
          onClose={() => {
            setPickerOpen(false)
            setPickerQuery('')
          }}
          open={pickerOpen}
          size="lg"
          title="Add items to the pop-up"
        >
          <div className="grid gap-4">
            <label className="relative block">
              <span className="sr-only">Search your catalog</span>
              <span aria-hidden className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-foose-faint"><Icon name="search" size={16} /></span>
              <input
                className="min-h-11 w-full rounded-xl border border-foose-border bg-foose-surface py-2 pl-10 pr-3 text-sm text-foose-text outline-none placeholder:text-foose-faint focus:border-accent focus:ring-2 focus:ring-accent/15"
                onChange={(input) => setPickerQuery(input.target.value)}
                placeholder="Search your catalog"
                type="search"
                value={pickerQuery}
              />
            </label>

            {actionError && <InlineNotice title="Could not add that listing" tone="error">{actionError}</InlineNotice>}

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <a
                className="flex aspect-square w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-foose-border p-3 text-center text-foose-muted transition hover:border-accent hover:bg-accent-light/40 hover:text-accent"
                href={withBasePath(`/listings/new?eventId=${encodeURIComponent(event._id)}`)}
              >
                <Icon name="plus" size={22} />
                <span className="text-xs font-bold leading-tight">New item for this pop-up</span>
              </a>

              {sellerListings.initialLoading && Array.from({ length: 5 }).map((_, index) => (
                <SkeletonBlock className="aspect-square rounded-xl" key={index} />
              ))}
              {pickerListings.map(renderPickerCard)}
            </div>

            {sellerListings.error && !sellerListings.data && (
              <StatePanel
                action={<button className="button inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border px-5 py-2.5 text-center text-sm font-bold transition disabled:pointer-events-none disabled:opacity-50 [&.full]:w-full button-secondary border-foose-border bg-foose-surface text-foose-text hover:border-accent hover:text-accent" onClick={() => void sellerListings.refetch()} type="button">Retry</button>}
                body={sellerListings.error}
                layout="section"
                title="Catalog unavailable"
                tone="error"
              />
            )}
            {!sellerListings.initialLoading && sellerListings.data && !pickerListings.length && (
              <p className="rounded-xl border border-foose-border bg-foose-surface-low p-4 text-center text-sm text-foose-muted">
                {pickerQuery
                  ? 'No catalog items match that search.'
                  : 'Every active listing is already in this pop-up — create a new one above to add more.'}
              </p>
            )}
          </div>
        </Dialog>
      )}
    </AppShell>
  )
}
