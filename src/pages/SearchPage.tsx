/* eslint-disable react-hooks/refs -- the cursor hook intentionally exposes a stable callback ref and reactive state */
import { useEffect, useMemo, useRef, useState, type MouseEvent, type ReactNode } from 'react'
import { MdVerified } from 'react-icons/md'
import {
  AppShell,
  FinspoCaption,
  FinspoLikeButton,
  FinspoMediaBadge,
  FinspoMasonry,
  Icon,
  InlineNotice,
  ProductCard,
  RefreshIndicator,
  SafeImage,
  StatePanel,
  UnifiedSearchCombobox,
} from '../components'
import { useAuth } from '../hooks/useAuth'
import { useExploreFeed, type ExploreFeedSnapshot } from '../hooks/useExploreFeed'
import { useImageBatchReady } from '../hooks/useImageBatchReady'
import { usePageNavigationSnapshot } from '../hooks/usePageNavigationSnapshot'
import { scrollRevealStateClass, scrollRevealTransitionClass, useScrollRevealBand } from '../hooks/useScrollRevealBand'
import { useUnifiedSearch, type UnifiedSearchSnapshot } from '../hooks/useUnifiedSearch'
import type { Event, GalleryPost, UnifiedSearchResult, UnifiedSearchResultType, UnifiedSearchScope, UnifiedSearchUser } from '../types/api'
import { eventHostName, eventTimeLabel, eventTypeLabel, isOnlinePopUp } from '../utils/events'
import { recordFinspoSearchClick } from '../utils/finspoSearchSignals'
import { finspoCoverImage, finspoImages } from '../utils/finspoImages'
import { formatMoney, getShopName, initials } from '../utils/format'
import { cacheFinspoPreview, captureNavigationTrigger, getCurrentAppHref, isHardPageReload, navigateTo, withBasePath } from '../utils/navigation'
import { getNavigationSnapshot } from '../stores/navigationMemoryStore'

type SearchNavigationSnapshot = {
  explore: ExploreFeedSnapshot | null
  query: string
  scope: UnifiedSearchScope
  search: UnifiedSearchSnapshot | null
  tag: string
  version: 1
}

const tabs: Array<{ label: string; scope: UnifiedSearchScope }> = [
  { label: 'All', scope: 'all' },
  { label: 'Items', scope: 'items' },
  { label: 'Finspo', scope: 'finspo' },
  { label: 'Events', scope: 'events' },
  { label: 'Users', scope: 'users' },
]

function activeScope(value: string | null): UnifiedSearchScope {
  return tabs.some((tab) => tab.scope === value) ? value as UnifiedSearchScope : 'all'
}

function searchHref(search: URLSearchParams, scope: UnifiedSearchScope) {
  const next = new URLSearchParams()
  const tag = search.get('tag')?.trim()
  const query = search.get('q')?.trim()
  if (tag) next.set('tag', tag)
  else if (query) next.set('q', query)
  next.set('tab', scope)
  return withBasePath(`/search?${next.toString()}`)
}

function imageForResult(result: UnifiedSearchResult) {
  if (result.type === 'item') return result.entity.images?.find(Boolean) || ''
  if (result.type === 'finspo') return finspoCoverImage(result.entity)
  if (result.type === 'event') return result.entity.coverImage || ''
  return result.entity.profilePhoto || result.entity.shop?.logoUrl || ''
}

