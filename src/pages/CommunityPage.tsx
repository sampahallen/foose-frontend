import { useCallback, useEffect, useState, type MouseEvent } from 'react'
import { AppShell, Badge, ButtonLink, FavoriteButton, FinspoAccountSuggestions, FinspoAccountSuggestionsSkeleton, FinspoCaption, FinspoFeedSkeleton, FinspoLikeButton, FinspoMediaCarousel, FinspoSkeletonTiles, FloatingCreateButton, Icon, InlineNotice, LoadingState, RefreshIndicator, SectionHeader, StatePanel } from '../components'
import { AppendFeedback, EventGridSkeleton } from '../components/feedback/DiscoverySkeletons'
import { DiscoveryImage } from '../components/feedback/DiscoveryMedia'
import { useAuth } from '../hooks/useAuth'
import { useApiResource } from '../hooks/useApiResource'
import { useFinspoFeed, type FinspoFeedSnapshot } from '../hooks/useFinspoFeed'
import { useImageBatchReady } from '../hooks/useImageBatchReady'
import { useInfiniteApiResource } from '../hooks/useInfiniteApiResource'
import { usePageNavigationSnapshot } from '../hooks/usePageNavigationSnapshot'
import { getNavigationSnapshot } from '../stores/navigationMemoryStore'
import type { Event, FinspoAccountSuggestion, FollowingFinspoFeed, GalleryPost } from '../types/api'
import { authHref } from '../utils/authRedirect'
import { communityMineRedirect } from '../utils/communityNavigation'
import { eventHostName, eventTimeLabel, eventTypeLabel, isOnlinePopUp } from '../utils/events'
import { finspoImages } from '../utils/finspoImages'
import { cacheFinspoPreview, captureNavigationTrigger, navigateTo, withBasePath } from '../utils/navigation'
import { isActiveEventPromotion } from '../utils/promotions'

type CommunityMainTab = 'events' | 'finspo'
type EventScope = 'featured' | 'public'
type FinspoScope = 'following' | 'public'
type PaginatedEvents = { events: Event[]; page: number; pages: number; total: number }
type CommunityFinspoNavigationSnapshot = {
  failedImages: string[]
  items: GalleryPost[]
  publicFeed: FinspoFeedSnapshot | null
  scope: FinspoScope
  version: 1
}

function initialCommunityState() {
  const params = new URLSearchParams(window.location.search)
  const tab = params.get('tab') === 'events' ? 'events' : 'finspo'
  const scope = params.get('scope')

  return {
    eventScope: scope === 'public' ? scope : 'featured',
    finspoScope: scope === 'following' ? scope : 'public',
    legacyMine: scope === 'mine',
    mainTab: tab,
  } as const
}

