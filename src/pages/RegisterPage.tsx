import { useMemo, useState, type FormEvent } from 'react'
import { FaApple, FaCheckCircle, FaExclamationCircle } from 'react-icons/fa'
import { FcGoogle } from 'react-icons/fc'
import blueLogo from '../assets/foose-logo-blue.png'
import {
  AppShell,
  Dialog,
  ErrorSummary,
  FormField,
  InlineNotice,
  PasswordField,
  SelectControl,
  SubmitButton,
  SuccessState,
  TextField,
} from '../components'
import { useAuth } from '../hooks/useAuth'
import { authHref, closeTargetForAuthModal, redirectFromSearch } from '../utils/authRedirect'
import { getErrorMessage } from '../utils/errorMessage'
import {
  emailLooksValid,
  normalizePhone,
  passwordMeetsRequirements,
  passwordRules,
  usernameLooksValid,
} from '../utils/formValidation'
import { GHANA_REGIONS } from '../utils/ghanaRegions'
import { navigateTo } from '../utils/navigation'
import { startOAuth } from '../utils/oauth'

const DUPLICATE_ACCOUNT_MESSAGE = 'A user with that email or username already exists'

type RegisterValues = {
  city: string
  email: string
  name: string
  password: string
  phone: string
  region: string
  username: string
}

const initialValues: RegisterValues = {
  city: '',
  email: '',
  name: '',
  password: '',
  phone: '',
  region: '',
  username: '',
}

function registerErrorMessage(error: unknown) {
  const message = getErrorMessage(error, 'Unable to register')
  const normalizedMessage = message.toLowerCase()
  if (normalizedMessage.includes('duplicate') || normalizedMessage.includes('already exists')) {
    return DUPLICATE_ACCOUNT_MESSAGE
  }
  return message
}

