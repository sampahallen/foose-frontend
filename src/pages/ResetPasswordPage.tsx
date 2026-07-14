import { useState, type FormEvent } from 'react'
import { FaCheckCircle, FaExclamationCircle } from 'react-icons/fa'
import blueLogo from '../assets/foose-logo-blue.png'
import { AppShell } from '../components'
import { apiPost } from '../lib/api'
import { authHref, closeTargetForAuthModal } from '../utils/authRedirect'
import { getErrorMessage } from '../utils/errorMessage'
import { passwordMeetsRequirements, passwordRules } from '../utils/formValidation'
import { getCurrentAppPathname } from '../utils/navigation'

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
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [success, setSuccess] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const passwordIsStrong = passwordMeetsRequirements(password)
  const passwordsMatch = password.length > 0 && password === confirmPassword
  const canSubmit = Boolean(token) && passwordIsStrong && passwordsMatch

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canSubmit) return

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
      <section className="auth-modal-shell fixed inset-0 z-100 flex items-center justify-center p-3 sm:p-4">
        <a aria-label="Close reset password" className="auth-modal-backdrop absolute inset-0 bg-black/45" href={closeTarget} />
        <form className="form-card auth-card auth-modal-card relative z-10 mx-auto flex max-h-[92dvh] w-full max-w-md flex-col gap-4 overflow-y-auto rounded-2xl border border-accent/20 bg-white p-4 shadow-2xl shadow-black/20 sm:p-6 md:max-w-lg md:p-8 [&_h1]:font-display [&_h1]:text-3xl [&_h1]:font-bold [&_h1]:text-accent sm:[&_h1]:text-4xl [&_label]:flex [&_label]:flex-col [&_label]:gap-2 [&_label]:text-sm [&_label]:font-semibold [&_label]:text-foose-text [&_input]:w-full [&_input]:rounded-xl [&_input]:border [&_input]:border-accent/25 [&_input]:bg-accent-light/20 [&_input]:px-3 [&_input]:py-3 [&_input]:text-foose-text [&_input]:outline-none [&_input]:transition [&_input]:focus:border-accent [&_input]:focus:bg-white [&_input]:focus:ring-2 [&_input]:focus:ring-accent/15" noValidate onSubmit={(event) => void handleSubmit(event)}>
          <a aria-label="Close reset password" className="modal-close-button absolute right-2 top-2 inline-flex size-9 items-center justify-center rounded-full border border-white/30 bg-black/60 text-white hover:bg-black" href={closeTarget}>
            x
          </a>
          <header className="flex flex-col gap-3 border-b border-foose-border pb-4 pt-2">
            <img alt="Foose" className="h-auto w-32 sm:w-36" src={blueLogo} />
            <div>
              <h1>Reset password</h1>
              <p className="mt-1 text-sm leading-6 text-foose-muted">Choose a new password for your Foose account.</p>
            </div>
          </header>

          {success ? (
            <div className="grid gap-4">
              <p className="rounded-xl bg-foose-success-bg px-4 py-3 text-sm font-bold text-foose-success">
                Your password has been reset. Log in with your new password.
              </p>
              <a className="button inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-accent bg-accent px-5 py-2.5 text-center text-sm font-bold text-white shadow-md shadow-accent/15 transition hover:bg-accent-hover" href={authHref('/login', '/')}>
                Back to login
              </a>
            </div>
          ) : (
            <>
              {!token && (
                <p className="rounded-xl border border-foose-danger/30 bg-foose-danger-bg px-4 py-3 text-sm font-bold text-foose-danger" role="alert">
                  This password reset link is missing a token.
                </p>
              )}

              {error && (
                <p className="rounded-xl border border-foose-danger/30 bg-foose-danger-bg px-4 py-3 text-sm font-bold text-foose-danger" role="alert">
                  {error}
                </p>
              )}

              <label>
                New password
                <span className="relative block">
                  <input
                    autoComplete="new-password"
                    className="pr-24"
                    onChange={(event) => setPassword(event.target.value)}
                    required
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                  />
                  <button className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md px-3 py-1 text-xs font-bold text-accent hover:bg-accent-light" onClick={() => setShowPassword((value) => !value)} type="button">
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </span>
                {!passwordIsStrong && password.length > 0 && (
                  <ul className="grid gap-1 text-xs font-semibold">
                    {passwordRules.map((rule) => {
                      const met = rule.test(password)
                      return (
                        <li className={`flex items-center gap-2 ${met ? 'text-foose-success' : 'text-foose-danger'}`} key={rule.id}>
                          {met ? <FaCheckCircle aria-hidden /> : <FaExclamationCircle aria-hidden />} {rule.label}
                        </li>
                      )
                    })}
                  </ul>
                )}
              </label>

              <label>
                Confirm password
                <span className="relative block">
                  <input
                    autoComplete="new-password"
                    className="pr-24"
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    required
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                  />
                  <button className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md px-3 py-1 text-xs font-bold text-accent hover:bg-accent-light" onClick={() => setShowConfirmPassword((value) => !value)} type="button">
                    {showConfirmPassword ? 'Hide' : 'Show'}
                  </button>
                </span>
                {confirmPassword.length > 0 && !passwordsMatch && (
                  <span className="text-xs font-semibold text-foose-danger">Passwords must match.</span>
                )}
              </label>

              <button className="button inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-accent bg-accent px-5 py-2.5 text-center text-sm font-bold text-white shadow-md shadow-accent/15 transition hover:bg-accent-hover disabled:pointer-events-none disabled:border-foose-border disabled:bg-foose-surface-mid disabled:text-foose-faint disabled:shadow-none [&.full]:w-full full" disabled={submitting || !canSubmit} type="submit">
                {submitting ? 'Resetting...' : 'Reset password'}
              </button>
            </>
          )}
        </form>
      </section>
    </AppShell>
  )
}
