import { useEffect, useRef, useState, type FormEvent, type MouseEvent as ReactMouseEvent } from 'react'
import blueLogo from '../assets/foose-logo-blue.png'
import { AppShell, Icon } from '../components'
import { FaApple } from 'react-icons/fa'
import { FcGoogle } from 'react-icons/fc'
import { useAuth } from '../hooks/useAuth'
import { apiPost } from '../lib/api'
import { authHref, closeTargetForAuthModal, redirectFromSearch } from '../utils/authRedirect'
import { getErrorMessage } from '../utils/errorMessage'
import { emailLooksValid } from '../utils/formValidation'
import { navigateTo, withBasePath } from '../utils/navigation'
import { startOAuth } from '../utils/oauth'

function loginSearchParams() {
  if (window.location.hash.startsWith('#/')) {
    const queryStart = window.location.hash.indexOf('?')
    return new URLSearchParams(queryStart === -1 ? '' : window.location.hash.slice(queryStart + 1))
  }

  return new URLSearchParams(window.location.search)
}

function ForgotPasswordDialog({
  initialEmail,
  onClose,
}: {
  initialEmail: string
  onClose: () => void
}) {
  const [email, setEmail] = useState(initialEmail)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const canSubmit = emailLooksValid(email)

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [onClose])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canSubmit) {
      setError('Enter the email address on your account.')
      return
    }

    setSubmitting(true)
    setError('')

    try {
      await apiPost('/auth/forgot-password', { email: email.trim() }, { auth: false })
      setSent(true)
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Unable to send password reset email'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div aria-modal="true" className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 p-4" role="dialog">
      <button aria-label="Close forgot password" className="absolute inset-0 cursor-default bg-transparent" onClick={onClose} type="button" />
      <section className="relative z-10 w-full max-w-md rounded-2xl border border-accent/20 bg-white p-5 shadow-2xl shadow-black/20 sm:p-6">
        <button aria-label="Close forgot password" className="absolute right-3 top-3 inline-flex size-9 items-center justify-center rounded-full border border-foose-border bg-white text-sm font-bold text-foose-text transition hover:border-accent hover:text-accent" onClick={onClose} type="button">
          x
        </button>
        <div className="pr-10">
          <h2 className="font-display text-2xl font-bold text-accent">Reset password</h2>
          <p className="mt-1 text-sm leading-6 text-foose-muted">
            Enter your account email and we&apos;ll send a secure reset link if it matches a Foose account.
          </p>
        </div>

        {sent ? (
          <div className="mt-5 grid gap-4">
            <p className="rounded-xl bg-foose-success-bg px-4 py-3 text-sm font-bold text-foose-success">
              If that email is in our records, we sent a password reset link.
            </p>
            <button className="inline-flex min-h-11 items-center justify-center rounded-xl border border-accent bg-accent px-5 text-sm font-bold text-white transition hover:bg-accent-hover" onClick={onClose} type="button">
              Back to login
            </button>
          </div>
        ) : (
          <form className="mt-5 grid gap-4" noValidate onSubmit={(event) => void handleSubmit(event)}>
            <label className="flex flex-col gap-2 text-sm font-semibold text-foose-text">
              Email
              <input
                autoComplete="email"
                autoFocus
                className="w-full rounded-xl border border-accent/25 bg-accent-light/20 px-3 py-3 text-foose-text outline-none transition focus:border-accent focus:bg-white focus:ring-2 focus:ring-accent/15"
                onChange={(event) => {
                  setEmail(event.target.value)
                  setError('')
                }}
                required
                type="email"
                value={email}
              />
            </label>
            {error && (
              <p className="rounded-xl border border-foose-danger/30 bg-foose-danger-bg px-4 py-3 text-sm font-bold text-foose-danger" role="alert">
                {error}
              </p>
            )}
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button className="inline-flex min-h-11 items-center justify-center rounded-xl border border-foose-border bg-white px-5 text-sm font-bold text-foose-text transition hover:border-accent hover:text-accent" onClick={onClose} type="button">
                Cancel
              </button>
              <button className="inline-flex min-h-11 items-center justify-center rounded-xl border border-accent bg-accent px-5 text-sm font-bold text-white transition hover:bg-accent-hover disabled:pointer-events-none disabled:border-foose-border disabled:bg-foose-surface-mid disabled:text-foose-faint" disabled={submitting || !canSubmit} type="submit">
                {submitting ? 'Sending...' : 'Send reset email'}
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  )
}

export function LoginPage() {
  const { login, user } = useAuth()
  const [error, setError] = useState('')
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [touched, setTouched] = useState({ identifier: false, password: false })
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)
  const errorRef = useRef<HTMLParagraphElement>(null)
  const loginParams = loginSearchParams()
  const redirectTarget = redirectFromSearch()
  const closeTarget = closeTargetForAuthModal(redirectTarget)
  const closeHref = withBasePath(closeTarget)
  const closeLabel = closeTarget === '/' ? 'Close login and return to home' : 'Close login'
  const identifierIsEmail = identifier.includes('@')
  const canSubmit = identifier.trim().length > 0 && password.length > 0 && (!identifierIsEmail || emailLooksValid(identifier))
  const identifierInvalid = touched.identifier && (!identifier.trim() || (identifierIsEmail && !emailLooksValid(identifier)))
  const passwordInvalid = touched.password && !password
  const submitHint = !identifier.trim()
    ? ''
    : identifierIsEmail && !emailLooksValid(identifier)
      ? 'Enter a valid email address.'
      : !password
        ? 'Enter your password.'
        : ''
  const verificationNotice = loginParams.get('verified') === '1' ? 'Email verified. Log in to continue.' : ''
  const verificationError = loginParams.get('error') || ''

  useEffect(() => {
    if (forgotPasswordOpen) return undefined

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') navigateTo(closeTarget, { replace: true })
    }

    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [closeTarget, forgotPasswordOpen])

  function requiredBadge(invalid: boolean) {
    return <span className={`ml-auto text-[10px] font-bold ${invalid ? 'text-foose-danger' : 'text-foose-faint'}`}>Required</span>
  }

  function handleClose(event: ReactMouseEvent<HTMLAnchorElement>) {
    event.preventDefault()
    navigateTo(closeTarget, { replace: true })
  }

  function showFormError(message: string) {
    setError(message)
    window.requestAnimationFrame(() => {
      formRef.current?.scrollTo({ behavior: 'smooth', top: 0 })
      errorRef.current?.focus({ preventScroll: true })
    })
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canSubmit) return
    const formData = new FormData(event.currentTarget)
    setSubmitting(true)
    setError('')

    try {
      await login({
        identifier: String(formData.get('identifier') || ''),
        password: String(formData.get('password') || ''),
      })
      navigateTo(redirectTarget, { replace: true })
    } catch (requestError) {
      showFormError(getErrorMessage(requestError, 'Unable to log in'))
    } finally {
      setSubmitting(false)
    }
  }

  const visibleError = error || verificationError

  return (
    <AppShell flush>
      <section className="auth-modal-shell fixed inset-0 z-100 flex items-center justify-center p-3 sm:p-4">
        <a aria-label={closeLabel} className="auth-modal-backdrop absolute inset-0 bg-black/45" href={closeHref} onClick={handleClose} />
        <form className="form-card auth-card auth-modal-card relative z-10 mx-auto flex max-h-[92dvh] w-full max-w-md flex-col gap-4 overflow-y-auto rounded-2xl border border-accent/20 bg-white p-4 shadow-2xl shadow-black/20 sm:p-6 md:max-w-lg md:p-8 [&_h1]:font-display [&_h1]:text-3xl [&_h1]:font-bold [&_h1]:text-accent sm:[&_h1]:text-4xl [&_label]:flex [&_label]:flex-col [&_label]:gap-2 [&_label]:text-sm [&_label]:font-semibold [&_label]:text-foose-text [&_input]:w-full [&_input]:rounded-xl [&_input]:border [&_input]:border-accent/25 [&_input]:bg-accent-light/20 [&_input]:px-3 [&_input]:py-3 [&_input]:text-foose-text [&_input]:outline-none [&_input]:transition [&_input]:focus:border-accent [&_input]:focus:bg-white [&_input]:focus:ring-2 [&_input]:focus:ring-accent/15" noValidate onSubmit={(event) => void handleSubmit(event)} ref={formRef}>
          <a aria-label={closeLabel} className="modal-close-button absolute right-3 top-3 inline-flex size-10 items-center justify-center rounded-full border border-white/30 bg-black/60 text-white transition hover:bg-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black" href={closeHref} onClick={handleClose}>
            <Icon name="close" size={18} />
          </a>
          <header className="flex flex-col gap-3 border-b border-foose-border pb-4 pt-2">
            <img alt="Foose" className="h-auto w-32 sm:w-36" src={blueLogo} />
            <div>
              <h1>Log in</h1>
              <p className="mt-1 text-sm leading-6 text-foose-muted">Thrift smarter. Manage buying, selling, messages, and saved finds in one place.</p>
            </div>
          </header>
          {user && <p className="accent-text font-bold text-accent">You are already logged in.</p>}
          {verificationNotice && <p className="rounded-xl bg-foose-success-bg px-4 py-3 text-sm font-bold text-foose-success">{verificationNotice}</p>}
          <div className="grid gap-3 sm:grid-cols-2">
            <button className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-foose-border bg-white px-4 text-sm font-bold text-foose-text transition hover:border-accent hover:bg-accent-light" onClick={() => startOAuth('google', redirectTarget)} type="button">
              <FcGoogle size={20} /> Sign in with Gmail
            </button>
            <button className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-foose-border bg-white px-4 text-sm font-bold text-foose-text transition hover:border-accent hover:bg-accent-light" onClick={() => startOAuth('apple', redirectTarget)} type="button">
              <FaApple size={20} /> Sign in with iCloud
            </button>
          </div>
          {visibleError && (
            <p
              className="rounded-xl border border-foose-danger/30 bg-foose-danger-bg px-4 py-3 text-sm font-bold text-foose-danger"
              ref={errorRef}
              role="alert"
              tabIndex={-1}
            >
              {visibleError}
            </p>
          )}
          <label>
            <span className="flex items-center gap-2">Email or username {requiredBadge(identifierInvalid)}</span>
            <input autoComplete="username" name="identifier" onBlur={() => setTouched((current) => ({ ...current, identifier: true }))} onChange={(event) => setIdentifier(event.target.value)} required />
            {identifierInvalid && identifierIsEmail && <span className="text-xs font-semibold text-foose-danger">Enter a valid email address.</span>}
          </label>
          <label>
            <span className="flex items-center gap-2">Password {requiredBadge(passwordInvalid)}</span>
            <span className="relative block">
              <input autoComplete="current-password" className="pr-24" name="password" onBlur={() => setTouched((current) => ({ ...current, password: true }))} onChange={(event) => setPassword(event.target.value)} required type={showPassword ? 'text' : 'password'} />
              <button className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md px-3 py-1 text-xs font-bold text-accent hover:bg-accent-light" onClick={() => setShowPassword((value) => !value)} type="button">
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </span>
          </label>
          <button className="button inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-accent bg-accent px-5 py-2.5 text-center text-sm font-bold text-white shadow-md shadow-accent/15 transition hover:bg-accent-hover disabled:pointer-events-none disabled:border-foose-border disabled:bg-foose-surface-mid disabled:text-foose-faint disabled:shadow-none [&.full]:w-full full" disabled={submitting || !canSubmit} type="submit">
            {submitting ? 'Logging in...' : 'Log in'}
          </button>
          {!canSubmit && submitHint && <p className="text-center text-xs font-bold text-foose-muted">{submitHint}</p>}
          <button
            className="mx-auto inline-flex w-fit items-center justify-center rounded-lg px-3 py-1 text-sm font-bold text-accent transition hover:bg-accent-light"
            onClick={() => setForgotPasswordOpen(true)}
            type="button"
          >
            Forgot password?
          </button>
          <p className="text-center text-sm text-foose-muted">
            New here?{' '}
            <a className="font-display font-bold text-accent hover:underline" href={authHref('/register', redirectTarget)}>
              Create an account
            </a>
          </p>
        </form>
        {forgotPasswordOpen && (
          <ForgotPasswordDialog
            initialEmail={identifierIsEmail && emailLooksValid(identifier) ? identifier.trim() : ''}
            onClose={() => setForgotPasswordOpen(false)}
          />
        )}
      </section>
    </AppShell>
  )
}
