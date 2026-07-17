import { useEffect, useState, type MouseEvent } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { apiGet, apiPost } from '../../lib/api'
import { authHref } from '../../utils/authRedirect'
import { getErrorMessage } from '../../utils/errorMessage'
import { navigateTo } from '../../utils/navigation'
import { useToast } from '../feedback'
import { Icon } from '../icons/Icon'
import { FaHeart } from 'react-icons/fa'

type FinspoLikeButtonProps = {
  className?: string
  initialCount?: number
  initialLiked?: boolean
  onChange?: (liked: boolean, likeCount: number) => void
  showCount?: boolean
  solidIcon?: boolean
  showText?: boolean
  targetId: string
}

type LikeState = {
  liked: boolean
  likeCount: number
}

export function FinspoLikeButton({
  className = 'favorite-button icon-button',
  initialCount = 0,
  initialLiked,
  onChange,
  showCount = false,
  showText = false,
  solidIcon = false,
  targetId,
}: FinspoLikeButtonProps) {
  return (
    <FinspoLikeButtonState
      className={className}
      initialCount={initialCount}
      initialLiked={initialLiked}
      key={`${targetId}:${initialLiked === undefined ? 'unknown' : initialLiked ? 'liked' : 'unliked'}`}
      onChange={onChange}
      showCount={showCount}
      solidIcon={solidIcon}
      showText={showText}
      targetId={targetId}
    />
  )
}

function FinspoLikeButtonState({
  className = 'favorite-button icon-button',
  initialCount = 0,
  initialLiked,
  onChange,
  showCount = false,
  showText = false,
  solidIcon = false,
  targetId,
}: FinspoLikeButtonProps) {
  const { status, user } = useAuth()
  const { showToast } = useToast()
  const [state, setState] = useState<LikeState>({ liked: initialLiked ?? false, likeCount: initialCount })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [announcement, setAnnouncement] = useState('')

  useEffect(() => {
    let mounted = true

    if (!user || !targetId || initialLiked !== undefined) return () => {
      mounted = false
    }

    void apiGet<LikeState>(`/community/gallery/${targetId}/like`)
      .then((result) => {
        if (mounted) setState(result)
      })
      .catch(() => {
        if (mounted) setState((current) => ({ ...current, liked: false }))
      })

    return () => {
      mounted = false
    }
  }, [initialCount, initialLiked, targetId, user])

  async function handleClick(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault()
    event.stopPropagation()

    if (!user && status === 'checking') return
    if (!user) {
      navigateTo(authHref('/login'))
      return
    }

    setBusy(true)
    setError('')
    setAnnouncement('')

    try {
      const result = await apiPost<LikeState>(`/community/gallery/${targetId}/like`)
      setState(result)
      onChange?.(result.liked, result.likeCount)
      setAnnouncement(result.liked ? 'Finspo liked.' : 'Finspo like removed.')
    } catch (requestError) {
      const message = getErrorMessage(requestError, 'Could not update this like')
      setError(message)
      showToast({ id: `finspo-like:${targetId}`, message, tone: 'error' })
    } finally {
      setBusy(false)
    }
  }

  const label = state.liked ? 'Unlike Finspo' : 'Like Finspo'

  return (
    <>
      <button
        aria-label={label}
        aria-pressed={state.liked}
        className={`${className} ${state.liked ? 'is-active' : ''}`}
        disabled={busy || status === 'checking'}
        onClick={(event) => void handleClick(event)}
        title={error || label}
        type="button"
      >
        {solidIcon ? <FaHeart aria-hidden /> : <Icon name="heart" />}
        {showText && <span>{state.liked ? 'Liked' : 'Like'}</span>}
        {showCount && <span aria-label={`${state.likeCount} likes`}>{state.likeCount}</span>}
      </button>
      {announcement && <span className="sr-only" role="status">{announcement}</span>}
      {error && <span className="sr-only" role="alert">{error}</span>}
    </>
  )
}
