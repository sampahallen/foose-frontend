import { useEffect, useRef, useState } from 'react'
import { IoArchiveOutline, IoArrowUndoOutline, IoEllipsisVertical } from 'react-icons/io5'
import { AppShell, ConfirmDialog, FinspoCaption, FinspoFeedSkeleton, FloatingCreateButton, Icon, InlineNotice, LightboxImage, RefreshIndicator, StatePanel, useToast } from '../components'
import { useApiResource } from '../hooks/useApiResource'
import { NavigationBackButton } from '../components/navigation'
import { useImageBatchReady } from '../hooks/useImageBatchReady'
import { apiDelete, apiPost } from '../lib/api'
import type { GalleryPost } from '../types/api'
import { getErrorMessage } from '../utils/errorMessage'
import { withBasePath } from '../utils/navigation'

type ArchivedFinspoFeed = {
  posts: GalleryPost[]
  retentionDays: number
  total: number
}

const DAY_MS = 24 * 60 * 60 * 1_000
const HOUR_MS = 60 * 60 * 1_000

function archiveExpiry(post: GalleryPost, retentionDays: number) {
  const authoritativeDeadline = new Date(post.archiveDeleteAt || '')
  if (!Number.isNaN(authoritativeDeadline.getTime())) return authoritativeDeadline

  const archivedAt = new Date(post.archivedAt || '')
  if (Number.isNaN(archivedAt.getTime())) return null
  return new Date(archivedAt.getTime() + retentionDays * DAY_MS)
}

function countdownLabel(post: GalleryPost, retentionDays: number, now: number) {
  const expiresAt = archiveExpiry(post, retentionDays)
  if (!expiresAt) return `Deletes within ${retentionDays} days`

  const remaining = expiresAt.getTime() - now
  if (remaining <= 0) return 'Deletion due'
  if (remaining < DAY_MS) {
    const hours = Math.max(1, Math.ceil(remaining / HOUR_MS))
    return `Deletes in ${hours} ${hours === 1 ? 'hour' : 'hours'}`
  }

  const days = Math.ceil(remaining / DAY_MS)
  return `Deletes in ${days} ${days === 1 ? 'day' : 'days'}`
}

function ArchivedPostMenu({
  busy,
  open,
  onClose,
  onDelete,
  onRestore,
  onToggle,
  post,
}: {
  busy: boolean
  open: boolean
  onClose: () => void
  onDelete: (post: GalleryPost) => void
  onRestore: (post: GalleryPost) => void
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
      if (event.key === 'Escape' && !busy) onClose()
    }

    document.addEventListener('mousedown', closeOnOutsideClick)
    window.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick)
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [busy, onClose, open])

  return (
    <div className="absolute right-2 top-2 z-30" ref={menuRef}>
      <button
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={`${open ? 'Close' : 'Open'} options for ${post.caption || 'archived Finspo post'}`}
        className="inline-flex size-8 items-center justify-center rounded-full border border-white/60 bg-white/90 text-foose-text shadow-md backdrop-blur transition hover:bg-white hover:text-accent disabled:pointer-events-none disabled:opacity-60"
        disabled={busy}
        onClick={onToggle}
        type="button"
      >
        <IoEllipsisVertical size={18} />
      </button>
      {open && (
        <div className="absolute right-0 top-10 z-40 w-48 rounded-xl border border-foose-border bg-foose-surface p-1.5 shadow-2xl" role="menu">
          <button className="flex min-h-10 w-full items-center gap-3 rounded-lg px-3 text-left text-sm font-bold text-foose-text transition hover:bg-foose-surface-low hover:text-accent disabled:pointer-events-none disabled:opacity-60" disabled={busy} onClick={() => onRestore(post)} role="menuitem" type="button">
            <IoArrowUndoOutline size={18} /> {busy ? 'Restoring...' : 'Restore'}
          </button>
          <button className="flex min-h-10 w-full items-center gap-3 rounded-lg px-3 text-left text-sm font-bold text-foose-danger transition hover:bg-foose-danger-bg disabled:pointer-events-none disabled:opacity-60" disabled={busy} onClick={() => onDelete(post)} role="menuitem" type="button">
            <Icon name="trash" size={17} /> Delete permanently
          </button>
        </div>
      )}
    </div>
  )
}

