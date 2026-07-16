import { useEffect, useState, type MouseEvent } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { apiGet, apiPost } from '../../lib/api'
import { authHref } from '../../utils/authRedirect'
import { getErrorMessage } from '../../utils/errorMessage'
import { navigateTo } from '../../utils/navigation'
import { Icon } from '../icons/Icon'

type FinspoLikeButtonProps = {
  className?: string
  initialCount?: number
  onChange?: (liked: boolean, likeCount: number) => void
  showCount?: boolean
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
  onChange,
  showCount = false,
  showText = false,
  targetId,
}: FinspoLikeButtonProps) {
  return (
    <FinspoLikeButtonState
      className={className}
      initialCount={initialCount}
      key={targetId}
      onChange={onChange}
      showCount={showCount}
      showText={showText}
      targetId={targetId}
    />
  )
}

function FinspoLikeButtonState({
  className = 'favorite-button icon-button',
  initialCount = 0,
  onChange,
  showCount = false,
  showText = false,
  targetId,
}: FinspoLikeButtonProps) {
  const { status, user } = useAuth()
  const [state, setState] = useState<LikeState>({ liked: false, likeCount: initialCount })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let mounted = true

    if (!user || !targetId) return () => {
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
  }, [initialCount, targetId, user])

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

    try {
      const result = await apiPost<LikeState>(`/community/gallery/${targetId}/like`)
      setState(result)
      onChange?.(result.liked, result.likeCount)
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Could not update this like'))
    } finally {
      setBusy(false)
    }
  }

  const label = state.liked ? 'Unlike Finspo' : 'Like Finspo'

  return (
    <button
      aria-label={label}
      aria-pressed={state.liked}
      className={`${className} ${state.liked ? 'is-active' : ''}`}
      disabled={busy || status === 'checking'}
      onClick={(event) => void handleClick(event)}
      title={error || label}
      type="button"
    >
      <Icon name="heart" />
      {showText && <span>{state.liked ? 'Liked' : 'Like'}</span>}
      {showCount && <span aria-label={`${state.likeCount} likes`}>{state.likeCount}</span>}
    </button>
  )
}
