import { useState, type FormEvent } from 'react'
import blueLogo from '../assets/foose-logo-blue.png'
import { AppShell, ErrorState } from '../components'
import { FaApple } from 'react-icons/fa'
import { FcGoogle } from 'react-icons/fc'
import { useAuth } from '../hooks/useAuth'
import { authHref, closeTargetForAuthModal, redirectFromSearch } from '../utils/authRedirect'
import { getErrorMessage } from '../utils/errorMessage'
import { emailLooksValid } from '../utils/formValidation'
import { navigateTo } from '../utils/navigation'
import { startOAuth } from '../utils/oauth'

export function LoginPage() {
  const { login, user } = useAuth()
  const [error, setError] = useState('')
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [touched, setTouched] = useState({ identifier: false, password: false })
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const redirectTarget = redirectFromSearch()
  const closeTarget = closeTargetForAuthModal(redirectTarget)
  const identifierIsEmail = identifier.includes('@')
  const canSubmit = identifier.trim().length > 0 && password.length > 0 && (!identifierIsEmail || emailLooksValid(identifier))
  const identifierInvalid = touched.identifier && (!identifier.trim() || (identifierIsEmail && !emailLooksValid(identifier)))
  const passwordInvalid = touched.password && !password

  function requiredBadge(invalid: boolean) {
    return <span className={`ml-auto text-[10px] font-bold ${invalid ? 'text-foose-danger' : 'text-foose-faint'}`}>Required</span>
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
      navigateTo(redirectTarget)
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Unable to log in'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AppShell flush>
      <section className="auth-modal-shell fixed inset-0 z-100 flex items-center justify-center p-3 sm:p-4">
        <a aria-label="Close login" className="auth-modal-backdrop absolute inset-0 bg-black/45" href={closeTarget} />
        <form className="form-card auth-card auth-modal-card relative z-10 mx-auto flex max-h-[92dvh] w-full max-w-md flex-col gap-4 overflow-y-auto rounded-2xl border border-accent/20 bg-white p-4 shadow-2xl shadow-black/20 sm:p-6 md:max-w-lg md:p-8 [&_h1]:font-display [&_h1]:text-3xl [&_h1]:font-bold [&_h1]:text-accent sm:[&_h1]:text-4xl [&_label]:flex [&_label]:flex-col [&_label]:gap-2 [&_label]:text-sm [&_label]:font-semibold [&_label]:text-foose-text [&_input]:w-full [&_input]:rounded-xl [&_input]:border [&_input]:border-accent/25 [&_input]:bg-accent-light/20 [&_input]:px-3 [&_input]:py-3 [&_input]:text-foose-text [&_input]:outline-none [&_input]:transition [&_input]:focus:border-accent [&_input]:focus:bg-white [&_input]:focus:ring-2 [&_input]:focus:ring-accent/15" noValidate onSubmit={(event) => void handleSubmit(event)}>
          <a aria-label="Close login" className="modal-close-button absolute right-2 top-2 inline-flex size-9 items-center justify-center rounded-full border border-white/30 bg-black/60 text-white hover:bg-black" href={closeTarget}>
            x
          </a>
          <header className="flex flex-col gap-3 border-b border-foose-border pb-4 pt-2">
            <img alt="Foose" className="h-auto w-32 sm:w-36" src={blueLogo} />
            <div>
              <h1>Log in</h1>
              <p className="mt-1 text-sm leading-6 text-foose-muted">Thrift smarter. Manage buying, selling, messages, and saved finds in one place.</p>
            </div>
          </header>
          {user && <p className="accent-text font-bold text-accent">You are already logged in.</p>}
          <div className="grid gap-3 sm:grid-cols-2">
            <button className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-foose-border bg-white px-4 text-sm font-bold text-foose-text transition hover:border-accent hover:bg-accent-light" onClick={() => startOAuth('google', redirectTarget)} type="button">
              <FcGoogle size={20} /> Sign in with Gmail
            </button>
            <button className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-foose-border bg-white px-4 text-sm font-bold text-foose-text transition hover:border-accent hover:bg-accent-light" onClick={() => startOAuth('apple', redirectTarget)} type="button">
              <FaApple size={20} /> Sign in with iCloud
            </button>
          </div>
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
          {error && <ErrorState message={error} />}
          <button className="button inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-accent bg-accent px-5 py-2.5 text-center text-sm font-bold text-white shadow-md shadow-accent/15 transition hover:bg-accent-hover disabled:pointer-events-none disabled:border-foose-border disabled:bg-foose-surface-mid disabled:text-foose-faint disabled:shadow-none [&.full]:w-full full" disabled={submitting || !canSubmit} type="submit">
            {submitting ? 'Logging in...' : 'Log in'}
          </button>
          <p className="text-center text-sm text-foose-muted">
            New here?{' '}
            <a className="font-display font-bold text-accent hover:underline" href={authHref('/register', redirectTarget)}>
              Create an account
            </a>
          </p>
        </form>
      </section>
    </AppShell>
  )
}
