import { useCallback, useEffect, useRef, useState } from 'react'
import { registerNavigationBlocker } from '../../utils/navigation'

export function useUnsavedChanges({
  dirty,
  enabled = true,
  message = 'Your changes have not been saved. If you leave now, they will be lost.',
}: {
  dirty: boolean
  enabled?: boolean
  message?: string
}) {
  const active = enabled && dirty
  const [open, setOpen] = useState(false)
  const pendingActionRef = useRef<(() => void) | null>(null)

  const requestNavigation = useCallback((action: () => void) => {
    if (!active) {
      action()
      return true
    }
    pendingActionRef.current = action
    setOpen(true)
    return false
  }, [active])

  const cancelLeave = useCallback(() => {
    pendingActionRef.current = null
    setOpen(false)
  }, [])

  const confirmLeave = useCallback(() => {
    const action = pendingActionRef.current
    pendingActionRef.current = null
    setOpen(false)
    action?.()
  }, [])

  useEffect(() => {
    if (!active) return undefined

    function handleBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault()
      event.returnValue = ''
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    const unregisterBlocker = registerNavigationBlocker((transition) => (
      requestNavigation(transition.retry)
    ))
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      unregisterBlocker()
    }
  }, [active, requestNavigation])

  return {
    cancelLeave,
    confirmLeave,
    dialogProps: {
      description: message,
      onCancel: cancelLeave,
      onConfirm: confirmLeave,
      open,
      title: 'Discard your changes?',
      tone: 'destructive' as const,
      cancelLabel: 'Keep editing',
      confirmLabel: 'Discard and leave',
    },
    open,
    requestNavigation,
  }
}
