import { useState, type MouseEvent } from 'react'
import { AppShell, FavoriteButton, FinspoCaption, FinspoFeedSkeleton, FinspoLikeButton, InlineNotice, ProductCard, RefreshIndicator, SectionHeader, StatePanel } from '../components'
import { EventGridSkeleton, ProductGridSkeleton } from '../components/feedback/DiscoverySkeletons'
import { DiscoveryImage } from '../components/feedback/DiscoveryMedia'
import { useApiResource } from '../hooks/useApiResource'
import { useImageBatchReady } from '../hooks/useImageBatchReady'
import { usePageNavigationSnapshot } from '../hooks/usePageNavigationSnapshot'
import type { FavoriteCollections, GalleryPost } from '../types/api'
import { getNavigationSnapshot } from '../stores/navigationMemoryStore'
import { formatDate } from '../utils/format'
import { Icon } from '../components/icons/Icon'
import { cacheFinspoPreview, captureNavigationTrigger, navigateTo, withBasePath } from '../utils/navigation'

type SavedTab = 'events' | 'finspos' | 'items'

function savedTab(): SavedTab {
  const value = new URLSearchParams(window.location.search).get('tab')
  return value === 'events' || value === 'finspos' ? value : 'items'
}

function authorName(post: GalleryPost) {
  if (post.userId && typeof post.userId === 'object') return `@${post.userId.username}`
  return 'Foose member'
}

function authorHref(post: GalleryPost) {
  if (post.userId && typeof post.userId === 'object') return `/profile/${post.userId.username}`
  return '#'
}

type SavedFinspoNavigationSnapshot = {
  failedImages: string[]
  finspos: GalleryPost[]
  version: 1
}

function refreshSavedFinspoOrder(current: GalleryPost[], incoming: GalleryPost[]) {
  const refreshed = new Map(incoming.map((post) => [post._id, post]))
  const known = new Set(current.map((post) => post._id))
  return [
    ...current.filter((post) => refreshed.has(post._id)).map((post) => refreshed.get(post._id) || post),
    ...incoming.filter((post) => !known.has(post._id)),
  ]
}