function FinspoResultCard({ failed, post }: { failed: boolean; post: GalleryPost }) {
  const { user } = useAuth()
  const author = typeof post.userId === 'object' ? post.userId : null
  const images = finspoImages(post)

  function rememberPost(event: MouseEvent<HTMLAnchorElement>) {
    if (event.button !== 0 || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return
    event.preventDefault()
    cacheFinspoPreview(post)
    recordFinspoSearchClick(post, user?._id)
    navigateTo(`/community/finspo/${post._id}`, {
      sourceLabel: 'Explore',
      trigger: captureNavigationTrigger(event.currentTarget),
    })
  }

  return (
    <article className="finspo-tile group relative min-w-0 overflow-hidden rounded-[18px] border border-foose-border/60 bg-foose-surface shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
      <FinspoMediaBadge count={images.length} />
      <a
        aria-label={post.caption || `Finspo by @${author?.username || 'Foose member'}`}
        className="block overflow-hidden bg-foose-surface-mid"
        href={withBasePath(`/community/finspo/${post._id}`)}
        id={`finspo-search-${post._id}`}
        onClick={rememberPost}
      >
        <SafeImage alt="" className="block h-auto w-full object-contain" fallback="Image unavailable" fallbackClassName="aspect-[4/5] text-sm" src={failed ? undefined : finspoCoverImage(post)} />
      </a>
      <FinspoLikeButton
        className="favorite-button absolute right-2 top-2 z-10 inline-flex size-8 items-center justify-center rounded-full border border-transparent bg-white/90 text-foose-ink shadow transition hover:bg-accent-light hover:text-accent [&.is-active]:bg-accent [&.is-active]:text-white"
        initialCount={post.likes?.length}
        initialLiked={user ? post.likes?.some((id) => String(id) === user._id) : undefined}
        targetId={post._id}
      />
      <div className="px-3 pb-3 pt-2">
        <FinspoCaption caption={post.caption} />
        <a className="mt-1 block truncate text-xs font-semibold text-foose-muted hover:text-accent" href={author?.username ? withBasePath(`/profile/${author.username}`) : '#'}>
          @{author?.username || 'Foose member'}
        </a>
      </div>
    </article>
  )
}

function EventResultCard({ event, failed }: { event: Event; failed: boolean }) {
  return (
    <article className="min-w-0 overflow-hidden rounded-[18px] border border-foose-border/60 bg-foose-surface shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
      <a className="block" href={withBasePath(`/community/events/${event._id}`)}>
        <div className="aspect-[16/9] overflow-hidden bg-foose-surface-mid">
          <SafeImage alt="" className="h-full w-full object-cover" fallback="No event image" fallbackClassName="text-sm" src={failed ? undefined : event.coverImage} />
        </div>
        <div className="space-y-1.5 p-4">
          <span className="text-[10px] font-black uppercase tracking-wider text-accent">{eventTypeLabel(event)}</span>
          <h2 className="line-clamp-2 text-sm font-black leading-tight text-foose-text">{event.title}</h2>
          <p className="text-[11px] text-foose-muted"><Icon name="calendar" size={14} /> {eventTimeLabel(event)}</p>
          <p className="truncate text-[11px] text-foose-muted"><Icon name="store" size={14} /> {eventHostName(event)}</p>
          <p className="truncate text-[11px] text-foose-muted"><Icon name="location" size={14} /> {isOnlinePopUp(event) ? 'Hosted on Foose' : event.location || 'Location pending'}</p>
        </div>
      </a>
    </article>
  )
}

function UserResultCard({ failed, result }: { failed: boolean; result: UnifiedSearchUser }) {
  const profileImage = result.profilePhoto || result.shop?.logoUrl || ''
  const href = result.username ? `/profile/${encodeURIComponent(result.username)}` : `/profile/${result._id}`
  return (
    <article className="min-w-0 rounded-[18px] border border-foose-border/60 bg-foose-surface p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-accent hover:shadow-lg">
      <a className="flex min-w-0 items-start gap-3" href={withBasePath(href)}>
        <SafeImage alt="" className="size-14 shrink-0 rounded-full bg-foose-surface-mid object-cover" fallback={initials(result.name)} fallbackClassName="bg-accent-light text-sm font-black text-accent" src={failed ? undefined : profileImage} />
        <span className="min-w-0 flex-1">
          <span className="flex min-w-0 items-center gap-1">
            <strong className="truncate text-sm text-foose-text">@{result.username}</strong>
            {result.isKycVerified && <MdVerified aria-label="Verified profile" className="shrink-0 text-accent" />}
          </span>
          <span className="block truncate text-xs text-foose-muted">{result.name}</span>
          {result.shop?.isLive && (
            <span className="mt-2 inline-flex max-w-full items-center gap-1 rounded-full bg-accent-light px-2 py-1 text-[10px] font-black text-accent">
              <Icon name="store" size={12} /> <span className="truncate">{result.shop.shopName}</span>
            </span>
          )}
          {result.bio && <span className="mt-2 line-clamp-2 text-xs leading-5 text-foose-muted">{result.bio}</span>}
        </span>
      </a>
    </article>
  )
}

function SearchResultCard({ failedImages, result }: { failedImages: Set<string>; result: UnifiedSearchResult }) {
  const failed = failedImages.has(imageForResult(result))
  if (result.type === 'item') return <ProductCard imageFailed={failed} listing={result.entity} variant="catalog" />
  if (result.type === 'finspo') return <FinspoResultCard failed={failed} post={result.entity} />
  if (result.type === 'event') return <EventResultCard event={result.entity} failed={failed} />
  return <UserResultCard failed={failed} result={result.entity} />
}

function exploreHref(result: UnifiedSearchResult) {
  if (result.type === 'item') return `/listing/${encodeURIComponent(result.entity._id)}`
  if (result.type === 'finspo') return `/community/finspo/${encodeURIComponent(result.entity._id)}`
  if (result.type === 'event') return `/community/events/${encodeURIComponent(result.entity._id)}`
  return result.entity.username
    ? `/profile/${encodeURIComponent(result.entity.username)}`
    : `/profile/${encodeURIComponent(result.entity._id)}`
}

function ExploreTile({ failed, result }: { failed: boolean; result: UnifiedSearchResult }) {
  const image = imageForResult(result)
  const href = exploreHref(result)
  const typeLabel = result.type === 'item' ? 'Item' : result.type === 'finspo' ? 'Finspo' : result.type === 'event' ? 'Event' : 'Creator'

  function rememberResult(event: MouseEvent<HTMLAnchorElement>) {
    if (event.button !== 0 || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || result.type !== 'finspo') return
    event.preventDefault()
    cacheFinspoPreview(result.entity)
    navigateTo(`/community/finspo/${result.entity._id}`, {
      sourceLabel: 'Explore',
      trigger: captureNavigationTrigger(event.currentTarget),
    })
  }

  if (result.type === 'user') {
    const profileImage = result.entity.profilePhoto || result.entity.shop?.logoUrl || ''
    return (
      <article className="group relative min-w-0 overflow-hidden rounded-[18px] border border-foose-border/60 bg-foose-surface shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
        <a className="flex aspect-square flex-col items-center justify-center gap-3 p-4 text-center" href={withBasePath(href)}>
          <SafeImage alt="" className="size-20 rounded-full bg-foose-surface-mid object-cover shadow-sm sm:size-24" fallback={initials(result.entity.name)} fallbackClassName="bg-accent-light text-xl font-black text-accent" src={failed ? undefined : profileImage} />
          <span className="min-w-0 max-w-full">
            <strong className="block truncate text-sm text-foose-text">@{result.entity.username}</strong>
            <span className="block truncate text-xs text-foose-muted">{result.entity.shop?.isLive ? result.entity.shop.shopName : result.entity.name}</span>
          </span>
          <span className="rounded-full bg-accent-light px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-accent">{typeLabel}</span>
        </a>
      </article>
    )
  }

  const title = result.type === 'item'
    ? result.entity.title
    : result.type === 'event'
      ? result.entity.title
      : result.entity.caption || 'Finspo'
  const subtitle = result.type === 'item'
    ? `${formatMoney(result.entity.price, result.entity.currency)} · ${getShopName(result.entity)}`
    : result.type === 'event'
      ? eventTimeLabel(result.entity)
      : `@${typeof result.entity.userId === 'object' ? result.entity.userId.username : 'Foose member'}`
  const aspect = result.type === 'item' ? 'aspect-[4/5]' : result.type === 'event' ? 'aspect-[4/3]' : ''

  return (
    <article className="group relative min-w-0 overflow-hidden rounded-[18px] border border-foose-border/60 bg-foose-surface shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
      <a aria-label={`${typeLabel}: ${title}`} className="relative block" href={withBasePath(href)} id={result.type === 'finspo' ? `finspo-explore-${result.entity._id}` : undefined} onClick={rememberResult}>
        <SafeImage
          alt=""
          className={`block w-full ${aspect} object-cover transition duration-300 group-hover:scale-[1.02]`}
          fallback="Media unavailable"
          fallbackClassName={aspect || 'aspect-[4/5]'}
          src={failed ? undefined : image}
        />
        <span className="absolute left-2.5 top-2.5 rounded-full bg-foose-surface/95 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-foose-text shadow-sm backdrop-blur">{typeLabel}</span>
        <span className="block px-3 pb-3 pt-2.5">
          <strong className="block line-clamp-2 text-sm leading-snug text-foose-text">{title}</strong>
          <small className="mt-1 block truncate text-[11px] text-foose-muted">{subtitle}</small>
        </span>
      </a>
    </article>
  )
}

function ExploreSkeleton({ count = 20 }: { count?: number }) {
  return (
    <section aria-busy="true" aria-label="Loading Explore recommendations" role="status">
      <span className="sr-only">Loading Explore recommendations</span>
      <FinspoMasonry gap={14} maxColumns={5} minColumnWidth={160} singleColumnBelow={0} targetColumnWidth={240}>
        {Array.from({ length: count }, (_, index) => (
          <div aria-hidden className={`animate-pulse rounded-[18px] bg-foose-surface-mid ${index % 5 === 0 ? 'aspect-square' : index % 3 === 0 ? 'aspect-[3/4]' : 'aspect-[4/5]'}`} key={index} />
        ))}
      </FinspoMasonry>
    </section>
  )
}

function ExploreMosaic({ failedImages, results }: { failedImages: Set<string>; results: UnifiedSearchResult[] }) {
  return (
    <FinspoMasonry gap={14} maxColumns={5} minColumnWidth={160} singleColumnBelow={0} targetColumnWidth={240}>
      {results.map((result) => (
        <ExploreTile failed={failedImages.has(imageForResult(result))} key={`${result.type}:${result.entity._id}`} result={result} />
      ))}
    </FinspoMasonry>
  )
}

function createExploreSeed() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
}

