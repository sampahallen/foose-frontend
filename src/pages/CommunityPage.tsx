import { useState, type MouseEvent } from 'react'
import { AppShell, Badge, ButtonLink, EmptyState, ErrorState, FavoriteButton, Icon, LoadingState, SectionHeader } from '../components'
import { useAuth } from '../hooks/useAuth'
import { useApiResource } from '../hooks/useApiResource'
import { apiDelete, apiPut } from '../lib/api'
import type { Event, GalleryPost } from '../types/api'
import { authHref } from '../utils/authRedirect'
import { getErrorMessage } from '../utils/errorMessage'
import { formatDate } from '../utils/format'
import { cacheFinspoPreview, navigateTo } from '../utils/navigation'

type CommunityMainTab = 'events' | 'finspo'
type EventScope = 'mine' | 'public'
type FinspoScope = 'following' | 'mine' | 'public'

function initialCommunityState() {
  const params = new URLSearchParams(window.location.search)
  const tab = params.get('tab') === 'finspo' ? 'finspo' : 'events'
  const scope = params.get('scope')

  return {
    eventScope: scope === 'mine' ? 'mine' : 'public',
    finspoScope: scope === 'mine' || scope === 'following' ? scope : 'public',
    mainTab: tab,
  } as const
}

function isArchivedEvent(event: Event) {
  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)
  return event.status === 'past' || new Date(event.date) < startOfToday
}

function isPromotedEvent(event: Event) {
  return Boolean(event.promotionTags?.some((tag) => ['featured', 'home-featured', 'home-banner'].includes(tag)))
}

function finspoAuthor(post: GalleryPost) {
  if (post.userId && typeof post.userId === 'object') return post.userId.name
  return 'Foose member'
}

function finspoAuthorHref(post: GalleryPost) {
  if (post.userId && typeof post.userId === 'object') return `/profile/${post.userId.username}`
  return '#'
}

function openFinspo(event: MouseEvent<HTMLAnchorElement>, post: GalleryPost) {
  event.preventDefault()
  cacheFinspoPreview(post)
  navigateTo(`/community/finspo/${post._id}`)
}

