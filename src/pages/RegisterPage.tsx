import { useState, type FormEvent } from 'react'
import { AppShell, ButtonLink, ErrorState } from '../components'
import { useAuth } from '../hooks/useAuth'
import { authHref, closeTargetForAuthModal, redirectFromSearch } from '../utils/authRedirect'
import { getErrorMessage } from '../utils/errorMessage'
import { navigateTo } from '../utils/navigation'

export function RegisterPage() {
  const { register } = useAuth()
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
      await register({
        email: String(formData.get('email') || ''),
        location: {
          city: String(formData.get('city') || ''),
          region: String(formData.get('region') || ''),
        },
        name: String(formData.get('name') || ''),
        password: String(formData.get('password') || ''),
        phone: String(formData.get('phone') || ''),
        username: String(formData.get('username') || ''),
      })
      navigateTo(redirectTarget)
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Unable to register'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AppShell flush>
      <section className="auth-modal-shell">
        <a aria-label="Close sign up" className="auth-modal-backdrop" href={closeTarget} />
        <form className="form-card auth-card auth-modal-card" onSubmit={(event) => void handleSubmit(event)}>
          <a aria-label="Close sign up" className="modal-close-button" href={closeTarget}>
            x
          </a>
          <h1>Create account</h1>
          <p>Join as a buyer or seller. You can open a DigiShop after identity verification.</p>
          <label>
            Name
            <input autoComplete="name" name="name" required />
          </label>
          <label>
            Email
            <input autoComplete="email" name="email" required type="email" />
          </label>
          <label>
            Username
            <input autoComplete="username" name="username" pattern="[a-zA-Z0-9_]{3,20}" required title="3-20 letters, numbers, or underscore" />
          </label>
          <label>
            Phone
            <input autoComplete="tel" name="phone" />
          </label>
          <div className="form-grid">
            <label>
              Region
              <input name="region" />
            </label>
            <label>
              City
              <input name="city" />
            </label>
          </div>
          <label>
            Password
            <input autoComplete="new-password" minLength={6} name="password" required type="password" />
          </label>
          {error && <ErrorState message={error} />}
          <button className="button button-primary full" disabled={submitting} type="submit">
            {submitting ? 'Creating...' : 'Create account'}
          </button>
          <ButtonLink to={authHref('/login', redirectTarget)} variant="secondary">
            Log in instead
          </ButtonLink>
        </form>
      </section>
    </AppShell>
  )
}
