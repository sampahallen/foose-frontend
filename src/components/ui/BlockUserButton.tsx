import { useEffect, useState, type MouseEvent, type ReactNode } from 'react'
import { ConfirmDialog } from '../forms/Dialog'
import { useAuth } from '../../hooks/useAuth'
import { apiDelete, apiGet, apiPost } from '../../lib/api'
import { authHref } from '../../utils/authRedirect'
import { getErrorMessage } from '../../utils/errorMessage'
import { navigateTo } from '../../utils/navigation'
import { useToast } from '../feedback'
import { Icon } from '../icons/Icon'

type BlockUserButtonProps = {
  blockedUserId: string
  className?: string
  label?: string
  onChange?: (active: boolean) => void
  renderTrigger?: (props: { active: boolean; busy: boolean; onClick: (event: MouseEvent<HTMLButtonElement>) => void }) => ReactNode
  showText?: boolean
}

export function BlockUserButton({
  blockedUserId,
  className = 'block-user-button icon-button',
  label = 'Block',
  onChange,
  renderTrigger,
  showText = false,
}: BlockUserButtonProps) {
  const { status, user } = useAuth()
  const { showToast } = useToast()
  const [active, setActive] = useState(false)
  const [busy, setBusy] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const activeLabel = 'Unblock'
  const isSelf = Boolean(user && blockedUserId === user._id)

  useEffect(() => {
    let mounted = true

    if (!user || !blockedUserId || isSelf) {
      queueMicrotask(() => {
        if (mounted) setActive(false)
      })
      return
    }

    void apiGet<{ active: boolean }>(`/blocks/status/${encodeURIComponent(blockedUserId)}`)
      .then((result) => {
        if (mounted) setActive(result.active)
      })
      .catch(() => {
        if (mounted) setActive(false)
      })

    return () => {
      mounted = false
    }
  }, [blockedUserId, isSelf, user])

  async function performUnblock() {
    setBusy(true)
    try {
      const result = await apiDelete<{ active: boolean }>(`/blocks/${encodeURIComponent(blockedUserId)}`)
      setActive(result.active)
      onChange?.(result.active)
      showToast({ id: `block:${blockedUserId}`, message: 'User unblocked', tone: 'success' })
    } catch (requestError) {
      const message = getErrorMessage(requestError, 'Could not unblock user')
      showToast({ id: `block:${blockedUserId}`, message, tone: 'error' })
    } finally {
      setBusy(false)
    }
  }

  async function performBlock() {
    setBusy(true)
    try {
      const result = await apiPost<{ active: boolean }>(`/blocks/${encodeURIComponent(blockedUserId)}`)
      setActive(result.active)
      onChange?.(result.active)
      showToast({ id: `block:${blockedUserId}`, message: 'User blocked', tone: 'success' })
    } catch (requestError) {
      const message = getErrorMessage(requestError, 'Could not block user')
      showToast({ id: `block:${blockedUserId}`, message, tone: 'error' })
    } finally {
      setBusy(false)
      setConfirmOpen(false)
    }
  }

  function handleClick(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault()
    event.stopPropagation()

    if (!user && status === 'checking') return

    if (!user) {
      navigateTo(authHref('/login'))
      return
    }

    if (active) {
      void performUnblock()
      return
    }

    setConfirmOpen(true)
  }

  if (isSelf) return null

  return (
    <>
      {renderTrigger ? renderTrigger({ active, busy: busy || status === 'checking', onClick: handleClick }) : (
        <button
          aria-label={active ? activeLabel : label}
          aria-pressed={active}
          className={` ${className} ${active ? 'is-active' : ''} `}
          disabled={busy || status === 'checking'}
          onClick={handleClick}
          title={active ? activeLabel : label}
          type="button"
        >
          <Icon name="shield" />
          {showText && <span>{active ? activeLabel : label}</span>}
        </button>
      )}
      <ConfirmDialog
        busy={busy}
        confirmLabel="Block user"
        description="They will be added to your blocked accounts list. You can unblock them at any time."
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => void performBlock()}
        open={confirmOpen}
        title="Block this user?"
        tone="destructive"
      />
    </>
  )
}
