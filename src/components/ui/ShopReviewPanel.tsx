import { useState, type FormEvent } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { useApiResource } from '../../hooks/useApiResource'
import { apiDelete, apiPost, apiPut } from '../../lib/api'
import type { PaginatedReviews, Review, User } from '../../types/api'
import { getErrorMessage } from '../../utils/errorMessage'
import { formatDate, initials } from '../../utils/format'
import { getCurrentAppPathname, withBasePath } from '../../utils/navigation'
import { InlineNotice, LoadingRegion, SkeletonBlock, StatePanel } from '../feedback'
import { ConfirmDialog, Dialog } from '../forms'
import { Icon } from '../icons/Icon'
import { SafeImage } from './SafeImage'

function reviewer(review: Review): User | undefined {
  return review.reviewerId && typeof review.reviewerId === 'object' ? review.reviewerId : undefined
}

function reviewerId(review: Review) {
  if (!review.reviewerId) return ''
  return typeof review.reviewerId === 'string' ? review.reviewerId : review.reviewerId._id
}

function reviewerName(review: Review) {
  const user = reviewer(review)
  if (!user) return 'Foose buyer'
  return user.username ? `@${user.username}` : user.name || 'Foose buyer'
}

function reviewerImage(review: Review) {
  return reviewer(review)?.profilePhoto
}

function StarRow({ size = 14, value }: { size?: number; value: number }) {
  const rounded = Math.max(0, Math.min(5, Math.round(Number(value) || 0)))

  return (
    <span aria-label={`${rounded} out of 5 stars`} className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <span className={star <= rounded ? 'inline-flex text-foose-text [&_svg]:fill-current' : 'inline-flex text-foose-border'} key={star}>
          <Icon name="star" size={size} />
        </span>
      ))}
    </span>
  )
}

function loginHref() {
  return withBasePath(`/login?redirect=${encodeURIComponent(getCurrentAppPathname() || '/')}`)
}

function ReviewRowsSkeleton({ count = 3 }: { count?: number }) {
  return (
    <LoadingRegion className="space-y-4" label="Loading shop reviews" layout="compact">
      {Array.from({ length: count }, (_, index) => (
        <div className="grid grid-cols-[auto_1fr] gap-3" key={index}>
          <SkeletonBlock className="size-9 rounded-md" />
          <div className="min-w-0 space-y-2">
            <div className="flex items-center gap-2">
              <SkeletonBlock className="h-3 w-20" />
              <SkeletonBlock className="h-3 w-28" />
            </div>
            <SkeletonBlock className="h-3 w-full max-w-sm" />
          </div>
        </div>
      ))}
    </LoadingRegion>
  )
}

