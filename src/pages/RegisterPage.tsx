import { useState, type FormEvent } from 'react'
import { AppShell, ButtonLink, ErrorState } from '../components'
import { useAuth } from '../hooks/useAuth'

export function RegisterPage() {
  const { register } = useAuth()
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

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
      window.location.href = '/dashboard'
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to register')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AppShell>
      <section className="auth-page">
        <form className="form-card auth-card" onSubmit={(event) => void handleSubmit(event)}>
          <h1>Create account</h1>
          <p>Registration is sent to `/api/auth/register` and stores only returned JWTs.</p>
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
            <input autoComplete="username" name="username" pattern="[a-zA-Z0-9_]{3,20}" required />
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
          <ButtonLink to="/login" variant="secondary">
            Log in instead
          </ButtonLink>
        </form>
      </section>
    </AppShell>
  )
}
