import { useState, type FormEvent } from 'react'
import { AppShell, ButtonLink, ErrorState } from '../components'
import { useAuth } from '../hooks/useAuth'
import { authHref, closeTargetForAuthModal, redirectFromSearch } from '../utils/authRedirect'
import { getErrorMessage } from '../utils/errorMessage'
import { navigateTo } from '../utils/navigation'

export function LoginPage() {
  const { login, user } = useAuth()
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const redirectTarget = redirectFromSearch()
  const closeTarget = closeTargetForAuthModal(redirectTarget)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
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
      <section className="auth-modal-shell">
        <a aria-label="Close login" className="auth-modal-backdrop" href={closeTarget} />
        <form className="form-card auth-card auth-modal-card" onSubmit={(event) => void handleSubmit(event)}>
          <a aria-label="Close login" className="modal-close-button" href={closeTarget}>
            x
          </a>
          <h1>Log in</h1>
          <p>Sign in with your email or username. Your session uses secure tokens stored in this browser only.</p>
          {user && <p className="accent-text">You are already logged in.</p>}
          <label>
            Email or username
            <input autoComplete="username" name="identifier" required />
          </label>
          <label>
            Password
            <input autoComplete="current-password" name="password" required type="password" />
          </label>
          {error && <ErrorState message={error} />}
          <button className="button button-primary full" disabled={submitting} type="submit">
            {submitting ? 'Logging in...' : 'Log in'}
          </button>
          <ButtonLink to={authHref('/register', redirectTarget)} variant="secondary">
            Create account
          </ButtonLink>
        </form>
      </section>
    </AppShell>
  )
}
