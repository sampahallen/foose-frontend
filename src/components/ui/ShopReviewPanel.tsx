import { useState, type FormEvent } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { useApiResource } from '../../hooks/useApiResource'
import { apiDelete, apiPost, apiPut } from '../../lib/api'
import type { PaginatedReviews, Review, User } from '../../types/api'
import { getErrorMessage } from '../../utils/errorMessage'
import { formatDate, initials } from '../../utils/format'
import { getCurrentAppPathname, withBasePath } from '../../utils/navigation'
import { Icon } from '../icons/Icon'

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
        <div className="mb-4 rounded-lg border border-foose-border bg-foose-surface-low p-3">
        {user ? (
          <form className="space-y-3" onSubmit={(event) => void submitReview(event)}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-bold text-foose-muted">Rate {shopName}</span>
              <span className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    aria-label={`${star} star rating`}
                    className={star <= rating ? 'inline-flex text-accent [&_svg]:fill-current' : 'inline-flex text-foose-border'}
                    key={star}
                    onClick={() => setRating(star)}
                    type="button"
                  >
                    <Icon name="star" size={18} />
                  </button>
                ))}
              </span>
            </div>
            <textarea
              className="min-h-20 w-full rounded-lg border border-foose-border bg-white p-3 text-sm text-foose-text outline-none focus:border-accent"
              maxLength={500}
              onChange={(event) => setComment(event.target.value)}
              placeholder="Leave a quick review..."
              value={comment}
            />
            {message && <p className="text-xs font-bold text-foose-success">{message}</p>}
            {error && <p className="text-xs font-bold text-foose-danger">{error}</p>}
            <button
              className="inline-flex min-h-10 w-full items-center justify-center rounded-lg border border-accent bg-accent px-4 text-sm font-black text-white transition hover:bg-accent-hover disabled:pointer-events-none disabled:opacity-50"
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
        <div className="mb-3">
          {message && <p className="text-xs font-bold text-foose-success">{message}</p>}
          {error && <p className="text-xs font-bold text-foose-danger">{error}</p>}
        </div>
      )}

      {reviews.loading && <p className="text-sm text-foose-muted">Loading reviews...</p>}
      {reviews.error && <p className="text-sm font-semibold text-foose-danger">{reviews.error}</p>}
      {!reviews.loading && !reviews.error && !reviews.data?.reviews.length && (
        <p className="text-sm leading-6 text-foose-muted">No reviews yet.</p>
      )}
      {!!reviews.data?.reviews.length && (
        <div className="space-y-3">
          {reviews.data.reviews.map((review) => (
            <article className="grid grid-cols-[auto_1fr] gap-3" key={review._id}>
              {reviewerImage(review) ? (
                <img alt="" className="size-9 rounded-md object-cover" src={reviewerImage(review)} />
              ) : (
                <span className="inline-flex size-9 items-center justify-center rounded-md bg-foose-surface-mid text-xs font-black text-foose-muted">{initials(reviewerName(review))}</span>
              )}
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <StarRow value={review.rating} />
                  <span className="text-xs text-foose-faint">by {reviewerName(review)}</span>
                  <span className="text-xs text-foose-faint">{formatDate(review.createdAt)}</span>
                  {allowDelete && user?._id === reviewerId(review) && (
                    <span className="ml-auto inline-flex items-center gap-1">
                      <button
                        aria-label="Edit review"
                        className="inline-flex size-8 items-center justify-center rounded-full border border-accent/20 bg-white text-accent transition hover:bg-accent hover:text-white"
                        onClick={() => startEdit(review)}
                        type="button"
                      >
                        <Icon name="pencil" size={14} />
                      </button>
                      <button
                        aria-label="Delete review"
                        className="inline-flex size-8 items-center justify-center rounded-full border border-red-100 bg-red-50 text-foose-danger transition hover:border-foose-danger hover:bg-foose-danger hover:text-white disabled:pointer-events-none disabled:opacity-60"
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
      {editingReview && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
          <button aria-label="Cancel edit review" className="absolute inset-0 bg-black/45" onClick={() => setEditingReview(null)} type="button" />
          <article className="relative z-10 w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
            <button aria-label="Close edit review" className="absolute right-3 top-3 inline-flex size-9 items-center justify-center rounded-full border border-foose-border bg-foose-surface text-foose-text hover:border-accent hover:text-accent" onClick={() => setEditingReview(null)} type="button">
              <Icon name="close" size={17} />
            </button>
            <h3 className="pr-10 text-lg font-black text-foose-text">Edit review</h3>
            <p className="mt-1 text-sm text-foose-muted">Update your rating and review text for {shopName}.</p>
            <form className="mt-5 space-y-4" onSubmit={(event) => void submitEdit(event)}>
              <div>
                <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-foose-faint">Stars</span>
                <span className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      aria-label={`${star} star rating`}
                      className={star <= editRating ? 'inline-flex text-accent [&_svg]:fill-current' : 'inline-flex text-foose-border'}
                      key={star}
                      onClick={() => setEditRating(star)}
                      type="button"
                    >
                      <Icon name="star" size={22} />
                    </button>
                  ))}
                </span>
              </div>
              <textarea
                className="min-h-28 w-full rounded-xl border border-foose-border bg-foose-surface p-3 text-sm text-foose-text outline-none focus:border-accent focus:ring-2 focus:ring-accent/15"
                maxLength={500}
                onChange={(event) => setEditComment(event.target.value)}
                placeholder="Update your review..."
                value={editComment}
              />
              <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                <button className="inline-flex min-h-10 items-center justify-center rounded-lg border border-foose-border bg-white px-4 text-sm font-bold text-foose-text hover:border-accent hover:text-accent" onClick={() => setEditingReview(null)} type="button">
                  Cancel
                </button>
                <button className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-accent bg-accent px-4 text-sm font-bold text-white hover:bg-accent-hover disabled:pointer-events-none disabled:opacity-60" disabled={submitting} type="submit">
                  <Icon name="pencil" size={15} />
                  {submitting ? 'Saving...' : 'Save review'}
                </button>
              </div>
            </form>
          </article>
        </div>
      )}
      {pendingDelete && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
          <button aria-label="Cancel delete review" className="absolute inset-0 bg-black/45" onClick={() => setPendingDelete(null)} type="button" />
          <article className="relative z-10 w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl">
            <h3 className="text-lg font-black text-foose-text">Delete review?</h3>
            <p className="mt-2 text-sm leading-6 text-foose-muted">This removes your review from {shopName}. You can post a new one later.</p>
            <div className="mt-5 flex justify-end gap-2">
              <button className="inline-flex min-h-10 items-center justify-center rounded-lg border border-foose-border bg-white px-4 text-sm font-bold text-foose-text hover:border-accent hover:text-accent" onClick={() => setPendingDelete(null)} type="button">
                Cancel
              </button>
              <button
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-foose-danger bg-foose-danger px-4 text-sm font-bold text-white hover:bg-red-700 disabled:pointer-events-none disabled:opacity-60"
                disabled={deletingId === pendingDelete._id}
                onClick={() => void deleteReview(pendingDelete._id)}
                type="button"
              >
                <Icon name="trash" size={15} />
                {deletingId === pendingDelete._id ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </article>
        </div>
      )}
    </div>
  )
}
