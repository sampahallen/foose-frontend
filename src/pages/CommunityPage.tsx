import { useCallback, useEffect, useRef, useState, type MouseEvent } from 'react'
import { IoArchiveOutline, IoEllipsisVertical, IoMegaphone } from 'react-icons/io5'
import { AppShell, Badge, ButtonLink, ConfirmDialog, FavoriteButton, FinspoAccountSuggestions, FinspoAccountSuggestionsSkeleton, FinspoCaption, FinspoFeedSkeleton, FinspoLikeButton, FinspoSkeletonTiles, FloatingCreateButton, Icon, InlineNotice, RefreshIndicator, SectionHeader, SelectControl, StatePanel, useToast } from '../components'
import { AppendFeedback, EventGridSkeleton } from '../components/feedback/DiscoverySkeletons'
import { DiscoveryImage } from '../components/feedback/DiscoveryMedia'
import { useAuth } from '../hooks/useAuth'
import { useApiResource } from '../hooks/useApiResource'
import { useFinspoFeed, type FinspoFeedSnapshot } from '../hooks/useFinspoFeed'
import { useImageBatchReady } from '../hooks/useImageBatchReady'
import { useInfiniteApiResource } from '../hooks/useInfiniteApiResource'
import { usePageNavigationSnapshot } from '../hooks/usePageNavigationSnapshot'
import { apiDelete, apiPost } from '../lib/api'
import { getNavigationSnapshot } from '../stores/navigationMemoryStore'
import type { Event, FinspoAccountSuggestion, FollowingFinspoFeed, GalleryPost } from '../types/api'
import { authHref } from '../utils/authRedirect'
import { eventHostName, eventTimeLabel, eventTypeLabel, eventWindowHasClosed, isOnlinePopUp } from '../utils/events'
import { getErrorMessage } from '../utils/errorMessage'
import { cacheFinspoPreview, captureNavigationTrigger, navigateTo, withBasePath } from '../utils/navigation'
import { eventPromotionPackages, startPromotionCheckout, type PromotionPackageName } from '../utils/promotions'

type CommunityMainTab = 'events' | 'finspo'
type EventScope = 'featured' | 'mine' | 'public'
type FinspoScope = 'following' | 'mine' | 'public'
type FinspoPostAction = 'archive' | 'delete'
type PaginatedEvents = { events: Event[]; page: number; pages: number; total: number }
type CommunityFinspoNavigationSnapshot = {
  failedImages: string[]
  items: GalleryPost[]
  publicFeed: FinspoFeedSnapshot | null
  scope: FinspoScope
  version: 1
}

function FinspoPostMenu({
  open,
  onClose,
  onRequestAction,
  onToggle,
  post,
}: {
  open: boolean
  onClose: () => void
  onRequestAction: (action: FinspoPostAction, post: GalleryPost) => void
  onToggle: () => void
  post: GalleryPost
}) {
  const menuRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) return

    function closeOnOutsideClick(event: globalThis.MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) onClose()
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }

    document.addEventListener('mousedown', closeOnOutsideClick)
    window.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick)
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [onClose, open])

  return (
    <div className="absolute right-2 top-2 z-30" ref={menuRef}>
      <button
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={`${open ? 'Close' : 'Open'} options for ${post.caption || 'Finspo post'}`}
        className="inline-flex size-8 items-center justify-center rounded-full border border-white/60 bg-white/90 text-foose-text shadow-md backdrop-blur transition hover:bg-white hover:text-accent"
        onClick={onToggle}
        type="button"
      >
        <IoEllipsisVertical size={18} />
      </button>
      {open && (
        <div className="absolute right-0 top-10 z-40 w-44 rounded-xl border border-foose-border bg-foose-surface p-1.5 shadow-2xl" role="menu">
          <a className="flex min-h-10 items-center gap-3 rounded-lg px-3 text-left text-sm font-bold text-foose-text transition hover:bg-foose-surface-low hover:text-accent" href={withBasePath(`/community/finspo/${post._id}/edit`)} onClick={onClose} role="menuitem">
            <Icon name="pencil" size={17} /> Edit
          </a>
          <button className="flex min-h-10 w-full items-center gap-3 rounded-lg px-3 text-left text-sm font-bold text-foose-text transition hover:bg-foose-surface-low hover:text-accent disabled:cursor-not-allowed disabled:opacity-50" disabled={post.isArchived} onClick={() => onRequestAction('archive', post)} role="menuitem" type="button">
            <IoArchiveOutline size={18} /> {post.isArchived ? 'Archived' : 'Archive'}
          </button>
          <button className="flex min-h-10 w-full items-center gap-3 rounded-lg px-3 text-left text-sm font-bold text-foose-danger transition hover:bg-foose-danger-bg" onClick={() => onRequestAction('delete', post)} role="menuitem" type="button">
            <Icon name="trash" size={17} /> Delete
          </button>
        </div>
      )}
    </div>
  )
}

