import { useState } from 'react'
import { AppShell, Badge, FavoriteButton, Icon, InlineNotice, LightboxImage, RefreshIndicator, SectionHeader, StatePanel } from '../components'
import { EventDetailSkeleton } from '../components/feedback/DiscoverySkeletons'
import { DiscoveryImage } from '../components/feedback/DiscoveryMedia'
import { NavigationBackButton } from '../components/navigation'
import { useAuth } from '../hooks/useAuth'
import { useApiResource } from '../hooks/useApiResource'
import { useCart } from '../hooks/useCart'
import type { Event, Listing } from '../types/api'
import { concreteEventListings, eventHostHref, eventHostName, eventTimeLabel, eventTimeTerm, eventTypeLabel, eventWindowHasClosed, eventWindowHasOpened, isOnlinePopUp } from '../utils/events'
import { formatMoney, getListingImage, getShop, listingMeta } from '../utils/format'
import { getCurrentAppPathname, withBasePath } from '../utils/navigation'

function eventIdFromPath() {
  const match = getCurrentAppPathname().match(/^\/community\/events\/([^/]+)/)
  return match ? decodeURIComponent(match[1]).trim() : ''
}

export function EventDetailPage() {
  const { user } = useAuth()
  const eventId = eventIdFromPath()
  const eventResource = useApiResource<{ event: Event }>(eventId ? `/community/events/${eventId}` : null, Boolean(eventId))
  const { addListing } = useCart()
  const event = eventResource.data?.event
  const [addedListingId, setAddedListingId] = useState('')
  const listings = event ? concreteEventListings(event).filter((listing) => {
    const owner = getShop(listing)?.ownerId
    const ownerId = typeof owner === 'string' ? owner : owner?._id
    return !user?._id || ownerId !== user._id
  }) : []
  const hostHref = event ? eventHostHref(event) : ''
  const onlineEvent = event ? isOnlinePopUp(event) : false
  const checkoutOpen = event ? eventWindowHasOpened(event) && !eventWindowHasClosed(event) : false

  function addPopUpListing(listing: Listing) {
    if (!event) return
    const added = addListing(listing, 1, {
      availableFrom: event.startsAt,
      availableUntil: event.endsAt,
      sourceEventId: event._id,
      sourceEventTitle: event.title,
    })
    if (added) setAddedListingId(listing._id)
  }

  function renderListing(listing: Listing) {
    const image = getListingImage(listing)
    return (
      <article className="event-catalog-card rounded-xl border border-foose-border bg-foose-surface shadow-sm p-4 md:p-5 overflow-hidden p-0 [&_img]:aspect-[4/3] [&_img]:w-full [&_img]:object-cover [&_.image-placeholder]:aspect-[4/3] [&_.image-placeholder]:w-full [&_.image-placeholder]:object-cover [&>div]:flex [&>div]:flex-col [&>div]:gap-3 [&>div]:p-4 max-lg:rounded-lg max-lg:p-3" key={listing._id}>
        <a href={withBasePath(`/listing/${listing._id}`)}>
          <DiscoveryImage alt={listing.title} fallback="Listing image unavailable" fallbackClassName="aspect-[4/3] min-h-32 w-full" src={image} />
        </a>
        <div>
          <p className="product-meta text-xs uppercase tracking-wide text-foose-faint">{listingMeta(listing)}</p>
          <h3>{listing.title}</h3>
          <strong>{formatMoney(listing.price, listing.currency)}</strong>
          <button className="button inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border px-5 py-2.5 text-center text-sm font-bold transition disabled:pointer-events-none disabled:opacity-50 [&.full]:w-full button-primary border-accent bg-accent text-white shadow-md shadow-accent/15 hover:bg-accent-hover" disabled={listing.status !== 'active'} onClick={() => addPopUpListing(listing)} type="button">
            {addedListingId === listing._id ? 'Added to cart' : 'Add to cart'}
          </button>
        </div>
      </article>
    )
  }

  return (
    <AppShell active="community" searchPlaceholder="Search events...">
      <div className="dashboard-head mb-5 flex flex-col gap-2 md:flex-row md:items-center md:justify-between [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:md:text-4xl [&_p]:text-sm [&_p]:leading-6 [&_p]:text-foose-muted [&_p]:md:text-base max-md:[&_h1]:text-2xl">
        <div>
          <NavigationBackButton className="mb-6" fallback={{ href: '/community?tab=events', label: 'Community events' }} />
          <h1>{event?.title || 'Event'}</h1>
          {event && <p>{eventTimeLabel(event)}{event.location ? ` - ${event.location}` : ''}</p>}
        </div>
      </div>

      {!eventId && <StatePanel action={<a className="button button-secondary" href={withBasePath('/community?tab=events')}>Browse community events</a>} body="This link does not identify a community event." layout="page" title="Event link is incomplete" tone="unavailable" />}
      {eventResource.initialLoading && <EventDetailSkeleton />}
      <RefreshIndicator active={eventResource.refreshing} className="mb-4" label="Refreshing event details" />
      {eventResource.error && <StatePanel action={<button className="button button-secondary" onClick={eventResource.refetch} type="button">Try again</button>} body={eventResource.error} layout="page" title={eventResource.errorMeta?.status === 404 ? 'This event is no longer available' : 'Event could not load'} tone={eventResource.errorMeta?.status === 403 ? 'permission' : eventResource.errorMeta?.status === 404 ? 'unavailable' : 'error'} />}

      {event && (
        <section className="event-detail grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px] max-lg:grid-cols-1">
          <div className="event-detail-media overflow-hidden rounded-xl border border-foose-border bg-foose-surface-mid [&_.lightbox-trigger]:h-full [&_.lightbox-trigger]:w-full [&_img]:h-full [&_img]:w-full [&_img]:object-contain aspect-[16/10]">
            {event.coverImage ? <LightboxImage alt={event.title} src={event.coverImage} /> : <span className="image-placeholder flex min-h-32 items-center justify-center bg-foose-surface-mid text-sm font-semibold text-foose-faint">No event banner</span>}
          </div>
          <div className="event-detail-panel flex flex-col gap-5 rounded-xl border border-foose-border bg-foose-surface p-5 shadow-sm md:p-6 [&>h2]:text-2xl [&>h2]:font-bold [&>p]:text-sm [&>p]:leading-6 [&>p]:text-foose-muted">
            <div className="badge-row flex flex-wrap items-center gap-2">
              <Badge tone={event.promotionTags?.length ? 'accent' : 'neutral'}>{event.promotionTags?.length ? 'Promoted' : event.status || event.type}</Badge>
              <Badge>{eventTypeLabel(event)}</Badge>
            </div>
            <h2>{event.title}</h2>
            <dl className="event-detail-list grid gap-3 sm:grid-cols-2 [&_div]:rounded-lg [&_div]:border [&_div]:border-foose-border [&_div]:bg-foose-surface-low [&_div]:p-3 [&_dt]:text-xs [&_dt]:font-bold [&_dt]:uppercase [&_dt]:tracking-widest [&_dt]:text-foose-faint [&_dd]:mt-1 [&_dd]:text-sm [&_dd]:font-semibold [&_dd]:text-foose-text">
              <div>
                <dt>{eventTimeTerm(event)}</dt>
                <dd>{eventTimeLabel(event)}</dd>
              </div>
              <div>
                <dt>Host</dt>
                <dd>
                  {hostHref ? <a href={withBasePath(hostHref)}>{eventHostName(event)}</a> : eventHostName(event)}
                </dd>
              </div>
              <div>
                <dt>Type</dt>
                <dd>{eventTypeLabel(event)}</dd>
              </div>
              <div>
                <dt>Location</dt>
                <dd>{onlineEvent ? 'Hosted on Foose' : event.location || 'Location pending'}</dd>
              </div>
            </dl>
            {event.description && <p>{event.description}</p>}
            {onlineEvent && (
              <div className="info-card rounded-xl border border-foose-border bg-foose-surface shadow-sm p-4 md:p-5">
                <Icon name="cart" />
                <div>
                  <strong>{checkoutOpen ? 'Shopping window open' : 'Preview window'}</strong>
                  <p>{checkoutOpen ? 'Items in this pop-up can be checked out now.' : 'You can add items to cart now, then checkout when the pop-up window opens.'}</p>
                </div>
              </div>
            )}
            <FavoriteButton className="button inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border px-5 py-2.5 text-center text-sm font-bold transition disabled:pointer-events-none disabled:opacity-50 [&.full]:w-full button-primary border-accent bg-accent text-white shadow-md shadow-accent/15 hover:bg-accent-hover favorite-button [&.is-active]:bg-accent [&.is-active]:text-white" showText targetId={event._id} targetType="event" />
          </div>
        </section>
      )}

      {event && onlineEvent && (
        <section className="event-management-section rounded-xl border border-foose-border bg-foose-surface p-5">
          <SectionHeader title="Pop-up catalog" eyebrow={checkoutOpen ? 'Checkout is open now' : 'Browse before the shopping window opens'} />
          {eventWindowHasClosed(event) && <InlineNotice className="mb-4" title="This pop-up has ended" tone="info">Its catalog remains available to review, but checkout is closed.</InlineNotice>}
          {!listings.length && <StatePanel body="The host has not added items to this pop-up yet." layout="section" title="No catalog items yet" tone="empty" />}
          {!!listings.length && <div className="event-catalog-grid grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">{listings.map(renderListing)}</div>}
        </section>
      )}
    </AppShell>
  )
}
