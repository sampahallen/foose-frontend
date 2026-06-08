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
      <section className="auth-modal-shell fixed inset-0 z-100 flex items-center justify-center p-4">
        <a aria-label="Close sign up" className="auth-modal-backdrop absolute inset-0 bg-black/45" href={closeTarget} />
        <form className="form-card rounded-xl border border-foose-border bg-foose-surface shadow-sm p-4 md:p-5 [&_label]:text-sm [&_label]:font-semibold [&_label]:text-foose-text [&_label]:flex [&_label]:flex-col [&_label]:gap-2 [&_input]:w-full [&_input]:px-3 [&_input]:py-3 [&_select]:w-full [&_select]:px-3 [&_select]:py-3 [&_textarea]:w-full [&_textarea]:px-3 [&_textarea]:py-3 max-lg:rounded-lg max-lg:p-3 auth-card mx-auto w-full max-w-3xl p-5 md:p-8 auth-modal-card relative z-10" onSubmit={(event) => void handleSubmit(event)}>
          <a aria-label="Close sign up" className="modal-close-button absolute right-2 top-2 inline-flex size-9 items-center justify-center rounded-full border border-white/30 bg-black/60 text-white hover:bg-black" href={closeTarget}>
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
          <div className="form-grid grid gap-4 sm:grid-cols-2 [&_.wide]:sm:col-span-2 [&_label]:flex [&_label]:flex-col [&_label]:gap-2 [&_input]:w-full [&_input]:px-3 [&_input]:py-3 [&_select]:w-full [&_select]:px-3 [&_select]:py-3 [&_textarea]:w-full [&_textarea]:px-3 [&_textarea]:py-3">
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
          <button className="button inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border px-5 py-2.5 text-center text-sm font-bold transition disabled:pointer-events-none disabled:opacity-50 [&.full]:w-full button-primary border-accent bg-accent text-white shadow-md shadow-accent/15 hover:bg-accent-hover full" disabled={submitting} type="submit">
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
