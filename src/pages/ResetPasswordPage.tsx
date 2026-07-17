import { useMemo, useState, type FormEvent } from 'react'
import { FaCheckCircle, FaExclamationCircle } from 'react-icons/fa'
import blueLogo from '../assets/foose-logo-blue.png'
import {
  AppShell,
  Dialog,
  ErrorSummary,
  InlineNotice,
  PasswordField,
  SubmitButton,
  SuccessState,
} from '../components'
import { apiPost } from '../lib/api'
import { authHref, closeTargetForAuthModal } from '../utils/authRedirect'
import { getErrorMessage } from '../utils/errorMessage'
import { passwordMeetsRequirements, passwordRules } from '../utils/formValidation'
import { getCurrentAppPathname, navigateTo } from '../utils/navigation'

function currentResetToken() {
  const match = getCurrentAppPathname().match(/^\/reset-password\/(.+)/)
  return match ? decodeURIComponent(match[1]).trim() : ''
}

export function ResetPasswordPage() {
  const token = currentResetToken()
  const closeTarget = closeTargetForAuthModal('/')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [password, setPassword] = useState('')
  const [submittedInvalid, setSubmittedInvalid] = useState(false)
  const [touched, setTouched] = useState({ confirm: false, password: false })
  const [success, setSuccess] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const passwordIsStrong = passwordMeetsRequirements(password)
  const passwordsMatch = password.length > 0 && password === confirmPassword
  const errors = useMemo(() => ({
    'reset-confirm-password': passwordsMatch ? '' : 'Enter the same password again.',
    'reset-password': passwordIsStrong ? '' : 'Complete all password requirements.',
  }), [passwordIsStrong, passwordsMatch])
  const validationErrors = Object.entries(errors).flatMap(([fieldId, message]) => message ? [{ fieldId, message }] : [])
  const canSubmit = Boolean(token) && validationErrors.length === 0

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canSubmit) {
      setSubmittedInvalid(true)
      setTouched({ confirm: true, password: true })
      return
    }

    setSubmitting(true)
    setError('')
    try {
      await apiPost(`/auth/reset-password/${encodeURIComponent(token)}`, { password }, { auth: false })
      setSuccess(true)
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Unable to reset password'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AppShell flush>
      <Dialog
        closeLabel="Close reset password"
        description="Choose a strong new password for your Foose account."
        onClose={() => navigateTo(closeTarget, { replace: true })}
        open
        size="sm"
        title="Reset password"
      >
        <div className="grid gap-5">
          <img alt="Foose" className="h-auto w-32" src={blueLogo} />
          {success ? (
            <SuccessState
              action={<a className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-accent px-5 text-sm font-black text-white transition hover:bg-accent-hover" href={authHref('/login', '/')}>Back to login</a>}
              layout="compact"
              message="Your password has been reset. Log in with your new password."
              title="Password reset"
            />
          ) : (
            <form aria-busy={submitting} className="grid gap-5" noValidate onSubmit={(event) => void handleSubmit(event)}>
              {!token && <InlineNotice title="Invalid reset link" tone="error">This password reset link is missing its secure token. Request a new link from the login screen.</InlineNotice>}
              {error && <InlineNotice title="Could not reset your password" tone="error">{error}</InlineNotice>}
              <ErrorSummary errors={validationErrors} focus={submittedInvalid && validationErrors.length > 0} />

              <PasswordField
                autoComplete="new-password"
                error={(touched.password || submittedInvalid) ? errors['reset-password'] : ''}
                id="reset-password"
                label="New password"
                onBlur={() => setTouched((current) => ({ ...current, password: true }))}
                onChange={(event) => { setPassword(event.target.value); setError('') }}
                required
                value={password}
              />
              <ul aria-label="Password requirements" className="grid gap-2 rounded-xl bg-foose-surface-low p-4 text-sm font-semibold">
                {passwordRules.map((rule) => {
                  const met = rule.test(password)
                  return (
                    <li className={`flex items-center gap-2 ${met ? 'text-foose-success' : 'text-foose-muted'}`} key={rule.id}>
                      {met ? <FaCheckCircle aria-hidden /> : <FaExclamationCircle aria-hidden className="text-foose-faint" />} {rule.label}
                    </li>
                  )
                })}
              </ul>
              <PasswordField
                autoComplete="new-password"
                error={(touched.confirm || submittedInvalid) ? errors['reset-confirm-password'] : ''}
                id="reset-confirm-password"
                label="Confirm password"
                onBlur={() => setTouched((current) => ({ ...current, confirm: true }))}
                onChange={(event) => { setConfirmPassword(event.target.value); setError('') }}
                required
                value={confirmPassword}
              />
              <SubmitButton className="w-full" disabled={!token} loading={submitting} loadingLabel="Resetting password…">Reset password</SubmitButton>
            </form>
          )}
        </div>
      </Dialog>
    </AppShell>
  )
}