function isPromotedEvent(event: Event) {
  return isActiveEventPromotion(event.promotionTags, event.promotionExpiresAt, event.status)
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
  const [mainTab] = useState<CommunityMainTab>(initialState.mainTab)
  const [eventScope] = useState<EventScope>(initialState.eventScope)
  const [finspoScope] = useState<FinspoScope>(initialState.finspoScope)
  const [restoredFinspo] = useState<CommunityFinspoNavigationSnapshot | null>(() => {
    const snapshot = getNavigationSnapshot<CommunityFinspoNavigationSnapshot>(`community-finspo:${initialState.finspoScope}`)?.data
    return snapshot?.version === 1 && snapshot.scope === initialState.finspoScope ? snapshot : null
  })
  const [suggestionSession, setSuggestionSession] = useState<{ accounts: FinspoAccountSuggestion[]; personalized: boolean; userId: string } | null>(null)
  const eventsPath = useCallback((page: number) => `/community/events?page=${page}&limit=12`, [])
  const extractEvents = useCallback((data: PaginatedEvents) => data.events || [], [])
  const events = useInfiniteApiResource(eventsPath, extractEvents, [])
  const gallery = useFinspoFeed({
    enabled: mainTab === 'finspo',
    initialSnapshot: restoredFinspo?.publicFeed,
  })
  const followingGallery = useApiResource<FollowingFinspoFeed>('/community/gallery/following', Boolean(user && mainTab === 'finspo' && finspoScope === 'following'))

  const publicEvents = events.items
  const featuredEvents = publicEvents.filter(isPromotedEvent)
  const finspoSource = followingGallery
  const incomingScopedFinspoItems = finspoSource.data?.posts
  const restoredScopedFinspoItems = restoredFinspo?.items || []
  const scopedFinspoItems = incomingScopedFinspoItems
    ? refreshScopedFinspoOrder(restoredScopedFinspoItems, incomingScopedFinspoItems)
    : restoredScopedFinspoItems
  const scopedImages = useImageBatchReady(
    scopedFinspoItems.flatMap(finspoImages),
    finspoScope === 'following' && (!finspoSource.loading || Boolean(restoredScopedFinspoItems.length)),
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
    finspoItems.flatMap(finspoImages),
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

  useEffect(() => {
    if (!initialState.legacyMine || status === 'checking') return
    const destination = communityMineRedirect(window.location.search, Boolean(user))
    if (destination) navigateTo(destination)
  }, [initialState.legacyMine, status, user])

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
    return <FloatingCreateButton href={isFinspo ? addFinspoHref() : addEventHref()} label={isFinspo ? 'Post Finspo' : 'Add event'} />
  }

  function renderEventCard(event: Event) {
    return (
      <article className="event-card rounded-lg border border-foose-border bg-foose-surface shadow-sm [&_h2]:text-sm [&_h2]:font-semibold [&_h2]:leading-tight [&_p]:text-[11px] [&_p]:uppercase [&_p]:tracking-wide [&_p]:text-foose-faint overflow-hidden p-0 [&>div:last-child]:flex [&>div:last-child]:flex-col [&>div:last-child]:gap-2 [&>div:last-child]:p-3 [&_.button]:min-h-9 [&_.button]:w-full [&_.button]:px-3 [&_.button]:py-2 [&_.table-actions_.button]:w-full" key={event._id}>
        <div className="event-image overflow-hidden rounded-lg bg-foose-surface-mid [&_img]:h-full [&_img]:w-full [&_img]:object-cover aspect-[16/9] rounded-none">
          <DiscoveryImage alt={`${event.title} cover`} fallback="Event cover unavailable" fallbackClassName="h-full min-h-32 w-full" src={event.coverImage} />
          <Badge tone={event.status === 'past' ? 'neutral' : event.status === 'ongoing' ? 'warning' : 'accent'}>{event.status || event.type}</Badge>
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
          <div className="table-actions flex flex-wrap items-center gap-3 justify-end">
            <a className="button inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border px-5 py-2.5 text-center text-sm font-bold transition disabled:pointer-events-none disabled:opacity-50 [&.full]:w-full button-secondary border-foose-border bg-foose-surface text-foose-text hover:border-accent hover:text-accent" href={withBasePath(`/community/events/${event._id}`)}>View event</a>
            <FavoriteButton className="button inline-flex min-h-9 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-center text-xs font-bold transition disabled:pointer-events-none disabled:opacity-50 [&.full]:w-full button-secondary border-foose-border bg-foose-surface text-foose-text hover:border-accent hover:text-accent favorite-button [&.is-active]:bg-accent [&.is-active]:text-white" showText targetId={event._id} targetType="event" />
          </div>
        </div>
      </article>
    )
  }

  function renderFinspoTile(post: GalleryPost) {
    const sourceLabel = finspoScope === 'following'
        ? 'Following Finspo'
        : 'Finspo'
    return (
      <article className="finspo-tile relative mb-3 break-inside-avoid max-md:mb-2" key={post._id}>
        <FinspoMediaCarousel
          alt={post.caption || `Finspo by ${finspoAuthor(post)}`}
          className="finspo-image rounded-none finspo-tile-link"
          href={withBasePath(`/community/finspo/${post._id}`)}
          images={finspoImages(post)}
          onNavigate={(event) => openFinspo(event, post, sourceLabel)}
          surface="feed"
        />
        <FinspoLikeButton className="floating-round inline-flex size-8 shrink-0 items-center justify-center rounded-full border border-transparent bg-transparent text-foose-ink transition hover:bg-accent-light hover:text-accent absolute right-2 top-2 z-10 bg-white/90 shadow favorite-button [&.is-active]:bg-accent [&.is-active]:text-white" initialCount={post.likes?.length} initialLiked={user ? post.likes?.some((userId) => String(userId) === user._id) : undefined} targetId={post._id} />
        <FinspoCaption caption={post.caption} />
        <a className="finspo-author-link mt-1 flex items-center gap-2 text-xs font-semibold text-foose-muted" href={finspoAuthorHref(post)}>{finspoAuthor(post)}</a>
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
      </nav>
    )
  }

  function renderEventPanel() {
    return (
      <section className="community-panel mx-auto w-full max-w-[1280px]">
        {renderEventTabs()}
        <RefreshIndicator active={events.refreshing} className="mb-4" label="Refreshing community events" />

        {eventScope === 'featured' && (
          <>
            <SectionHeader
              title="Featured events"
              eyebrow="Promoted pop-ups and community moments"
            />
            {events.loading && !featuredEvents.length && <EventGridSkeleton count={4} label="Loading featured community events" />}
            {events.error && !featuredEvents.length && <StatePanel action={<button className="button inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border px-5 py-2.5 text-center text-sm font-bold transition disabled:pointer-events-none disabled:opacity-50 [&.full]:w-full button-secondary border-foose-border bg-foose-surface text-foose-text hover:border-accent hover:text-accent" onClick={events.refetch} type="button">Try again</button>} body={events.error} layout="section" title="Featured events could not load" tone="error" />}
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
            {events.error && !publicEvents.length && <StatePanel action={<button className="button inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border px-5 py-2.5 text-center text-sm font-bold transition disabled:pointer-events-none disabled:opacity-50 [&.full]:w-full button-secondary border-foose-border bg-foose-surface text-foose-text hover:border-accent hover:text-accent" onClick={events.refetch} type="button">Try again</button>} body={events.error} layout="section" title="Community events could not load" tone="error" />}
            {events.error && !!publicEvents.length && <InlineNotice action={<button className="font-black text-accent" onClick={events.refetch} type="button">Retry</button>} tone="warning">Community events could not refresh. Showing the current events.</InlineNotice>}
            {!events.loading && !events.error && !publicEvents.length && <StatePanel action={<ButtonLink to="/community/events/new">Add an event</ButtonLink>} body="Be the first to publish a community event or pop-up." layout="section" title="No events yet" tone="empty" />}
            {!!publicEvents.length && <div className="event-grid grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">{publicEvents.map((event) => renderEventCard(event))}</div>}
            <div ref={events.sentinelRef} className="flex min-h-14 items-center justify-center py-4">
              <AppendFeedback error={events.loadMoreError} label="Loading more community events" loading={events.loadingMore} retry={events.retryLoadMore} />
            </div>
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

        <>
            {activeFinspoLoading && !finspoItems.length && !finspoAccountSuggestions.length && (
              finspoScope === 'following' ? <FinspoAccountSuggestionsSkeleton /> : <FinspoFeedSkeleton />
            )}
            {activeFinspoError && <InlineNotice action={<button className="font-black text-accent" onClick={activeFinspoRefetch} type="button">Retry</button>} title="Finspo could not load" tone="error">{activeFinspoError}</InlineNotice>}
            {finspoScope === 'following' && !!finspoAccountSuggestions.length && (
              <FinspoAccountSuggestions accounts={finspoAccountSuggestions} onFollowingChanged={refreshFollowingAfterSuggestion} personalized={suggestionsPersonalized} />
            )}
            {!activeFinspoLoading && !activeFinspoError && !finspoItems.length && !finspoAccountSuggestions.length && (
              <StatePanel action={finspoScope === 'following' ? <a className="button inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border px-5 py-2.5 text-center text-sm font-bold transition disabled:pointer-events-none disabled:opacity-50 [&.full]:w-full button-secondary border-foose-border bg-foose-surface text-foose-text hover:border-accent hover:text-accent" href={withBasePath('/community?tab=finspo&scope=public')}>Discover public Finspo</a> : <ButtonLink to="/community/finspo/new">Post Finspo</ButtonLink>} body={finspoScope === 'following' ? 'Follow members to build a Finspo feed around their posts.' : 'Be the first to share a look or source of inspiration.'} layout="section" title="No Finspo yet" tone="empty" />
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
      </section>
    )
  }

  return (
    <AppShell active="community">
      {initialState.legacyMine && <LoadingState label="Redirecting to your profile" layout="page" variant="spinner" />}

      {!initialState.legacyMine && <><nav className="tab-line community-main-tabs flex flex-wrap items-center justify-center gap-2 [&_button]:shrink-0 [&_button]:rounded-full [&_button]:border [&_button]:border-foose-border [&_button]:bg-foose-surface-low [&_button]:px-4 [&_button]:py-2 [&_button]:text-sm [&_button]:font-semibold [&_button]:text-foose-muted [&_button]:transition [&_button]:hover:border-accent [&_button]:hover:text-accent [&_a]:shrink-0 [&_a]:rounded-full [&_a]:border [&_a]:border-foose-border [&_a]:bg-foose-surface-low [&_a]:px-4 [&_a]:py-2 [&_a]:text-sm [&_a]:font-semibold [&_a]:text-foose-muted [&_a]:transition [&_a]:hover:border-accent [&_a]:hover:text-accent [&_button.active]:border-accent [&_button.active]:bg-accent [&_button.active]:text-white [&_a.active]:border-accent [&_a.active]:bg-accent [&_a.active]:text-white" aria-label="Community sections">
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
      </>}
    </AppShell>
  )
}
