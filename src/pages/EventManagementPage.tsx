import { useMemo, useState } from 'react'
import { IoMegaphone } from 'react-icons/io5'
import { AppShell, Badge, ButtonLink, EmptyState, ErrorState, Icon, LightboxImage, LoadingState, SectionHeader, SelectControl } from '../components'
import { useApiResource } from '../hooks/useApiResource'
import { apiDelete, apiPost } from '../lib/api'
import type { Event, Listing } from '../types/api'
import { concreteEventListings, eventHostName, eventTimeLabel, eventTimeTerm, eventTypeLabel, eventWindowHasClosed, eventWindowHasOpened, isOnlinePopUp } from '../utils/events'
import { getErrorMessage } from '../utils/errorMessage'
import { formatMoney, getListingImage, listingMeta } from '../utils/format'
import { getCurrentAppPathname, navigateTo, withBasePath } from '../utils/navigation'
import { eventPromotionPackages, startPromotionCheckout, type PromotionPackageName } from '../utils/promotions'

function eventIdFromPath() {
  const match = getCurrentAppPathname().match(/^\/community\/events\/([^/]+)\/manage/)
  return match ? decodeURIComponent(match[1]).trim() : ''
}

function attachedListingIds(listings: Listing[]) {
  return new Set(listings.map((listing) => listing._id))
}

function isPromoted(event: Event) {
  if (event.status === 'past') return false
  if (event.promotionExpiresAt && new Date(event.promotionExpiresAt).getTime() <= Date.now()) return false
  return Boolean(event.promotionTags?.some((tag) => ['featured', 'home-featured', 'home-banner'].includes(tag)))
}

