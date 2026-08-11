import { AppShell, Badge, FavoriteButton, Icon, InlineNotice, LightboxImage, ProductCard, RefreshIndicator, SectionHeader, StatePanel } from '../components'
import { EventDetailSkeleton } from '../components/feedback/DiscoverySkeletons'
import { PRODUCT_GRID_CLASS } from '../components/marketplace/ProductCard'
import { NavigationBackButton } from '../components/navigation'
import { useAuth } from '../hooks/useAuth'
import { useApiResource } from '../hooks/useApiResource'
import { useCart } from '../hooks/useCart'
import type { Event, Listing } from '../types/api'
import { concreteEventListings, eventHostHref, eventHostName, eventTimeLabel, eventTimeTerm, eventTypeLabel, eventWindowHasClosed, eventWindowHasOpened, isOnlinePopUp } from '../utils/events'
import { getShop } from '../utils/format'
import { getCurrentAppPathname, navigateTo, withBasePath } from '../utils/navigation'
import { isActiveEventPromotion } from '../utils/promotions'

function eventIdFromPath() {
  const match = getCurrentAppPathname().match(/^\/community\/events\/([^/]+)/)
  return match ? decodeURIComponent(match[1]).trim() : ''
}

export function EventDetailPage() {
  const { user } = useAuth()
  const eventId = eventIdFromPath()
  const eventResource = useApiResource<{ event: Event }>(eventId ? `/community/events/${eventId}` : null, Boolean(eventId))
  const { addListing, items: cartItems } = useCart()
  const event = eventResource.data?.event
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
    addListing(listing, 1, {
      availableFrom: event.startsAt,
      availableUntil: event.endsAt,
      sourceEventId: event._id,
      sourceEventTitle: event.title,
    })
  }

  function renderListing(listing: Listing) {
    // Read from the cart itself, so the state survives a reload and stays right
    // if the item is removed from the cart page.
    const inCart = cartItems.some((item) => item.listingId === listing._id)
    return (
      <div className="flex flex-col gap-2" key={listing._id}>
        <ProductCard listing={listing} />
        {inCart ? (
          <button className="button inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border px-5 py-2.5 text-center text-sm font-bold transition [&.full]:w-full border-foose-success bg-foose-success-bg text-foose-success hover:brightness-95" onClick={() => navigateTo('/cart')} type="button">
            <Icon name="check" size={16} />
            Added to cart
          </button>
        ) : (
          <button className="button inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border px-5 py-2.5 text-center text-sm font-bold transition disabled:pointer-events-none disabled:opacity-50 [&.full]:w-full button-primary border-accent bg-accent text-white shadow-md shadow-accent/15 hover:bg-accent-hover" disabled={listing.status !== 'active'} onClick={() => addPopUpListing(listing)} type="button">
            Add to cart
          </button>
        )}
      </div>
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

      {!eventId && <StatePanel action={<a className="button inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border px-5 py-2.5 text-center text-sm font-bold transition disabled:pointer-events-none disabled:opacity-50 [&.full]:w-full button-secondary border-foose-border bg-foose-surface text-foose-text hover:border-accent hover:text-accent" href={withBasePath('/community?tab=events')}>Browse community events</a>} body="This link does not identify a community event." layout="page" title="Event link is incomplete" tone="unavailable" />}
      {eventResource.initialLoading && <EventDetailSkeleton />}
      <RefreshIndicator active={eventResource.refreshing} className="mb-4" label="Refreshing event details" />
      {eventResource.error && <StatePanel action={<button className="button inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border px-5 py-2.5 text-center text-sm font-bold transition disabled:pointer-events-none disabled:opacity-50 [&.full]:w-full button-secondary border-foose-border bg-foose-surface text-foose-text hover:border-accent hover:text-accent" onClick={eventResource.refetch} type="button">Try again</button>} body={eventResource.error} layout="page" title={eventResource.errorMeta?.status === 404 ? 'This event is no longer available' : 'Event could not load'} tone={eventResource.errorMeta?.status === 403 ? 'permission' : eventResource.errorMeta?.status === 404 ? 'unavailable' : 'error'} />}

      {event && (
        <section className="event-detail grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px] max-lg:grid-cols-1">
          <div className="event-detail-media overflow-hidden rounded-xl border border-foose-border bg-foose-surface-mid [&_.lightbox-trigger]:h-full [&_.lightbox-trigger]:w-full [&_img]:h-full [&_img]:w-full [&_img]:object-contain aspect-[16/10]">
            {event.coverImage ? <LightboxImage alt={event.title} src={event.coverImage} /> : <span className="image-placeholder flex min-h-32 items-center justify-center bg-foose-surface-mid text-sm font-semibold text-foose-faint">No event banner</span>}
          </div>
          <div className="event-detail-panel flex flex-col gap-5 rounded-xl border border-foose-border bg-foose-surface p-5 shadow-sm md:p-6 [&>h2]:text-2xl [&>h2]:font-bold [&>p]:text-sm [&>p]:leading-6 [&>p]:text-foose-muted">
            <div className="badge-row flex flex-wrap items-center gap-2">
              <Badge tone={isActiveEventPromotion(event.promotionTags, event.promotionExpiresAt, event.status) ? 'accent' : 'neutral'}>{isActiveEventPromotion(event.promotionTags, event.promotionExpiresAt, event.status) ? 'Promoted' : event.status || event.type}</Badge>
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
          {!!listings.length && <div className={PRODUCT_GRID_CLASS}>{listings.map(renderListing)}</div>}
        </section>
      )}
    </AppShell>
  )
}
