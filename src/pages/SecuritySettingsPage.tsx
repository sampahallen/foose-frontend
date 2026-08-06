import { useState, type FormEvent } from 'react'
import { AppShell, InlineNotice } from '../components'
import { PasswordField, TextField } from '../components/forms/FormField'
import { SubmitButton } from '../components/forms/FormControls'
import { FormActions, FormPage, FormSection } from '../components/forms/FormLayout'
import { SettingsSkeleton } from '../components/operational/OperationalStates'
import { NavigationBackButton } from '../components/navigation'
import { useAuth } from '../hooks/useAuth'
import { apiPost, apiPut } from '../lib/api'
import { getErrorMessage } from '../utils/errorMessage'

export function SecuritySettingsPage() {
  const { refreshUser, status, user } = useAuth()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [passwordSaved, setPasswordSaved] = useState(false)
  const [passwordSubmitting, setPasswordSubmitting] = useState(false)

  const [emailPassword, setEmailPassword] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [emailError, setEmailError] = useState('')
  const [emailRequested, setEmailRequested] = useState(false)
  const [emailSubmitting, setEmailSubmitting] = useState(false)

  async function submitPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPasswordError('')
    setPasswordSaved(false)

    if (newPassword !== confirmNewPassword) {
      setPasswordError('New password and confirmation do not match.')
      return
    }

    setPasswordSubmitting(true)
    try {
      await apiPut('/users/me/password', { currentPassword, newPassword })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmNewPassword('')
      setPasswordSaved(true)
    } catch (err) {
      setPasswordError(getErrorMessage(err, 'Could not change your password'))
    } finally {
      setPasswordSubmitting(false)
    }
  }

  async function submitEmailChange(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setEmailError('')
    setEmailSubmitting(true)
    try {
      await apiPost<{ pendingEmail: string }>('/users/me/email-change', {
        currentPassword: emailPassword,
        newEmail,
      })
      setEmailPassword('')
      setNewEmail('')
      setEmailRequested(true)
      await refreshUser()
    } catch (err) {
      setEmailError(getErrorMessage(err, 'Could not request an email change'))
    } finally {
      setEmailSubmitting(false)
    }
  }

  if (status === 'checking' || !user) return <AppShell active="profile"><NavigationBackButton className="mb-5" fallback={{ href: '/profile', label: 'Profile' }} /><SettingsSkeleton label="Loading security settings" /></AppShell>

  return (
    <AppShell active="profile" searchPlaceholder="Search Foose...">
      <FormPage
        aside={(
          <nav aria-label="Security settings sections" className="hidden rounded-2xl border border-foose-border bg-foose-surface p-3 shadow-sm lg:grid">
            <a className="min-h-11 rounded-xl px-3 py-3 text-sm font-bold text-foose-text transition hover:bg-accent-light hover:text-accent" href="#security-password">Password</a>
            <a className="min-h-11 rounded-xl px-3 py-3 text-sm font-bold text-foose-text transition hover:bg-accent-light hover:text-accent" href="#security-email">Email</a>
          </nav>
        )}
        description="Manage the password and email address you sign in with."
        eyebrow={<NavigationBackButton fallback={{ href: '/profile', label: 'Profile' }} />}
        title="Security"
        width="standard"
      >
        <form id="security-password" noValidate onSubmit={(event) => void submitPassword(event)}>
          <FormSection description="Choose a new password with at least 6 characters." title="Password">
            <PasswordField autoComplete="current-password" id="security-current-password" label="Current password" onChange={(event) => { setCurrentPassword(event.target.value); setPasswordSaved(false) }} required value={currentPassword} />
            <PasswordField autoComplete="new-password" id="security-new-password" label="New password" minLength={6} onChange={(event) => { setNewPassword(event.target.value); setPasswordSaved(false) }} required value={newPassword} />
            <PasswordField autoComplete="new-password" id="security-confirm-password" label="Confirm new password" minLength={6} onChange={(event) => { setConfirmNewPassword(event.target.value); setPasswordSaved(false) }} required value={confirmNewPassword} />
            {passwordError && <InlineNotice tone="error">{passwordError}</InlineNotice>}
            {passwordSaved && <InlineNotice title="Password changed" tone="success">You have been signed out of other devices for your security.</InlineNotice>}
            <FormActions>
              <SubmitButton loading={passwordSubmitting} loadingLabel="Changing password…">Change password</SubmitButton>
            </FormActions>
          </FormSection>
        </form>

        <form id="security-email" noValidate onSubmit={(event) => void submitEmailChange(event)}>
          <FormSection description="Confirming a new address requires clicking a link sent to it." title="Email">
            <TextField autoComplete="email" disabled id="security-current-email" label="Current email" value={user.email} />
            {user.pendingEmail && (
              <InlineNotice title="Confirmation pending" tone="info">
                Check {user.pendingEmail} for a link to finish updating your email.
              </InlineNotice>
            )}
            {emailRequested && !user.pendingEmail && (
              <InlineNotice title="Check your inbox" tone="success">A confirmation link was sent to your new email address.</InlineNotice>
            )}
            <PasswordField autoComplete="current-password" id="security-email-password" label="Current password" onChange={(event) => setEmailPassword(event.target.value)} required value={emailPassword} />
            <TextField autoComplete="email" id="security-new-email" label="New email address" onChange={(event) => setNewEmail(event.target.value)} required type="email" value={newEmail} />
            {emailError && <InlineNotice tone="error">{emailError}</InlineNotice>}
            <FormActions>
              <SubmitButton loading={emailSubmitting} loadingLabel="Sending confirmation…">Change email</SubmitButton>
            </FormActions>
          </FormSection>
        </form>
      </FormPage>
    </AppShell>
  )
}
