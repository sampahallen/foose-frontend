import { useMemo, type MouseEvent } from 'react'
import { AppShell, EmptyState, ErrorState, FavoriteButton, Icon, LightboxImage, LoadingState } from '../components'
import { useApiResource } from '../hooks/useApiResource'
import type { GalleryPost } from '../types/api'
import { formatDate } from '../utils/format'
import { cacheFinspoPreview, navigateTo, readFinspoPreview } from '../utils/navigation'

function finspoIdFromPath() {
  const match = window.location.pathname.match(/^\/community\/finspo\/([^/]+)/)
  return match ? decodeURIComponent(match[1]).trim() : ''
}

function authorName(post: GalleryPost) {
  if (post.userId && typeof post.userId === 'object') return post.userId.name
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
    <article className="finspo-tile" key={post._id}>
      <a
        aria-label={post.caption || `Finspo by ${authorName(post)}`}
        className="finspo-image finspo-tile-link"
        href={`/community/finspo/${post._id}`}
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
      <div className="dashboard-head">
        <div>
          <a className="back-link" href="/community?tab=finspo">
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
        <section className="finspo-detail-layout">
          <article className="finspo-detail-card finspo-focus-card">
            <div className="finspo-detail-image">
              <LightboxImage alt={post.caption || 'Finspo post'} src={post.imageUrl} />
            </div>
            <div className="finspo-detail-body">
              <div className="finspo-detail-head">
                <a href={authorHref(post)}>
                  <strong>{authorName(post)}</strong>
                </a>
                <FavoriteButton className="button button-secondary favorite-button" showText targetId={post._id} targetType="finspo" />
              </div>
              {post.caption && <p>{post.caption}</p>}
              {!!post.tags?.length && <p className="muted-copy">{post.tags.map((tag) => `#${tag}`).join(' ')}</p>}
              {post.createdAt && <small className="muted-copy">{formatDate(post.createdAt)}</small>}
            </div>
          </article>

          <aside className="finspo-surround" aria-label="More Finspo posts">
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
