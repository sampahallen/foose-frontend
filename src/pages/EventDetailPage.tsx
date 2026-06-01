import { AppShell, Badge, EmptyState, ErrorState, FavoriteButton, Icon, LightboxImage, LoadingState } from '../components'
import { useApiResource } from '../hooks/useApiResource'
import type { Event } from '../types/api'
import { formatDate } from '../utils/format'
import { getCurrentAppPathname } from '../utils/navigation'

function eventIdFromPath() {
  const match = getCurrentAppPathname().match(/^\/community\/events\/([^/]+)/)
  return match ? decodeURIComponent(match[1]).trim() : ''
}

export function EventDetailPage() {
  const eventId = eventIdFromPath()
  const eventResource = useApiResource<{ event: Event }>(eventId ? `/community/events/${eventId}` : null, Boolean(eventId))
  const event = eventResource.data?.event

  return (
    <AppShell active="community" searchPlaceholder="Search events...">
      <div className="dashboard-head">
        <div>
          <a className="back-link" href="/community">
            <Icon name="arrow" /> Back to Community
          </a>
          <h1>{event?.title || 'Event'}</h1>
          {event && <p>{formatDate(event.date)}{event.location ? ` - ${event.location}` : ''}</p>}
        </div>
      </div>

      {!eventId && <EmptyState body="This event link is missing an event id." title="Event not found" />}
      {eventResource.loading && <LoadingState label="Loading event..." />}
      {eventResource.error && <ErrorState message={eventResource.error} retry={eventResource.refetch} />}

      {event && (
        <section className="event-detail">
          <div className="event-detail-media">
            {event.coverImage ? <LightboxImage alt={event.title} src={event.coverImage} /> : <span className="image-placeholder">No event banner</span>}
          </div>
          <div className="event-detail-panel">
            <Badge tone={event.promotionTags?.length ? 'accent' : 'neutral'}>{event.promotionTags?.length ? 'Promoted' : event.status || event.type}</Badge>
            <h2>{event.title}</h2>
            <dl className="event-detail-list">
              <div>
                <dt>Date</dt>
                <dd>{formatDate(event.date)}</dd>
              </div>
              <div>
                <dt>Location</dt>
                <dd>{event.location || 'Location pending'}</dd>
              </div>
              <div>
                <dt>Type</dt>
                <dd>{event.type}</dd>
              </div>
            </dl>
            {event.description && <p>{event.description}</p>}
            <FavoriteButton className="button button-primary favorite-button" showText targetId={event._id} targetType="event" />
          </div>
        </section>
      )}
    </AppShell>
  )
}