export function CommunityPage() {
  const initialState = initialCommunityState()
  const { status, user } = useAuth()
  const events = useApiResource<{ events: Event[] }>('/community/events')
  const myEvents = useApiResource<{ events: Event[] }>('/community/events/me', Boolean(user))
  const gallery = useApiResource<{ posts: GalleryPost[]; total: number }>('/community/gallery?page=1&limit=18')
  const followingGallery = useApiResource<{ posts: GalleryPost[]; total: number }>('/community/gallery/following', Boolean(user))
  const myGallery = useApiResource<{ posts: GalleryPost[]; total: number }>('/community/gallery/me', Boolean(user))
  const [actionError, setActionError] = useState('')
  const [mainTab, setMainTab] = useState<CommunityMainTab>(initialState.mainTab)
  const [eventScope, setEventScope] = useState<EventScope>(initialState.eventScope)
  const [finspoScope, setFinspoScope] = useState<FinspoScope>(initialState.finspoScope)
  const [promotingEventId, setPromotingEventId] = useState('')

  const publicEvents = events.data?.events || []
  const ownedEvents = myEvents.data?.events || []
  const currentOwnedEvents = ownedEvents.filter((event) => !isArchivedEvent(event))
  const archivedOwnedEvents = ownedEvents.filter(isArchivedEvent)
  const finspoSource = finspoScope === 'mine' ? myGallery : finspoScope === 'following' ? followingGallery : gallery
  const finspoItems = finspoSource.data?.posts || []

  async function refreshCommunity() {
    const jobs = [events.refetch(), gallery.refetch()]
    if (user) jobs.push(myEvents.refetch(), myGallery.refetch(), followingGallery.refetch())
    await Promise.all(jobs)
  }

  function requireLogin() {
    if (status === 'checking') return
    navigateTo(authHref('/register'))
  }

  function addEventHref() {
    return user || status === 'checking' ? '/community/events/new' : authHref('/register', '/community/events/new')
  }

  function addFinspoHref() {
    return user || status === 'checking' ? '/community/finspo/new' : authHref('/register', '/community/finspo/new')
  }

  async function deleteEvent(eventId: string) {
    if (!window.confirm('Delete this event?')) return
    setActionError('')
    try {
      await apiDelete(`/community/events/${eventId}`)
      await refreshCommunity()
    } catch (err) {
      setActionError(getErrorMessage(err, 'Could not delete event'))
    }
  }

  async function promoteEvent(event: Event) {
    setActionError('')
    setPromotingEventId(event._id)
    try {
      const promotionTags = Array.from(new Set([...(event.promotionTags || []), 'featured', 'home-featured']))
      await apiPut(`/community/events/${event._id}`, { promotionTags })
      await refreshCommunity()
    } catch (err) {
      setActionError(getErrorMessage(err, 'Could not promote event'))
    } finally {
      setPromotingEventId('')
    }
  }

  async function deleteGalleryPost(postId: string) {
    if (!window.confirm('Delete this Finspo post?')) return
    setActionError('')
    try {
      await apiDelete(`/community/gallery/${postId}`)
      await refreshCommunity()
    } catch (err) {
      setActionError(getErrorMessage(err, 'Could not delete Finspo'))
    }
  }

  function renderEventCard(event: Event, owned = false) {
    return (
      <article className="event-card" key={event._id}>
        <div className="event-image">
          {event.coverImage ? <img alt="" src={event.coverImage} /> : <span className="image-placeholder">No image</span>}
          <Badge tone={isArchivedEvent(event) ? 'neutral' : event.status === 'ongoing' ? 'warning' : 'accent'}>{event.status || event.type}</Badge>
        </div>
        <div>
          <p>
            <Icon name="calendar" /> {formatDate(event.date)}
          </p>
          <h2>{event.title}</h2>
          <p>
            <Icon name="location" /> {event.location || 'Location pending'}
          </p>
          {owned ? (
            <div className="table-actions">
              <a className="button button-secondary" href={`/community/events/${event._id}/edit`}>
                Edit
              </a>
              {isPromotedEvent(event) ? (
                <span className="button button-secondary event-promotion-pill">Promoted</span>
              ) : (
                <button className="button button-secondary" disabled={promotingEventId === event._id} onClick={() => void promoteEvent(event)} type="button">
                  {promotingEventId === event._id ? 'Promoting...' : 'Promote'}
                </button>
              )}
              <button className="button button-secondary" onClick={() => void deleteEvent(event._id)} type="button">
                Remove
              </button>
            </div>
          ) : (
            <div className="table-actions">
              <a className="button button-secondary" href={`/community/events/${event._id}`}>
                View event
              </a>
              <FavoriteButton className="button button-secondary favorite-button" showText targetId={event._id} targetType="event" />
            </div>
          )}
        </div>
      </article>
    )
  }

  function renderFinspoTile(post: GalleryPost, owned = false) {
    return (
      <article className="finspo-tile" key={post._id}>
        <a
          aria-label={post.caption || `Finspo by ${finspoAuthor(post)}`}
          className="finspo-image finspo-tile-link"
          href={`/community/finspo/${post._id}`}
          onClick={(event) => openFinspo(event, post)}
        >
          <img alt="" src={post.imageUrl} />
        </a>
        {!owned && <FavoriteButton className="floating-round favorite-button" targetId={post._id} targetType="finspo" />}
        {!owned && (
          <a className="finspo-author-link" href={finspoAuthorHref(post)}>
            {finspoAuthor(post)}
          </a>
        )}
        {owned && (
          <div className="finspo-tile-actions">
            <a className="button button-secondary" href={`/community/finspo/${post._id}/edit`}>
              Edit
            </a>
            <button className="button button-secondary" onClick={() => void deleteGalleryPost(post._id)} type="button">
              Remove
            </button>
          </div>
        )}
        <span className="sr-only">
          {post.caption || 'Untitled Finspo'}
          {!!post.tags?.length && ` ${post.tags.map((tag) => `#${tag}`).join(' ')}`}
        </span>
      </article>
    )
  }

  function renderEventTabs() {
    return (
      <nav className="section-tabs" aria-label="Event views">
        <button className={eventScope === 'public' ? 'active' : ''} onClick={() => setEventScope('public')} type="button">
          Public
        </button>
        <button className={eventScope === 'mine' ? 'active' : ''} onClick={() => (user ? setEventScope('mine') : requireLogin())} type="button">
          My events
        </button>
      </nav>
    )
  }

  function renderFinspoTabs() {
    return (
      <nav className="section-tabs" aria-label="Finspo views">
        <button className={finspoScope === 'public' ? 'active' : ''} onClick={() => setFinspoScope('public')} type="button">
          Public
        </button>
        <button className={finspoScope === 'following' ? 'active' : ''} onClick={() => (user ? setFinspoScope('following') : requireLogin())} type="button">
          Following
        </button>
        <button className={finspoScope === 'mine' ? 'active' : ''} onClick={() => (user ? setFinspoScope('mine') : requireLogin())} type="button">
          My Finspo
        </button>
      </nav>
    )
  }

  function renderEventPanel() {
    return (
      <section className="community-panel">
        {renderEventTabs()}

        {eventScope === 'public' && (
          <>
            <SectionHeader
              action={
                <a className="button button-primary" href={addEventHref()}>
                  Add event
                </a>
              }
              title="Public events"
              eyebrow="Save the events you want to come back to"
            />
            {events.loading && <LoadingState label="Loading events..." />}
            {events.error && <ErrorState message={events.error} retry={events.refetch} />}
            {!events.loading && !events.error && !publicEvents.length && <EmptyState body="No community events are published yet." title="No events yet" />}
            {!!publicEvents.length && <div className="event-grid">{publicEvents.map((event) => renderEventCard(event))}</div>}
          </>
        )}

        {eventScope === 'mine' && user && (
          <>
            <SectionHeader
              action={
                <a className="button button-primary" href={addEventHref()}>
                  Add event
                </a>
              }
              title="Your listed events"
              eyebrow="Edit or remove the events you created"
            />
            {myEvents.loading && <LoadingState label="Loading your events..." />}
            {myEvents.error && <ErrorState message={myEvents.error} retry={myEvents.refetch} />}
            {!myEvents.loading && !myEvents.error && !ownedEvents.length && <EmptyState body="Create an event to list it here." title="No events listed" />}
            {!!currentOwnedEvents.length && <div className="event-grid">{currentOwnedEvents.map((event) => renderEventCard(event, true))}</div>}
            {!!archivedOwnedEvents.length && (
              <section className="archive-section">
                <SectionHeader title="Archived and out-of-date" eyebrow={`${archivedOwnedEvents.length} older events`} />
                <div className="event-grid">{archivedOwnedEvents.map((event) => renderEventCard(event, true))}</div>
              </section>
            )}
          </>
        )}
      </section>
    )
  }

  function renderFinspoPanel() {
    return (
      <section className="community-panel">
        {renderFinspoTabs()}

        {finspoScope !== 'mine' && (
          <>
            <SectionHeader
              action={
                <a className="button button-primary" href={addFinspoHref()}>
                  Post Finspo
                </a>
              }
              title={finspoScope === 'following' ? 'Following Finspo' : 'Public Finspo'}
              eyebrow={finspoScope === 'following' ? 'Posts from people you follow' : 'Liked posts are collected in Saved'}
            />
            {finspoSource.loading && <LoadingState label="Loading Finspo..." />}
            {finspoSource.error && <ErrorState message={finspoSource.error} retry={finspoSource.refetch} />}
            {!finspoSource.loading && !finspoSource.error && !finspoItems.length && (
              <EmptyState body={finspoScope === 'following' ? 'Follow members to see their Finspo here.' : 'No Finspo posts are published yet.'} title="No Finspo yet" />
            )}
            {!!finspoItems.length && <div className="finspo-masonry">{finspoItems.map((post) => renderFinspoTile(post))}</div>}
          </>
        )}

        {finspoScope === 'mine' && user && (
          <>
            <SectionHeader
              action={
                <a className="button button-primary" href={addFinspoHref()}>
                  Post Finspo
                </a>
              }
              title="Your Finspo"
              eyebrow="Post, edit, and remove your own inspiration"
            />
            {myGallery.loading && <LoadingState label="Loading your Finspo..." />}
            {myGallery.error && <ErrorState message={myGallery.error} retry={myGallery.refetch} />}
            {!myGallery.loading && !myGallery.error && !finspoItems.length && <EmptyState body="Post your first Finspo to see it here." title="No posts yet" />}
            {!!finspoItems.length && <div className="finspo-masonry">{finspoItems.map((post) => renderFinspoTile(post, true))}</div>}
          </>
        )}
      </section>
    )
  }

  return (
    <AppShell active="community">
      <section className="page-hero community-hero">
        <h1>Community Hub</h1>
        <p>Find local events and browse Finspo from the Foose community.</p>
      </section>
      {actionError && <ErrorState message={actionError} />}

      <nav className="tab-line community-main-tabs" aria-label="Community sections">
        <button className={mainTab === 'events' ? 'active' : ''} onClick={() => setMainTab('events')} type="button">
          Events
        </button>
        <button className={mainTab === 'finspo' ? 'active' : ''} onClick={() => setMainTab('finspo')} type="button">
          Finspo
        </button>
      </nav>

      {mainTab === 'events' && renderEventPanel()}
      {mainTab === 'finspo' && renderFinspoPanel()}

      {!user && (
        <section className="seller-cta compact">
          <div>
            <h2>Want to contribute?</h2>
            <p>Create an account to save events, like Finspo, and manage your own posts.</p>
          </div>
          <ButtonLink to={authHref('/register', '/community')} variant="secondary">
            Sign up
          </ButtonLink>
        </section>
      )}
    </AppShell>
  )
}
