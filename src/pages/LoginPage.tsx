import { useState, type FormEvent } from 'react'
import { AppShell, ButtonLink, ErrorState } from '../components'
import { useAuth } from '../hooks/useAuth'

export function LoginPage() {
  const { login, user } = useAuth()
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

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
      window.location.href = '/dashboard'
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to log in')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AppShell>
      <section className="auth-page">
        <form className="form-card auth-card" onSubmit={(event) => void handleSubmit(event)}>
          <h1>Log in</h1>
          <p>No account is assumed at startup. Use a real API account to continue.</p>
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
          <ButtonLink to="/register" variant="secondary">
            Create account
          </ButtonLink>
        </form>
      </section>
    </AppShell>
  )
}