export function RegisterPage() {
  const { register } = useAuth()
  const [error, setError] = useState('')
  const [values, setValues] = useState<RegisterValues>(initialValues)
  const [touched, setTouched] = useState<Partial<Record<keyof RegisterValues, boolean>>>({})
  const [submittedInvalid, setSubmittedInvalid] = useState(false)
  const [passwordFocused, setPasswordFocused] = useState(false)
  const [verificationEmail, setVerificationEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const redirectTarget = redirectFromSearch()
  const closeTarget = closeTargetForAuthModal(redirectTarget)

  const validation = useMemo(() => ({
    email: emailLooksValid(values.email) ? '' : 'Enter a valid email address.',
    name: values.name.trim().length >= 2 ? '' : 'Enter at least 2 characters for your name.',
    password: passwordMeetsRequirements(values.password) ? '' : 'Complete all password requirements.',
    username: usernameLooksValid(values.username) ? '' : 'Use 3-20 letters, numbers, underscores, or dots.',
  }), [values.email, values.name, values.password, values.username])
  const validationErrors = Object.entries(validation).flatMap(([field, message]) => (
    message ? [{ fieldId: `register-${field}`, message }] : []
  ))
  const canSubmit = validationErrors.length === 0
  const showPasswordRules = passwordFocused || touched.password || values.password.length > 0

  function updateField(name: keyof RegisterValues, value: string) {
    setValues((current) => ({ ...current, [name]: value }))
    setError('')
  }

  function markTouched(name: keyof RegisterValues) {
    setTouched((current) => ({ ...current, [name]: true }))
  }

  function fieldError(name: keyof typeof validation) {
    return touched[name] || submittedInvalid ? validation[name] : ''
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canSubmit) {
      setSubmittedInvalid(true)
      setTouched((current) => ({ ...current, email: true, name: true, password: true, username: true }))
      return
    }

    setSubmitting(true)
    setError('')
    try {
      await register({
        email: values.email.trim(),
        location: { city: values.city.trim(), region: values.region },
        name: values.name.trim(),
        password: values.password,
        phone: normalizePhone(values.phone),
        username: values.username.trim(),
      })
      setVerificationEmail(values.email.trim())
    } catch (requestError) {
      setError(registerErrorMessage(requestError))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AppShell flush>
      <Dialog
        closeLabel="Close sign up"
        description={verificationEmail ? 'Your account is ready for email verification.' : 'Create one account for buying, saving, messaging, and selling on Foose.'}
        onClose={() => navigateTo(closeTarget, { replace: true })}
        open
        size="lg"
        title={verificationEmail ? 'Check your email' : 'Create account'}
      >
        {verificationEmail ? (
          <div className="grid gap-5">
            <img alt="Foose" className="h-auto w-32" src={blueLogo} />
            <SuccessState
              action={<a className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-accent px-5 text-sm font-black text-white transition hover:bg-accent-hover" href={authHref('/login', redirectTarget)}>Back to login</a>}
              layout="compact"
              message={<>We sent a secure sign-in link to <strong className="text-foose-text">{verificationEmail}</strong>. It expires in 15 minutes and works once.</>}
              title="Verify your email"
            />
          </div>
        ) : (
          <form aria-busy={submitting} className="grid gap-5" noValidate onSubmit={(event) => void handleSubmit(event)}>
            <img alt="Foose" className="h-auto w-32" src={blueLogo} />
            <div className="grid gap-3 sm:grid-cols-2">
              <button className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-foose-border bg-white px-4 text-sm font-bold text-foose-text transition hover:border-accent hover:bg-accent-light focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent" onClick={() => startOAuth('google', redirectTarget)} type="button">
                <FcGoogle size={20} /> Sign up with Gmail
              </button>
              <button className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-foose-border bg-white px-4 text-sm font-bold text-foose-text transition hover:border-accent hover:bg-accent-light focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent" onClick={() => startOAuth('apple', redirectTarget)} type="button">
                <FaApple size={20} /> Sign up with iCloud
              </button>
            </div>

            {error && <InlineNotice title="Could not create your account" tone="error">{error}</InlineNotice>}
            <ErrorSummary errors={validationErrors} focus={submittedInvalid && validationErrors.length > 0} />

            <div className="grid gap-5 sm:grid-cols-2">
              <TextField autoComplete="name" error={fieldError('name')} id="register-name" label="Name" name="name" onBlur={() => markTouched('name')} onChange={(event) => updateField('name', event.target.value)} required value={values.name} wrapperClassName="sm:col-span-2" />
              <TextField autoComplete="email" error={fieldError('email')} id="register-email" label="Email" name="email" onBlur={() => markTouched('email')} onChange={(event) => updateField('email', event.target.value)} required type="email" value={values.email} />
              <TextField autoCapitalize="none" autoComplete="username" error={fieldError('username')} hint="3-20 letters, numbers, underscores, or dots." id="register-username" label="Username" name="username" onBlur={() => markTouched('username')} onChange={(event) => updateField('username', event.target.value)} required spellCheck={false} value={values.username} />
              <TextField autoComplete="tel" id="register-phone" inputMode="tel" label="Phone" name="phone" onBlur={() => updateField('phone', normalizePhone(values.phone))} onChange={(event) => updateField('phone', event.target.value)} optional placeholder="0240000000" type="tel" value={values.phone} />
              <FormField htmlFor="register-region" label="Region" optional>
                <SelectControl id="register-region" name="region" onChange={(event) => updateField('region', event.currentTarget.value)} value={values.region}>
                  <option value="">Select region</option>
                  {GHANA_REGIONS.map((region) => <option key={region} value={region}>{region}</option>)}
                </SelectControl>
              </FormField>
              <TextField autoComplete="address-level2" id="register-city" label="City" name="city" onChange={(event) => updateField('city', event.target.value)} optional value={values.city} />
              <PasswordField
                autoComplete="new-password"
                error={fieldError('password')}
                id="register-password"
                label="Password"
                name="password"
                onBlur={() => { setPasswordFocused(false); markTouched('password') }}
                onChange={(event) => updateField('password', event.target.value)}
                onFocus={() => setPasswordFocused(true)}
                required
                value={values.password}
                wrapperClassName="sm:col-span-2"
              />
            </div>

            {showPasswordRules && (
              <ul aria-label="Password requirements" className="grid gap-2 rounded-xl bg-foose-surface-low p-4 text-sm font-semibold sm:grid-cols-2">
                {passwordRules.map((rule) => {
                  const met = rule.test(values.password)
                  return (
                    <li className={`flex items-center gap-2 ${met ? 'text-foose-success' : 'text-foose-muted'}`} key={rule.id}>
                      {met ? <FaCheckCircle aria-hidden /> : <FaExclamationCircle aria-hidden className="text-foose-faint" />} {rule.label}
                    </li>
                  )
                })}
              </ul>
            )}

            <SubmitButton className="w-full" loading={submitting} loadingLabel="Creating account…">Create account</SubmitButton>
            <p className="text-center text-sm text-foose-muted">
              Already have an account?{' '}
              <a className="font-display font-bold text-accent hover:underline" href={authHref('/login', redirectTarget)}>Log in instead</a>
            </p>
          </form>
        )}
      </Dialog>
    </AppShell>
  )
}
