import { AppShell, Badge, EmptyState, ErrorState, Icon, LoadingState, SectionHeader } from '../components'
import { useAuth } from '../hooks/useAuth'
import { apiPost } from '../lib/api'
import { useApiResource } from '../hooks/useApiResource'
import type { Event, GalleryPost } from '../types/api'
import { formatDate } from '../utils/format'

export function CommunityPage() {
  const { user } = useAuth()
  const events = useApiResource<{ events: Event[] }>('/community/events')
  const gallery = useApiResource<{ posts: GalleryPost[]; total: number }>('/community/gallery?page=1&limit=12')

  async function rsvp(eventId: string) {
    if (!user) {
      window.location.assign('/login')
      return
    }
    await apiPost(`/community/events/${eventId}/attend`)
    await events.refetch()
  }

  return (
    <AppShell active="community">
      <section className="page-hero">
        <h1>Community Hub</h1>
        <p>Events and gallery posts load directly from the community API.</p>
      </section>
      <div className="tab-line">
        <a className="active" href="#events">
          Events
        </a>
        <a href="#gallery">Gallery</a>
      </div>
      <section id="events">
        {events.loading && <LoadingState label="Loading events..." />}
        {events.error && <ErrorState message={events.error} retry={events.refetch} />}
        {!events.loading && !events.error && !events.data?.events.length && (
          <EmptyState body="No upcoming community events are published yet." title="No events yet" />
        )}
        {!!events.data?.events.length && (
          <div className="event-grid">
            {events.data.events.map((event) => (
              <article className="event-card" key={event._id}>
                <div className="event-image">
                  {event.coverImage ? <img alt={event.title} src={event.coverImage} /> : <span className="image-placeholder">No image</span>}
                  <Badge tone={event.status === 'ongoing' ? 'warning' : 'accent'}>{event.status || event.type}</Badge>
                </div>
                <div>
                  <p>
                    <Icon name="calendar" /> {formatDate(event.date)}
                  </p>
                  <h2>{event.title}</h2>
                  <p>
                    <Icon name="location" /> {event.location || 'Location pending'}
                  </p>
                  <button className="button button-primary" onClick={() => void rsvp(event._id)} type="button">
                    RSVP now
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
      <section className="home-section" id="gallery">
        <SectionHeader title="Streetwear Gallery" eyebrow="Posts published through the gallery API" />
        {gallery.loading && <LoadingState label="Loading gallery..." />}
        {gallery.error && <ErrorState message={gallery.error} retry={gallery.refetch} />}
        {!gallery.loading && !gallery.error && !gallery.data?.posts.length && (
          <EmptyState body="Gallery posts will appear here after users publish them." title="No gallery posts yet" />
        )}
        {!!gallery.data?.posts.length && (
          <div className="community-gallery">
            {gallery.data.posts.map((post) => (
              <img alt={post.caption || 'Community gallery post'} key={post._id} src={post.imageUrl} />
            ))}
          </div>
        )}
      </section>
    </AppShell>
  )
}
