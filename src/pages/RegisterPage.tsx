import { useMemo, useState, type FormEvent } from 'react'
import { FaApple, FaCheckCircle, FaExclamationCircle } from 'react-icons/fa'
import { FcGoogle } from 'react-icons/fc'
import blueLogo from '../assets/foose-logo-blue.png'
import {
  AppShell,
  Dialog,
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

type ValidatedRegisterField = 'name' | 'email' | 'username' | 'region' | 'city' | 'password'

const VALIDATED_FIELDS: ValidatedRegisterField[] = ['name', 'email', 'username', 'region', 'city', 'password']

function validateRegisterValues(values: RegisterValues): Record<ValidatedRegisterField, string> {
  return {
    name: values.name.trim().length >= 2 ? '' : 'Enter at least 2 characters.',
    email: emailLooksValid(values.email) ? '' : 'Enter a valid email address.',
    username: usernameLooksValid(values.username) ? '' : 'Use 3-20 letters, numbers, underscores, or dots.',
    region: GHANA_REGIONS.some((region) => region === values.region) ? '' : 'Select a Ghana region.',
    city: values.city.trim().length >= 2 ? '' : 'Enter your city or town.',
    password: passwordMeetsRequirements(values.password) ? '' : 'Complete the password requirements.',
  }
}

function registerValuesFromForm(form: HTMLFormElement): RegisterValues {
  const data = new FormData(form)
  const value = (name: keyof RegisterValues) => String(data.get(name) || '')
  return {
    city: value('city'),
    email: value('email'),
    name: value('name'),
    password: value('password'),
    phone: value('phone'),
    region: value('region'),
    username: value('username'),
  }
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

  const validation = useMemo(() => validateRegisterValues(values), [values])
  const showPasswordRules = passwordFocused || touched.password || values.password.length > 0
  const passwordInvalid = Boolean(fieldError('password'))

  function updateField(name: keyof RegisterValues, value: string) {
    setValues((current) => current[name] === value ? current : { ...current, [name]: value })
    setError('')
  }

  function markTouched(name: keyof RegisterValues) {
    setTouched((current) => ({ ...current, [name]: true }))
  }

  function fieldError(name: ValidatedRegisterField) {
    return touched[name] || submittedInvalid ? validation[name] : ''
  }

  function syncFormControl(target: EventTarget | null) {
    if (!(target instanceof HTMLInputElement || target instanceof HTMLSelectElement)) return
    if (!Object.prototype.hasOwnProperty.call(initialValues, target.name)) return
    updateField(target.name as keyof RegisterValues, target.value)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const submittedValues = registerValuesFromForm(event.currentTarget)
    const submittedValidation = validateRegisterValues(submittedValues)
    const firstInvalidField = VALIDATED_FIELDS.find((field) => submittedValidation[field])
    setValues(submittedValues)

    if (firstInvalidField) {
      setSubmittedInvalid(true)
      setTouched((current) => ({
        ...current,
        city: true,
        email: true,
        name: true,
        password: true,
        region: true,
        username: true,
      }))
      window.requestAnimationFrame(() => document.getElementById(`register-${firstInvalidField}`)?.focus())
      return
    }

    setSubmitting(true)
    setError('')
    try {
      await register({
        email: submittedValues.email.trim(),
        location: { city: submittedValues.city.trim(), region: submittedValues.region },
        name: submittedValues.name.trim(),
        password: submittedValues.password,
        phone: normalizePhone(submittedValues.phone),
        username: submittedValues.username.trim(),
      })
      setVerificationEmail(submittedValues.email.trim())
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
        description={verificationEmail ? 'Your account is ready. Verify your email to unlock protected actions.' : 'Create one account for buying, saving, messaging, and selling on Foose.'}
        onClose={() => navigateTo(closeTarget, { replace: true })}
        open
        size="lg"
        title={verificationEmail ? 'Check your email' : 'Create account'}
      >
        {verificationEmail ? (
          <div className="grid gap-5">
            <img alt="Foose" className="h-auto w-32" src={blueLogo} />
            <SuccessState
              action={<a className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-accent px-5 text-sm font-black text-white transition hover:bg-accent-hover" href={authHref('/login', redirectTarget)}>Continue to login</a>}
              layout="compact"
              message={<>We sent a one-time verification link to <strong className="text-foose-text">{verificationEmail}</strong>. You can log in now to browse, save favorites, and add items to your cart. Verify before messaging, checking out, listing an item, or opening a DigiShop.</>}
              title="Verify your email"
            />
          </div>
        ) : (
          <form
            aria-busy={submitting}
            className="grid gap-5"
            noValidate
            onInputCapture={(event) => syncFormControl(event.target)}
            onSubmit={(event) => void handleSubmit(event)}
          >
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

            <div className="grid gap-5 sm:grid-cols-2">
              <TextField autoComplete="name" error={fieldError('name')} errorPlacement="inline" id="register-name" label="Name" name="name" onBlur={(event) => { updateField('name', event.currentTarget.value); markTouched('name') }} onChange={(event) => updateField('name', event.target.value)} required value={values.name} wrapperClassName="sm:col-span-2" />
              <TextField autoComplete="email" error={fieldError('email')} errorPlacement="inline" id="register-email" label="Email" name="email" onBlur={(event) => { updateField('email', event.currentTarget.value); markTouched('email') }} onChange={(event) => updateField('email', event.target.value)} required type="email" value={values.email} />
              <TextField autoCapitalize="none" autoComplete="username" error={fieldError('username')} errorPlacement="inline" hint="3-20 letters, numbers, underscores, or dots." id="register-username" label="Username" name="username" onBlur={(event) => { updateField('username', event.currentTarget.value); markTouched('username') }} onChange={(event) => updateField('username', event.target.value)} required spellCheck={false} value={values.username} />
              <TextField autoComplete="tel" id="register-phone" inputMode="tel" label="Phone" name="phone" onBlur={(event) => updateField('phone', normalizePhone(event.currentTarget.value))} onChange={(event) => updateField('phone', event.target.value)} optional placeholder="0240000000" type="tel" value={values.phone} />
              <FormField error={fieldError('region')} errorPlacement="inline" htmlFor="register-region" label="Region" required>
                <div onBlurCapture={() => markTouched('region')}>
                  <SelectControl
                    aria-describedby={fieldError('region') ? 'register-region-error' : undefined}
                    aria-invalid={Boolean(fieldError('region')) || undefined}
                    autoComplete="address-level1"
                    className={fieldError('region') ? 'border-foose-danger bg-foose-danger-bg/15 focus:border-foose-danger focus:ring-foose-danger/15' : ''}
                    id="register-region"
                    menuZIndex={1500}
                    name="region"
                    onChange={(event) => updateField('region', event.currentTarget.value)}
                    required
                    value={values.region}
                  >
                    <option value="">Select region</option>
                    {GHANA_REGIONS.map((region) => <option key={region} value={region}>{region}</option>)}
                  </SelectControl>
                </div>
              </FormField>
              <TextField autoComplete="address-level2" error={fieldError('city')} errorPlacement="inline" id="register-city" label="City or town" name="city" onBlur={(event) => { updateField('city', event.currentTarget.value); markTouched('city') }} onChange={(event) => updateField('city', event.target.value)} required value={values.city} />
              <PasswordField
                aria-describedby={showPasswordRules ? 'register-password-requirements' : undefined}
                aria-invalid={passwordInvalid || undefined}
                autoComplete="new-password"
                id="register-password"
                label="Password"
                name="password"
                onBlur={(event) => { updateField('password', event.currentTarget.value); setPasswordFocused(false); markTouched('password') }}
                onChange={(event) => updateField('password', event.target.value)}
                onFocus={() => setPasswordFocused(true)}
                required
                value={values.password}
                wrapperClassName="sm:col-span-2"
              />
            </div>

            {showPasswordRules && (
              <ul aria-label="Password requirements" className="flex flex-col gap-1 rounded-xl bg-foose-surface-low p-3 text-xs font-semibold" id="register-password-requirements">
                {passwordRules.map((rule) => {
                  const met = rule.test(values.password)
                  return (
                    <li className={`flex items-center gap-1.5 leading-4 ${met ? 'text-foose-success' : 'text-foose-danger'}`} key={rule.id}>
                      {met ? <FaCheckCircle aria-hidden /> : <FaExclamationCircle aria-hidden />} {rule.label}
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
