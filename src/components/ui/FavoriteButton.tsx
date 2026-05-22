import { useEffect, useState, type MouseEvent } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { apiDelete, apiGet, apiPost } from '../../lib/api'
import { authHref } from '../../utils/authRedirect'
import { getErrorMessage } from '../../utils/errorMessage'
import { Icon } from '../icons/Icon'

type FavoriteTarget = 'event' | 'finspo' | 'listing'

type FavoriteButtonProps = {
  activeLabel?: string
  className?: string
  label?: string
  onChange?: (active: boolean) => void
  showText?: boolean
  targetId: string
  targetType: FavoriteTarget
}

function defaultLabel(targetType: FavoriteTarget) {
  if (targetType === 'event') return 'Save event'
  if (targetType === 'finspo') return 'Like'
  return 'Favorite'
}

export function FavoriteButton({
  activeLabel,
  className = 'favorite-button icon-button',
  label,
  onChange,
  showText = false,
  targetId,
  targetType,
}: FavoriteButtonProps) {
  const { status, user } = useAuth()
  const [active, setActive] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const displayLabel = label || defaultLabel(targetType)
  const displayActiveLabel = activeLabel || (targetType === 'finspo' ? 'Liked' : 'Saved')

  useEffect(() => {
    let mounted = true

    if (!user || !targetId) {
      queueMicrotask(() => {
        if (mounted) setActive(false)
      })
      return
    }

    void apiGet<{ active: boolean }>(`/favorites/status?targetType=${targetType}&targetId=${encodeURIComponent(targetId)}`)
      .then((result) => {
        if (mounted) setActive(result.active)
      })
      .catch(() => {
        if (mounted) setActive(false)
      })

    return () => {
      mounted = false
    }
  }, [targetId, targetType, user])

  async function handleClick(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault()
    event.stopPropagation()

    if (!user && status === 'checking') return

    if (!user) {
      window.location.assign(authHref('/register'))
      return
    }

    setBusy(true)
    setError('')

    try {
      if (targetType === 'finspo') {
        const result = await apiPost<{ liked: boolean }>(`/community/gallery/${targetId}/like`)
        setActive(result.liked)
        onChange?.(result.liked)
      } else if (active) {
        const result = await apiDelete<{ active: boolean }>(`/favorites/${targetType}/${targetId}`)
        setActive(result.active)
        onChange?.(result.active)
      } else {
        const result = await apiPost<{ active: boolean }>(`/favorites/${targetType}/${targetId}`)
        setActive(result.active)
        onChange?.(result.active)
      }
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Could not update saved item'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <button
      aria-label={active ? displayActiveLabel : displayLabel}
      aria-pressed={active}
      className={`${className} ${active ? 'is-active' : ''}`}
      disabled={busy || status === 'checking'}
      onClick={(event) => void handleClick(event)}
      title={error || (active ? displayActiveLabel : displayLabel)}
      type="button"
    >
      <Icon name="heart" />
      {showText && <span>{active ? displayActiveLabel : displayLabel}</span>}
    </button>
  )
}
