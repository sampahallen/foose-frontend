import { useState } from 'react'
import { AppShell, ErrorState, LoadingState } from '../components'
import { useAuth } from '../hooks/useAuth'
import { apiDelete, apiPost } from '../lib/api'
import { getErrorMessage } from '../utils/errorMessage'
import { withBasePath } from '../utils/navigation'

type AccountAction = 'deactivate' | 'delete'

function ConfirmModal({
  action,
  busy,
  confirmText,
  onClose,
  onConfirm,
  setConfirmText,
}: {
  action: AccountAction
  busy: boolean
  confirmText: string
  onClose: () => void
  onConfirm: () => void
  setConfirmText: (value: string) => void
}) {
  const isDelete = action === 'delete'
  const canConfirm = !busy && (!isDelete || confirmText === 'DELETE')

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/45 px-4 py-6 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="account-confirm-title">
      <div className="w-full max-w-md rounded-2xl border border-foose-border bg-white p-5 shadow-2xl sm:p-6">
        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-black uppercase tracking-widest ${isDelete ? 'bg-foose-danger-bg text-foose-danger' : 'bg-accent-light text-accent'}`}>
          Are you sure?
        </span>
        <h2 className="mt-4 text-2xl font-black text-foose-text" id="account-confirm-title">
          {isDelete ? 'Delete account?' : 'Deactivate account?'}
        </h2>
        <p className="mt-2 text-sm leading-6 text-foose-muted">
          {isDelete
            ? 'Your account will be removed. Your username and email may be used again. This cannot be undone.'
            : 'Your account will be hidden and you will be signed out. You can come back by logging in and verifying again.'}
        </p>

        {isDelete && (
          <label className="mt-5 flex flex-col gap-2 text-sm font-bold text-foose-text">
            Type DELETE to confirm
            <input
              autoComplete="off"
              className="h-11 rounded-xl border border-foose-border bg-foose-surface-low px-3 text-sm outline-none transition focus:border-foose-danger focus:bg-white focus:ring-2 focus:ring-foose-danger/15"
              onChange={(event) => setConfirmText(event.target.value)}
              value={confirmText}
            />
          </label>
        )}

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-foose-border bg-white px-5 text-sm font-bold text-foose-text transition hover:border-accent hover:text-accent disabled:pointer-events-none disabled:opacity-60"
            disabled={busy}
            onClick={onClose}
            type="button"
          >
            Cancel
          </button>
          <button
            className={`inline-flex min-h-11 items-center justify-center rounded-xl border px-5 text-sm font-bold text-white transition disabled:pointer-events-none disabled:border-foose-border disabled:bg-foose-surface-mid disabled:text-foose-faint ${isDelete ? 'border-foose-danger bg-foose-danger hover:brightness-95' : 'border-accent bg-accent hover:bg-accent-hover'}`}
            disabled={!canConfirm}
            onClick={onConfirm}
            type="button"
          >
            {busy ? 'Working...' : isDelete ? 'Delete account' : 'Deactivate account'}
          </button>
        </div>
      </div>
    </div>
  )
}

export function AccountSettingsPage() {
  const { logout, status, user } = useAuth()
  const [modalAction, setModalAction] = useState<AccountAction | null>(null)
  const [busyAction, setBusyAction] = useState<AccountAction | null>(null)
  const [confirmText, setConfirmText] = useState('')
  const [error, setError] = useState('')

  function closeModal() {
    if (busyAction) return
    setModalAction(null)
    setConfirmText('')
  }

  function openModal(action: AccountAction) {
    setError('')
    setConfirmText('')
    setModalAction(action)
  }

  async function confirmAction() {
    if (!modalAction) return
    setBusyAction(modalAction)
    setError('')

    try {
      if (modalAction === 'deactivate') {
        await apiPost<{ scheduledDeletionAt: string }>('/users/me/deactivate')
      } else {
        await apiDelete('/users/me', { body: { confirmation: 'DELETE' } })
      }
      await logout()
    } catch (err) {
      setError(getErrorMessage(err, modalAction === 'delete' ? 'Could not delete your account' : 'Could not deactivate your account'))
      setBusyAction(null)
      setModalAction(null)
      setConfirmText('')
    }
  }

  if (status === 'checking' || !user) return <LoadingState label="Loading account settings..." />

  return (
    <AppShell active="profile" searchPlaceholder="Search Foose...">
      <section className="mx-auto w-full max-w-3xl">
        <div className="mb-6 flex flex-col gap-2 [&_h1]:font-display [&_h1]:text-3xl [&_h1]:font-bold [&_h1]:text-foose-text md:[&_h1]:text-5xl [&_p]:text-sm [&_p]:leading-6 [&_p]:text-foose-muted">
          <a className="w-fit text-sm font-bold text-accent hover:underline" href={withBasePath('/profile')}>
            Profile
          </a>
          <h1>Account settings</h1>
          <p>Manage access to your Foose account.</p>
        </div>

        {error && <div className="mb-5"><ErrorState message={error} /></div>}

        <section className="rounded-2xl border border-foose-danger/25 bg-white p-4 shadow-sm sm:p-6 md:p-8">
          <div className="flex flex-col gap-2 border-b border-foose-border pb-5">
            <span className="text-xs font-black uppercase tracking-[0.18em] text-foose-danger">Account actions</span>
            <h2 className="font-display text-2xl font-bold text-foose-text">Deactivate or delete account</h2>
            <p className="text-sm leading-6 text-foose-muted">These actions are serious. We will ask you to confirm before continuing.</p>
          </div>

          <div className="grid gap-4 pt-5 md:grid-cols-2">
            <div className="rounded-xl border border-foose-border bg-foose-surface-low p-4">
              <h3 className="text-base font-bold text-foose-text">Deactivate account</h3>
              <p className="mt-2 text-sm leading-6 text-foose-muted">Hide your account for now. You can come back later.</p>
              <button
                className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-foose-border bg-white px-5 text-sm font-bold text-foose-text transition hover:border-foose-danger hover:text-foose-danger disabled:pointer-events-none disabled:bg-foose-surface-mid disabled:text-foose-faint"
                disabled={busyAction !== null}
                onClick={() => openModal('deactivate')}
                type="button"
              >
                Deactivate account
              </button>
            </div>

            <div className="rounded-xl border border-foose-danger/30 bg-foose-danger/5 p-4">
              <h3 className="text-base font-bold text-foose-danger">Delete account</h3>
              <p className="mt-2 text-sm leading-6 text-foose-muted">Remove your account from Foose. This cannot be undone.</p>
              <button
                className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-foose-danger bg-foose-danger px-5 text-sm font-bold text-white transition hover:brightness-95 disabled:pointer-events-none disabled:border-foose-border disabled:bg-foose-surface-mid disabled:text-foose-faint"
                disabled={busyAction !== null}
                onClick={() => openModal('delete')}
                type="button"
              >
                Delete account
              </button>
            </div>
          </div>
        </section>
      </section>

      {modalAction && (
        <ConfirmModal
          action={modalAction}
          busy={busyAction === modalAction}
          confirmText={confirmText}
          onClose={closeModal}
          onConfirm={() => void confirmAction()}
          setConfirmText={setConfirmText}
        />
      )}
    </AppShell>
  )
}
