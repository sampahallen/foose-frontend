import { useCallback, useEffect, useMemo, useState, type CSSProperties, type MouseEvent } from 'react'
import { FaBookmark, FaComment } from 'react-icons/fa'
import { IoShareSocial } from 'react-icons/io5'
import { MdVerified } from 'react-icons/md'
import { AppShell, Badge, FinspoCaption, FinspoComments, FinspoDetailSkeleton, FinspoLikeButton, FinspoMasonry, FinspoSkeletonTile, InlineNotice, LightboxImage, RefreshIndicator, StatePanel } from '../components'
import { NavigationBackButton } from '../components/navigation'
import { useApiResource } from '../hooks/useApiResource'
import { useAuth } from '../hooks/useAuth'
import { useFinspoFeed, type FinspoFeedSnapshot } from '../hooks/useFinspoFeed'
import { useImageBatchReady } from '../hooks/useImageBatchReady'
import { usePageNavigationSnapshot } from '../hooks/usePageNavigationSnapshot'
import { getNavigationSnapshot } from '../stores/navigationMemoryStore'
import type { GalleryPost } from '../types/api'
import { formatDate, initials } from '../utils/format'
import { cacheFinspoPreview, captureNavigationTrigger, getCurrentAppPathname, navigateTo, readFinspoPreview, withBasePath } from '../utils/navigation'

type FinspoDetailNavigationSnapshot = {
  commentsOpen: boolean
  related: FinspoFeedSnapshot | null
  version: 1
}

const finspoFallback = { href: '/community?tab=finspo&scope=public', label: 'Finspo' } as const

function finspoIdFromPath() {
  const match = getCurrentAppPathname().match(/^\/community\/finspo\/([^/]+)/)
  return match ? decodeURIComponent(match[1]).trim() : ''
}

function authorName(post: GalleryPost) {
  if (post.userId && typeof post.userId === 'object') return `@${post.userId.username}`
  return 'Foose member'
}

function authorUser(post: GalleryPost) {
  return post.userId && typeof post.userId === 'object' ? post.userId : null
}

function authorHref(post: GalleryPost) {
  if (post.userId && typeof post.userId === 'object') return `/profile/${post.userId.username}`
  return '#'
}