export function ShopReviewPanel({
  allowDelete = true,
  className = '',
  limit = 3,
  showForm = true,
  shopId,
  shopName,
  title = 'Reviews',
}: {
  allowDelete?: boolean
  className?: string
  limit?: number
  showForm?: boolean
  shopId: string
  shopName: string
  title?: string
}) {
  const { user } = useAuth()
  const reviews = useApiResource<PaginatedReviews>(shopId ? `/reviews/shop/${shopId}?page=1&limit=${limit}` : null, Boolean(shopId))
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [editComment, setEditComment] = useState('')
  const [editRating, setEditRating] = useState(5)
  const [submitting, setSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState('')
  const [editingReview, setEditingReview] = useState<Review | null>(null)
  const [pendingDelete, setPendingDelete] = useState<Review | null>(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function submitReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!shopId) return

    setSubmitting(true)
    setMessage('')
    setError('')
    try {
      await apiPost('/reviews', {
        comment: comment.trim() || undefined,
        rating,
        shopId,
      })
      setComment('')
      setRating(5)
      setMessage('Review posted.')
      await reviews.refetch()
    } catch (reviewError) {
      setError(getErrorMessage(reviewError, 'Unable to post review'))
    } finally {
      setSubmitting(false)
    }
  }

  async function deleteReview(reviewId: string) {
    setDeletingId(reviewId)
    setMessage('')
    setError('')
    try {
      await apiDelete(`/reviews/${reviewId}`)
      setMessage('Review deleted. You can post a new one when ready.')
      setPendingDelete(null)
      if (editingReview?._id === reviewId) setEditingReview(null)
      await reviews.refetch()
    } catch (reviewError) {
      setError(getErrorMessage(reviewError, 'Unable to delete review'))
    } finally {
      setDeletingId('')
    }
  }

  function startEdit(review: Review) {
    setEditingReview(review)
    setEditRating(review.rating)
    setEditComment(review.comment || '')
    setMessage('')
    setError('')
  }

  async function submitEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!editingReview) return

    setSubmitting(true)
    setMessage('')
    setError('')
    try {
      await apiPut(`/reviews/${editingReview._id}`, {
        comment: editComment.trim() || undefined,
        rating: editRating,
      })
      setEditingReview(null)
      setMessage('Review updated.')
      await reviews.refetch()
    } catch (reviewError) {
      setError(getErrorMessage(reviewError, 'Unable to update review'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className={`shop-review-panel ${className}`}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-base font-black text-foose-text">{title}</h2>
        <span className="text-xs font-bold text-foose-faint">{reviews.data?.total || 0}</span>
      </div>

      {showForm && (
        <div className="mb-4 rounded-2xl border border-foose-border/80 bg-foose-surface-low p-4 shadow-sm">
        {user ? (
          <form aria-busy={submitting} className="space-y-4" onSubmit={(event) => void submitReview(event)}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-bold text-foose-text" id="shop-review-rating-label">Rate {shopName}</span>
              <span aria-labelledby="shop-review-rating-label" className="flex items-center gap-0.5" role="radiogroup">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    aria-checked={star === rating}
                    aria-label={`${star} star rating`}
                    className={star <= rating ? 'inline-flex size-11 items-center justify-center rounded-full text-accent transition hover:bg-accent-light [&_svg]:fill-current' : 'inline-flex size-11 items-center justify-center rounded-full text-foose-border transition hover:bg-white hover:text-accent'}
                    key={star}
                    onClick={() => setRating(star)}
                    role="radio"
                    type="button"
                  >
                    <Icon name="star" size={18} />
                  </button>
                ))}
              </span>
            </div>
            <label className="grid gap-2 text-sm font-semibold text-foose-text" htmlFor="shop-review-comment">
              Review <span className="sr-only">Optional</span>
            <textarea
              aria-describedby="shop-review-comment-count"
              className="min-h-24 w-full resize-y rounded-xl border border-foose-border bg-white p-3 text-sm text-foose-text outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/15"
              id="shop-review-comment"
              maxLength={500}
              onChange={(event) => setComment(event.target.value)}
              placeholder="Leave a quick review..."
              value={comment}
            />
              <span className="text-right text-xs font-semibold tabular-nums text-foose-faint" id="shop-review-comment-count">{comment.length}/500</span>
            </label>
            {message && <InlineNotice tone="success">{message}</InlineNotice>}
            {error && <InlineNotice tone="error">{error}</InlineNotice>}
            <button
              className="inline-flex min-h-12 w-full items-center justify-center rounded-xl border border-accent bg-accent px-4 text-sm font-black text-white shadow-sm transition hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:pointer-events-none disabled:opacity-50"
              disabled={submitting}
              type="submit"
            >
              {submitting ? 'Posting...' : 'Post review'}
            </button>
          </form>
        ) : (
          <a className="inline-flex min-h-10 w-full items-center justify-center rounded-lg border border-accent bg-accent px-4 text-sm font-black text-white transition hover:bg-accent-hover" href={loginHref()}>
            Log in to review
          </a>
        )}
        </div>
      )}
      {!showForm && (message || error) && (
        <div className="mb-3 space-y-2">
          {message && <InlineNotice tone="success">{message}</InlineNotice>}
          {error && <InlineNotice tone="error">{error}</InlineNotice>}
        </div>
      )}

      {reviews.initialLoading && <ReviewRowsSkeleton count={Math.min(limit, 3)} />}
      {reviews.refreshing && reviews.data && (
        <div aria-live="polite" className="mb-3 h-1 overflow-hidden rounded-full bg-foose-surface-mid" role="status">
          <span className="block h-full w-1/3 animate-pulse rounded-full bg-accent motion-reduce:animate-none" />
          <span className="sr-only">Refreshing reviews</span>
        </div>
      )}
      {reviews.error && !reviews.data && (
        <StatePanel
          action={<button className="button button-secondary" onClick={() => void reviews.refetch()} type="button">Try again</button>}
          body={reviews.error}
          className="[&_h2]:text-base"
          layout="compact"
          title="Reviews could not load"
          tone="error"
        />
      )}
      {reviews.error && reviews.data && (
        <InlineNotice
          action={<button className="text-xs font-black underline" onClick={() => void reviews.refetch()} type="button">Retry</button>}
          className="mb-3"
          tone="error"
        >
          The latest reviews could not be refreshed. Showing the reviews already loaded.
        </InlineNotice>
      )}
      {!reviews.initialLoading && !reviews.error && !reviews.data?.reviews.length && (
        <StatePanel
          body="Be the first buyer to share an experience with this shop."
          className="[&_h2]:text-base"
          layout="compact"
          title="No reviews yet"
          tone="empty"
          visual={null}
        />
      )}
      {!!reviews.data?.reviews.length && (
        <div className="space-y-3">
          {reviews.data.reviews.map((review) => (
            <article className="grid grid-cols-[auto_1fr] gap-3" key={review._id}>
              <SafeImage
                alt=""
                className="size-9 rounded-md object-cover"
                fallback={initials(reviewerName(review))}
                fallbackClassName="text-xs font-black text-foose-muted"
                src={reviewerImage(review)}
              />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <StarRow value={review.rating} />
                  <span className="text-xs text-foose-faint">by {reviewerName(review)}</span>
                  <span className="text-xs text-foose-faint">{formatDate(review.createdAt)}</span>
                  {allowDelete && user?._id === reviewerId(review) && (
                    <span className="ml-auto inline-flex items-center gap-1">
                      <button
                        aria-label="Edit review"
                        className="inline-flex size-11 items-center justify-center rounded-full border border-accent/20 bg-white text-accent transition hover:bg-accent hover:text-white"
                        onClick={() => startEdit(review)}
                        type="button"
                      >
                        <Icon name="pencil" size={14} />
                      </button>
                      <button
                        aria-label="Delete review"
                        className="inline-flex size-11 items-center justify-center rounded-full border border-red-100 bg-red-50 text-foose-danger transition hover:border-foose-danger hover:bg-foose-danger hover:text-white disabled:pointer-events-none disabled:opacity-60"
                        disabled={deletingId === review._id}
                        onClick={() => setPendingDelete(review)}
                        type="button"
                      >
                        <Icon name="trash" size={14} />
                      </button>
                    </span>
                  )}
                </div>
                <p className="mt-1 line-clamp-2 text-sm leading-5 text-foose-muted">{review.comment || 'Rated this seller.'}</p>
              </div>
            </article>
          ))}
        </div>
      )}
      <Dialog
        description={`Update your rating and review text for ${shopName}.`}
        dismissible={!submitting}
        footer={(
          <>
            <button className="inline-flex min-h-11 items-center justify-center rounded-xl border border-foose-border bg-white px-4 text-sm font-bold text-foose-text hover:border-accent hover:text-accent" disabled={submitting} onClick={() => setEditingReview(null)} type="button">
              Cancel
            </button>
            <button className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-accent bg-accent px-4 text-sm font-bold text-white hover:bg-accent-hover disabled:pointer-events-none disabled:opacity-60" disabled={submitting} form="edit-shop-review-form" type="submit">
              <Icon name="pencil" size={15} />
              {submitting ? 'Saving...' : 'Save review'}
            </button>
          </>
        )}
        onClose={() => setEditingReview(null)}
        open={Boolean(editingReview)}
        size="sm"
        title="Edit review"
      >
        {editingReview && (
            <form aria-busy={submitting} className="space-y-4" id="edit-shop-review-form" onSubmit={(event) => void submitEdit(event)}>
              <div>
                <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-foose-faint">Stars</span>
                <span aria-label="Review rating" className="flex items-center gap-0.5" role="radiogroup">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      aria-checked={star === editRating}
                      aria-label={`${star} star rating`}
                      className={star <= editRating ? 'inline-flex size-11 items-center justify-center rounded-full text-accent transition hover:bg-accent-light [&_svg]:fill-current' : 'inline-flex size-11 items-center justify-center rounded-full text-foose-border transition hover:bg-foose-surface-low hover:text-accent'}
                      key={star}
                      onClick={() => setEditRating(star)}
                      role="radio"
                      type="button"
                    >
                      <Icon name="star" size={22} />
                    </button>
                  ))}
                </span>
              </div>
              <textarea
                aria-describedby="edit-shop-review-count"
                aria-label="Review text"
                className="min-h-28 w-full rounded-xl border border-foose-border bg-foose-surface p-3 text-sm text-foose-text outline-none focus:border-accent focus:ring-2 focus:ring-accent/15"
                maxLength={500}
                onChange={(event) => setEditComment(event.target.value)}
                placeholder="Update your review..."
                value={editComment}
              />
              <p className="text-right text-xs font-semibold tabular-nums text-foose-faint" id="edit-shop-review-count">{editComment.length}/500</p>
            </form>
        )}
      </Dialog>
      <ConfirmDialog
        busy={Boolean(pendingDelete && deletingId === pendingDelete._id)}
        confirmLabel="Delete review"
        description={`This removes your review from ${shopName}. You can post a new one later.`}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => { if (pendingDelete) void deleteReview(pendingDelete._id) }}
        open={Boolean(pendingDelete)}
        title="Delete review?"
        tone="destructive"
      />
    </div>
  )
}
