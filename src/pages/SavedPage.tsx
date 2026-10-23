import { useState, type MouseEvent } from 'react'
import { AppShell, FavoriteButton, FinspoCaption, FinspoLikeButton, FinspoMediaBadge, InlineNotice, ProductCard, RefreshIndicator, StatePanel } from '../components'
import { EventGridSkeleton, ProductGridSkeleton, SavedFinspoSkeleton } from '../components/feedback/DiscoverySkeletons'
import { DiscoveryImage } from '../components/feedback/DiscoveryMedia'
import { useApiResource } from '../hooks/useApiResource'
import { useImageBatchReady } from '../hooks/useImageBatchReady'
import { usePageNavigationSnapshot } from '../hooks/usePageNavigationSnapshot'
import type { FavoriteCollections, GalleryPost } from '../types/api'
import { getNavigationSnapshot } from '../stores/navigationMemoryStore'
import { formatDate } from '../utils/format'
import { Icon } from '../components/icons/Icon'
import { finspoCoverImage, finspoImages } from '../utils/finspoImages'
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
  const [removedListingIds, setRemovedListingIds] = useState<string[]>([])
  const savedListings = data?.listings.filter((listing) => !removedListingIds.includes(listing._id)) || []
  const finspoItems = data?.finspos
    ? refreshSavedFinspoOrder(restoredFinspos, data.finspos)
    : restoredFinspos
  const finspoMedia = useImageBatchReady(
    finspoItems.map(finspoCoverImage),
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

  function removeSavedListing(id: string, title: string) {
    setRemovedListingIds((current) => current.includes(id) ? current : [...current, id])
    setAnnouncement(`${title} removed from saved items`)
    void favorites.refetch()
  }

  return (
    <AppShell active="saved" searchPlaceholder="Search saved finds...">
      <header className="mb-7 border-b border-foose-border pb-6 pt-2 sm:mb-9 sm:pb-8">
        <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.2em] text-foose-muted">Your collection</p>
        <h1 className="font-display text-4xl font-semibold tracking-tight text-foose-text sm:text-5xl">Saved</h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-foose-muted">The pieces, moments, and plans you want to return to.</p>
      </header>

      <div className="saved-tabs mb-7 flex gap-7 overflow-x-auto border-b border-foose-border sm:gap-10" role="tablist" aria-label="Saved collections">
        {([
          ['items', 'Items', savedListings.length],
          ['events', 'Events', data?.events.length],
          ['finspos', 'Finspo', data?.finspos.length],
        ] as const).map(([tab, label, count]) => (
          <button
            aria-controls="saved-panel"
            aria-selected={activeTab === tab}
            className={`-mb-px flex min-h-11 shrink-0 items-center gap-2 border-b-2 px-0.5 pb-3 pt-1 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${activeTab === tab ? 'border-accent text-foose-text' : 'border-transparent text-foose-muted hover:text-foose-text'}`}
            id={`saved-tab-${tab}`}
            key={tab}
            onClick={() => setTab(tab)}
            role="tab"
            type="button"
          >
            {label}
            {data && <> <span className={`text-xs tabular-nums ${activeTab === tab ? 'text-accent' : 'text-foose-faint'}`}>{count}</span></>}
          </button>
        ))}
      </div>

      <div aria-labelledby={`saved-tab-${activeTab}`} id="saved-panel" role="tabpanel" tabIndex={0}>
      <span aria-live="polite" className="sr-only">{announcement}</span>
      <RefreshIndicator active={favorites.refreshing} className="mt-4" label="Refreshing saved collections" />
      {favorites.initialLoading && activeTab === 'items' && <ProductGridSkeleton count={10} label="Loading favorite marketplace items" variant="saved" />}
      {favorites.initialLoading && activeTab === 'events' && <EventGridSkeleton count={4} label="Loading saved community events" variant="saved" />}
      {favorites.initialLoading && activeTab === 'finspos' && !finspoItems.length && <SavedFinspoSkeleton />}
      {favorites.error && !data && !finspoItems.length && <StatePanel action={<button className="button inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border px-5 py-2.5 text-center text-sm font-bold transition disabled:pointer-events-none disabled:opacity-50 [&.full]:w-full button-secondary border-foose-border bg-foose-surface text-foose-text hover:border-accent hover:text-accent" onClick={favorites.refetch} type="button">Try again</button>} body={favorites.error} layout="section" title="Saved collections could not load" tone="error" />}
      {favorites.error && (data || finspoItems.length > 0) && <InlineNotice action={<button className="font-black text-accent" onClick={favorites.refetch} type="button">Retry</button>} tone="warning">Saved collections could not refresh. Your current collection remains visible.</InlineNotice>}

      {!favorites.initialLoading && data && activeTab === 'items' && (
        <section>
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3 sm:mb-8">
            <div>
              <h2 className="font-display text-2xl font-semibold tracking-tight text-foose-text sm:text-3xl">Favorite items</h2>
              <p className="mt-1 text-sm text-foose-muted">Your most-loved finds, all in one place.</p>
            </div>
            <span className="text-xs font-semibold uppercase tracking-widest text-foose-muted">{savedListings.length} saved</span>
          </div>
          {!savedListings.length && <StatePanel className="rounded-sm bg-foose-surface-low/40" action={<a className="inline-flex min-h-11 items-center justify-center border border-foose-text px-5 py-2.5 text-sm font-semibold text-foose-text transition hover:bg-foose-text hover:text-white" href={withBasePath('/browse')}>Explore listings</a>} body="Tap the heart on a listing to collect it here." layout="section" title="Your collection starts here" tone="empty" />}
          {!!savedListings.length && (
            <div className="product-grid grid grid-cols-2 gap-x-3 gap-y-7 sm:grid-cols-3 sm:gap-x-5 sm:gap-y-9 lg:grid-cols-4 xl:grid-cols-5">
              {savedListings.map((listing) => (
                <ProductCard key={listing._id} listing={listing} onFavoriteChange={(active) => { if (!active) removeSavedListing(listing._id, listing.title) }} variant="saved" />
              ))}
            </div>
          )}
        </section>
      )}

      {!favorites.initialLoading && data && activeTab === 'events' && (
        <section>
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3 sm:mb-8">
            <div>
              <h2 className="font-display text-2xl font-semibold tracking-tight text-foose-text sm:text-3xl">Saved events</h2>
              <p className="mt-1 text-sm text-foose-muted">Plans worth keeping on your calendar.</p>
            </div>
            <span className="text-xs font-semibold uppercase tracking-widest text-foose-muted">{data.events.length} saved</span>
          </div>
          {!data.events.length && <StatePanel className="rounded-sm bg-foose-surface-low/40" action={<a className="inline-flex min-h-11 items-center justify-center border border-foose-text px-5 py-2.5 text-sm font-semibold text-foose-text transition hover:bg-foose-text hover:text-white" href={withBasePath('/community?tab=events')}>Explore events</a>} body="Save public events from Community to revisit them here." layout="section" title="No plans saved yet" tone="empty" />}
          {!!data.events.length && (
            <div className="event-grid grid gap-x-5 gap-y-9 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {data.events.map((event) => (
                <article className="event-card min-w-0" key={event._id}>
                  <a className="event-image block aspect-[4/3] overflow-hidden rounded-sm bg-foose-surface-mid [&_img]:h-full [&_img]:w-full [&_img]:object-cover" href={withBasePath(`/community/events/${event._id}`)}>
                    <DiscoveryImage alt={`${event.title} cover`} fallback="Event cover unavailable" fallbackClassName="h-full min-h-32 w-full" src={event.coverImage} />
                  </a>
                  <div className="pt-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-foose-muted">{formatDate(event.date)}</p>
                    <h3 className="mt-1 line-clamp-2 text-base font-semibold leading-snug text-foose-text"><a className="hover:text-accent" href={withBasePath(`/community/events/${event._id}`)}>{event.title}</a></h3>
                    <p className="mt-2 flex items-center gap-1.5 text-xs text-foose-muted"><Icon name="location" size={13} /> {event.location || 'Location pending'}</p>
                    <FavoriteButton
                      className="favorite-button mt-3 inline-flex min-h-9 items-center gap-2 border-b border-foose-border text-xs font-semibold text-foose-text transition hover:border-accent hover:text-accent [&.is-active]:text-accent"
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
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3 sm:mb-8">
            <div>
              <h2 className="font-display text-2xl font-semibold tracking-tight text-foose-text sm:text-3xl">Liked Finspo</h2>
              <p className="mt-1 text-sm text-foose-muted">A gallery of ideas to come back to.</p>
            </div>
            <span className="text-xs font-semibold uppercase tracking-widest text-foose-muted">{finspoItems.length} liked</span>
          </div>
          {!favorites.error && !finspoItems.length && <StatePanel className="rounded-sm bg-foose-surface-low/40" action={<a className="inline-flex min-h-11 items-center justify-center border border-foose-text px-5 py-2.5 text-sm font-semibold text-foose-text transition hover:bg-foose-text hover:text-white" href={withBasePath('/community?tab=finspo')}>Explore Finspo</a>} body="Like Finspo posts in Community to collect them here." layout="section" title="No inspiration saved yet" tone="empty" />}
          {!!finspoItems.length && (
            <div className="finspo-masonry columns-2 gap-3 sm:gap-5 md:columns-3 lg:columns-4 xl:columns-5">
              {finspoItems.map((post) => (
                <article className="finspo-tile relative mb-7 break-inside-avoid sm:mb-9" key={post._id}>
                  <FinspoMediaBadge count={finspoImages(post).length} />
                  <a
                    aria-label={post.caption || `Finspo by ${authorName(post)}`}
                    className="finspo-image finspo-tile-link block overflow-hidden rounded-sm border-0 bg-foose-surface-mid [&_img]:h-auto [&_img]:w-full [&_img]:object-contain"
                    href={withBasePath(`/community/finspo/${post._id}`)}
                    id={`finspo-saved-${post._id}`}
                    onClick={(event) => openFinspo(event, post)}
                  >
                    <DiscoveryImage alt={post.caption || `Finspo by ${authorName(post)}`} fallbackClassName="aspect-[4/5] w-full" src={failedFinspoImages.has(finspoCoverImage(post)) ? undefined : finspoCoverImage(post)} />
                  </a>
                  <FinspoCaption caption={post.caption} />
                  <a className="finspo-author-link mt-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-foose-muted" href={authorHref(post)}>
                    {authorName(post)}
                  </a>
                  <FinspoLikeButton
                    className="floating-round inline-flex size-8 shrink-0 items-center justify-center rounded-full border border-transparent bg-transparent text-foose-ink transition hover:bg-accent-light hover:text-accent absolute right-2 top-2 z-10 bg-white/90 shadow favorite-button [&.is-active]:bg-accent [&.is-active]:text-white"
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
      </div>
    </AppShell>
  )
}
