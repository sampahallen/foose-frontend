import { useCallback, useEffect, useMemo, useRef, useState, type FocusEvent, type ReactNode } from 'react'
import { consumeNavigationFlash } from '../../utils/navigationFlash'
import { subscribeToNavigation } from '../../utils/navigation'
import { Icon } from '../icons/Icon'
import { ToastContext, type ToastInput, type ToastRecord, type ToastTone } from './toastContext'

const DEFAULT_DURATION: Record<ToastTone, number> = {
  error: 6000,
  info: 5000,
  success: 4000,
  warning: 6000,
}

const toneClasses: Record<ToastTone, string> = {
  error: 'border-foose-danger/25 bg-foose-danger-bg text-foose-danger',
  info: 'border-accent/20 bg-white text-accent',
  success: 'border-foose-success/25 bg-foose-success-bg text-foose-success',
  warning: 'border-foose-warning/25 bg-foose-warning-bg text-foose-warning',
}

function toastKey(input: ToastInput) {
  return input.id || `${input.tone}:${input.title || ''}:${input.message}`
}

function ToastCard({ onDismiss, toast }: { onDismiss: (id: string) => void; toast: ToastRecord }) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const remainingRef = useRef(toast.duration)
  const startedAtRef = useRef(0)

  const clearTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = null
  }, [])

  const startTimer = useCallback(() => {
    clearTimer()
    startedAtRef.current = Date.now()
    timerRef.current = setTimeout(() => onDismiss(toast.id), remainingRef.current)
  }, [clearTimer, onDismiss, toast.id])

  const pauseTimer = useCallback(() => {
    if (!timerRef.current) return
    remainingRef.current = Math.max(0, remainingRef.current - (Date.now() - startedAtRef.current))
    clearTimer()
  }, [clearTimer])

  const resumeTimer = useCallback(() => {
    if (remainingRef.current <= 0) {
      onDismiss(toast.id)
      return
    }
    startTimer()
  }, [onDismiss, startTimer, toast.id])

  useEffect(() => {
    remainingRef.current = toast.duration
    startTimer()
    return clearTimer
  }, [clearTimer, startTimer, toast.duration, toast.revision])

  function handleBlur(event: FocusEvent<HTMLElement>) {
    if (event.currentTarget.contains(event.relatedTarget)) return
    resumeTimer()
  }

  return (
    <article
      className={`pointer-events-auto flex w-full items-start gap-3 rounded-2xl border px-4 py-3 text-sm shadow-xl shadow-black/10 ${toneClasses[toast.tone]}`}
      onBlur={handleBlur}
      onFocus={pauseTimer}
      onMouseEnter={pauseTimer}
      onMouseLeave={resumeTimer}
      role={toast.tone === 'error' ? 'alert' : 'status'}
    >
      <span aria-hidden="true" className="mt-0.5 shrink-0">
        <Icon name={toast.tone === 'success' ? 'check' : toast.tone === 'info' ? 'info' : 'alert'} size={19} />
      </span>
      <div className="min-w-0 flex-1 text-foose-text">
        {toast.title && <p className="font-bold">{toast.title}</p>}
        <p className={toast.title ? 'mt-0.5 text-foose-muted' : ''}>{toast.message}</p>
      </div>
      <button
        aria-label="Dismiss notification"
        className="-mr-1 grid size-9 shrink-0 place-items-center rounded-full text-foose-muted transition hover:bg-black/5 hover:text-foose-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        onClick={() => onDismiss(toast.id)}
        type="button"
      >
        <Icon name="close" size={17} />
      </button>
    </article>
  )
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastRecord[]>([])
  const revisionRef = useRef(0)

  const dismissToast = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const clearToasts = useCallback(() => setToasts([]), [])

  const showToast = useCallback((input: ToastInput) => {
    const id = toastKey(input)
    revisionRef.current += 1
    const toast: ToastRecord = {
      duration: input.duration ?? DEFAULT_DURATION[input.tone],
      id,
      message: input.message,
      revision: revisionRef.current,
      title: input.title,
      tone: input.tone,
    }
    setToasts((current) => [...current.filter((item) => item.id !== id), toast].slice(-3))
    return id
  }, [])

  useEffect(() => {
    function showNavigationFlash() {
      const flash = consumeNavigationFlash()
      if (flash) showToast(flash)
    }

    showNavigationFlash()
    return subscribeToNavigation(showNavigationFlash)
  }, [showToast])

  const value = useMemo(() => ({ clearToasts, dismissToast, showToast, toasts }), [clearToasts, dismissToast, showToast, toasts])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-label="Notifications"
        className="pointer-events-none fixed inset-x-3 top-20 z-[120] mx-auto flex max-w-sm flex-col gap-2 md:inset-x-auto md:right-5 md:top-24 md:mx-0 md:w-[min(24rem,calc(100vw-2.5rem))]"
      >
        {toasts.map((toast) => <ToastCard key={toast.id} onDismiss={dismissToast} toast={toast} />)}
      </div>
    </ToastContext.Provider>
  )
}
