import { useId, useState, type FormEvent, type ReactNode } from 'react'
import { ChoiceCardGroup, type ChoiceCardOption } from '../forms/FormControls'
import { Dialog } from '../forms/Dialog'
import { TextAreaField } from '../forms/FormField'
import { useAuth } from '../../hooks/useAuth'
import { ApiError, apiPost } from '../../lib/api'
import { authHref } from '../../utils/authRedirect'
import { getErrorMessage } from '../../utils/errorMessage'
import { navigateTo } from '../../utils/navigation'
import type { UserReportReason } from '../../types/api'
import { useToast } from '../feedback'
import { Icon } from '../icons/Icon'

const reasons: ChoiceCardOption<UserReportReason>[] = [
  { label: 'Harassment or abusive behavior', value: 'harassment' },
  { label: 'Scam or fraud', value: 'scam_or_fraud' },
  { label: 'Counterfeit or fake listings', value: 'counterfeit_or_fake_listings' },
  { label: 'Inappropriate content', value: 'inappropriate_content' },
  { label: 'Spam', value: 'spam' },
  { label: 'Other', value: 'other' },
]

type ReportUserDialogProps = {
  className?: string
  label?: string
  renderTrigger?: (props: { onClick: () => void }) => ReactNode
  reportedUserId: string
  showText?: boolean
}

export function ReportUserDialog({
  className = 'report-user-button icon-button',
  label = 'Report',
  renderTrigger,
  reportedUserId,
  showText = true,
}: ReportUserDialogProps) {
  const { status, user } = useAuth()
  const { showToast } = useToast()
  const formId = useId()
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState<UserReportReason | ''>('')
  const [details, setDetails] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const isSelf = Boolean(user && reportedUserId === user._id)

  function resetAndClose() {
    setOpen(false)
    setReason('')
    setDetails('')
    setError('')
  }

  function handleTriggerClick() {
    if (!user && status === 'checking') return

    if (!user) {
      navigateTo(authHref('/login'))
      return
    }

    setOpen(true)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!reason) {
      setError('Choose the issue that best matches what happened.')
      return
    }
    if (reason === 'other' && !details.trim()) {
      setError('Describe the issue when choosing "Other".')
      return
    }

    setSubmitting(true)
    setError('')
    try {
      await apiPost('/reports', {
        details: reason === 'other' ? details.trim() : undefined,
        reason,
        reportedUserId,
      })
      showToast({ id: `report:${reportedUserId}`, message: 'Report submitted', tone: 'success' })
      resetAndClose()
    } catch (requestError) {
      const message = requestError instanceof ApiError && requestError.status === 409
        ? 'You already reported this user'
        : getErrorMessage(requestError, 'Could not submit report')
      setError(message)
      showToast({ id: `report:${reportedUserId}`, message, tone: 'error' })
    } finally {
      setSubmitting(false)
    }
  }

  if (isSelf) return null

  return (
    <>
      {renderTrigger ? renderTrigger({ onClick: handleTriggerClick }) : (
        <button className={className} onClick={handleTriggerClick} title={label} type="button">
          <Icon name="alert" />
          {showText && <span>{label}</span>}
        </button>
      )}
      <Dialog
        dismissible={!submitting}
        footer={(
          <>
            <button
              className="rounded-xl border border-foose-border bg-foose-surface px-5 py-2.5 text-sm font-bold text-foose-text transition hover:border-accent hover:text-accent disabled:opacity-50"
              disabled={submitting}
              onClick={resetAndClose}
              type="button"
            >
              Cancel
            </button>
            <button
              aria-busy={submitting || undefined}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-accent bg-accent px-5 py-2.5 text-sm font-black text-white transition hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
              disabled={submitting}
              form={`report-user-form-${formId}`}
              type="submit"
            >
              {submitting ? 'Submitting…' : 'Submit report'}
            </button>
          </>
        )}
        onClose={resetAndClose}
        open={open}
        title="Report this user"
      >
        <form id={`report-user-form-${formId}`} noValidate onSubmit={(event) => void handleSubmit(event)}>
          {error && (
            <p className="mb-3 rounded-xl border border-foose-danger/30 bg-foose-danger-bg/35 p-3 text-sm font-semibold text-foose-danger" role="alert">
              {error}
            </p>
          )}
          <ChoiceCardGroup
            label="What's the issue?"
            name="reportReason"
            onChange={setReason}
            options={reasons}
            required
            value={reason || undefined}
          />
          {reason === 'other' && (
            <TextAreaField
              hint="Do not include passwords, PINs, or card details."
              id="report-user-details"
              label="Describe the issue"
              maxLength={2000}
              onChange={(event) => setDetails(event.target.value)}
              placeholder="Tell us what happened…"
              required
              rows={5}
              value={details}
            />
          )}
        </form>
      </Dialog>
    </>
  )
}
