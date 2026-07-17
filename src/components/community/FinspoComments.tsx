import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { FaCaretRight, FaChevronDown } from 'react-icons/fa'
import { InlineNotice, LoadingRegion, SkeletonBlock } from '../feedback'
import { useAuth } from '../../hooks/useAuth'
import { ApiError, apiGet, apiPost } from '../../lib/api'
import type {
  CreatedFinspoComment,
  CreatedFinspoReply,
  FinspoComment,
  FinspoCommentContext,
  FinspoCommentLikeState,
  PaginatedFinspoComments,
  PaginatedFinspoReplies,
} from '../../types/api'
import { authHref } from '../../utils/authRedirect'
import { getErrorMessage } from '../../utils/errorMessage'
import { initials } from '../../utils/format'
import { navigateTo, withBasePath } from '../../utils/navigation'

const COMMENT_PAGE_SIZE = 20
const REPLY_PAGE_SIZE = 20

type ReplyCollection = {
  error: string
  loaded: boolean
  loading: boolean
  loadingMore: boolean
  loadMoreError: string
  page: number
  pages: number
  replies: FinspoComment[]
  total: number
}

type ReplyTarget = {
  rootCommentId: string
  targetId: string
  username: string
}

export type FinspoCommentsProps = {
  className?: string
  commentCount: number
  focusCommentId?: string
  onCountChange: (count: number) => void
  open: boolean
  postId: string
}

function emptyReplyCollection(): ReplyCollection {
  return {
    error: '',
    loaded: false,
    loading: false,
    loadingMore: false,
    loadMoreError: '',
    page: 1,
    pages: 1,
    replies: [],
    total: 0,
  }
}

function appendUniqueComments(current: FinspoComment[], next: FinspoComment[]) {
  const seen = new Set(current.map((comment) => comment._id))
  return next.reduce((comments, comment) => {
    if (seen.has(comment._id)) return comments
    seen.add(comment._id)
    comments.push(comment)
    return comments
  }, [...current])
}

function profileHref(comment: FinspoComment) {
  return withBasePath(`/profile/${comment.userId.username}`)
}

function CommentAvatar({ comment }: { comment: FinspoComment }) {
  const user = comment.userId

  return (
    <a aria-label={`View @${user.username}'s profile`} className="shrink-0" href={profileHref(comment)}>
      {user.profilePhoto ? (
        <img alt="" className="size-9 rounded-full object-cover" src={user.profilePhoto} />
      ) : (
        <span aria-hidden className="inline-flex size-9 items-center justify-center rounded-full bg-accent-light text-xs font-black text-accent">
          {initials(user.name)}
        </span>
      )}
    </a>
  )
}