function openFinspo(event: MouseEvent<HTMLAnchorElement>, post: GalleryPost) {
  if (event.button !== 0 || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return
  event.preventDefault()
  cacheFinspoPreview(post)
  navigateTo(`/community/finspo/${post._id}`, {
    sourceLabel: 'Saved',
    trigger: captureNavigationTrigger(event.currentTarget),
  })
}

export function SavedPage() {
  const activeTab = savedTab()
  const [restoredSnapshot] = useState<SavedFinspoNavigationSnapshot | null>(() => {
    const snapshot = getNavigationSnapshot<SavedFinspoNavigationSnapshot>('saved-finspo')?.data
    return snapshot?.version === 1 ? snapshot : null
  })
  const restoredFinspos = restoredSnapshot?.finspos || []
  const favorites = useApiResource<FavoriteCollections>('/favorites')
  const data = favorites.data
  const [announcement, setAnnouncement] = useState('')
  const finspoItems = data?.finspos
    ? refreshSavedFinspoOrder(restoredFinspos, data.finspos)
    : restoredFinspos
  const finspoMedia = useImageBatchReady(
    finspoItems.map((post) => post.imageUrl),
    activeTab === 'finspos' && (!favorites.loading || Boolean(finspoItems.length)),
  )
  const failedFinspoImages = new Set([...(restoredSnapshot?.failedImages || []), ...finspoMedia.failed])
  const restorationReady = activeTab !== 'finspos'
    || ((!favorites.loading || Boolean(finspoItems.length)) && finspoMedia.ready)
  usePageNavigationSnapshot<SavedFinspoNavigationSnapshot>({
    capture: () => ({ failedImages: Array.from(failedFinspoImages), finspos: finspoItems, version: 1 }),
    mediaHeavy: true,
    namespace: 'saved-finspo',
    ready: restorationReady,
  })

  function setTab(tab: SavedTab) {
    navigateTo(`/saved?tab=${tab}`)
  }

  return (
    <AppShell active="saved" searchPlaceholder="Search saved finds...">
      <section className="page-hero [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:md:text-4xl [&_p]:text-sm [&_p]:leading-6 [&_p]:text-foose-muted [&_p]:md:text-base mb-8 rounded-xl border border-foose-border bg-foose-surface p-5 md:p-8 [&.small]:py-6 max-md:[&_h1]:text-2xl small">
        <h1>Saved</h1>
        <p>Your favorite listings, liked Finspo posts, and saved events live here.</p>
      </section>

      <div className="tab-line [&_button]:shrink-0 [&_button]:rounded-full [&_button]:border [&_button]:border-foose-border [&_button]:bg-foose-surface-low [&_button]:px-4 [&_button]:py-2 [&_button]:text-sm [&_button]:font-semibold [&_button]:text-foose-muted [&_button]:transition [&_button]:hover:border-accent [&_button]:hover:text-accent [&_a]:shrink-0 [&_a]:rounded-full [&_a]:border [&_a]:border-foose-border [&_a]:bg-foose-surface-low [&_a]:px-4 [&_a]:py-2 [&_a]:text-sm [&_a]:font-semibold [&_a]:text-foose-muted [&_a]:transition [&_a]:hover:border-accent [&_a]:hover:text-accent [&_button.active]:border-accent [&_button.active]:bg-accent [&_button.active]:text-white [&_a.active]:border-accent [&_a.active]:bg-accent [&_a.active]:text-white flex flex-wrap items-center gap-2 saved-tabs" role="tablist" aria-label="Saved collections">
        <button className={activeTab === 'items' ? 'active' : ''} onClick={() => setTab('items')} type="button">
          Items
        </button>
        <button className={activeTab === 'events' ? 'active' : ''} onClick={() => setTab('events')} type="button">
          Events
        </button>
        <button className={activeTab === 'finspos' ? 'active' : ''} onClick={() => setTab('finspos')} type="button">
          Finspo
        </button>
      </div>

      <span aria-live="polite" className="sr-only">{announcement}</span>
      <RefreshIndicator active={favorites.refreshing} className="mt-4" label="Refreshing saved collections" />
      {favorites.initialLoading && activeTab === 'items' && <ProductGridSkeleton label="Loading favorite marketplace items" />}
      {favorites.initialLoading && activeTab === 'events' && <EventGridSkeleton count={4} label="Loading saved community events" />}
      {favorites.initialLoading && activeTab === 'finspos' && !finspoItems.length && <FinspoFeedSkeleton label="Loading liked Finspo posts" />}
      {favorites.error && !data && !finspoItems.length && <StatePanel action={<button className="button button-secondary" onClick={favorites.refetch} type="button">Try again</button>} body={favorites.error} layout="section" title="Saved collections could not load" tone="error" />}
      {favorites.error && (data || finspoItems.length > 0) && <InlineNotice action={<button className="font-black text-accent" onClick={favorites.refetch} type="button">Retry</button>} tone="warning">Saved collections could not refresh. Your current collection remains visible.</InlineNotice>}

      {!favorites.loading && !favorites.error && data && activeTab === 'items' && (
        <section>
          <SectionHeader title="Favorite items" eyebrow={`${data.listings.length} saved`} />
          {!data.listings.length && <StatePanel action={<a className="button button-secondary" href={withBasePath('/browse')}>Find marketplace items</a>} body="Tap the heart on a listing to collect it here." layout="section" title="No favorite items yet" tone="empty" />}
          {!!data.listings.length && (
            <div className="product-grid grid grid-cols-2 gap-x-2 gap-y-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {data.listings.map((listing) => (
                <ProductCard key={listing._id} listing={listing} />
              ))}
            </div>
          )}
        </section>
      )}

      {!favorites.loading && !favorites.error && data && activeTab === 'events' && (
        <section>
          <SectionHeader title="Saved events" eyebrow={`${data.events.length} saved`} />
          {!data.events.length && <StatePanel action={<a className="button button-secondary" href={withBasePath('/community?tab=events')}>Explore events</a>} body="Save public events from Community to revisit them here." layout="section" title="No saved events yet" tone="empty" />}
          {!!data.events.length && (
            <div className="event-grid grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {data.events.map((event) => (
                <article className="event-card rounded-lg border border-foose-border bg-foose-surface shadow-sm [&_h2]:text-sm [&_h2]:font-semibold [&_h2]:leading-tight [&_p]:text-[11px] [&_p]:uppercase [&_p]:tracking-wide [&_p]:text-foose-faint overflow-hidden p-0 [&>div:last-child]:flex [&>div:last-child]:flex-col [&>div:last-child]:gap-2 [&>div:last-child]:p-3 [&_.button]:min-h-9 [&_.button]:w-full [&_.button]:px-3 [&_.button]:py-2 [&_.table-actions_.button]:w-full" key={event._id}>
                  <div className="event-image overflow-hidden rounded-lg bg-foose-surface-mid [&_img]:h-full [&_img]:w-full [&_img]:object-cover aspect-[16/9] rounded-none">
                    <DiscoveryImage alt={`${event.title} cover`} fallback="Event cover unavailable" fallbackClassName="h-full min-h-32 w-full" src={event.coverImage} />
                  </div>
                  <div>
                    <p>
                      <Icon name="calendar" /> {formatDate(event.date)}
                    </p>
                    <h2>{event.title}</h2>
                    <p>
                      <Icon name="location" /> {event.location || 'Location pending'}
                    </p>
                    <FavoriteButton
                      className="button inline-flex min-h-9 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-center text-xs font-bold transition disabled:pointer-events-none disabled:opacity-50 [&.full]:w-full button-secondary border-foose-border bg-foose-surface text-foose-text hover:border-accent hover:text-accent favorite-button [&.is-active]:bg-accent [&.is-active]:text-white"
                      onChange={(active) => {
                        setAnnouncement(active ? `${event.title} saved` : `${event.title} removed from saved events`)
                        if (!active) void favorites.refetch()
                      }}
                      showText
                      targetId={event._id}
                      targetType="event"
                    />
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {(!favorites.loading || finspoItems.length > 0) && activeTab === 'finspos' && (
        <section>
          <SectionHeader title="Liked Finspo" eyebrow={`${finspoItems.length} liked`} />
          {!favorites.error && !finspoItems.length && <StatePanel action={<a className="button button-secondary" href={withBasePath('/community?tab=finspo')}>Explore Finspo</a>} body="Like Finspo posts in Community to collect them here." layout="section" title="No liked Finspo yet" tone="empty" />}
          {!!finspoItems.length && (
            <div className="finspo-masonry columns-2 gap-2 md:columns-3 lg:columns-5 max-md:columns-2 max-md:gap-2">
              {finspoItems.map((post) => (
                <article className="finspo-tile relative mb-3 break-inside-avoid max-md:mb-2" key={post._id}>
                  <a
                    aria-label={post.caption || `Finspo by ${authorName(post)}`}
                    className="finspo-image block overflow-hidden rounded-none border-0 bg-transparent [&_img]:h-auto [&_img]:w-full [&_img]:object-contain finspo-tile-link"
                    href={withBasePath(`/community/finspo/${post._id}`)}
                    id={`finspo-saved-${post._id}`}
                    onClick={(event) => openFinspo(event, post)}
                  >
                    <DiscoveryImage alt={post.caption || `Finspo by ${authorName(post)}`} fallbackClassName="aspect-[4/5] w-full" src={failedFinspoImages.has(post.imageUrl) ? undefined : post.imageUrl} />
                  </a>
                  <FinspoCaption caption={post.caption} />
                  <a className="finspo-author-link mt-1 flex items-center gap-2 text-xs font-semibold text-foose-muted" href={authorHref(post)}>
                    {authorName(post)}
                  </a>
                  <FinspoLikeButton
                    className="floating-round inline-flex size-8 shrink-0 items-center justify-center rounded-full border border-transparent bg-transparent text-current transition hover:bg-accent-light hover:text-accent absolute right-2 top-2 z-10 bg-white/90 shadow favorite-button [&.is-active]:bg-accent [&.is-active]:text-white"
                    initialCount={post.likes?.length}
                    initialLiked
                    onChange={(liked) => {
                      setAnnouncement(liked ? 'Finspo added to liked posts' : 'Finspo removed from liked posts')
                      if (!liked) void favorites.refetch()
                    }}
                    targetId={post._id}
                  />
                </article>
              ))}
            </div>
          )}
        </section>
      )}
    </AppShell>
  )
}
