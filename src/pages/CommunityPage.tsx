import { useState, type MouseEvent } from 'react'
import { AppShell, Badge, ButtonLink, EmptyState, ErrorState, FavoriteButton, Icon, LoadingState, SectionHeader } from '../components'
import { useAuth } from '../hooks/useAuth'
import { useApiResource } from '../hooks/useApiResource'
import { apiDelete, apiPut } from '../lib/api'
import type { Event, GalleryPost } from '../types/api'
import { authHref } from '../utils/authRedirect'
import { eventHostName, eventTimeLabel, eventTypeLabel, eventWindowHasClosed, isOnlinePopUp } from '../utils/events'
import { getErrorMessage } from '../utils/errorMessage'
import { cacheFinspoPreview, navigateTo, withBasePath } from '../utils/navigation'

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
  return eventWindowHasClosed(event)
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
      <article className="event-card rounded-xl border border-foose-border bg-foose-surface shadow-sm p-4 md:p-5 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:leading-tight [&_h2]:md:text-lg [&_p]:text-xs [&_p]:uppercase [&_p]:tracking-wide [&_p]:text-foose-faint overflow-hidden p-0 [&>div:last-child]:flex [&>div:last-child]:flex-col [&>div:last-child]:gap-3 [&>div:last-child]:p-4 [&_.button]:w-full [&_.table-actions_.button]:w-full" key={event._id}>
        <div className="event-image overflow-hidden rounded-lg bg-foose-surface-mid [&_img]:h-full [&_img]:w-full [&_img]:object-cover aspect-[16/9] rounded-none">
          {event.coverImage ? <img alt="" src={event.coverImage} /> : <span className="image-placeholder flex min-h-32 items-center justify-center bg-foose-surface-mid text-sm font-semibold text-foose-faint">No image</span>}
          <Badge tone={isArchivedEvent(event) ? 'neutral' : event.status === 'ongoing' ? 'warning' : 'accent'}>{event.status || event.type}</Badge>
        </div>
        <div>
          <p>
            <Icon name="calendar" /> {eventTimeLabel(event)}
          </p>
          <h2>{event.title}</h2>
          <p>
            <Icon name="store" /> {eventHostName(event)}
          </p>
          <p>
            <Icon name="location" /> {isOnlinePopUp(event) ? 'Hosted on Foose' : event.location || 'Location pending'}
          </p>
          <p className="muted-copy text-sm leading-6 text-foose-muted md:text-base">{eventTypeLabel(event)}</p>
          {owned ? (
            <div className="table-actions flex flex-wrap items-center gap-3 justify-end">
              <a className="button inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border px-5 py-2.5 text-center text-sm font-bold transition disabled:pointer-events-none disabled:opacity-50 [&.full]:w-full button-secondary border-foose-border bg-foose-surface text-foose-text hover:border-accent hover:text-accent" href={withBasePath(`/community/events/${event._id}/manage`)}>
                Manage
              </a>
              {isPromotedEvent(event) ? (
                <span className="button inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border px-5 py-2.5 text-center text-sm font-bold transition disabled:pointer-events-none disabled:opacity-50 [&.full]:w-full button-secondary border-foose-border bg-foose-surface text-foose-text hover:border-accent hover:text-accent event-promotion-pill pointer-events-none bg-accent-light text-accent">Promoted</span>
              ) : (
                <button className="button inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border px-5 py-2.5 text-center text-sm font-bold transition disabled:pointer-events-none disabled:opacity-50 [&.full]:w-full button-secondary border-foose-border bg-foose-surface text-foose-text hover:border-accent hover:text-accent" disabled={promotingEventId === event._id} onClick={() => void promoteEvent(event)} type="button">
                  {promotingEventId === event._id ? 'Promoting...' : 'Promote'}
                </button>
              )}
              <button className="button inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border px-5 py-2.5 text-center text-sm font-bold transition disabled:pointer-events-none disabled:opacity-50 [&.full]:w-full button-secondary border-foose-border bg-foose-surface text-foose-text hover:border-accent hover:text-accent" onClick={() => void deleteEvent(event._id)} type="button">
                Remove
              </button>
            </div>
          ) : (
            <div className="table-actions flex flex-wrap items-center gap-3 justify-end">
              <a className="button inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border px-5 py-2.5 text-center text-sm font-bold transition disabled:pointer-events-none disabled:opacity-50 [&.full]:w-full button-secondary border-foose-border bg-foose-surface text-foose-text hover:border-accent hover:text-accent" href={withBasePath(`/community/events/${event._id}`)}>
                View event
              </a>
              <FavoriteButton className="button inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border px-5 py-2.5 text-center text-sm font-bold transition disabled:pointer-events-none disabled:opacity-50 [&.full]:w-full button-secondary border-foose-border bg-foose-surface text-foose-text hover:border-accent hover:text-accent favorite-button [&.is-active]:bg-foose-danger-bg [&.is-active]:text-foose-danger" showText targetId={event._id} targetType="event" />
            </div>
          )}
        </div>
      </article>
    )
  }

  function renderFinspoTile(post: GalleryPost, owned = false) {
    return (
      <article className="finspo-tile relative mb-3 break-inside-avoid max-md:mb-2" key={post._id}>
        <a
          aria-label={post.caption || `Finspo by ${finspoAuthor(post)}`}
          className="finspo-image block overflow-hidden rounded-none border-0 bg-transparent [&_img]:h-auto [&_img]:w-full [&_img]:object-contain finspo-tile-link"
          href={withBasePath(`/community/finspo/${post._id}`)}
          onClick={(event) => openFinspo(event, post)}
        >
          <img alt="" src={post.imageUrl} />
        </a>
        {!owned && <FavoriteButton className="floating-round inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-transparent bg-transparent text-current transition hover:bg-accent-light hover:text-accent absolute right-3 top-3 z-10 bg-white/90 shadow favorite-button [&.is-active]:bg-foose-danger-bg [&.is-active]:text-foose-danger" targetId={post._id} targetType="finspo" />}
        {!owned && (
          <a className="finspo-author-link mt-2 flex items-center gap-2 text-sm font-semibold text-foose-muted" href={finspoAuthorHref(post)}>
            {finspoAuthor(post)}
          </a>
        )}
        {owned && (
          <div className="finspo-tile-actions mt-2 flex items-center gap-2 text-sm font-semibold text-foose-muted">
            <a className="button inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border px-5 py-2.5 text-center text-sm font-bold transition disabled:pointer-events-none disabled:opacity-50 [&.full]:w-full button-secondary border-foose-border bg-foose-surface text-foose-text hover:border-accent hover:text-accent" href={withBasePath(`/community/finspo/${post._id}/edit`)}>
              Edit
            </a>
            <button className="button inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border px-5 py-2.5 text-center text-sm font-bold transition disabled:pointer-events-none disabled:opacity-50 [&.full]:w-full button-secondary border-foose-border bg-foose-surface text-foose-text hover:border-accent hover:text-accent" onClick={() => void deleteGalleryPost(post._id)} type="button">
              Remove
            </button>
          </div>
        )}
        <span className="sr-only absolute size-px overflow-hidden whitespace-nowrap">
          {post.caption || 'Untitled Finspo'}
          {!!post.tags?.length && ` ${post.tags.map((tag) => `#${tag}`).join(' ')}`}
        </span>
      </article>
    )
  }

  function renderEventTabs() {
    return (
      <nav className="section-tabs [&_button]:shrink-0 [&_button]:rounded-full [&_button]:border [&_button]:border-foose-border [&_button]:bg-foose-surface-low [&_button]:px-4 [&_button]:py-2 [&_button]:text-sm [&_button]:font-semibold [&_button]:text-foose-muted [&_button]:transition [&_button]:hover:border-accent [&_button]:hover:text-accent [&_button.active]:border-accent [&_button.active]:bg-accent [&_button.active]:text-white flex flex-wrap items-center gap-2" aria-label="Event views">
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
      <nav className="section-tabs [&_button]:shrink-0 [&_button]:rounded-full [&_button]:border [&_button]:border-foose-border [&_button]:bg-foose-surface-low [&_button]:px-4 [&_button]:py-2 [&_button]:text-sm [&_button]:font-semibold [&_button]:text-foose-muted [&_button]:transition [&_button]:hover:border-accent [&_button]:hover:text-accent [&_button.active]:border-accent [&_button.active]:bg-accent [&_button.active]:text-white flex flex-wrap items-center gap-2" aria-label="Finspo views">
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
      <section className="community-panel mx-auto w-full max-w-[1280px]">
        {renderEventTabs()}

        {eventScope === 'public' && (
          <>
            <SectionHeader
              action={
                <a className="button inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border px-5 py-2.5 text-center text-sm font-bold transition disabled:pointer-events-none disabled:opacity-50 [&.full]:w-full button-primary border-accent bg-accent text-white shadow-md shadow-accent/15 hover:bg-accent-hover" href={addEventHref()}>
                  Add event
                </a>
              }
              title="Public events"
              eyebrow="Save the events you want to come back to"
            />
            {events.loading && <LoadingState label="Loading events..." />}
            {events.error && <ErrorState message={events.error} retry={events.refetch} />}
            {!events.loading && !events.error && !publicEvents.length && <EmptyState body="No community events are published yet." title="No events yet" />}
            {!!publicEvents.length && <div className="event-grid grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">{publicEvents.map((event) => renderEventCard(event))}</div>}
          </>
        )}

        {eventScope === 'mine' && user && (
          <>
            <SectionHeader
              action={
                <a className="button inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border px-5 py-2.5 text-center text-sm font-bold transition disabled:pointer-events-none disabled:opacity-50 [&.full]:w-full button-primary border-accent bg-accent text-white shadow-md shadow-accent/15 hover:bg-accent-hover" href={addEventHref()}>
                  Add event
                </a>
              }
              title="Your listed events"
              eyebrow="Edit or remove the events you created"
            />
            {myEvents.loading && <LoadingState label="Loading your events..." />}
            {myEvents.error && <ErrorState message={myEvents.error} retry={myEvents.refetch} />}
            {!myEvents.loading && !myEvents.error && !ownedEvents.length && <EmptyState body="Create an event to list it here." title="No events listed" />}
            {!!currentOwnedEvents.length && <div className="event-grid grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">{currentOwnedEvents.map((event) => renderEventCard(event, true))}</div>}
            {!!archivedOwnedEvents.length && (
              <section className="archive-section">
                <SectionHeader title="Archived and out-of-date" eyebrow={`${archivedOwnedEvents.length} older events`} />
                <div className="event-grid grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">{archivedOwnedEvents.map((event) => renderEventCard(event, true))}</div>
              </section>
            )}
          </>
        )}
      </section>
    )
  }

  function renderFinspoPanel() {
    return (
      <section className="community-panel mx-auto w-full max-w-[1280px]">
        {renderFinspoTabs()}

        {finspoScope !== 'mine' && (
          <>
            <SectionHeader
              action={
                <a className="button inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border px-5 py-2.5 text-center text-sm font-bold transition disabled:pointer-events-none disabled:opacity-50 [&.full]:w-full button-primary border-accent bg-accent text-white shadow-md shadow-accent/15 hover:bg-accent-hover" href={addFinspoHref()}>
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
            {!!finspoItems.length && <div className="finspo-masonry columns-2 gap-3 md:columns-3 lg:columns-4 max-md:columns-2 max-md:gap-2">{finspoItems.map((post) => renderFinspoTile(post))}</div>}
          </>
        )}

        {finspoScope === 'mine' && user && (
          <>
            <SectionHeader
              action={
                <a className="button inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border px-5 py-2.5 text-center text-sm font-bold transition disabled:pointer-events-none disabled:opacity-50 [&.full]:w-full button-primary border-accent bg-accent text-white shadow-md shadow-accent/15 hover:bg-accent-hover" href={addFinspoHref()}>
                  Post Finspo
                </a>
              }
              title="Your Finspo"
              eyebrow="Post, edit, and remove your own inspiration"
            />
            {myGallery.loading && <LoadingState label="Loading your Finspo..." />}
            {myGallery.error && <ErrorState message={myGallery.error} retry={myGallery.refetch} />}
            {!myGallery.loading && !myGallery.error && !finspoItems.length && <EmptyState body="Post your first Finspo to see it here." title="No posts yet" />}
            {!!finspoItems.length && <div className="finspo-masonry columns-2 gap-3 md:columns-3 lg:columns-4 max-md:columns-2 max-md:gap-2">{finspoItems.map((post) => renderFinspoTile(post, true))}</div>}
          </>
        )}
      </section>
    )
  }

  return (
    <AppShell active="community">
      <section className="page-hero [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:md:text-4xl [&_p]:text-sm [&_p]:leading-6 [&_p]:text-foose-muted [&_p]:md:text-base mb-8 rounded-xl border border-foose-border bg-foose-surface p-5 md:p-8 [&.small]:py-6 max-md:[&_h1]:text-2xl community-hero">
        <h1>Community Hub</h1>
        <p>Find local events and browse Finspo from the Foose community.</p>
      </section>
      {actionError && <ErrorState message={actionError} />}

      <nav className="tab-line [&_button]:shrink-0 [&_button]:rounded-full [&_button]:border [&_button]:border-foose-border [&_button]:bg-foose-surface-low [&_button]:px-4 [&_button]:py-2 [&_button]:text-sm [&_button]:font-semibold [&_button]:text-foose-muted [&_button]:transition [&_button]:hover:border-accent [&_button]:hover:text-accent [&_a]:shrink-0 [&_a]:rounded-full [&_a]:border [&_a]:border-foose-border [&_a]:bg-foose-surface-low [&_a]:px-4 [&_a]:py-2 [&_a]:text-sm [&_a]:font-semibold [&_a]:text-foose-muted [&_a]:transition [&_a]:hover:border-accent [&_a]:hover:text-accent [&_button.active]:border-accent [&_button.active]:bg-accent [&_button.active]:text-white [&_a.active]:border-accent [&_a.active]:bg-accent [&_a.active]:text-white flex flex-wrap items-center gap-2 community-main-tabs" aria-label="Community sections">
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
        <section className="seller-cta mx-auto w-full max-w-[1280px] rounded-xl bg-accent p-6 text-white my-10 grid gap-6 md:grid-cols-[1fr_auto] [&_h2]:text-3xl [&_h2]:font-bold compact">
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