export function EventManagementPage() {
  const eventId = eventIdFromPath()
  const eventResource = useApiResource<{ event: Event }>(eventId ? `/community/events/${eventId}/manage` : null, Boolean(eventId))
  const event = eventResource.data?.event
  const onlineEvent = event ? isOnlinePopUp(event) : false
  const sellerListings = useApiResource<{ listings: Listing[] }>('/listings/me', Boolean(event && onlineEvent))
  const catalogListings = useMemo(() => (event ? concreteEventListings(event) : []), [event])
  const attachedIds = useMemo(() => attachedListingIds(catalogListings), [catalogListings])
  const availableListings = (sellerListings.data?.listings || []).filter((listing) => !attachedIds.has(listing._id))
  const [selectedListingId, setSelectedListingId] = useState('')
  const [actionError, setActionError] = useState('')
  const [actionStatus, setActionStatus] = useState('')
  const [eventPromotionPackage, setEventPromotionPackage] = useState<PromotionPackageName>('basic')
  const catalogOpen = event ? eventWindowHasOpened(event) && !eventWindowHasClosed(event) : false

  async function refreshEvent() {
    await Promise.all([eventResource.refetch(), sellerListings.refetch()])
  }

  async function attachListing() {
    if (!selectedListingId) return
    setActionError('')
    setActionStatus('')
    try {
      await apiPost(`/community/events/${eventId}/listings`, { listingId: selectedListingId })
      setSelectedListingId('')
      setActionStatus('Listing added to the pop-up catalog.')
      await refreshEvent()
    } catch (err) {
      setActionError(getErrorMessage(err, 'Could not add listing to this event'))
    }
  }

  async function removeListing(listingId: string) {
    setActionError('')
    setActionStatus('')
    try {
      await apiDelete(`/community/events/${eventId}/listings/${listingId}`)
      setActionStatus('Listing removed from the pop-up catalog.')
      await refreshEvent()
    } catch (err) {
      setActionError(getErrorMessage(err, 'Could not remove listing from this event'))
    }
  }

  async function promoteEvent() {
    if (!event) return
    setActionError('')
    setActionStatus('')
    try {
      await startPromotionCheckout('event', event._id, eventPromotionPackage)
    } catch (err) {
      setActionError(getErrorMessage(err, 'Could not start event promotion'))
    }
  }

  async function deleteEvent() {
    if (!window.confirm('Delete this event?')) return
    setActionError('')
    try {
      await apiDelete(`/community/events/${eventId}`)
      navigateTo('/community?tab=events&scope=mine')
    } catch (err) {
      setActionError(getErrorMessage(err, 'Could not delete this event'))
    }
  }

  function renderCatalogCard(listing: Listing) {
    const image = getListingImage(listing)
    return (
      <article className="event-catalog-card rounded-xl border border-foose-border bg-foose-surface shadow-sm p-4 md:p-5 overflow-hidden p-0 [&_img]:aspect-[4/3] [&_img]:w-full [&_img]:object-cover [&_.image-placeholder]:aspect-[4/3] [&_.image-placeholder]:w-full [&_.image-placeholder]:object-cover [&>div]:flex [&>div]:flex-col [&>div]:gap-3 [&>div]:p-4 max-lg:rounded-lg max-lg:p-3" key={listing._id}>
        {image ? <img alt="" src={image} /> : <span className="image-placeholder flex min-h-32 items-center justify-center bg-foose-surface-mid text-sm font-semibold text-foose-faint">No image</span>}
        <div>
          <p className="product-meta text-xs uppercase tracking-wide text-foose-faint">{listingMeta(listing)}</p>
          <h3>{listing.title}</h3>
          <strong>{formatMoney(listing.price, listing.currency)}</strong>
          <div className="table-actions flex flex-wrap items-center gap-3 justify-end">
            <a className="button inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border px-5 py-2.5 text-center text-sm font-bold transition disabled:pointer-events-none disabled:opacity-50 [&.full]:w-full button-secondary border-foose-border bg-foose-surface text-foose-text hover:border-accent hover:text-accent" href={withBasePath(`/listing/${listing._id}`)}>
              View
            </a>
            <button className="button inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border px-5 py-2.5 text-center text-sm font-bold transition disabled:pointer-events-none disabled:opacity-50 [&.full]:w-full button-secondary border-foose-border bg-foose-surface text-foose-text hover:border-accent hover:text-accent" onClick={() => void removeListing(listing._id)} type="button">
              Remove
            </button>
          </div>
        </div>
      </article>
    )
  }

  return (
    <AppShell active="community" searchPlaceholder="Search events...">
      <div className="dashboard-head mb-5 flex flex-col gap-2 md:flex-row md:items-center md:justify-between [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:md:text-4xl [&_p]:text-sm [&_p]:leading-6 [&_p]:text-foose-muted [&_p]:md:text-base max-md:[&_h1]:text-2xl">
        <div>
          <a className="back-link mb-6 inline-flex items-center gap-2 text-sm font-semibold text-foose-muted hover:text-accent" href={withBasePath('/community?tab=events&scope=mine')}>
            <Icon name="arrow" /> Back to my events
          </a>
          <h1>{event?.title || 'Event management'}</h1>
          {event && <p>{eventTimeLabel(event)} - {eventTypeLabel(event)}</p>}
        </div>
      </div>

      {!eventId && <EmptyState body="This management link is missing an event id." title="Event not found" />}
      {eventResource.loading && <LoadingState label="Loading event..." />}
      {eventResource.error && <ErrorState message={eventResource.error} retry={eventResource.refetch} />}
      {actionError && <ErrorState message={actionError} />}
      {actionStatus && <p className="success-copy font-bold text-accent rounded-lg bg-foose-success-bg px-4 py-3 text-foose-success">{actionStatus}</p>}

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
                {isPromoted(event) ? (
                  <span className="button inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border px-5 py-2.5 text-center text-sm font-bold transition disabled:pointer-events-none disabled:opacity-50 [&.full]:w-full button-secondary border-foose-border bg-foose-surface text-foose-text hover:border-accent hover:text-accent event-promotion-pill pointer-events-none bg-accent-light text-accent">Promoted</span>
                ) : (
                  <span className="grid gap-2 sm:min-w-56">
                    <label className="relative block">
                      <SelectControl
                        aria-label="Event promotion package"
                        className="h-11 w-full appearance-none rounded-xl border border-accent/20 bg-accent-light/70 px-3 pr-10 text-sm font-black text-accent outline-none transition hover:border-accent focus:border-accent focus:bg-white focus:ring-2 focus:ring-accent/15"
                        onChange={(input) => setEventPromotionPackage(input.target.value as PromotionPackageName)}
                        value={eventPromotionPackage}
                      >
                        {eventPromotionPackages.map((item) => (
                          <option key={item.value} value={item.value}>
                            {item.label}
                          </option>
                        ))}
                      </SelectControl>
                    </label>
                    <button className="button inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border px-5 py-2.5 text-center text-sm font-bold transition disabled:pointer-events-none disabled:opacity-50 [&.full]:w-full button-secondary border-foose-border bg-foose-surface text-foose-text hover:border-accent hover:text-accent" onClick={() => void promoteEvent()} type="button">
                      <IoMegaphone /> Promote
                    </button>
                  </span>
                )}
                <button className="button inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border px-5 py-2.5 text-center text-sm font-bold transition disabled:pointer-events-none disabled:opacity-50 [&.full]:w-full button-secondary border-foose-border bg-foose-surface text-foose-text hover:border-accent hover:text-accent" onClick={() => void deleteEvent()} type="button">
                  Delete
                </button>
              </div>
            </div>
          </section>

          {onlineEvent ? (
            <section className="event-management-section rounded-xl border border-foose-border bg-foose-surface p-5">
              <SectionHeader
                action={<ButtonLink to={`/listings/new?eventId=${encodeURIComponent(event._id)}`}>Add new listing</ButtonLink>}
                eyebrow={catalogOpen ? 'Shopping window is open' : 'Buyers can preview and cart these items before checkout opens'}
                title="Online pop-up catalog"
              />
              <div className="event-catalog-picker flex flex-col gap-3 sm:flex-row [&_select]:h-11 [&_select]:flex-1 [&_select]:px-3">
                <label>
                  Add existing listing
                  <SelectControl onChange={(input) => setSelectedListingId(input.target.value)} value={selectedListingId}>
                    <option value="">Choose from your catalog</option>
                    {availableListings.map((listing) => (
                      <option key={listing._id} value={listing._id}>
                        {listing.title}
                      </option>
                    ))}
                  </SelectControl>
                </label>
                <button className="button inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border px-5 py-2.5 text-center text-sm font-bold transition disabled:pointer-events-none disabled:opacity-50 [&.full]:w-full button-primary border-accent bg-accent text-white shadow-md shadow-accent/15 hover:bg-accent-hover" disabled={!selectedListingId} onClick={() => void attachListing()} type="button">
                  Add to pop-up
                </button>
              </div>
              {sellerListings.loading && <LoadingState label="Loading your catalog..." />}
              {sellerListings.error && <ErrorState message={sellerListings.error} retry={sellerListings.refetch} />}
              {!catalogListings.length && <EmptyState body="Attach existing listings or create a new one for this online pop-up." title="No pop-up listings yet" />}
              {!!catalogListings.length && <div className="event-catalog-grid grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">{catalogListings.map(renderCatalogCard)}</div>}
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
    </AppShell>
  )
}