function CommentRow({
  comment,
  expanded = false,
  isReply = false,
  likeBusy = false,
  onLike,
  onReply,
  onToggleReplies,
  repliesId,
}: {
  comment: FinspoComment
  expanded?: boolean
  isReply?: boolean
  likeBusy?: boolean
  onLike: (comment: FinspoComment) => void
  onReply: (comment: FinspoComment) => void
  onToggleReplies?: () => void
  repliesId?: string
}) {
  const username = `@${comment.userId.username}`
  const replyToUsername = comment.replyToUserId?.username

  return (
    <article className="min-w-0">
      <div className="flex min-w-0 items-center gap-2">
        <CommentAvatar comment={comment} />
        <div className="flex min-w-0 items-center gap-1 text-sm font-black text-foose-text">
          <a className="truncate hover:text-accent" href={profileHref(comment)}>{username}</a>
          {isReply && replyToUsername && (
            <>
              <FaCaretRight aria-hidden className="shrink-0 text-[11px] text-foose-faint" />
              <a className="truncate text-foose-muted hover:text-accent" href={withBasePath(`/profile/${replyToUsername}`)}>@{replyToUsername}</a>
            </>
          )}
        </div>
      </div>

      <p className="mt-1 whitespace-pre-wrap break-words pl-11 text-sm leading-6 text-foose-text">{comment.body}</p>

      <div className="flex items-center gap-1 pl-9">
        <button
          aria-label={`${comment.liked ? 'Unlike' : 'Like'} ${username}'s comment`}
          aria-pressed={comment.liked}
          className={`inline-flex min-h-11 items-center gap-1 rounded-lg border-0 bg-transparent px-2 text-xs font-bold transition hover:bg-accent-light hover:text-accent disabled:pointer-events-none disabled:opacity-50 ${comment.liked ? 'text-accent' : 'text-foose-muted'}`}
          disabled={likeBusy}
          onClick={() => onLike(comment)}
          type="button"
        >
          <span>{comment.liked ? 'Liked' : 'Like'}</span>
          <span aria-label={`${comment.likeCount} likes`}>{comment.likeCount}</span>
        </button>
        <button
          aria-label={`Reply to ${username}`}
          className="inline-flex min-h-11 items-center gap-1 rounded-lg border-0 bg-transparent px-2 text-xs font-bold text-foose-muted transition hover:bg-accent-light hover:text-accent"
          onClick={() => onReply(comment)}
          type="button"
        >
          <span>Reply</span>
          <span aria-label={`${comment.replyCount} replies`}>{comment.replyCount}</span>
        </button>
      </div>

      {!isReply && comment.replyCount > 0 && onToggleReplies && (
        <div className="pl-9">
          <button
            aria-controls={repliesId}
            aria-expanded={expanded}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border-0 bg-transparent px-2 text-xs font-black text-accent transition hover:bg-accent-light"
            onClick={onToggleReplies}
            type="button"
          >
            <span>Replies</span>
            <span aria-label={`${comment.replyCount} replies`}>{comment.replyCount}</span>
            <FaChevronDown aria-hidden className={`text-[10px] transition-transform ${expanded ? 'rotate-180' : ''}`} />
          </button>
        </div>
      )}
    </article>
  )
}

function CommentRowsSkeleton({ count = 2 }: { count?: number }) {
  return (
    <LoadingRegion label="Loading comments" layout="pane">
      <div className="space-y-5">
      {Array.from({ length: count }).map((_, index) => (
        <div aria-hidden key={index}>
          <div className="flex items-center gap-2">
            <SkeletonBlock className="size-9 rounded-full" />
            <SkeletonBlock className="h-3 w-24 rounded-full" />
          </div>
          <SkeletonBlock className="ml-11 mt-2 h-3 w-4/5 rounded-full" />
          <SkeletonBlock className="ml-11 mt-3 h-3 w-28 rounded-full" />
        </div>
      ))}
      </div>
    </LoadingRegion>
  )
}