function DeleteArchivedPostDialog({
  busy,
  error,
  onClose,
  onConfirm,
}: {
  busy: boolean
  error?: string
  onClose: () => void
  onConfirm: () => void
}) {
  return (
    <ConfirmDialog
      busy={busy}
      cancelLabel="Keep post"
      confirmLabel="Delete permanently"
      description={(
        <span className="grid gap-3">
          <span>This post will be permanently removed from Foose. This action cannot be undone.</span>
          {error && <span className="rounded-xl border border-foose-danger/30 bg-foose-danger-bg/40 p-3 font-semibold text-foose-danger" role="alert">{error}</span>}
        </span>
      )}
      onCancel={onClose}
      onConfirm={onConfirm}
      open
      title="Delete this archived post?"
      tone="destructive"
    />
  )
}

export function CommunityFinspoArchivedPage() {
  const archived = useApiResource<ArchivedFinspoFeed>('/community/gallery/me/archived')
  const { showToast } = useToast()
  const [menuPost, setMenuPost] = useState<GalleryPost | null>(null)
  const [pendingDelete, setPendingDelete] = useState<GalleryPost | null>(null)
  const [busyPostId, setBusyPostId] = useState('')
  const [actionError, setActionError] = useState('')
  const [deleteError, setDeleteError] = useState('')
  const [now, setNow] = useState(Date.now)
  const retentionDays = Math.max(1, archived.data?.retentionDays || 30)
  const archivedPosts = (archived.data?.posts || []).filter((post) => {
    if (post.isArchived === false) return false
    const expiresAt = archiveExpiry(post, retentionDays)
    return !expiresAt || expiresAt.getTime() > now
  })
  const images = useImageBatchReady(
    archivedPosts.map((post) => post.imageUrl),
    !archived.loading && !archived.error,
  )
  const failedImages = new Set(images.failed)
  const readyPosts = images.ready ? archivedPosts : []
  const pageLoading = archived.initialLoading || (!archived.error && archivedPosts.length > 0 && !images.ready)
  const previewItems = readyPosts.filter((post) => !failedImages.has(post.imageUrl)).map((post) => ({ alt: post.caption || 'Archived Finspo post', src: post.imageUrl }))

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000)
    return () => window.clearInterval(timer)
  }, [])

  async function restorePost(post: GalleryPost) {
    setMenuPost(null)
    setBusyPostId(post._id)
    setActionError('')
    try {
      await apiPost(`/community/gallery/${post._id}/restore`)
      showToast({ message: 'The post is active in My Finspo again.', title: 'Finspo restored', tone: 'success' })
      await archived.refetch()
    } catch (error) {
      setActionError(getErrorMessage(error, 'Could not restore this Finspo post'))
    } finally {
      setBusyPostId('')
    }
  }

  function requestDelete(post: GalleryPost) {
    setMenuPost(null)
    setDeleteError('')
    setPendingDelete(post)
  }

  async function deletePost() {
    if (!pendingDelete) return
    setBusyPostId(pendingDelete._id)
    setDeleteError('')
    try {
      await apiDelete(`/community/gallery/${pendingDelete._id}`)
      setPendingDelete(null)
      showToast({ message: 'The archived post was permanently removed.', title: 'Finspo deleted', tone: 'success' })
      await archived.refetch()
    } catch (error) {
      setDeleteError(getErrorMessage(error, 'Could not delete this Finspo post'))
    } finally {
      setBusyPostId('')
    }
  }

  return (
    <AppShell active="community" searchPlaceholder="Search Finspo...">
      <header className="mb-6 flex flex-col gap-4 rounded-2xl border border-foose-border bg-foose-surface p-5 shadow-sm sm:p-6 md:flex-row md:items-end md:justify-between">
        <div>
          <NavigationBackButton className="mb-4" fallback={{ href: '/community?tab=finspo&scope=mine', label: 'My Finspo' }} />
          <div className="flex items-center gap-3">
            <span className="inline-flex size-12 items-center justify-center rounded-2xl bg-accent-light text-accent"><IoArchiveOutline size={25} /></span>
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-accent">Private archive</p>
              <h1 className="text-3xl font-black text-foose-text md:text-4xl">Archived Finspo</h1>
            </div>
          </div>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-foose-muted">Restore a post at any time. Archived posts are permanently deleted {retentionDays} days after they enter the archive.</p>
        </div>
      </header>

      <RefreshIndicator active={archived.refreshing} className="mb-4" label="Refreshing archived Finspo" />
      {actionError && <InlineNotice className="mb-4" title="Archive action did not finish" tone="error">{actionError}</InlineNotice>}
      {pageLoading && <FinspoFeedSkeleton count={Math.min(Math.max(archivedPosts.length || 10, 10), 50)} label="Loading archived Finspo posts" showAuthor={false} showMenu />}
      {!pageLoading && archived.error && !archived.data && <StatePanel action={<button className="button button-secondary" onClick={archived.refetch} type="button">Try again</button>} body={archived.error} layout="section" title="Your Finspo archive could not load" tone="error" />}
      {!pageLoading && archived.error && archived.data && <InlineNotice action={<button className="font-black text-accent" onClick={archived.refetch} type="button">Retry</button>} tone="warning">The archive could not refresh. Showing the posts already loaded.</InlineNotice>}
      {!pageLoading && !archived.error && !archivedPosts.length && (
        <StatePanel
          action={<a className="inline-flex min-h-11 items-center justify-center rounded-xl border border-accent bg-accent px-5 text-sm font-bold text-white transition hover:bg-accent-hover" href={withBasePath('/community?tab=finspo&scope=mine')}>Return to My Finspo</a>}
          body="Posts you archive will stay private here until they are restored or permanently deleted."
          layout="section"
          title="Your archive is empty"
          tone="empty"
        />
      )}
      {!pageLoading && !archived.error && !!readyPosts.length && (
        <section aria-label={`${readyPosts.length} archived Finspo posts`}>
          <div className="mb-4 flex items-center justify-between gap-3">
            <p className="text-sm font-bold text-foose-muted">{readyPosts.length} archived {readyPosts.length === 1 ? 'post' : 'posts'}</p>
            <span className="rounded-full bg-foose-danger-bg px-3 py-1 text-xs font-black text-foose-danger">Auto-delete: {retentionDays} days</span>
          </div>
          <div className="finspo-masonry columns-2 gap-2 md:columns-3 lg:columns-5 max-md:columns-2 max-md:gap-2">
            {readyPosts.map((post) => {
              const expiresAt = archiveExpiry(post, retentionDays)
              return (
                <article className="finspo-tile relative mb-3 break-inside-avoid max-md:mb-2" key={post._id}>
                  {failedImages.has(post.imageUrl)
                    ? <div className="flex aspect-[4/5] w-full items-center justify-center bg-foose-surface-mid px-3 text-center text-xs font-bold text-foose-muted" role="img" aria-label="Archived Finspo image unavailable">Media unavailable</div>
                    : <LightboxImage
                        alt={post.caption || 'Archived Finspo post'}
                        className="finspo-image overflow-hidden rounded-none [&_img]:h-auto [&_img]:w-full [&_img]:object-contain"
                        index={previewItems.findIndex((item) => item.src === post.imageUrl)}
                        items={previewItems}
                        src={post.imageUrl}
                      />}
                  <ArchivedPostMenu
                    busy={busyPostId === post._id}
                    open={menuPost?._id === post._id}
                    onClose={() => setMenuPost(null)}
                    onDelete={requestDelete}
                    onRestore={(selectedPost) => void restorePost(selectedPost)}
                    onToggle={() => setMenuPost((current) => current?._id === post._id ? null : post)}
                    post={post}
                  />
                  <FinspoCaption caption={post.caption} />
                  <time className="mt-1 flex items-center gap-1 text-[11px] font-black text-foose-danger" dateTime={expiresAt?.toISOString()} title={expiresAt ? `Scheduled for permanent deletion ${expiresAt.toLocaleString()}` : undefined}>
                    <Icon name="clock" size={13} /> {countdownLabel(post, retentionDays, now)}
                  </time>
                </article>
              )
            })}
          </div>
        </section>
      )}

      <FloatingCreateButton href="/community/finspo/new" label="Post Finspo" />

      {pendingDelete && (
        <DeleteArchivedPostDialog
          busy={busyPostId === pendingDelete._id}
          error={deleteError}
          onClose={() => {
            if (!busyPostId) setPendingDelete(null)
          }}
          onConfirm={() => void deletePost()}
        />
      )}
    </AppShell>
  )
}