function openFinspo(event: MouseEvent<HTMLAnchorElement>, post: GalleryPost) {
  if (event.button !== 0 || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return
  event.preventDefault()
  cacheFinspoPreview(post)
  navigateTo(`/community/finspo/${post._id}`, {
    sourceLabel: 'Finspo post',
    trigger: captureNavigationTrigger(event.currentTarget),
  })
}

function renderImageTile(post: GalleryPost, currentUserId?: string, mediaFailed = false) {
  return (
    <article className="finspo-tile relative mb-3 break-inside-avoid max-md:mb-2" key={post._id}>
      <a
        aria-label={post.caption || `Finspo by ${authorName(post)}`}
        className="finspo-image block overflow-hidden rounded-none border-0 bg-transparent [&_img]:h-auto [&_img]:w-full [&_img]:object-contain [&_img]:transition-transform [&_img]:duration-300 [&_img]:ease-out hover:[&_img]:scale-[1.025] motion-reduce:[&_img]:transform-none motion-reduce:[&_img]:transition-none finspo-tile-link"
        href={withBasePath(`/community/finspo/${post._id}`)}
        id={`finspo-related-${post._id}`}
        onClick={(event) => openFinspo(event, post)}
      >
        {mediaFailed
          ? <span className="flex aspect-[4/5] w-full items-center justify-center bg-foose-surface-mid px-3 text-center text-xs font-bold text-foose-muted" role="img" aria-label="Finspo image unavailable">Media unavailable</span>
          : <img alt="" src={post.imageUrl} />}
      </a>
      <FinspoLikeButton
        className="favorite-button floating-round absolute right-2 top-2 z-10 inline-flex size-8 shrink-0 items-center justify-center rounded-full border border-transparent bg-white/90 text-current shadow transition hover:bg-accent-light hover:text-accent [&_svg]:size-4 [&.is-active]:bg-accent [&.is-active]:text-white"
        initialCount={post.likes?.length}
        initialLiked={currentUserId ? post.likes?.some((userId) => String(userId) === currentUserId) : undefined}
        targetId={post._id}
      />
      <FinspoCaption caption={post.caption} />
      <a className="finspo-author-link mt-1 flex items-center gap-2 text-xs font-semibold text-foose-muted" href={authorHref(post)}>
        {authorName(post)}
      </a>
    </article>
  )
}

export function CommunityFinspoDetailPage() {
  const postId = finspoIdFromPath()
  const detailQuery = new URLSearchParams(window.location.search)
  const focusCommentId = detailQuery.get('comment')?.trim() || ''
  const commentsRequested = detailQuery.get('comments') === '1'
  const { user } = useAuth()
  const [restoredDetail] = useState<FinspoDetailNavigationSnapshot | null>(() => {
    const snapshot = getNavigationSnapshot<FinspoDetailNavigationSnapshot>(`finspo-detail:${postId}`)?.data
    return snapshot?.version === 1 ? snapshot : null
  })
  const cachedPreview = useMemo(() => postId ? readFinspoPreview<GalleryPost>(postId) : null, [postId])
  const [commentsOpenPostId, setCommentsOpenPostId] = useState(() => restoredDetail?.commentsOpen === false ? '' : postId)
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({})
  const [likeAnnouncement, setLikeAnnouncement] = useState('')
  const [relatedRailEnabled, setRelatedRailEnabled] = useState(() => (
    typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches
  ))
  const [viewportSize, setViewportSize] = useState(() => ({
    height: typeof window !== 'undefined' ? window.innerHeight : 800,
    width: typeof window !== 'undefined' ? window.innerWidth : 1280,
  }))
  const [focusedImageDimensions, setFocusedImageDimensions] = useState({ height: 0, url: '', width: 0 })
  const postResource = useApiResource<{ post: GalleryPost }>(postId ? `/community/gallery/${postId}` : null, Boolean(postId))
  const {
    error: relatedError,
    failedImageSet: relatedFailedImageSet,
    items: relatedPosts,
    loading: relatedLoading,
    loadingMore: relatedLoadingMore,
    loadMoreError: relatedLoadMoreError,
    refetch: refetchRelated,
    refreshing: relatedRefreshing,
    retryLoadMore: retryRelatedLoadMore,
    sentinelRef: relatedSentinelRef,
    snapshot: relatedSnapshot,
  } = useFinspoFeed({
    enabled: Boolean(postId),
    excludePostId: postId,
    initialSnapshot: restoredDetail?.related,
  })
  const post = postResource.data?.post || (postResource.loading ? cachedPreview : null)
  const postImage = useImageBatchReady(post ? [post.imageUrl] : [], Boolean(post))
  const detailLoading = Boolean(postId) && ((!post && postResource.loading) || (Boolean(post) && !postImage.ready))
  const postImageFailed = Boolean(post && postImage.ready && postImage.failed.includes(post.imageUrl))
  const activePostId = post?._id || ''
  const commentCount = post ? commentCounts[post._id] ?? post.commentCount ?? 0 : 0
  const commentsOpen = Boolean(activePostId && (commentsOpenPostId === activePostId || commentsRequested || focusCommentId))
  const commentsPanelVisible = !post?.isArchived && (commentsOpen || relatedRailEnabled)
  const relatedMedia = useImageBatchReady(
    relatedPosts.map((relatedPost) => relatedPost.imageUrl),
    !relatedLoading || Boolean(relatedPosts.length),
  )
  const currentImageDimensions = focusedImageDimensions.url === post?.imageUrl ? focusedImageDimensions : null
  const focusedImageHeightLimit = viewportSize.width >= 768
    ? Math.min(viewportSize.height * 0.72, 680)
    : Math.min(viewportSize.height * 0.58, 480)
  const focusedImageScale = currentImageDimensions
    ? Math.min(1, focusedImageHeightLimit / currentImageDimensions.height)
    : 1
  const focusedImageColumnWidth = currentImageDimensions
    ? Math.max(1, Math.round(currentImageDimensions.width * focusedImageScale))
    : Math.min(560, Math.max(240, viewportSize.width * 0.34))
  const focusedDetailsWidth = Math.min(620, Math.max(320, viewportSize.width * 0.32))
  const focusedAreaWidth = Math.round(focusedImageColumnWidth + focusedDetailsWidth)
  const focusedLayoutStyle = {
    '--finspo-image-width': `${focusedImageColumnWidth}px`,
  } as CSSProperties
  const updateCommentCount = useCallback((count: number) => {
    if (!activePostId) return
    setCommentCounts((current) => ({ ...current, [activePostId]: count }))
  }, [activePostId])

  const restorationReady = !detailLoading && (!relatedPosts.length || relatedMedia.ready)
  usePageNavigationSnapshot<FinspoDetailNavigationSnapshot>({
    capture: () => ({
      commentsOpen: commentsOpenPostId === postId,
      related: relatedSnapshot,
      version: 1,
    }),
    mediaHeavy: true,
    namespace: `finspo-detail:${postId}`,
    ready: restorationReady,
  })

  useEffect(() => {
    const railQuery = window.matchMedia('(min-width: 768px)')
    const updateRail = (event: MediaQueryListEvent) => setRelatedRailEnabled(event.matches)
    let resizeFrame = 0
    const updateViewport = () => {
      window.cancelAnimationFrame(resizeFrame)
      resizeFrame = window.requestAnimationFrame(() => setViewportSize({ height: window.innerHeight, width: window.innerWidth }))
    }
    railQuery.addEventListener('change', updateRail)
    window.addEventListener('resize', updateViewport)
    return () => {
      railQuery.removeEventListener('change', updateRail)
      window.removeEventListener('resize', updateViewport)
      window.cancelAnimationFrame(resizeFrame)
    }
  }, [])

  return (
    <AppShell active="community" searchPlaceholder="Search Finspo..." wide>
      <div className="dashboard-head mb-5 flex flex-col gap-2 md:hidden [&_h1]:text-2xl [&_h1]:font-bold [&_p]:text-sm [&_p]:leading-6 [&_p]:text-foose-muted">
        <div>
          <NavigationBackButton className="mb-6" fallback={finspoFallback} />
          <h1>Finspo</h1>
          <p>Open the post, then keep browsing the community wall around it.</p>
        </div>
      </div>

      {!postId && <StatePanel action={<NavigationBackButton className="button button-secondary" fallback={finspoFallback} label="Browse Finspo" />} body="This link does not identify a Finspo post." layout="page" title="Finspo link is incomplete" tone="unavailable" />}
      {detailLoading && <FinspoDetailSkeleton featuredWidth={focusedAreaWidth} wrapFeatured={relatedRailEnabled} />}
      <RefreshIndicator active={postResource.refreshing || (Boolean(cachedPreview) && postResource.loading) || relatedRefreshing} className="mb-4" label="Refreshing focused Finspo" />
      {!detailLoading && !post && postResource.error && (focusCommentId
        ? <StatePanel action={<NavigationBackButton className="button button-secondary" fallback={finspoFallback} label="Return to Finspo" />} body="The Finspo post or comment may have been removed or is no longer public." layout="page" title="This activity is no longer available" tone="unavailable" />
        : <StatePanel
            action={postResource.errorMeta?.status === 403 || postResource.errorMeta?.status === 404
              ? <NavigationBackButton className="button button-secondary" fallback={finspoFallback} label="Return to Finspo" />
              : <button className="button button-secondary" onClick={postResource.refetch} type="button">Try again</button>}
            body={postResource.error}
            layout="page"
            title={postResource.errorMeta?.status === 404 ? 'This Finspo is unavailable' : 'Finspo could not load'}
            tone={postResource.errorMeta?.status === 403 ? 'permission' : postResource.errorMeta?.status === 404 ? 'unavailable' : 'error'}
          />)}

      {post && !detailLoading && (
        <section aria-label="Focused Finspo post and recommendations" className="finspo-detail-layout min-w-0" style={focusedLayoutStyle}>
          <span aria-live="polite" className="sr-only">{likeAnnouncement}</span>
          <FinspoMasonry
            className="finspo-surround"
            featuredItem={(
            <article className="finspo-detail-card finspo-focus-card relative grid min-w-0 self-start items-start gap-0 overflow-hidden rounded-xl border border-foose-border bg-foose-surface md:grid-cols-[minmax(0,min(52%,var(--finspo-image-width)))_minmax(0,1fr)]" key={`focus-${post._id}`}>
              <NavigationBackButton className="hidden md:inline-flex" fallback={finspoFallback} variant="floating" />
              {postImageFailed ? (
                <div className="flex min-h-72 w-full items-center justify-center bg-foose-surface-mid px-5 text-center text-sm font-bold text-foose-muted" role="img" aria-label="Finspo image unavailable">
                  This image could not be displayed.
                </div>
              ) : <LightboxImage
                alt={post.caption || 'Finspo post'}
                className="finspo-detail-image self-start justify-self-start rounded-none [&_img]:ml-0 [&_img]:mr-auto [&_img]:block [&_img]:h-auto [&_img]:max-h-[min(58dvh,480px)] [&_img]:max-w-full [&_img]:rounded-t-xl [&_img]:object-contain [&_img]:w-auto md:[&_img]:ml-auto md:[&_img]:mr-0 md:[&_img]:max-h-[min(72dvh,680px)] md:[&_img]:rounded-none"
                onLoad={(event) => {
                  const image = event.currentTarget
                  if (!image.naturalWidth || !image.naturalHeight) return
                  setFocusedImageDimensions({ height: image.naturalHeight, url: post.imageUrl, width: image.naturalWidth })
                }}
                src={post.imageUrl}
              />}
              <div className={`finspo-detail-body min-w-0 w-full rounded-none border-0 bg-foose-surface p-4 shadow-none sm:p-5 ${commentsPanelVisible ? 'h-[min(72dvh,620px)] overflow-hidden md:h-[min(72dvh,680px)]' : ''}`}>
                <div className={commentsPanelVisible ? 'flex h-full min-h-0 flex-col' : 'grid grid-cols-1 gap-4'}>
                  <div className={`grid grid-cols-1 gap-3 ${commentsPanelVisible ? 'finspo-thin-scrollbar max-h-[40%] shrink-0 overflow-y-auto overscroll-contain pb-3' : ''}`}>
                  <a className="finspo-detail-head flex min-w-0 items-center gap-2" href={authorHref(post)}>
                    {authorUser(post)?.profilePhoto ? (
                      <img alt="" className="size-9 shrink-0 rounded-full object-cover md:size-8" src={authorUser(post)?.profilePhoto} />
                    ) : (
                      <span aria-hidden className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-accent-light text-[11px] font-black text-accent md:size-8">
                        {initials(authorUser(post)?.name || authorName(post))}
                      </span>
                    )}
                    <span className="min-w-0">
                      <span className="flex min-w-0 items-center gap-1">
                        <strong className="truncate text-xs">{authorName(post)}</strong>
                        {authorUser(post)?.isKycVerified && <MdVerified aria-label="Verified profile" className="size-3.5 shrink-0 text-accent" />}
                      </span>
                      <span className="block truncate text-[11px] text-foose-muted">
                        {authorUser(post)?.name || 'Foose member'}
                      </span>
                    </span>
                  </a>
                  {post.caption && <p className="text-sm leading-5">{post.caption}</p>}
                  {!!post.tags?.length && (
                    <p className="muted-copy flex flex-wrap gap-x-2 gap-y-1 text-xs leading-5 text-foose-muted">
                      {post.tags.map((tag) => (
                        <a
                          className="rounded-sm text-accent transition hover:underline focus:outline-none focus:ring-2 focus:ring-accent/25"
                          href={withBasePath(`/search?tag=${encodeURIComponent(tag.replace(/^#+/, ''))}&tab=all`)}
                          key={tag}
                          onClick={(event) => {
                            event.preventDefault()
                            navigateTo(`/search?tag=${encodeURIComponent(tag.replace(/^#+/, ''))}&tab=all`, { state: { unifiedSearchTrack: true } })
                          }}
                        >#{tag.replace(/^#+/, '')}</a>
                      ))}
                    </p>
                  )}
                  {post.createdAt && <small className="muted-copy text-xs leading-5 text-foose-muted">{formatDate(post.createdAt)}</small>}
                  <div className="grid w-full grid-cols-4 items-center gap-1 border-y border-foose-border py-1.5">
                    {post.isArchived ? (
                      <Badge tone="neutral">Archived</Badge>
                    ) : (
                      <>
                        <button
                          aria-controls={`finspo-comments-${post._id}`}
                          aria-expanded={commentsPanelVisible}
                          aria-label={relatedRailEnabled
                            ? `${commentCount} ${commentCount === 1 ? 'comment is' : 'comments are'} shown`
                            : `${commentsOpen ? 'Hide' : 'Show'} ${commentCount} ${commentCount === 1 ? 'comment' : 'comments'}`}
                          aria-pressed={commentsPanelVisible}
                          className={`inline-flex min-h-8 w-full items-center justify-center gap-1 whitespace-nowrap rounded-lg border-0 bg-transparent px-2 py-1 text-[11px] font-bold transition hover:bg-foose-surface-low hover:text-accent focus:outline-none focus:ring-2 focus:ring-accent/30 ${commentsPanelVisible ? 'text-accent' : 'text-foose-text'}`}
                          onClick={() => setCommentsOpenPostId((current) => current === post._id ? '' : post._id)}
                          type="button"
                        >
                          <FaComment aria-hidden className="size-3.5" />
                          <span aria-label={`${commentCount} comments`}>{commentCount}</span>
                        </button>
                        <FinspoLikeButton className="favorite-button inline-flex min-h-8 w-full items-center justify-center gap-1 whitespace-nowrap rounded-lg border-0 bg-transparent px-2 py-1 text-[11px] font-bold text-foose-text transition hover:bg-foose-surface-low hover:text-accent focus:outline-none focus:ring-2 focus:ring-accent/30 disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-3.5 [&.is-active]:bg-transparent [&.is-active]:text-accent" initialCount={post.likes?.length} initialLiked={user ? post.likes?.some((userId) => String(userId) === user._id) : undefined} onChange={(liked) => setLikeAnnouncement(liked ? 'Finspo liked' : 'Finspo unliked')} showCount solidIcon targetId={post._id} />
                        <span className="contents">
                          <button
                            aria-disabled="true"
                            aria-label="Share this Finspo post (coming soon)"
                            className="inline-flex min-h-8 w-full items-center justify-center rounded-lg border-0 bg-transparent text-foose-muted transition hover:bg-foose-surface-low hover:text-foose-text focus:outline-none focus:ring-2 focus:ring-accent/30 disabled:cursor-default"
                            title="Share coming soon"
                            type="button"
                          >
                            <IoShareSocial aria-hidden className="size-4" />
                          </button>
                          <button
                            aria-disabled="true"
                            aria-label="Save this Finspo post (coming soon)"
                            className="inline-flex min-h-8 w-full items-center justify-center rounded-lg border-0 bg-transparent text-foose-muted transition hover:bg-foose-surface-low hover:text-foose-text focus:outline-none focus:ring-2 focus:ring-accent/30 disabled:cursor-default"
                            title="Save coming soon"
                            type="button"
                          >
                            <FaBookmark aria-hidden className="size-3.5" />
                          </button>
                        </span>
                      </>
                    )}
                  </div>
                  </div>
                  {!post.isArchived && <FinspoComments className="min-h-0 flex-1" commentCount={commentCount} focusCommentId={focusCommentId} key={post._id} onCountChange={updateCommentCount} open={commentsPanelVisible} postId={post._id} />}
                </div>
              </div>
            </article>
            )}
            featuredReserveColumns={relatedRailEnabled ? 1 : 0}
            featuredWidth={focusedAreaWidth}
            gap={relatedRailEnabled ? 12 : 8}
            maxColumns={10}
            minColumns={2}
            targetColumnWidth={190}
          >
            {relatedPosts.map((relatedPost) => renderImageTile(relatedPost, user?._id, relatedFailedImageSet.has(relatedPost.imageUrl)))}
            {relatedLoading && !relatedPosts.length && Array.from({ length: 12 }, (_, index) => <FinspoSkeletonTile index={index} key={`related-initial-${index}`} />)}
            {relatedLoadingMore && Array.from({ length: 50 }, (_, index) => <FinspoSkeletonTile index={index} key={`related-loading-${index}`} />)}
          </FinspoMasonry>
          {relatedError && <InlineNotice action={<button className="font-black text-accent" onClick={refetchRelated} type="button">Retry suggestions</button>} className="my-4" title="Related Finspo did not load" tone="error">The focused post remains available.</InlineNotice>}
          {!relatedError && !relatedPosts.length && <StatePanel body="More Finspo posts will appear here as the community shares them." layout="compact" title="Nothing else yet" tone="empty" />}
          <div ref={relatedSentinelRef} className="min-h-14 py-4">
            {relatedLoadMoreError && <InlineNotice action={<button className="font-black text-accent" onClick={retryRelatedLoadMore} type="button">Try again</button>} title="More Finspo did not load" tone="error">{relatedLoadMoreError}</InlineNotice>}
          </div>
        </section>
      )}
    </AppShell>
  )
}
