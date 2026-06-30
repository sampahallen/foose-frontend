import { useState, type FormEvent } from 'react'
import blueLogo from '../assets/foose-logo-blue.png'
import { AppShell, ErrorState } from '../components'
import { FaApple, FaCheckCircle, FaExclamationCircle } from 'react-icons/fa'
import { FcGoogle } from 'react-icons/fc'
import { useAuth } from '../hooks/useAuth'
import { authHref, closeTargetForAuthModal, redirectFromSearch } from '../utils/authRedirect'
import { getErrorMessage } from '../utils/errorMessage'
import { emailLooksValid, normalizePhone, passwordMeetsRequirements, passwordRules, usernameLooksValid } from '../utils/formValidation'
import { startOAuth } from '../utils/oauth'

export function RegisterPage() {
  const { register } = useAuth()
  const [error, setError] = useState('')
  const [values, setValues] = useState({ email: '', name: '', password: '', username: '' })
  const [touched, setTouched] = useState({ email: false, name: false, password: false, username: false })
  const [passwordFocused, setPasswordFocused] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [verificationEmail, setVerificationEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const redirectTarget = redirectFromSearch()
  const closeTarget = closeTargetForAuthModal(redirectTarget)
  const canSubmit =
    values.name.trim().length >= 2 &&
    emailLooksValid(values.email) &&
    usernameLooksValid(values.username) &&
    passwordMeetsRequirements(values.password)

  function updateRequiredField(name: keyof typeof values, value: string) {
    setValues((current) => ({ ...current, [name]: value }))
  }

  function markTouched(name: keyof typeof touched) {
    setTouched((current) => ({ ...current, [name]: true }))
  }

  const fieldInvalid = {
    email: touched.email && !emailLooksValid(values.email),
    name: touched.name && values.name.trim().length < 2,
    password: touched.password && !passwordMeetsRequirements(values.password),
    username: touched.username && !usernameLooksValid(values.username),
  }
  const showPasswordRules =
    (passwordFocused || touched.password || values.password.length > 0) && !passwordMeetsRequirements(values.password)

  function requiredBadge(invalid: boolean) {
    return <span className={`ml-auto text-[10px] font-bold ${invalid ? 'text-foose-danger' : 'text-foose-faint'}`}>Required</span>
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canSubmit) return
    const formData = new FormData(event.currentTarget)
    const email = String(formData.get('email') || '').trim()
    setSubmitting(true)
    setError('')

    try {
      await register({
        email,
        location: {
          city: String(formData.get('city') || ''),
          region: String(formData.get('region') || ''),
        },
        name: String(formData.get('name') || ''),
        password: String(formData.get('password') || ''),
        phone: String(formData.get('phone') || ''),
        username: String(formData.get('username') || ''),
      })
      setVerificationEmail(email)
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Unable to register'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AppShell flush>
      <section className="auth-modal-shell fixed inset-0 z-100 flex items-center justify-center p-3 sm:p-4">
        <a aria-label="Close sign up" className="auth-modal-backdrop absolute inset-0 bg-black/45" href={closeTarget} />
        {verificationEmail ? (
          <div className="auth-card auth-modal-card relative z-10 mx-auto flex w-full max-w-md flex-col gap-4 rounded-2xl border border-accent/20 bg-white p-6 shadow-2xl shadow-black/20">
            <a aria-label="Close sign up" className="modal-close-button absolute right-2 top-2 inline-flex size-9 items-center justify-center rounded-full border border-white/30 bg-black/60 text-white hover:bg-black" href={closeTarget}>
              x
            </a>
            <img alt="Foose" className="h-auto w-32" src={blueLogo} />
            <div>
              <h1 className="font-display text-3xl font-bold text-accent">Check your email</h1>
              <p className="mt-2 text-sm leading-6 text-foose-muted">
                We sent a secure sign-in link to <strong className="text-foose-text">{verificationEmail}</strong>. It expires in 15 minutes and works once.
              </p>
            </div>
            <a className="button inline-flex min-h-12 items-center justify-center rounded-xl border border-accent bg-accent px-5 text-sm font-bold text-white shadow-md shadow-accent/15 transition hover:bg-accent-hover" href={authHref('/login', redirectTarget)}>
              Back to login
            </a>
          </div>
        ) : (
        <form className="form-card auth-card auth-modal-card relative z-10 mx-auto flex max-h-[92dvh] w-full max-w-md flex-col gap-4 overflow-y-auto rounded-2xl border border-accent/20 bg-white p-4 shadow-2xl shadow-black/20 sm:p-6 md:max-w-2xl md:p-8 [&_h1]:font-display [&_h1]:text-3xl [&_h1]:font-bold [&_h1]:text-accent sm:[&_h1]:text-4xl [&_label]:flex [&_label]:flex-col [&_label]:gap-2 [&_label]:text-sm [&_label]:font-semibold [&_label]:text-foose-text [&_input]:w-full [&_input]:rounded-xl [&_input]:border [&_input]:border-accent/25 [&_input]:bg-accent-light/20 [&_input]:px-3 [&_input]:py-3 [&_input]:text-foose-text [&_input]:outline-none [&_input]:transition [&_input]:focus:border-accent [&_input]:focus:bg-white [&_input]:focus:ring-2 [&_input]:focus:ring-accent/15" noValidate onSubmit={(event) => void handleSubmit(event)}>
          <a aria-label="Close sign up" className="modal-close-button absolute right-2 top-2 inline-flex size-9 items-center justify-center rounded-full border border-white/30 bg-black/60 text-white hover:bg-black" href={closeTarget}>
            x
          </a>
          <header className="flex flex-col gap-3 border-b border-foose-border pb-4 pt-2">
            <img alt="Foose" className="h-auto w-32 sm:w-36" src={blueLogo} />
            <div>
              <h1>Create account</h1>
              <p className="mt-1 text-sm leading-6 text-foose-muted">Start buying, saving, messaging sellers, and opening your DigiShop after verification.</p>
            </div>
          </header>
          <div className="grid gap-3 sm:grid-cols-2">
            <button className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-foose-border bg-white px-4 text-sm font-bold text-foose-text transition hover:border-accent hover:bg-accent-light" onClick={() => startOAuth('google', redirectTarget)} type="button">
              <FcGoogle size={20} /> Sign up with Gmail
            </button>
            <button className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-foose-border bg-white px-4 text-sm font-bold text-foose-text transition hover:border-accent hover:bg-accent-light" onClick={() => startOAuth('apple', redirectTarget)} type="button">
              <FaApple size={20} /> Sign up with iCloud
            </button>
          </div>
          <label>
            <span className="flex items-center gap-2">Name {requiredBadge(fieldInvalid.name)}</span>
            <input autoComplete="name" name="name" onBlur={() => markTouched('name')} onChange={(event) => updateRequiredField('name', event.target.value)} required />
            {fieldInvalid.name && <span className="text-xs font-semibold text-foose-danger">Enter at least 2 characters.</span>}
          </label>
          <label>
            <span className="flex items-center gap-2">Email {requiredBadge(fieldInvalid.email)}</span>
            <input autoComplete="email" name="email" onBlur={() => markTouched('email')} onChange={(event) => updateRequiredField('email', event.target.value)} required type="email" />
            {fieldInvalid.email && <span className="text-xs font-semibold text-foose-danger">Enter a valid email address.</span>}
          </label>
          <label>
            <span className="flex items-center gap-2">Username {requiredBadge(fieldInvalid.username)}</span>
            <input autoComplete="username" name="username" onBlur={() => markTouched('username')} onChange={(event) => updateRequiredField('username', event.target.value)} pattern="[a-zA-Z0-9_]{3,20}" required title="3-20 letters, numbers, or underscore" />
            {fieldInvalid.username && <span className="text-xs font-semibold text-foose-danger">Use 3-20 letters, numbers, or underscores.</span>}
          </label>
          <label>
            Phone
            <input autoComplete="tel" name="phone" onBlur={(event) => { event.currentTarget.value = normalizePhone(event.currentTarget.value) }} placeholder="0240000000" />
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
            <span className="flex items-center gap-2">Password {requiredBadge(fieldInvalid.password)}</span>
            <span className="relative block">
              <input
                autoComplete="new-password"
                className="pr-24"
                minLength={8}
                name="password"
                onBlur={() => {
                  setPasswordFocused(false)
                  markTouched('password')
                }}
                onChange={(event) => updateRequiredField('password', event.target.value)}
                onFocus={() => setPasswordFocused(true)}
                required
                type={showPassword ? 'text' : 'password'}
              />
              <button className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md px-3 py-1 text-xs font-bold text-accent hover:bg-accent-light" onClick={() => setShowPassword((value) => !value)} type="button">
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </span>
            {showPasswordRules && (
              <ul className="grid gap-1 text-xs font-semibold">
                {passwordRules.map((rule) => {
                  const met = rule.test(values.password)
                  return (
                    <li className={`flex items-center gap-2 ${met ? 'text-foose-success' : 'text-foose-danger'}`} key={rule.id}>
                      {met ? <FaCheckCircle aria-hidden /> : <FaExclamationCircle aria-hidden />} {rule.label}
                    </li>
                  )
                })}
              </ul>
            )}
          </label>
          {error && <ErrorState message={error} />}
          <button className="button inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-accent bg-accent px-5 py-2.5 text-center text-sm font-bold text-white shadow-md shadow-accent/15 transition hover:bg-accent-hover disabled:pointer-events-none disabled:border-foose-border disabled:bg-foose-surface-mid disabled:text-foose-faint disabled:shadow-none [&.full]:w-full full" disabled={submitting || !canSubmit} type="submit">
            {submitting ? 'Creating...' : 'Create account'}
          </button>
          <p className="text-center text-sm text-foose-muted">
            Already have an account?{' '}
            <a className="font-display font-bold text-accent hover:underline" href={authHref('/login', redirectTarget)}>
              Log in instead
            </a>
          </p>
        </form>
        )}
      </section>
    </AppShell>
  )
}