function skeletonType(scope: UnifiedSearchScope, index: number): UnifiedSearchResultType {
  if (scope === 'items') return 'item'
  if (scope === 'finspo') return 'finspo'
  if (scope === 'events') return 'event'
  if (scope === 'users') return 'user'
  return (['item', 'finspo', 'event', 'user'] as const)[index % 4]
}

function SearchSkeletonCard({ index, type }: { index: number; type: UnifiedSearchResultType }) {
  if (type === 'user') {
    return (
      <article aria-hidden className="flex animate-pulse items-start gap-3 rounded-xl border border-foose-border bg-foose-surface p-4">
        <div className="size-14 shrink-0 rounded-full bg-foose-surface-mid" />
        <div className="min-w-0 flex-1 space-y-2 pt-1">
          <div className="h-3 w-2/3 rounded-full bg-foose-surface-mid" />
          <div className="h-2.5 w-1/2 rounded-full bg-foose-surface-mid" />
          <div className="h-6 w-3/5 rounded-full bg-foose-surface-mid" />
        </div>
      </article>
    )
  }

  if (type === 'item') {
    return (
      <article aria-hidden className="animate-pulse overflow-hidden bg-transparent">
        <div className="aspect-[4/5] rounded-md bg-foose-surface-mid" />
        <div className="space-y-1.5 py-2">
          <div className="h-2.5 w-2/3 rounded-full bg-foose-surface-mid" />
          <div className="h-2.5 w-1/3 rounded-full bg-foose-surface-mid" />
          <div className="h-3 w-1/2 rounded-full bg-foose-surface-mid" />
          <div className="h-2.5 w-3/4 rounded-full bg-foose-surface-mid" />
        </div>
      </article>
    )
  }

  if (type === 'event') {
    return (
      <article aria-hidden className="animate-pulse overflow-hidden rounded-xl border border-foose-border bg-foose-surface">
        <div className="aspect-[16/9] bg-foose-surface-mid" />
        <div className="space-y-2 p-3">
          <div className="h-2.5 w-1/3 rounded-full bg-foose-surface-mid" />
          <div className="h-3 w-4/5 rounded-full bg-foose-surface-mid" />
          <div className="h-2.5 w-2/3 rounded-full bg-foose-surface-mid" />
          <div className="h-2.5 w-1/2 rounded-full bg-foose-surface-mid" />
        </div>
      </article>
    )
  }

  return (
    <article aria-hidden className="finspo-tile animate-pulse overflow-hidden rounded-xl bg-foose-surface shadow-sm">
      <div className={`${index % 3 === 0 ? 'aspect-[3/4]' : index % 3 === 1 ? 'aspect-square' : 'aspect-[4/5]'} bg-foose-surface-mid`} />
      <div className="space-y-2 px-2 pb-2 pt-2">
        <div className="h-2.5 w-4/5 rounded-full bg-foose-surface-mid" />
        <div className="h-2.5 w-1/2 rounded-full bg-foose-surface-mid" />
      </div>
    </article>
  )
}