function initialCommunityState() {
  const params = new URLSearchParams(window.location.search)
  const tab = params.get('tab') === 'events' ? 'events' : 'finspo'
  const scope = params.get('scope')

  return {
    eventScope: scope === 'mine' || scope === 'public' ? scope : 'featured',
    finspoScope: scope === 'mine' || scope === 'following' ? scope : 'public',
    mainTab: tab,
  } as const
}

function isArchivedEvent(event: Event) {
  return eventWindowHasClosed(event)
}

function isPromotedEvent(event: Event) {
  if (event.status === 'past') return false
  if (event.promotionExpiresAt && new Date(event.promotionExpiresAt).getTime() <= Date.now()) return false
  return Boolean(event.promotionTags?.some((tag) => ['featured', 'home-featured', 'home-banner'].includes(tag)))
}

function finspoAuthor(post: GalleryPost) {
  if (post.userId && typeof post.userId === 'object') return `@${post.userId.username}`
  return 'Foose member'
}

function finspoAuthorHref(post: GalleryPost) {
  if (post.userId && typeof post.userId === 'object') return `/profile/${post.userId.username}`
  return '#'
}

function refreshScopedFinspoOrder(current: GalleryPost[], incoming: GalleryPost[]) {
  const refreshed = new Map(incoming.map((post) => [post._id, post]))
  const known = new Set(current.map((post) => post._id))
  return [
    ...current.filter((post) => refreshed.has(post._id)).map((post) => refreshed.get(post._id) || post),
    ...incoming.filter((post) => !known.has(post._id)),
  ]
}

