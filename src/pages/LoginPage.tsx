import { useRef, useState, type FormEvent } from 'react'
import blueLogo from '../assets/foose-logo-blue.png'
import { AppShell, Dialog, InlineNotice, PasswordField, SubmitButton, SuccessState, TextField } from '../components'
import { FaApple } from 'react-icons/fa'
import { FcGoogle } from 'react-icons/fc'
import { useAuth } from '../hooks/useAuth'
import { apiPost } from '../lib/api'
import { authHref, closeTargetForAuthModal, redirectFromSearch } from '../utils/authRedirect'
import { getErrorMessage } from '../utils/errorMessage'
import { emailLooksValid } from '../utils/formValidation'
import { navigateTo } from '../utils/navigation'
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
    <Dialog description="Enter your account email. We’ll confirm it belongs to a Foose account before sending a secure reset link." onClose={onClose} open size="sm" title="Reset password">
        {sent ? (
          <div className="grid gap-4">
            <SuccessState
              action={<button className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-accent bg-accent px-5 text-sm font-bold text-white transition hover:bg-accent-hover" onClick={onClose} type="button">Back to login</button>}
              layout="compact"
              message={`We sent a password reset link to ${email.trim()}.`}
              title="Check your email"
            />
          </div>
        ) : (
          <form aria-busy={submitting} className="grid gap-4" noValidate onSubmit={(event) => void handleSubmit(event)}>
            <TextField autoComplete="email" autoFocus error={error && !canSubmit ? error : ''} label="Email" onChange={(event) => { setEmail(event.target.value); setError('') }} required type="email" value={email} />
            {error && <InlineNotice tone="error">{error}</InlineNotice>}
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button className="inline-flex min-h-11 items-center justify-center rounded-xl border border-foose-border bg-white px-5 text-sm font-bold text-foose-text transition hover:border-accent hover:text-accent" onClick={onClose} type="button">
                Cancel
              </button>
              <SubmitButton loading={submitting} loadingLabel="Sending…">Send reset email</SubmitButton>
            </div>
          </form>
        )}
    </Dialog>
  )
}

export function LoginPage() {
  const { login, user } = useAuth()
  const [error, setError] = useState('')
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [touched, setTouched] = useState({ identifier: false, password: false })
  const [submitting, setSubmitting] = useState(false)
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)
  const errorRef = useRef<HTMLDivElement>(null)
  const loginParams = loginSearchParams()
  const redirectTarget = redirectFromSearch()
  const closeTarget = closeTargetForAuthModal(redirectTarget)
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

  function showFormError(message: string) {
    setError(message)
    window.requestAnimationFrame(() => {
      formRef.current?.scrollTo({ behavior: 'smooth', top: 0 })
      errorRef.current?.focus({ preventScroll: true })
    })
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canSubmit) {
      setTouched({ identifier: true, password: true })
      const message = submitHint || 'Enter your email or username and password.'
      showFormError(message)
      window.requestAnimationFrame(() => document.getElementById(!identifier.trim() ? 'login-identifier' : 'login-password')?.focus())
      return
    }
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
      <Dialog closeLabel={closeLabel} description="Thrift smarter. Manage buying, selling, messages, and saved finds in one place." onClose={() => navigateTo(closeTarget, { replace: true })} open={!forgotPasswordOpen} title="Log in">
        <form aria-busy={submitting} className="grid gap-4" noValidate onSubmit={(event) => void handleSubmit(event)} ref={formRef}>
          <img alt="Foose" className="h-auto w-32" src={blueLogo} />
          {user && <p className="accent-text font-bold text-accent">You are already logged in.</p>}
          {verificationNotice && <InlineNotice tone="success">{verificationNotice}</InlineNotice>}
          <div className="grid gap-3 sm:grid-cols-2">
            <button className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-foose-border bg-white px-4 text-sm font-bold text-foose-text transition hover:border-accent hover:bg-accent-light" onClick={() => startOAuth('google', redirectTarget)} type="button">
              <FcGoogle size={20} /> Sign in with Gmail
            </button>
            <button className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-foose-border bg-white px-4 text-sm font-bold text-foose-text transition hover:border-accent hover:bg-accent-light" onClick={() => startOAuth('apple', redirectTarget)} type="button">
              <FaApple size={20} /> Sign in with iCloud
            </button>
          </div>
          {visibleError && <div ref={errorRef} tabIndex={-1}><InlineNotice tone="error">{visibleError}</InlineNotice></div>}
          <TextField autoComplete="username" error={identifierInvalid ? (identifierIsEmail ? 'Enter a valid email address.' : 'Enter your email or username.') : ''} id="login-identifier" label="Email or username" name="identifier" onBlur={() => setTouched((current) => ({ ...current, identifier: true }))} onChange={(event) => setIdentifier(event.target.value)} required value={identifier} />
          <PasswordField autoComplete="current-password" error={passwordInvalid ? 'Enter your password.' : ''} id="login-password" label="Password" name="password" onBlur={() => setTouched((current) => ({ ...current, password: true }))} onChange={(event) => setPassword(event.target.value)} required value={password} />
          <SubmitButton className="w-full" loading={submitting} loadingLabel="Logging in…">Log in</SubmitButton>
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
      </Dialog>
      {forgotPasswordOpen && (
        <ForgotPasswordDialog
          initialEmail={identifierIsEmail && emailLooksValid(identifier) ? identifier.trim() : ''}
          onClose={() => setForgotPasswordOpen(false)}
        />
      )}
    </AppShell>
  )
}