function SearchSkeleton({ scope }: { scope: UnifiedSearchScope }) {
  const count = scope === 'all' ? 20 : 12
  const tiles = Array.from({ length: count }, (_, index) => (
    <SearchSkeletonCard index={index} key={index} type={skeletonType(scope, index)} />
  ))

  return (
    <section aria-busy="true" aria-label="Loading search results" role="status">
      <span className="sr-only">Loading search results</span>
      {scope === 'all' || scope === 'finspo' ? (
        <FinspoMasonry gap={12} maxColumns={5} minColumnWidth={190} singleColumnBelow={640} targetColumnWidth={230}>{tiles}</FinspoMasonry>
      ) : scope === 'items' ? (
        <div className="grid grid-cols-2 gap-x-2 gap-y-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">{tiles}</div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">{tiles}</div>
      )}
    </section>
  )
}

function ResultsLayout({ children, scope }: { children: ReactNode; scope: UnifiedSearchScope }) {
  if (scope === 'all' || scope === 'finspo') {
    return <FinspoMasonry gap={12} maxColumns={5} minColumnWidth={190} singleColumnBelow={640} targetColumnWidth={230}>{children}</FinspoMasonry>
  }
  if (scope === 'items') return <div className="grid grid-cols-2 gap-x-2 gap-y-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">{children}</div>
  return <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">{children}</div>
}