function openFinspo(event: MouseEvent<HTMLAnchorElement>, post: GalleryPost, sourceLabel: string) {
  if (event.button !== 0 || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return
  event.preventDefault()
  cacheFinspoPreview(post)
  navigateTo(`/community/finspo/${post._id}`, {
    sourceLabel,
    trigger: captureNavigationTrigger(event.currentTarget),
  })
}

export function CommunityPage() {
  const initialState = initialCommunityState()
  const { refreshUser, status, user } = useAuth()
  const { showToast } = useToast()
  const [actionError, setActionError] = useState('')
  const [mainTab] = useState<CommunityMainTab>(initialState.mainTab)
  const [eventScope] = useState<EventScope>(initialState.eventScope)
  const [finspoScope] = useState<FinspoScope>(initialState.finspoScope)
  const [restoredFinspo] = useState<CommunityFinspoNavigationSnapshot | null>(() => {
    const snapshot = getNavigationSnapshot<CommunityFinspoNavigationSnapshot>(`community-finspo:${initialState.finspoScope}`)?.data
    return snapshot?.version === 1 && snapshot.scope === initialState.finspoScope ? snapshot : null
  })
  const [promotingEventId, setPromotingEventId] = useState('')
  const [eventPromotionPackage, setEventPromotionPackage] = useState<PromotionPackageName>('basic')
  const [pendingEventDelete, setPendingEventDelete] = useState<Event | null>(null)
  const [eventDeleteBusy, setEventDeleteBusy] = useState(false)
  const [eventDeleteError, setEventDeleteError] = useState('')
  const [finspoMenuPost, setFinspoMenuPost] = useState<GalleryPost | null>(null)
  const [pendingFinspoAction, setPendingFinspoAction] = useState<{ action: FinspoPostAction; post: GalleryPost } | null>(null)
  const [finspoActionBusy, setFinspoActionBusy] = useState(false)
  const [finspoActionError, setFinspoActionError] = useState('')
  const [suggestionSession, setSuggestionSession] = useState<{ accounts: FinspoAccountSuggestion[]; personalized: boolean; userId: string } | null>(null)
  const eventsPath = useCallback((page: number) => `/community/events?page=${page}&limit=12`, [])
  const extractEvents = useCallback((data: PaginatedEvents) => data.events || [], [])
  const events = useInfiniteApiResource(eventsPath, extractEvents, [])
  const myEvents = useApiResource<{ events: Event[] }>('/community/events/me', Boolean(user))
  const gallery = useFinspoFeed({
    enabled: mainTab === 'finspo',
    initialSnapshot: restoredFinspo?.publicFeed,
  })
  const followingGallery = useApiResource<FollowingFinspoFeed>('/community/gallery/following', Boolean(user && mainTab === 'finspo' && finspoScope === 'following'))
  const myGallery = useApiResource<{ posts: GalleryPost[]; total: number }>('/community/gallery/me', Boolean(user))

  const publicEvents = events.items
  const featuredEvents = publicEvents.filter(isPromotedEvent)
  const ownedEvents = myEvents.data?.events || []
  const currentOwnedEvents = ownedEvents.filter((event) => !isArchivedEvent(event))
  const archivedOwnedEvents = ownedEvents.filter(isArchivedEvent)
  const finspoSource = finspoScope === 'mine' ? myGallery : followingGallery
  const incomingScopedFinspoItems = finspoSource.data?.posts?.filter((post) => finspoScope !== 'mine' || !post.isArchived)
  const restoredScopedFinspoItems = restoredFinspo?.items || []
  const scopedFinspoItems = incomingScopedFinspoItems
    ? refreshScopedFinspoOrder(restoredScopedFinspoItems, incomingScopedFinspoItems)
    : restoredScopedFinspoItems
  const scopedImages = useImageBatchReady(
    scopedFinspoItems.map((post) => post.imageUrl),
    finspoScope !== 'public' && (!finspoSource.loading || Boolean(restoredScopedFinspoItems.length)),
  )
  const failedScopedImages = new Set([...(restoredFinspo?.failedImages || []), ...scopedImages.failed])
  const readyScopedFinspoItems = scopedImages.ready ? scopedFinspoItems : []
  const finspoItems = finspoScope === 'public' ? gallery.items : readyScopedFinspoItems
  const activeFinspoError = finspoScope === 'public' ? gallery.error : finspoSource.error
  const activeFinspoLoading = finspoScope === 'public'
    ? gallery.loading
    : (finspoSource.loading && !restoredScopedFinspoItems.length) || (!finspoSource.error && !scopedImages.ready)
  const activeFinspoRefetch = finspoScope === 'public' ? gallery.refetch : finspoSource.refetch
  const restorationMedia = useImageBatchReady(
    finspoItems.map((post) => post.imageUrl),
    mainTab === 'finspo' && !activeFinspoLoading,
  )
  const activeFailedImages = finspoScope === 'public'
    ? Array.from(gallery.failedImageSet)
    : Array.from(failedScopedImages)
  const restorationReady = mainTab !== 'finspo' || (!activeFinspoLoading && restorationMedia.ready)
  usePageNavigationSnapshot<CommunityFinspoNavigationSnapshot>({
    capture: () => ({
      failedImages: activeFailedImages,
      items: finspoItems,
      publicFeed: gallery.snapshot,
      scope: finspoScope,
      version: 1,
    }),
    mediaHeavy: true,
    namespace: `community-finspo:${finspoScope}`,
    ready: restorationReady,
  })
  const responseSuggestions = followingGallery.data?.suggestedAccounts || []
  const activeSuggestionSession = suggestionSession && suggestionSession.userId === user?._id ? suggestionSession : null
  const finspoAccountSuggestions = finspoScope === 'following'
    ? (activeSuggestionSession?.accounts || responseSuggestions)
    : []
  const suggestionsPersonalized = activeSuggestionSession
    ? activeSuggestionSession.personalized
    : Boolean(followingGallery.data?.suggestionMeta?.personalized)

  async function refreshCommunity() {
    const jobs = [events.refetch(), gallery.refetch()]
    if (user) jobs.push(myEvents.refetch(), myGallery.refetch(), followingGallery.refetch())
    await Promise.all(jobs)
  }

  async function refreshFollowingAfterSuggestion() {
    if (user && responseSuggestions.length && suggestionSession?.userId !== user._id) {
      setSuggestionSession({
        accounts: responseSuggestions,
        personalized: Boolean(followingGallery.data?.suggestionMeta?.personalized),
        userId: user._id,
      })
    }
    await Promise.allSettled([refreshUser(), followingGallery.refetch()])
  }

  function addEventHref() {
    return user || status === 'checking' ? withBasePath('/community/events/new') : authHref('/login', '/community/events/new', { closeToHome: true })
  }

  function addFinspoHref() {
    return user || status === 'checking' ? withBasePath('/community/finspo/new') : authHref('/login', '/community/finspo/new', { closeToHome: true })
  }

  function renderFloatingCreateButton() {
    const isFinspo = mainTab === 'finspo'
    const showArchiveShortcut = isFinspo && finspoScope === 'mine' && Boolean(user)
    return (
      <>
        {showArchiveShortcut && (
          <a aria-label="View archived Finspo" className="fixed bottom-[calc(6rem+env(safe-area-inset-bottom))] right-20 z-50 inline-flex size-14 items-center justify-center rounded-full border border-accent/20 bg-foose-surface/95 text-accent shadow-xl backdrop-blur transition hover:bg-accent-light focus:outline-none focus:ring-2 focus:ring-accent/30 md:hidden" href={withBasePath('/community/finspo/archived')}>
            <IoArchiveOutline size={25} />
          </a>
        )}
        <FloatingCreateButton href={isFinspo ? addFinspoHref() : addEventHref()} label={isFinspo ? 'Post Finspo' : 'Add event'} />
      </>
    )
  }

  function requestEventDelete(event: Event) {
    setActionError('')
    setEventDeleteError('')
    setPendingEventDelete(event)
  }

  async function deleteEvent() {
    if (!pendingEventDelete) return
    setEventDeleteError('')
    setEventDeleteBusy(true)
    try {
      await apiDelete(`/community/events/${pendingEventDelete._id}`)
      showToast({ message: 'The event was removed from Community.', title: 'Event deleted', tone: 'success' })
      await refreshCommunity()
      setPendingEventDelete(null)
    } catch (err) {
      setEventDeleteError(getErrorMessage(err, 'Could not delete event'))
    } finally {
      setEventDeleteBusy(false)
    }
  }

  async function promoteEvent(event: Event) {
    setActionError('')
    setPromotingEventId(event._id)
    try {
      const result = await startPromotionCheckout('event', event._id, eventPromotionPackage)
      if (result.status === 'cancelled') {
        showToast({ message: 'You were not charged. You can promote this event whenever you are ready.', title: 'Payment cancelled', tone: 'info' })
      }
    } catch (err) {
      setActionError(getErrorMessage(err, 'Could not start event promotion'))
    } finally {
      setPromotingEventId('')
    }
  }

  function requestFinspoAction(action: FinspoPostAction, post: GalleryPost) {
    setFinspoMenuPost(null)
    setFinspoActionError('')
    setPendingFinspoAction({ action, post })
  }

  async function confirmFinspoAction() {
    if (!pendingFinspoAction) return

    const { action, post } = pendingFinspoAction
    setFinspoActionBusy(true)
    setFinspoActionError('')
    try {
      if (action === 'archive') {
        await apiPost(`/community/gallery/${post._id}/archive`)
      } else {
        await apiDelete(`/community/gallery/${post._id}`)
      }
      showToast({
        message: action === 'archive' ? 'You can restore it from Archived Finspo for 30 days.' : 'The Finspo post was permanently removed.',
        title: action === 'archive' ? 'Finspo archived' : 'Finspo deleted',
        tone: 'success',
      })
      await refreshCommunity()
      setPendingFinspoAction(null)
    } catch (err) {
      setFinspoActionError(getErrorMessage(err, action === 'archive' ? 'Could not archive Finspo' : 'Could not delete Finspo'))
    } finally {
      setFinspoActionBusy(false)
    }
  }

  function renderEventCard(event: Event, owned = false) {
    return (
      <article className="event-card rounded-lg border border-foose-border bg-foose-surface shadow-sm [&_h2]:text-sm [&_h2]:font-semibold [&_h2]:leading-tight [&_p]:text-[11px] [&_p]:uppercase [&_p]:tracking-wide [&_p]:text-foose-faint overflow-hidden p-0 [&>div:last-child]:flex [&>div:last-child]:flex-col [&>div:last-child]:gap-2 [&>div:last-child]:p-3 [&_.button]:min-h-9 [&_.button]:w-full [&_.button]:px-3 [&_.button]:py-2 [&_.table-actions_.button]:w-full" key={event._id}>
        <div className="event-image overflow-hidden rounded-lg bg-foose-surface-mid [&_img]:h-full [&_img]:w-full [&_img]:object-cover aspect-[16/9] rounded-none">
          <DiscoveryImage alt={`${event.title} cover`} fallback="Event cover unavailable" fallbackClassName="h-full min-h-32 w-full" src={event.coverImage} />
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
          <p className="muted-copy text-xs leading-5 text-foose-muted">{eventTypeLabel(event)}</p>
          {owned ? (
            <div className="table-actions flex flex-wrap items-center gap-3 justify-end">
              <a className="button inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border px-5 py-2.5 text-center text-sm font-bold transition disabled:pointer-events-none disabled:opacity-50 [&.full]:w-full button-secondary border-foose-border bg-foose-surface text-foose-text hover:border-accent hover:text-accent" href={withBasePath(`/community/events/${event._id}/manage`)}>
                Manage
              </a>
              {isPromotedEvent(event) ? (
                <span className="button inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border px-5 py-2.5 text-center text-sm font-bold transition disabled:pointer-events-none disabled:opacity-50 [&.full]:w-full button-secondary border-foose-border bg-foose-surface text-foose-text hover:border-accent hover:text-accent event-promotion-pill pointer-events-none bg-accent-light text-accent">Promoted</span>
              ) : (
                <div className="grid w-full gap-2">
                  <label className="relative block">
                    <SelectControl
                      aria-label="Event promotion package"
                      className="h-11 w-full appearance-none rounded-xl border border-accent/20 bg-accent-light/70 px-3 pr-10 text-xs font-black text-accent outline-none transition hover:border-accent focus:border-accent focus:bg-white focus:ring-2 focus:ring-accent/15"
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
                  <button className="button inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border px-5 py-2.5 text-center text-sm font-bold transition disabled:pointer-events-none disabled:opacity-50 [&.full]:w-full button-secondary border-foose-border bg-foose-surface text-foose-text hover:border-accent hover:text-accent" disabled={promotingEventId === event._id} onClick={() => void promoteEvent(event)} type="button">
                    <IoMegaphone /> {promotingEventId === event._id ? 'Opening secure payment...' : 'Promote'}
                  </button>
                </div>
              )}
              <button className="button inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border px-5 py-2.5 text-center text-sm font-bold transition disabled:pointer-events-none disabled:opacity-50 [&.full]:w-full button-secondary border-foose-border bg-foose-surface text-foose-text hover:border-accent hover:text-accent" onClick={() => requestEventDelete(event)} type="button">
                Remove
              </button>
            </div>
          ) : (
            <div className="table-actions flex flex-wrap items-center gap-3 justify-end">
              <a className="button inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border px-5 py-2.5 text-center text-sm font-bold transition disabled:pointer-events-none disabled:opacity-50 [&.full]:w-full button-secondary border-foose-border bg-foose-surface text-foose-text hover:border-accent hover:text-accent" href={withBasePath(`/community/events/${event._id}`)}>
                View event
              </a>
              <FavoriteButton className="button inline-flex min-h-9 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-center text-xs font-bold transition disabled:pointer-events-none disabled:opacity-50 [&.full]:w-full button-secondary border-foose-border bg-foose-surface text-foose-text hover:border-accent hover:text-accent favorite-button [&.is-active]:bg-accent [&.is-active]:text-white" showText targetId={event._id} targetType="event" />
            </div>
          )}
        </div>
      </article>
    )
  }

  function renderFinspoTile(post: GalleryPost, owned = false) {
    const mediaFailed = finspoScope === 'public' ? gallery.failedImageSet.has(post.imageUrl) : failedScopedImages.has(post.imageUrl)
    const sourceLabel = finspoScope === 'mine'
      ? 'My Finspo'
      : finspoScope === 'following'
        ? 'Following Finspo'
        : 'Finspo'
    return (
      <article className="finspo-tile relative mb-3 break-inside-avoid max-md:mb-2" key={post._id}>
        <a
          aria-label={post.caption || `Finspo by ${finspoAuthor(post)}`}
          className="finspo-image block overflow-hidden rounded-none border-0 bg-transparent [&_img]:h-auto [&_img]:w-full [&_img]:object-contain [&_img]:transition-transform [&_img]:duration-300 [&_img]:ease-out hover:[&_img]:scale-[1.025] motion-reduce:[&_img]:transform-none motion-reduce:[&_img]:transition-none finspo-tile-link"
          href={withBasePath(`/community/finspo/${post._id}`)}
          id={`finspo-community-${finspoScope}-${post._id}`}
          onClick={(event) => openFinspo(event, post, sourceLabel)}
        >
          {mediaFailed
            ? <span className="flex aspect-[4/5] w-full items-center justify-center bg-foose-surface-mid px-3 text-center text-xs font-bold text-foose-muted" role="img" aria-label="Finspo image unavailable">Media unavailable</span>
            : <img alt="" src={post.imageUrl} />}
        </a>
        {!owned && <FinspoLikeButton className="floating-round inline-flex size-8 shrink-0 items-center justify-center rounded-full border border-transparent bg-transparent text-current transition hover:bg-accent-light hover:text-accent absolute right-2 top-2 z-10 bg-white/90 shadow favorite-button [&.is-active]:bg-accent [&.is-active]:text-white" initialCount={post.likes?.length} initialLiked={user ? post.likes?.some((userId) => String(userId) === user._id) : undefined} targetId={post._id} />}
        <FinspoCaption caption={post.caption} />
        {!owned && (
          <a className="finspo-author-link mt-1 flex items-center gap-2 text-xs font-semibold text-foose-muted" href={finspoAuthorHref(post)}>
            {finspoAuthor(post)}
          </a>
        )}
        {owned && (
          <FinspoPostMenu
            open={finspoMenuPost?._id === post._id}
            onClose={() => setFinspoMenuPost(null)}
            onRequestAction={requestFinspoAction}
            onToggle={() => setFinspoMenuPost((current) => current?._id === post._id ? null : post)}
            post={post}
          />
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
      <nav className="section-tabs mb-6 flex items-center justify-between gap-4 border-b border-foose-border [&_a]:flex-1 [&_a]:border-0 [&_a]:border-b-2 [&_a]:border-transparent [&_a]:bg-transparent [&_a]:px-2 [&_a]:py-3 [&_a]:text-center [&_a]:text-sm [&_a]:font-semibold [&_a]:text-foose-muted [&_a]:transition [&_a]:hover:border-accent/40 [&_a]:hover:text-accent [&_a.active]:border-accent [&_a.active]:text-accent" aria-label="Event views">
        <a aria-current={eventScope === 'featured' ? 'page' : undefined} className={eventScope === 'featured' ? 'active' : ''} href={withBasePath('/community?tab=events&scope=featured')}>
          Featured
        </a>
        <a aria-current={eventScope === 'public' ? 'page' : undefined} className={eventScope === 'public' ? 'active' : ''} href={withBasePath('/community?tab=events&scope=public')}>
          Public
        </a>
        <a aria-current={eventScope === 'mine' ? 'page' : undefined} className={eventScope === 'mine' ? 'active' : ''} href={user ? withBasePath('/community?tab=events&scope=mine') : authHref('/login', '/community?tab=events&scope=mine')}>
          My events
        </a>
      </nav>
    )
  }

  function renderFinspoTabs() {
    return (
      <nav className="section-tabs mb-6 flex items-center justify-between gap-4 border-b border-foose-border [&_a]:flex-1 [&_a]:border-0 [&_a]:border-b-2 [&_a]:border-transparent [&_a]:bg-transparent [&_a]:px-2 [&_a]:py-3 [&_a]:text-center [&_a]:text-sm [&_a]:font-semibold [&_a]:text-foose-muted [&_a]:transition [&_a]:hover:border-accent/40 [&_a]:hover:text-accent [&_a.active]:border-accent [&_a.active]:text-accent" aria-label="Finspo views">
        <a aria-current={finspoScope === 'public' ? 'page' : undefined} className={finspoScope === 'public' ? 'active' : ''} href={withBasePath('/community?tab=finspo&scope=public')}>
          Public
        </a>
        <a aria-current={finspoScope === 'following' ? 'page' : undefined} className={finspoScope === 'following' ? 'active' : ''} href={user ? withBasePath('/community?tab=finspo&scope=following') : authHref('/login', '/community?tab=finspo&scope=following')}>
          Following
        </a>
        <a aria-current={finspoScope === 'mine' ? 'page' : undefined} className={finspoScope === 'mine' ? 'active' : ''} href={user ? withBasePath('/community?tab=finspo&scope=mine') : authHref('/login', '/community?tab=finspo&scope=mine')}>
          My Finspo
        </a>
      </nav>
    )
  }

  function renderEventPanel() {
    return (
      <section className="community-panel mx-auto w-full max-w-[1280px]">
        {renderEventTabs()}
        <RefreshIndicator active={eventScope === 'mine' ? myEvents.refreshing : events.refreshing} className="mb-4" label="Refreshing community events" />

        {eventScope === 'featured' && (
          <>
            <SectionHeader
              title="Featured events"
              eyebrow="Promoted pop-ups and community moments"
            />
            {events.loading && !featuredEvents.length && <EventGridSkeleton count={4} label="Loading featured community events" />}
            {events.error && !featuredEvents.length && <StatePanel action={<button className="button button-secondary" onClick={events.refetch} type="button">Try again</button>} body={events.error} layout="section" title="Featured events could not load" tone="error" />}
            {events.error && !!featuredEvents.length && <InlineNotice action={<button className="font-black text-accent" onClick={events.refetch} type="button">Retry</button>} tone="warning">Featured events could not refresh. Showing the current events.</InlineNotice>}
            {!events.loading && !events.error && !featuredEvents.length && <StatePanel body="Promoted community events will appear here when a campaign is active." layout="section" title="No featured events right now" tone="empty" />}
            {!!featuredEvents.length && <div className="event-grid grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">{featuredEvents.map((event) => renderEventCard(event))}</div>}
            <div ref={events.sentinelRef} className="flex min-h-14 items-center justify-center py-4">
              <AppendFeedback error={events.loadMoreError} label="Loading more featured events" loading={events.loadingMore} retry={events.retryLoadMore} />
            </div>
          </>
        )}

        {eventScope === 'public' && (
          <>
            <SectionHeader
              title="Public events"
              eyebrow="Save the events you want to come back to"
            />
            {events.loading && !publicEvents.length && <EventGridSkeleton count={6} label="Loading public community events" />}
            {events.error && !publicEvents.length && <StatePanel action={<button className="button button-secondary" onClick={events.refetch} type="button">Try again</button>} body={events.error} layout="section" title="Community events could not load" tone="error" />}
            {events.error && !!publicEvents.length && <InlineNotice action={<button className="font-black text-accent" onClick={events.refetch} type="button">Retry</button>} tone="warning">Community events could not refresh. Showing the current events.</InlineNotice>}
            {!events.loading && !events.error && !publicEvents.length && <StatePanel action={<ButtonLink to="/community/events/new">Add an event</ButtonLink>} body="Be the first to publish a community event or pop-up." layout="section" title="No events yet" tone="empty" />}
            {!!publicEvents.length && <div className="event-grid grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">{publicEvents.map((event) => renderEventCard(event))}</div>}
            <div ref={events.sentinelRef} className="flex min-h-14 items-center justify-center py-4">
              <AppendFeedback error={events.loadMoreError} label="Loading more community events" loading={events.loadingMore} retry={events.retryLoadMore} />
            </div>
          </>
        )}

        {eventScope === 'mine' && user && (
          <>
            <SectionHeader
              title="Your listed events"
              eyebrow="Edit or remove the events you created"
            />
            {myEvents.initialLoading && <EventGridSkeleton count={4} label="Loading your listed events" />}
            {myEvents.error && !ownedEvents.length && <StatePanel action={<button className="button button-secondary" onClick={myEvents.refetch} type="button">Try again</button>} body={myEvents.error} layout="section" title="Your events could not load" tone="error" />}
            {myEvents.error && !!ownedEvents.length && <InlineNotice action={<button className="font-black text-accent" onClick={myEvents.refetch} type="button">Retry</button>} tone="warning">Your event list could not refresh. Current events remain available.</InlineNotice>}
            {!myEvents.loading && !myEvents.error && !ownedEvents.length && <StatePanel action={<ButtonLink to="/community/events/new">Create an event</ButtonLink>} body="Create an event to manage it here." layout="section" title="No events listed" tone="empty" />}
            {!!currentOwnedEvents.length && <div className="event-grid grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">{currentOwnedEvents.map((event) => renderEventCard(event, true))}</div>}
            {!!archivedOwnedEvents.length && (
              <section className="archive-section">
                <SectionHeader title="Archived and out-of-date" eyebrow={`${archivedOwnedEvents.length} older events`} />
                <div className="event-grid grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">{archivedOwnedEvents.map((event) => renderEventCard(event, true))}</div>
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
        <RefreshIndicator active={finspoScope === 'public' ? gallery.refreshing : finspoSource.refreshing} className="mb-4" label="Refreshing Finspo" />

        {finspoScope !== 'mine' && (
          <>
            {activeFinspoLoading && !finspoItems.length && !finspoAccountSuggestions.length && (
              finspoScope === 'following' ? <FinspoAccountSuggestionsSkeleton /> : <FinspoFeedSkeleton />
            )}
            {activeFinspoError && <InlineNotice action={<button className="font-black text-accent" onClick={activeFinspoRefetch} type="button">Retry</button>} title="Finspo could not load" tone="error">{activeFinspoError}</InlineNotice>}
            {finspoScope === 'following' && !!finspoAccountSuggestions.length && (
              <FinspoAccountSuggestions accounts={finspoAccountSuggestions} onFollowingChanged={refreshFollowingAfterSuggestion} personalized={suggestionsPersonalized} />
            )}
            {!activeFinspoLoading && !activeFinspoError && !finspoItems.length && !finspoAccountSuggestions.length && (
              <StatePanel action={finspoScope === 'following' ? <a className="button button-secondary" href={withBasePath('/community?tab=finspo&scope=public')}>Discover public Finspo</a> : <ButtonLink to="/community/finspo/new">Post Finspo</ButtonLink>} body={finspoScope === 'following' ? 'Follow members to build a Finspo feed around their posts.' : 'Be the first to share a look or source of inspiration.'} layout="section" title="No Finspo yet" tone="empty" />
            )}
            {!!finspoItems.length && (
              <div className="finspo-masonry columns-2 gap-2 md:columns-3 lg:columns-5 max-md:columns-2 max-md:gap-2">
                {finspoItems.map((post) => renderFinspoTile(post))}
                {finspoScope === 'public' && gallery.loadingMore && <FinspoSkeletonTiles />}
              </div>
            )}
            {finspoScope === 'public' && (
              <div ref={gallery.sentinelRef} className="min-h-14 py-4" aria-label={gallery.hasMore ? 'Load more Finspo posts' : 'All Finspo posts loaded'}>
                {gallery.loadMoreError && <InlineNotice action={<button className="font-black text-accent" onClick={gallery.retryLoadMore} type="button">Try again</button>} title="More Finspo did not load" tone="error">{gallery.loadMoreError}</InlineNotice>}
              </div>
            )}
          </>
        )}

        {finspoScope === 'mine' && user && (
          <>
            <SectionHeader
              action={
                <div className="hidden items-center gap-2 md:flex">
                  <a className="button inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-foose-border bg-foose-surface px-5 py-2.5 text-center text-sm font-bold text-foose-text transition hover:border-accent hover:text-accent" href={withBasePath('/community/finspo/archived')}>
                    <IoArchiveOutline size={19} /> Archived
                  </a>
                </div>
              }
              title="Your Finspo"
              eyebrow="Manage active and archived inspiration"
            />
            {activeFinspoLoading && !finspoItems.length && <FinspoFeedSkeleton label="Loading your Finspo posts" showAuthor={false} showMenu />}
            {activeFinspoError && <InlineNotice action={<button className="font-black text-accent" onClick={activeFinspoRefetch} type="button">Retry</button>} title="Your Finspo could not load" tone="error">{activeFinspoError}</InlineNotice>}
            {!activeFinspoLoading && !activeFinspoError && !finspoItems.length && <StatePanel action={<ButtonLink to="/community/finspo/new">Post Finspo</ButtonLink>} body="Post new Finspo or review posts in your archive." layout="section" title="No active posts" tone="empty" />}
            {!!finspoItems.length && <div className="finspo-masonry columns-2 gap-2 md:columns-3 lg:columns-5 max-md:columns-2 max-md:gap-2">{finspoItems.map((post) => renderFinspoTile(post, true))}</div>}
          </>
        )}
      </section>
    )
  }

  return (
    <AppShell active="community">
      {actionError && <InlineNotice className="mx-auto mb-4 w-full max-w-[1280px]" title="Community action did not finish" tone="error">{actionError}</InlineNotice>}

      <nav className="tab-line community-main-tabs flex flex-wrap items-center justify-center gap-2 [&_button]:shrink-0 [&_button]:rounded-full [&_button]:border [&_button]:border-foose-border [&_button]:bg-foose-surface-low [&_button]:px-4 [&_button]:py-2 [&_button]:text-sm [&_button]:font-semibold [&_button]:text-foose-muted [&_button]:transition [&_button]:hover:border-accent [&_button]:hover:text-accent [&_a]:shrink-0 [&_a]:rounded-full [&_a]:border [&_a]:border-foose-border [&_a]:bg-foose-surface-low [&_a]:px-4 [&_a]:py-2 [&_a]:text-sm [&_a]:font-semibold [&_a]:text-foose-muted [&_a]:transition [&_a]:hover:border-accent [&_a]:hover:text-accent [&_button.active]:border-accent [&_button.active]:bg-accent [&_button.active]:text-white [&_a.active]:border-accent [&_a.active]:bg-accent [&_a.active]:text-white" aria-label="Community sections">
        <a aria-current={mainTab === 'finspo' ? 'page' : undefined} className={mainTab === 'finspo' ? 'active' : ''} href={withBasePath(`/community?tab=finspo&scope=${finspoScope}`)}>
          Finspo
        </a>
        <a aria-current={mainTab === 'events' ? 'page' : undefined} className={mainTab === 'events' ? 'active' : ''} href={withBasePath(`/community?tab=events&scope=${eventScope}`)}>
          Events
        </a>
      </nav>

      {mainTab === 'finspo' && renderFinspoPanel()}
      {mainTab === 'events' && renderEventPanel()}
      {renderFloatingCreateButton()}

      {pendingFinspoAction && (
        <ConfirmDialog
          busy={finspoActionBusy}
          confirmLabel={pendingFinspoAction.action === 'delete' ? 'Delete post' : 'Archive post'}
          description={(
            <span className="grid gap-3">
              <span>
                {pendingFinspoAction.action === 'delete'
                  ? 'This Finspo post will be permanently deleted. This action cannot be undone.'
                  : 'This post will disappear from public, following, saved, and recommendation feeds. You can restore it from Archived Finspo for up to 30 days.'}
              </span>
              {finspoActionError && <span className="rounded-xl border border-foose-danger/30 bg-foose-danger-bg/40 p-3 font-semibold text-foose-danger" role="alert">{finspoActionError}</span>}
            </span>
          )}
          onCancel={() => {
            if (!finspoActionBusy) {
              setPendingFinspoAction(null)
              setFinspoActionError('')
            }
          }}
          onConfirm={() => void confirmFinspoAction()}
          open
          title={pendingFinspoAction.action === 'delete' ? 'Delete this post?' : 'Archive this post?'}
          tone={pendingFinspoAction.action === 'delete' ? 'destructive' : 'default'}
        />
      )}

      {pendingEventDelete && (
        <ConfirmDialog
          busy={eventDeleteBusy}
          confirmLabel="Delete event"
          description={(
            <span className="grid gap-3">
              <span><strong>{pendingEventDelete.title}</strong> will be removed from Community. This action cannot be undone.</span>
              {eventDeleteError && <span className="rounded-xl border border-foose-danger/30 bg-foose-danger-bg/40 p-3 font-semibold text-foose-danger" role="alert">{eventDeleteError}</span>}
            </span>
          )}
          onCancel={() => {
            if (!eventDeleteBusy) {
              setPendingEventDelete(null)
              setEventDeleteError('')
            }
          }}
          onConfirm={() => void deleteEvent()}
          open
          title="Delete this event?"
          tone="destructive"
        />
      )}

      {!user && (
        <section className="seller-cta mx-auto w-full max-w-[1280px] rounded-xl bg-accent p-6 text-white my-10 grid gap-6 md:grid-cols-[1fr_auto] [&_h2]:text-3xl [&_h2]:font-bold compact">
          <div>
            <h2>Want to contribute?</h2>
            <p>Create an account to save events, like Finspo, and manage your own posts.</p>
          </div>
          <ButtonLink to={authHref('/login', '/community')} variant="secondary">
            Sign up
          </ButtonLink>
        </section>
      )}
    </AppShell>
  )
}
