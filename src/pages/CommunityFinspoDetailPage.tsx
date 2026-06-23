import { useMemo, type MouseEvent } from 'react'
import { AppShell, EmptyState, ErrorState, FavoriteButton, Icon, LightboxImage, LoadingState } from '../components'
import { useApiResource } from '../hooks/useApiResource'
import type { GalleryPost } from '../types/api'
import { formatDate } from '../utils/format'
import { cacheFinspoPreview, getCurrentAppPathname, navigateTo, readFinspoPreview, withBasePath } from '../utils/navigation'

function finspoIdFromPath() {
  const match = getCurrentAppPathname().match(/^\/community\/finspo\/([^/]+)/)
  return match ? decodeURIComponent(match[1]).trim() : ''
}

function authorName(post: GalleryPost) {
  if (post.userId && typeof post.userId === 'object') return `@${post.userId.username}`
  return 'Foose member'
}

function authorHref(post: GalleryPost) {
  if (post.userId && typeof post.userId === 'object') return `/profile/${post.userId.username}`
  return '#'
}

function openFinspo(event: MouseEvent<HTMLAnchorElement>, post: GalleryPost) {
  event.preventDefault()
  cacheFinspoPreview(post)
  navigateTo(`/community/finspo/${post._id}`)
}

function renderImageTile(post: GalleryPost) {
  return (
    <article className="finspo-tile relative mb-3 break-inside-avoid max-md:mb-2" key={post._id}>
      <a
        aria-label={post.caption || `Finspo by ${authorName(post)}`}
        className="finspo-image block overflow-hidden rounded-none border-0 bg-transparent [&_img]:h-auto [&_img]:w-full [&_img]:object-contain finspo-tile-link"
        href={withBasePath(`/community/finspo/${post._id}`)}
        onClick={(event) => openFinspo(event, post)}
      >
        <img alt="" src={post.imageUrl} />
      </a>
    </article>
  )
}

export function CommunityFinspoDetailPage() {
  const postId = finspoIdFromPath()
  const postResource = useApiResource<{ post: GalleryPost }>(postId ? `/community/gallery/${postId}` : null, Boolean(postId))
  const relatedResource = useApiResource<{ posts: GalleryPost[]; total: number }>('/community/gallery?page=1&limit=36')
  const cachedPost = useMemo(() => (postId ? readFinspoPreview<GalleryPost>(postId) : null), [postId])
  const post = postResource.data?.post || cachedPost
  const relatedPosts = (relatedResource.data?.posts || []).filter((item) => item._id !== postId)

  return (
    <AppShell active="community" searchPlaceholder="Search Finspo...">
      <div className="dashboard-head mb-5 flex flex-col gap-2 md:flex-row md:items-center md:justify-between [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:md:text-4xl [&_p]:text-sm [&_p]:leading-6 [&_p]:text-foose-muted [&_p]:md:text-base max-md:[&_h1]:text-2xl">
        <div>
          <a className="back-link mb-6 inline-flex items-center gap-2 text-sm font-semibold text-foose-muted hover:text-accent" href="/community?tab=finspo">
            <Icon name="arrow" /> Back to Finspo
          </a>
          <h1>Finspo</h1>
          <p>Open the post, then keep browsing the community wall around it.</p>
        </div>
      </div>

      {!postId && <EmptyState body="This Finspo link is missing a post id." title="Post not found" />}
      {postResource.loading && <LoadingState label="Loading Finspo..." />}
      {!post && postResource.error && <ErrorState message={postResource.error} retry={postResource.refetch} />}

      {post && (
        <section className="finspo-detail-layout flex flex-col gap-5 lg:flex-row">
          <article className="finspo-detail-card flex-1 rounded-xl border border-foose-border bg-foose-surface p-4 finspo-focus-card">
            <div className="finspo-detail-image overflow-hidden rounded-lg bg-foose-surface-mid [&_img]:h-full [&_img]:w-full [&_img]:object-cover">
              <LightboxImage alt={post.caption || 'Finspo post'} src={post.imageUrl} />
            </div>
            <div className="finspo-detail-body">
              <div className="finspo-detail-head">
                <a href={authorHref(post)}>
                  <strong>{authorName(post)}</strong>
                </a>
                <FavoriteButton className="button inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border px-4 py-2 text-center text-sm font-bold transition disabled:pointer-events-none disabled:opacity-50 [&.full]:w-full button-secondary border-foose-border bg-foose-surface text-foose-text hover:border-accent hover:text-accent favorite-button [&.is-active]:bg-accent [&.is-active]:text-white" showText targetId={post._id} targetType="finspo" />
              </div>
              {post.caption && <p>{post.caption}</p>}
              {!!post.tags?.length && <p className="muted-copy text-sm leading-6 text-foose-muted md:text-base">{post.tags.map((tag) => `#${tag}`).join(' ')}</p>}
              {post.createdAt && <small className="muted-copy text-sm leading-6 text-foose-muted md:text-base">{formatDate(post.createdAt)}</small>}
            </div>
          </article>

          <aside className="finspo-surround flex-1 columns-2 gap-2 md:columns-3 lg:columns-4 [&_.finspo-tile]:mb-2" aria-label="More Finspo posts">
            {relatedResource.loading && <LoadingState label="Loading more Finspo..." />}
            {relatedResource.error && <ErrorState message={relatedResource.error} retry={relatedResource.refetch} />}
            {!relatedResource.loading && !relatedResource.error && !relatedPosts.length && <EmptyState body="More Finspo posts will appear here." title="Nothing else yet" />}
            {!!relatedPosts.length && relatedPosts.map(renderImageTile)}
          </aside>
        </section>
      )}
    </AppShell>
  )
}