export function SearchPage() {
  const searchBarVisible = useScrollRevealBand()
  const searchText = window.location.search
  const params = useMemo(() => new URLSearchParams(searchText), [searchText])
  const scope = activeScope(params.get('tab'))
  const tag = params.get('tag')?.trim().replace(/^#+/, '') || ''
  const query = tag ? '' : params.get('q')?.trim() || ''
  const term = tag ? `#${tag}` : query
  const historyState = (window.history.state || {}) as Record<string, unknown>
  const navigationId = String(historyState.fooseNavigationId || '')
  const [restoredPage] = useState<SearchNavigationSnapshot | null>(() => {
    const snapshot = getNavigationSnapshot<SearchNavigationSnapshot>('explore-search')?.data
    return snapshot?.version === 1
      && snapshot.query === query
      && snapshot.scope === scope
      && snapshot.tag === tag
      ? snapshot
      : null
  })
  const exploreSeedRef = useRef(String(
    restoredPage?.explore?.seed || (!isHardPageReload() && historyState.exploreFeedSeed) || createExploreSeed(),
  ))
  const initialNavigationEntry = historyState.fooseNavigationOrigin === 'initial'
  const shouldFocusSearch = !term && (historyState.focusSearch === true || !historyState.fooseNavigation || initialNavigationEntry)
  const trackInitial = useMemo(() => {
    void navigationId
    const state = window.history.state as {
      fooseNavigation?: boolean
      fooseNavigationOrigin?: 'initial' | 'internal'
      unifiedSearchLogged?: boolean
      unifiedSearchTrack?: boolean
    } | null
    return scope === 'all' && Boolean(term) && !state?.unifiedSearchLogged
      && (state?.unifiedSearchTrack === true || !state?.fooseNavigation || state?.fooseNavigationOrigin === 'initial')
  }, [navigationId, scope, term])
  const search = useUnifiedSearch({
    initialSnapshot: restoredPage?.search,
    navigationKey: navigationId,
    query,
    scope,
    tag,
    trackInitial,
  })
  const noResults = Boolean(term && !search.loading && !search.error && !search.results.length)
  const exploreEnabled = !term || noResults
  const explore = useExploreFeed({
    enabled: exploreEnabled,
    initialSnapshot: restoredPage?.explore,
    limit: noResults ? 20 : 50,
    seed: exploreSeedRef.current,
  })
  const visibleResults = term && !noResults ? search.results : explore.results
  const visibleMedia = useImageBatchReady(visibleResults.map(imageForResult).filter(Boolean), !search.loading && !explore.loading)
  const contentReady = !search.loading && (!exploreEnabled || !explore.loading) && (!visibleResults.length || visibleMedia.ready)
  usePageNavigationSnapshot<SearchNavigationSnapshot>({
    capture: () => ({
      explore: explore.navigationSnapshot,
      query,
      scope,
      search: search.navigationSnapshot,
      tag,
      version: 1,
    }),
    mediaHeavy: true,
    namespace: 'explore-search',
    ready: contentReady,
  })

  useEffect(() => {
    if (!exploreEnabled) return
    const state = (window.history.state || {}) as Record<string, unknown>
    const nextState: Record<string, unknown> = { ...state, exploreFeedSeed: exploreSeedRef.current }
    delete nextState.focusSearch
    navigateTo(getCurrentAppHref(), { replace: true, scroll: 'preserve', state: nextState })
  }, [exploreEnabled])

  useEffect(() => {
    if (scope !== 'all' || !term) return
    const state = (window.history.state || {}) as Record<string, unknown>
    const nextState: Record<string, unknown> = { ...state, unifiedSearchLogged: true }
    delete nextState.unifiedSearchTrack
    navigateTo(getCurrentAppHref(), { replace: true, scroll: 'preserve', state: nextState })
  }, [navigationId, scope, term])

  function clearSearch() {
    navigateTo('/search', {
      replace: true,
      state: { exploreFeedSeed: exploreSeedRef.current, focusSearch: true },
    })
  }

  return (
    <AppShell active="explore" wide>
      <section className="mx-auto w-full max-w-[1500px]">
        <div className="relative mb-4 overflow-hidden rounded-[28px] border border-foose-border/60 bg-foose-surface px-5 py-7 shadow-sm sm:px-8 sm:py-9 lg:px-10 lg:py-10">
          <div aria-hidden="true" className="pointer-events-none absolute -right-20 -top-28 size-72 rounded-full bg-accent-light/80 blur-3xl sm:size-96" />
          <div className="relative max-w-3xl">
            <p className="mb-3 text-[11px] font-black uppercase tracking-[0.22em] text-accent">The Foose edit</p>
            <h1 className="font-display text-[clamp(2.1rem,5vw,4.25rem)] font-bold leading-[1.05] tracking-[-0.045em] text-foose-text">{term ? 'Find what moves you.' : 'Find your next favorite.'}</h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-foose-muted sm:text-base">{term ? 'Explore the pieces, people and ideas behind your search.' : 'A fresh mix of pre-loved pieces, style inspiration, events and people.'}</p>
          </div>
        </div>
        <header className={`sticky top-16 z-40 -mx-4 mb-7 border-b border-foose-border/70 bg-foose-bg/95 px-4 py-3 backdrop-blur lg:top-[78px] ${scrollRevealTransitionClass} ${scrollRevealStateClass(searchBarVisible)} sm:-mx-5 sm:px-5 md:-mx-6 md:px-6 lg:-mx-8 lg:px-8 2xl:-mx-10 2xl:px-10`}>
          <div className="mx-auto flex w-full max-w-4xl items-center gap-3">
            <UnifiedSearchCombobox
              autoFocus={shouldFocusSearch}
              className="min-w-0 flex-1"
              defaultValue={term}
              key={`${term}:${term ? 'submitted' : 'explore'}`}
              onClear={term ? clearSearch : undefined}
              placeholder="Search pieces, people, events and Finspo"
              variant="light"
            />
          </div>
        </header>
        <RefreshIndicator active={search.refreshing || explore.refreshing} className="-mt-5 mb-4" label={term ? 'Refreshing search results' : 'Refreshing Explore recommendations'} />

        {(query || tag) && (
          <>
            <nav aria-label="Search result types" className="mb-7 flex w-full gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {tabs.map((tab) => (
                <a
                  aria-current={scope === tab.scope ? 'page' : undefined}
                  className={`inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-full border px-4 text-sm font-bold transition focus:outline-none focus:ring-2 focus:ring-accent/25 ${scope === tab.scope ? 'border-accent bg-accent text-white shadow-sm' : 'border-foose-border/70 bg-foose-surface text-foose-muted hover:border-accent hover:text-accent'}`}
                  href={searchHref(params, tab.scope)}
                  key={tab.scope}
                  onClick={(event) => {
                    if (event.button !== 0 || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return
                    event.preventDefault()
                    navigateTo(searchHref(params, tab.scope))
                  }}
                >
                  {tab.label}
                  {!search.loading && <span className={`${scope === tab.scope ? 'bg-white/20 text-white' : 'bg-foose-surface-low text-foose-faint'} rounded-full px-2 py-0.5 text-[10px]`}>{search.counts[tab.scope] || 0}</span>}
                </a>
              ))}
            </nav>

            <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="mb-1 text-[11px] font-black uppercase tracking-[0.16em] text-accent">Search results</p>
                <h2 className="font-display text-2xl font-bold tracking-tight text-foose-text sm:text-3xl">{tag ? `#${tag}` : `Results for “${query}”`}</h2>
                {!search.loading && !search.error && <p className="mt-1.5 text-sm text-foose-muted">{search.total.toLocaleString()} {scope === 'all' ? 'results' : scope}</p>}
              </div>
              {scope === 'items' && (
                <a className="inline-flex min-h-11 items-center gap-2 rounded-full border border-foose-border bg-foose-surface px-4 text-xs font-bold text-foose-text transition hover:border-accent hover:text-accent" href={withBasePath('/browse')}>
                  <Icon name="filter" size={16} /> Browse with filters
                </a>
              )}
            </div>

            {search.loading && <SearchSkeleton scope={scope} />}
            {search.error && !search.results.length && <StatePanel action={<button className="button inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border px-5 py-2.5 text-center text-sm font-bold transition disabled:pointer-events-none disabled:opacity-50 [&.full]:w-full button-secondary border-foose-border bg-foose-surface text-foose-text hover:border-accent hover:text-accent" onClick={search.refetch} type="button">Try search again</button>} body={search.error} layout="section" title="Search could not load" tone="error" />}
            {search.error && !!search.results.length && <InlineNotice action={<button className="font-black text-accent" onClick={search.refetch} type="button">Retry</button>} title="Search did not refresh" tone="warning">Your current results are still available.</InlineNotice>}
            {noResults && (
              <>
                <StatePanel
                  action={<button className="inline-flex min-h-11 items-center justify-center rounded-xl bg-accent px-5 text-sm font-bold text-white transition hover:bg-accent-hover focus:outline-none focus:ring-2 focus:ring-accent/30" onClick={clearSearch} type="button">Clear search</button>}
                  body="Try another phrase, username or hashtag, or keep discovering below."
                  layout="section"
                  title="No matches found"
                  tone="empty"
                />
                <div className="mb-5 mt-7 flex flex-wrap items-end justify-between gap-3 border-t border-foose-border pt-7">
                  <div>
                    <p className="mb-1 text-[11px] font-black uppercase tracking-[0.16em] text-accent">Keep discovering</p>
                    <h2 className="font-display text-2xl font-bold tracking-tight text-foose-text">Explore instead</h2>
                    <p className="mt-1 text-sm text-foose-muted">A fresh mix from across Foose.</p>
                  </div>
                  <button className="text-sm font-bold text-accent hover:text-accent-hover" onClick={clearSearch} type="button">Explore more</button>
                </div>
                {explore.loading && <ExploreSkeleton count={12} />}
                {explore.error && <InlineNotice action={<button className="font-black text-accent" onClick={explore.refetch} type="button">Retry recommendations</button>} title="Explore suggestions did not load" tone="error">You can clear the search and try another phrase.</InlineNotice>}
                {!!explore.results.length && <ExploreMosaic failedImages={explore.failedImageSet} results={explore.results.slice(0, 20)} />}
              </>
            )}
            {!!search.results.length && (
              <section>
                <ResultsLayout scope={scope}>
                  {search.results.map((result) => <SearchResultCard failedImages={search.failedImageSet} key={`${result.type}:${result.entity._id}`} result={result} />)}
                  {search.loadingMore && Array.from({ length: 8 }, (_, index) => (
                    <SearchSkeletonCard index={index} key={`more-${index}`} type={skeletonType(scope, index)} />
                  ))}
                </ResultsLayout>
              </section>
            )}
            <div className="flex min-h-16 items-center justify-center" ref={search.sentinelRef}>
              {search.loadMoreError && <InlineNotice action={<button className="font-black text-accent" onClick={search.retryLoadMore} type="button">Try again</button>} className="w-full max-w-xl" title="More search results did not load" tone="error">{search.loadMoreError}</InlineNotice>}
              {!search.loading && !search.loadingMore && search.results.length > 0 && !search.hasMore && <span className="text-xs text-foose-faint">You've reached the end.</span>}
            </div>
          </>
        )}

        {!query && !tag && (
          <section>
            <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="mb-1 text-[11px] font-black uppercase tracking-[0.16em] text-accent">Made for discovery</p>
                <h2 className="font-display text-2xl font-bold tracking-tight text-foose-text sm:text-3xl">Explore Foose</h2>
                <p className="mt-1.5 text-sm text-foose-muted">
                  {explore.feed?.personalized ? 'A personal mix with room for something unexpected.' : 'Items, Finspo, events and people worth discovering.'}
                </p>
              </div>
              {explore.feed?.personalized && <span className="rounded-full bg-accent-light px-3 py-1 text-[10px] font-black uppercase tracking-wider text-accent">For you</span>}
            </div>
            {explore.loading && <ExploreSkeleton />}
            {explore.error && !explore.results.length && <StatePanel action={<button className="button inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border px-5 py-2.5 text-center text-sm font-bold transition disabled:pointer-events-none disabled:opacity-50 [&.full]:w-full button-secondary border-foose-border bg-foose-surface text-foose-text hover:border-accent hover:text-accent" onClick={explore.refetch} type="button">Refresh Explore</button>} body={explore.error} layout="section" title="Explore could not load" tone="error" />}
            {explore.error && !!explore.results.length && <InlineNotice action={<button className="font-black text-accent" onClick={explore.refetch} type="button">Retry</button>} title="Explore did not refresh" tone="warning">Your current recommendations are still available.</InlineNotice>}
            {!explore.loading && !explore.error && !explore.results.length && <StatePanel action={<a className="button inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border px-5 py-2.5 text-center text-sm font-bold transition disabled:pointer-events-none disabled:opacity-50 [&.full]:w-full button-secondary border-foose-border bg-foose-surface text-foose-text hover:border-accent hover:text-accent" href={withBasePath('/browse')}>Browse marketplace items</a>} body="Fresh recommendations will appear as the Foose community posts." layout="section" title="Explore is warming up" tone="info" />}
            {!!explore.results.length && <ExploreMosaic failedImages={explore.failedImageSet} results={explore.results} />}
            {explore.loadingMore && <ExploreSkeleton count={8} />}
            <div className="flex min-h-16 items-center justify-center" ref={explore.sentinelRef}>
              {explore.loadMoreError && <InlineNotice action={<button className="font-black text-accent" onClick={explore.retryLoadMore} type="button">Try again</button>} className="w-full max-w-xl" title="More recommendations did not load" tone="error">{explore.loadMoreError}</InlineNotice>}
              {!explore.loading && !explore.loadingMore && explore.results.length > 0 && !explore.hasMore && <span className="text-xs text-foose-faint">You're all caught up.</span>}
            </div>
          </section>
        )}
      </section>
    </AppShell>
  )
}