export function FinspoComments({ className = '', commentCount, focusCommentId = '', onCountChange, open, postId }: FinspoCommentsProps) {
  const { status, user } = useAuth()
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const rootLoadingRef = useRef(false)
  const replyLoadingRef = useRef<Set<string>>(new Set())
  const focusedRootIdRef = useRef('')
  const scrolledFocusIdRef = useRef('')
  const [comments, setComments] = useState<FinspoComment[]>([])
  const [rootError, setRootError] = useState('')
  const [rootLoaded, setRootLoaded] = useState(false)
  const [rootLoading, setRootLoading] = useState(false)
  const [rootLoadingMore, setRootLoadingMore] = useState(false)
  const [rootLoadMoreError, setRootLoadMoreError] = useState('')
  const [rootPage, setRootPage] = useState(1)
  const [rootPages, setRootPages] = useState(1)
  const [replyCollections, setReplyCollections] = useState<Record<string, ReplyCollection>>({})
  const [expandedRootIds, setExpandedRootIds] = useState<Set<string>>(() => new Set())
  const [replyTarget, setReplyTarget] = useState<ReplyTarget | null>(null)
  const [body, setBody] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [mutationError, setMutationError] = useState('')
  const [mutationContext, setMutationContext] = useState<'comment' | 'like' | 'reply'>('comment')
  const [busyLikeIds, setBusyLikeIds] = useState<Set<string>>(() => new Set())
  const [focusAttempt, setFocusAttempt] = useState(0)
  const [focusError, setFocusError] = useState('')
  const [focusStatus, setFocusStatus] = useState<'idle' | 'loading' | 'ready' | 'unavailable'>('idle')
  const [highlightedCommentId, setHighlightedCommentId] = useState('')
  const [announcement, setAnnouncement] = useState('')

  const loadComments = useCallback(async (page: number, append: boolean) => {
    if (!postId || rootLoadingRef.current) return

    rootLoadingRef.current = true
    if (append) {
      setRootLoadMoreError('')
      setRootLoadingMore(true)
    } else {
      setRootError('')
      setRootLoading(true)
    }

    try {
      const result = await apiGet<PaginatedFinspoComments>(`/community/gallery/${postId}/comments?page=${page}&limit=${COMMENT_PAGE_SIZE}`)
      setComments((current) => {
        if (append) return appendUniqueComments(current, result.comments)
        const focusedRoot = current.filter((comment) => comment._id === focusedRootIdRef.current)
        return appendUniqueComments(result.comments, focusedRoot)
      })
      setRootPage(result.page)
      setRootPages(result.pages)
      onCountChange(result.totalComments)
    } catch (requestError) {
      const message = getErrorMessage(requestError, append ? 'Could not load more comments' : 'Could not load comments')
      if (append) setRootLoadMoreError(message)
      else setRootError(message)
    } finally {
      rootLoadingRef.current = false
      setRootLoaded(true)
      setRootLoading(false)
      setRootLoadingMore(false)
    }
  }, [onCountChange, postId])

  const loadReplies = useCallback(async (rootCommentId: string, page: number, append: boolean) => {
    if (!postId || replyLoadingRef.current.has(rootCommentId)) return

    replyLoadingRef.current.add(rootCommentId)
    setReplyCollections((current) => {
      const collection = current[rootCommentId] || emptyReplyCollection()
      return {
        ...current,
        [rootCommentId]: {
          ...collection,
          error: '',
          loadMoreError: append ? '' : collection.loadMoreError,
          loading: !append,
          loadingMore: append,
        },
      }
    })

    try {
      const result = await apiGet<PaginatedFinspoReplies>(`/community/gallery/${postId}/comments/${rootCommentId}/replies?page=${page}&limit=${REPLY_PAGE_SIZE}`)
      setReplyCollections((current) => {
        const collection = current[rootCommentId] || emptyReplyCollection()
        return {
          ...current,
          [rootCommentId]: {
            ...collection,
            error: '',
            loadMoreError: '',
            loaded: true,
            loading: false,
            loadingMore: false,
            page: result.page,
            pages: result.pages,
            replies: append
              ? appendUniqueComments(collection.replies, result.replies)
              : appendUniqueComments(
                  result.replies,
                  collection.replies.filter((reply) => reply._id === focusCommentId),
                ),
            total: result.total,
          },
        }
      })
    } catch (requestError) {
      setReplyCollections((current) => {
        const collection = current[rootCommentId] || emptyReplyCollection()
        return {
          ...current,
          [rootCommentId]: {
            ...collection,
            error: append ? collection.error : getErrorMessage(requestError, 'Could not load replies'),
            loadMoreError: append ? getErrorMessage(requestError, 'Could not load more replies') : collection.loadMoreError,
            loaded: true,
            loading: false,
            loadingMore: false,
          },
        }
      })
    } finally {
      replyLoadingRef.current.delete(rootCommentId)
    }
  }, [focusCommentId, postId])

  useEffect(() => {
    if (!open || rootLoaded || rootLoadingRef.current) return
    void loadComments(1, false)
  }, [loadComments, open, rootLoaded])

  useEffect(() => {
    if (!open || !postId || !focusCommentId) return undefined

    const controller = new AbortController()
    scrolledFocusIdRef.current = ''
    focusedRootIdRef.current = ''
    queueMicrotask(() => {
      if (!controller.signal.aborted) {
        setFocusError('')
        setFocusStatus('loading')
      }
    })

    void apiGet<FinspoCommentContext>(
      `/community/gallery/${postId}/comments/${focusCommentId}/context`,
      { signal: controller.signal },
    ).then((context) => {
      if (controller.signal.aborted) return
      focusedRootIdRef.current = context.rootCommentId
      setComments((current) => appendUniqueComments([context.rootComment], current))
      onCountChange(context.totalComments)

      if (context.isReply) {
        setExpandedRootIds((current) => new Set(current).add(context.rootCommentId))
        setReplyCollections((current) => {
          const collection = current[context.rootCommentId] || emptyReplyCollection()
          return {
            ...current,
            [context.rootCommentId]: {
              ...collection,
              error: '',
              replies: appendUniqueComments(collection.replies, [context.target]),
              total: Math.max(collection.total, context.rootComment.replyCount),
            },
          }
        })
        void loadReplies(context.rootCommentId, 1, false)
      }

      setFocusStatus('ready')
    }).catch((requestError) => {
      if (controller.signal.aborted) return
      if (requestError instanceof ApiError && requestError.status === 404) {
        setFocusError('That comment is no longer available. You can still browse the conversation.')
      } else {
        setFocusError(getErrorMessage(requestError, 'The highlighted comment could not be opened.'))
      }
      setFocusStatus('unavailable')
    })

    return () => controller.abort()
  }, [focusAttempt, focusCommentId, loadReplies, onCountChange, open, postId])

  useEffect(() => {
    if (focusStatus !== 'ready' || !focusCommentId || scrolledFocusIdRef.current === focusCommentId) return undefined

    let frame = 0
    let attempts = 0
    const reveal = () => {
      const target = document.querySelector<HTMLElement>(`[data-finspo-comment-id="${focusCommentId}"]`)
      if (!target && attempts < 30) {
        attempts += 1
        frame = window.requestAnimationFrame(reveal)
        return
      }
      if (!target) return
      scrolledFocusIdRef.current = focusCommentId
      setHighlightedCommentId(focusCommentId)
      target.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }

    frame = window.requestAnimationFrame(reveal)
    return () => window.cancelAnimationFrame(frame)
  }, [comments, focusCommentId, focusStatus, replyCollections])

  useEffect(() => {
    if (!highlightedCommentId) return undefined
    const timeout = window.setTimeout(() => setHighlightedCommentId(''), 3500)
    return () => window.clearTimeout(timeout)
  }, [highlightedCommentId])

  function requireUser() {
    if (user) return true
    if (status !== 'checking') navigateTo(authHref('/login'))
    return false
  }

  function beginReply(comment: FinspoComment, rootCommentId: string) {
    if (!requireUser()) return
    setMutationError('')
    setReplyTarget({
      rootCommentId,
      targetId: comment._id,
      username: comment.userId.username,
    })
    requestAnimationFrame(() => textareaRef.current?.focus())
  }

  function toggleReplies(comment: FinspoComment) {
    const rootCommentId = comment._id
    const expanded = expandedRootIds.has(rootCommentId)

    setExpandedRootIds((current) => {
      const next = new Set(current)
      if (expanded) next.delete(rootCommentId)
      else next.add(rootCommentId)
      return next
    })

    const collection = replyCollections[rootCommentId]
    if (!expanded && !collection?.loaded && !collection?.loading) {
      void loadReplies(rootCommentId, 1, false)
    }
  }

  function applyLikeState(result: FinspoCommentLikeState) {
    const updateComment = (comment: FinspoComment) => comment._id === result.commentId
      ? { ...comment, liked: result.liked, likeCount: result.likeCount }
      : comment

    setComments((current) => current.map(updateComment))
    setReplyCollections((current) => {
      let changed = false
      const next = { ...current }

      Object.entries(current).forEach(([rootCommentId, collection]) => {
        if (!collection.replies.some((reply) => reply._id === result.commentId)) return
        changed = true
        next[rootCommentId] = { ...collection, replies: collection.replies.map(updateComment) }
      })

      return changed ? next : current
    })
  }

  async function toggleCommentLike(comment: FinspoComment) {
    if (!requireUser() || busyLikeIds.has(comment._id)) return

    setMutationContext('like')
    setMutationError('')
    setBusyLikeIds((current) => new Set(current).add(comment._id))
    try {
      const result = await apiPost<FinspoCommentLikeState>(`/community/gallery/${postId}/comments/${comment._id}/like`)
      applyLikeState(result)
      setAnnouncement(result.liked ? 'Comment liked' : 'Comment unliked')
    } catch (requestError) {
      setMutationError(getErrorMessage(requestError, 'Could not update this comment like'))
    } finally {
      setBusyLikeIds((current) => {
        const next = new Set(current)
        next.delete(comment._id)
        return next
      })
    }
  }

  async function submitComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmedBody = body.trim()
    if (!trimmedBody || !requireUser() || submitting) return

    setSubmitting(true)
    setMutationContext(replyTarget ? 'reply' : 'comment')
    setMutationError('')

    try {
      if (replyTarget) {
        const result = await apiPost<CreatedFinspoReply>(`/community/gallery/${postId}/comments/${replyTarget.targetId}/replies`, { body: trimmedBody })
        setComments((current) => current.map((comment) => comment._id === result.rootCommentId
          ? { ...comment, replyCount: result.rootReplyCount }
          : comment))
        setExpandedRootIds((current) => new Set(current).add(result.rootCommentId))

        const existingCollection = replyCollections[result.rootCommentId]
        if (existingCollection?.loaded) {
          setReplyCollections((current) => {
            const collection = current[result.rootCommentId] || emptyReplyCollection()
            const repliesWithUpdatedTarget = replyTarget.targetId === result.rootCommentId
              ? collection.replies
              : collection.replies.map((reply) => reply._id === replyTarget.targetId
                ? { ...reply, replyCount: reply.replyCount + 1 }
                : reply)
            return {
              ...current,
              [result.rootCommentId]: {
                ...collection,
                error: '',
                loaded: true,
                loading: false,
                loadingMore: false,
                pages: Math.max(collection.pages, Math.ceil(result.rootReplyCount / REPLY_PAGE_SIZE)),
                replies: appendUniqueComments(repliesWithUpdatedTarget, [result.reply]),
                total: result.rootReplyCount,
              },
            }
          })
        } else {
          await loadReplies(result.rootCommentId, 1, false)
        }
        onCountChange(result.totalComments)
        setAnnouncement(`Reply posted to @${replyTarget.username}`)
      } else {
        const result = await apiPost<CreatedFinspoComment>(`/community/gallery/${postId}/comments`, { body: trimmedBody })
        setComments((current) => [result.comment, ...current.filter((comment) => comment._id !== result.comment._id)])
        onCountChange(result.totalComments)
        setAnnouncement('Comment posted')
      }

      setBody('')
      setReplyTarget(null)
    } catch (requestError) {
      setMutationError(getErrorMessage(requestError, replyTarget ? 'Could not post this reply' : 'Could not post this comment'))
    } finally {
      setSubmitting(false)
    }
  }

  if (!open) return null

  return (
    <section aria-labelledby={`finspo-comments-title-${postId}`} className={`finspo-comments-panel flex min-h-0 flex-col border-t border-foose-border pt-4 ${className}`} id={`finspo-comments-${postId}`}>
      <span aria-live="polite" className="sr-only">{announcement}</span>
      <div className="mb-3 flex shrink-0 items-center justify-between gap-3">
        <h2 className="text-base font-black text-foose-text" id={`finspo-comments-title-${postId}`}>Comments</h2>
        <span aria-label={`${commentCount} comments`} className="text-xs font-bold text-foose-faint">{commentCount}</span>
      </div>

      <div aria-label="Comment thread" className="finspo-thin-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1" role="region" tabIndex={0}>
        {focusCommentId && focusStatus === 'loading' && (
          <p className="mb-3 rounded-lg bg-accent-light px-3 py-2 text-xs font-bold text-accent" role="status">Opening highlighted comment...</p>
        )}
        {focusCommentId && focusStatus === 'unavailable' && (
          <InlineNotice action={<button className="min-h-9 text-xs font-black text-accent" onClick={() => setFocusAttempt((current) => current + 1)} type="button">Try again</button>} className="mb-3" tone="warning">{focusError}</InlineNotice>
        )}
        {rootLoading && <CommentRowsSkeleton count={3} />}
        {!rootLoading && rootError && (
          <InlineNotice action={<button className="min-h-11 font-black text-accent" onClick={() => void loadComments(1, false)} type="button">Try again</button>} title="Comments could not load" tone="error">{rootError}</InlineNotice>
        )}
        {!rootLoading && !rootError && rootLoaded && !comments.length && <p className="flex min-h-full items-center justify-center py-3 text-center text-sm text-foose-muted">No comments yet. Start the conversation.</p>}

        {!rootLoading && !rootError && comments.length > 0 && (
          <div className="space-y-5">
            {comments.map((comment) => {
              const expanded = expandedRootIds.has(comment._id)
              const repliesId = `finspo-comment-replies-${comment._id}`
              const collection = replyCollections[comment._id]

              return (
                <div className={`rounded-xl transition duration-700 ${highlightedCommentId === comment._id ? 'bg-accent-light ring-2 ring-accent/35' : ''}`} data-finspo-comment-id={comment._id} key={comment._id}>
                  <CommentRow
                    comment={comment}
                    expanded={expanded}
                    likeBusy={busyLikeIds.has(comment._id)}
                    onLike={(target) => void toggleCommentLike(target)}
                    onReply={(target) => beginReply(target, comment._id)}
                    onToggleReplies={() => toggleReplies(comment)}
                    repliesId={repliesId}
                  />

                  {expanded && (
                    <div className="ml-8 mt-2 border-l border-foose-border pl-3 sm:ml-10" id={repliesId}>
                      {collection?.loading && <CommentRowsSkeleton />}
                      {collection?.error && (
                        <InlineNotice action={<button className="min-h-11 font-black text-accent" onClick={() => void loadReplies(comment._id, 1, false)} type="button">Try replies again</button>} className="my-2" tone="error">{collection.error}</InlineNotice>
                      )}
                      {!collection?.loading && collection?.replies.map((reply) => (
                        <div className={`mb-4 rounded-xl transition duration-700 last:mb-0 ${highlightedCommentId === reply._id ? 'bg-accent-light ring-2 ring-accent/35' : ''}`} data-finspo-comment-id={reply._id} key={reply._id}>
                          <CommentRow
                            comment={reply}
                            isReply
                            likeBusy={busyLikeIds.has(reply._id)}
                            onLike={(target) => void toggleCommentLike(target)}
                            onReply={(target) => beginReply(target, comment._id)}
                          />
                        </div>
                      ))}
                      {!collection?.loading && !collection?.error && collection?.loaded && !collection.replies.length && (
                        <p className="py-2 text-xs text-foose-muted">No replies to show.</p>
                      )}
                      {collection && !collection.error && collection.page < collection.pages && (
                        <div>
                          {collection.loadMoreError && <InlineNotice action={<button className="font-black text-accent" onClick={() => void loadReplies(comment._id, collection.page + 1, true)} type="button">Try again</button>} className="my-2" tone="error">{collection.loadMoreError}</InlineNotice>}
                          <button
                            className="mt-2 inline-flex min-h-11 items-center border-0 bg-transparent text-xs font-black text-accent disabled:pointer-events-none disabled:opacity-50"
                            disabled={collection.loadingMore}
                            onClick={() => void loadReplies(comment._id, collection.page + 1, true)}
                            type="button"
                          >
                            {collection.loadingMore ? 'Loading replies...' : 'Load more replies'}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {rootPage < rootPages && (
          <div className="mt-5">
            {rootLoadMoreError && <InlineNotice action={<button className="font-black text-accent" onClick={() => void loadComments(rootPage + 1, true)} type="button">Try again</button>} className="mb-2" tone="error">{rootLoadMoreError}</InlineNotice>}
            <button
              className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-foose-border bg-foose-surface px-4 text-sm font-black text-foose-text transition hover:border-accent hover:text-accent disabled:pointer-events-none disabled:opacity-50"
              disabled={rootLoadingMore}
              onClick={() => void loadComments(rootPage + 1, true)}
              type="button"
            >
              {rootLoadingMore ? 'Loading comments...' : 'Load more comments'}
            </button>
          </div>
        )}
      </div>

      <div className="mt-4 shrink-0 border-t border-foose-border bg-foose-surface pt-3">
        {mutationError && (
          <InlineNotice
            className="mb-3"
            title={mutationContext === 'like' ? 'Like was not updated' : mutationContext === 'reply' ? 'Reply was not posted' : 'Comment was not posted'}
            tone="error"
          >
            {mutationError}
          </InlineNotice>
        )}

        {status === 'checking' ? (
          <LoadingRegion label="Checking comment access" layout="compact"><SkeletonBlock className="h-20 rounded-xl" /></LoadingRegion>
        ) : user ? (
          <form aria-busy={submitting} className="rounded-2xl border border-foose-border/70 bg-foose-surface-low p-3 shadow-sm md:grid md:grid-cols-[minmax(0,1fr)_auto] md:items-end md:gap-2" onSubmit={(event) => void submitComment(event)}>
            {replyTarget && (
              <div className="mb-2 flex items-center justify-between gap-3 rounded-lg bg-accent-light px-3 py-2 text-xs font-bold text-accent md:col-span-2">
                <span className="min-w-0 truncate">Replying to @{replyTarget.username}</span>
                <button className="shrink-0 border-0 bg-transparent underline underline-offset-2" onClick={() => setReplyTarget(null)} type="button">Cancel</button>
              </div>
            )}
            <label className="sr-only" htmlFor={`finspo-comment-input-${postId}`}>
              {replyTarget ? `Reply to @${replyTarget.username}` : 'Add a comment'}
            </label>
            <textarea
              aria-describedby={`finspo-comment-counter-${postId}`}
              aria-invalid={Boolean(mutationError && mutationContext !== 'like') || undefined}
              className="min-h-24 w-full resize-none rounded-xl border border-foose-border bg-white px-4 py-3 text-sm text-foose-text outline-none transition placeholder:text-foose-faint focus:border-accent focus:ring-2 focus:ring-accent/15 aria-invalid:border-foose-danger aria-invalid:ring-2 aria-invalid:ring-foose-danger/15 md:min-h-12"
              id={`finspo-comment-input-${postId}`}
              maxLength={1000}
              onChange={(event) => setBody(event.target.value)}
              placeholder={replyTarget ? `Reply to @${replyTarget.username}...` : 'Add a comment...'}
              ref={textareaRef}
              rows={2}
              value={body}
            />
            <div className="mt-2 flex items-center justify-between gap-3 md:mt-0 md:flex-col md:items-end">
              <span className="text-xs font-semibold tabular-nums text-foose-faint" id={`finspo-comment-counter-${postId}`}>{body.length}/1000</span>
              <button
                className="inline-flex min-h-12 min-w-24 items-center justify-center rounded-xl border border-accent bg-accent px-4 text-sm font-black text-white shadow-sm transition hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:pointer-events-none disabled:opacity-50"
                disabled={submitting || rootLoading || !body.trim()}
                type="submit"
              >
                {submitting ? 'Posting...' : replyTarget ? 'Reply' : 'Post'}
              </button>
            </div>
          </form>
        ) : (
          <a className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-accent bg-accent px-4 text-sm font-black text-white transition hover:bg-accent-hover" href={authHref('/login')}>
            Log in to comment
          </a>
        )}
      </div>
    </section>
  )
}
