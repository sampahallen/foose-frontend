import { useEffect, useRef, useState, type FormEvent } from 'react'
import { AppShell, AvatarCropDialog, Icon, InlineNotice } from '../components'
import { ErrorSummary, SubmitButton } from '../components/forms/FormControls'
import { TextAreaField, TextField } from '../components/forms/FormField'
import { FormActions, FormPage, FormSection } from '../components/forms/FormLayout'
import { UnsavedChangesGuard } from '../components/forms/UnsavedChangesGuard'
import { SettingsSkeleton } from '../components/operational/OperationalStates'
import { NavigationBackButton } from '../components/navigation'
import { useAuth } from '../hooks/useAuth'
import { useUsernameAvailability } from '../hooks/useUsernameAvailability'
import { apiPut } from '../lib/api'
import type { User } from '../types/api'
import { getErrorMessage } from '../utils/errorMessage'
import { normalizePhone, usernameLooksValid } from '../utils/formValidation'
import { initials } from '../utils/format'
import { withBasePath } from '../utils/navigation'

export function ProfileSettingsPage() {
  const { refreshUser, status, user } = useAuth()
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [name, setName] = useState(user?.name || '')
  const [username, setUsername] = useState(user?.username || '')
  const [phone, setPhone] = useState(user?.phone || '')
  const [touched, setTouched] = useState({ name: false, username: false })
  const [bio, setBio] = useState(user?.bio || '')
  const [validationAttempt, setValidationAttempt] = useState(0)
  const [profileFiles, setProfileFiles] = useState<File[]>([])
  const [profilePreviewUrl, setProfilePreviewUrl] = useState('')
  const [avatarEditorOpen, setAvatarEditorOpen] = useState(false)
  const hydratedUserIdRef = useRef(user?._id || '')
  const {
    check: checkUsernameAvailability,
    reset: resetUsernameAvailability,
    state: usernameAvailability,
  } = useUsernameAvailability(user?.username || '')
  const normalizedUsername = username.normalize('NFKC').trim().toLocaleLowerCase()
  const availabilityApplies = usernameAvailability.username === normalizedUsername
  const usernameUnavailable = availabilityApplies && usernameAvailability.status === 'unavailable'
  const canSubmit = name.trim().length >= 2 && usernameLooksValid(username) && !usernameUnavailable
  const nameInvalid = touched.name && name.trim().length < 2
  const usernameInvalid = touched.username && !usernameLooksValid(username)
  const avatarSource = profilePreviewUrl || user?.profilePhoto || ''
  const validationErrors = [
    ...(name.trim().length < 2 ? [{ fieldId: 'profile-name', message: 'Enter a name with at least 2 characters.' }] : []),
    ...(!usernameLooksValid(username) ? [{ fieldId: 'profile-username', message: 'Use 3-20 letters, numbers, underscores, or dots for your username.' }] : []),
    ...(usernameUnavailable ? [{ fieldId: 'profile-username', message: `@${normalizedUsername} is already taken.` }] : []),
  ]
  const dirty = !saved && (name !== (user?.name || '') || username !== (user?.username || '') || phone !== (user?.phone || '') || bio !== (user?.bio || '') || profileFiles.length > 0)

  useEffect(() => {
    if (!user || hydratedUserIdRef.current === user._id) return
    hydratedUserIdRef.current = user._id
    const timer = window.setTimeout(() => {
      setName(user.name || '')
      setUsername(user.username || '')
      setPhone(user.phone || '')
      setBio(user.bio || '')
      resetUsernameAvailability()
    }, 0)
    return () => window.clearTimeout(timer)
  }, [resetUsernameAvailability, user])

  useEffect(() => () => {
    if (profilePreviewUrl) URL.revokeObjectURL(profilePreviewUrl)
  }, [profilePreviewUrl])

  function handleCroppedPhoto(file: File) {
    setProfileFiles([file])
    setProfilePreviewUrl(URL.createObjectURL(file))
    setAvatarEditorOpen(false)
    setSaved(false)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canSubmit) {
      setTouched({ name: true, username: true })
      setValidationAttempt((attempt) => attempt + 1)
      return
    }
    const form = event.currentTarget
    const formData = new FormData(form)
    if (profileFiles[0]) {
      formData.set('profilePhoto', profileFiles[0], profileFiles[0].name)
    }

    setError('')
    setSaved(false)
    setSubmitting(true)
    try {
      const { user: updatedUser } = await apiPut<{ user: User }>('/users/me', formData)
      setName(updatedUser.name || '')
      setUsername(updatedUser.username || '')
      setPhone(updatedUser.phone || '')
      setBio(updatedUser.bio || '')
      await refreshUser()
      setProfileFiles([])
      setProfilePreviewUrl('')
      setSaved(true)
      resetUsernameAvailability()
    } catch (err) {
      setError(getErrorMessage(err, 'Could not update your profile'))
    } finally {
      setSubmitting(false)
    }
  }

  if (status === 'checking' || !user) return <AppShell active="profile"><NavigationBackButton className="mb-5" fallback={{ href: '/profile', label: 'Profile' }} /><SettingsSkeleton label="Loading profile settings" /></AppShell>

  return (
    <AppShell active="profile" searchPlaceholder="Search Foose...">
      <FormPage
        aside={(
          <nav aria-label="Profile settings sections" className="hidden rounded-2xl border border-foose-border bg-white p-3 shadow-sm lg:grid">
            <a className="min-h-11 rounded-xl px-3 py-3 text-sm font-bold text-foose-text transition hover:bg-accent-light hover:text-accent" href="#profile-public-identity">Public identity</a>
            <a className="min-h-11 rounded-xl px-3 py-3 text-sm font-bold text-foose-text transition hover:bg-accent-light hover:text-accent" href="#profile-about">About you</a>
            <a className="min-h-11 rounded-xl px-3 py-3 text-sm font-bold text-foose-text transition hover:bg-accent-light hover:text-accent" href="#profile-save">Save changes</a>
          </nav>
        )}
        description="Update the public identity shoppers and sellers see across Foose."
        eyebrow={<NavigationBackButton fallback={{ href: '/profile', label: 'Profile' }} />}
        title="Profile settings"
        width="standard"
      >
        <form className="space-y-5" noValidate onSubmit={(event) => void handleSubmit(event)}>
          <UnsavedChangesGuard when={dirty && !submitting} />
          <ErrorSummary errors={validationErrors} focus={validationAttempt > 0} />

          <FormSection columns={2} description="Your photo, name, and handle appear on listings, Finspo, and community activity." id="profile-public-identity" title="Public identity">
            <div className="form-field-wide flex flex-col gap-4 rounded-2xl bg-accent-light/55 p-4 sm:flex-row sm:items-center">
              <div className="relative w-fit shrink-0 self-start">
                {avatarSource ? (
                  <img alt="" className="size-20 rounded-full object-cover ring-4 ring-white" src={avatarSource} />
                ) : (
                  <span className="inline-flex size-20 items-center justify-center rounded-full bg-white text-xl font-black text-accent ring-4 ring-white">{initials(user.name)}</span>
                )}
                <button
                  aria-label="Edit profile photo"
                  className="absolute -bottom-1 -right-1 inline-flex size-11 items-center justify-center rounded-full border-4 border-accent-light bg-accent text-white shadow-md transition hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                  onClick={() => setAvatarEditorOpen(true)}
                  title="Edit profile photo"
                  type="button"
                >
                  <Icon name="pencil" size={17} />
                </button>
              </div>
              <div className="min-w-0">
                <strong className="block truncate text-lg text-foose-text">{name || user.name}</strong>
                <span className="block truncate text-sm font-semibold text-foose-muted">@{username || user.username}</span>
              </div>
            </div>
            {profileFiles[0] && (
              <InlineNotice className="form-field-wide" title="New photo ready" tone="info">Save your profile to publish the cropped photo.</InlineNotice>
            )}
            <TextField
              autoComplete="name"
              error={nameInvalid ? 'Enter at least 2 characters.' : undefined}
              id="profile-name"
              label="Name"
              name="name"
              onBlur={() => setTouched((current) => ({ ...current, name: true }))}
              onChange={(event) => { setName(event.target.value); setSaved(false) }}
              required
              value={name}
            />
            <div className="grid min-w-0 gap-2">
              <TextField
                aria-describedby={availabilityApplies && usernameAvailability.status !== 'idle' ? 'profile-username-availability' : undefined}
                aria-invalid={usernameInvalid || usernameUnavailable || undefined}
                autoCapitalize="none"
                autoComplete="username"
                error={usernameInvalid ? 'Use 3-20 letters, numbers, underscores, or dots.' : undefined}
                id="profile-username"
                label="Username"
                name="username"
                onBlur={() => setTouched((current) => ({ ...current, username: true }))}
                onChange={(event) => {
                  const nextUsername = event.target.value
                  setUsername(nextUsername)
                  setSaved(false)
                  checkUsernameAvailability(nextUsername)
                }}
                pattern="[a-zA-Z0-9_.]{3,20}"
                required
                value={username}
              />
              {availabilityApplies && usernameAvailability.status !== 'idle' && (
                <div
                  aria-live="polite"
                  className={`flex min-h-10 items-center gap-2 rounded-xl border px-3 py-2 text-sm font-bold ${
                    usernameAvailability.status === 'available'
                      ? 'border-foose-success/30 bg-foose-success-bg/55 text-foose-success'
                      : usernameAvailability.status === 'unavailable'
                        ? 'border-foose-danger/30 bg-foose-danger-bg/55 text-foose-danger'
                        : usernameAvailability.status === 'error'
                          ? 'border-foose-warning/30 bg-foose-warning-bg/45 text-foose-warning'
                          : 'border-accent/20 bg-accent-light/55 text-accent-strong'
                  }`}
                  id="profile-username-availability"
                  role="status"
                >
                  {(usernameAvailability.status === 'waiting' || usernameAvailability.status === 'checking') && (
                    <><span aria-hidden="true" className="size-3.5 animate-spin rounded-full border-2 border-current border-r-transparent motion-reduce:animate-none" />Checking @{normalizedUsername}&hellip;</>
                  )}
                  {usernameAvailability.status === 'available' && <>@{normalizedUsername} is available.</>}
                  {usernameAvailability.status === 'unavailable' && <>@{normalizedUsername} is already taken.</>}
                  {usernameAvailability.status === 'error' && <>Could not check availability right now. It will be verified when you save.</>}
                </div>
              )}
            </div>
          </FormSection>

          <FormSection description="Help people know where to reach you and what you are into." id="profile-about" title="About you">
            <TextField
              autoComplete="tel"
              id="profile-phone"
              inputMode="tel"
              label="Phone"
              name="phone"
              onBlur={() => setPhone((current) => normalizePhone(current))}
              onChange={(event) => { setPhone(event.target.value); setSaved(false) }}
              optional
              placeholder="0240000000"
              value={phone}
            />
            <TextAreaField
              id="profile-bio"
              label="Bio"
              maxLength={280}
              name="bio"
              onChange={(event) => { setBio(event.target.value); setSaved(false) }}
              optional
              placeholder="Tell the Foose community what you thrift, sell, or collect."
              rows={5}
              value={bio}
            />
          </FormSection>

          {error && <InlineNotice tone="error">{error}</InlineNotice>}
          {saved && <InlineNotice title="Changes saved" tone="success">Your public profile has been updated.</InlineNotice>}

          <div id="profile-save">
          <FormActions sticky>
            <a className="inline-flex min-h-12 items-center justify-center rounded-xl border border-foose-border bg-white px-5 text-sm font-bold text-foose-text transition hover:border-accent hover:text-accent" href={withBasePath('/profile')}>Cancel</a>
            <SubmitButton loading={submitting} loadingLabel="Saving profile…">Save profile</SubmitButton>
          </FormActions>
          </div>
        </form>
        <AvatarCropDialog
          initialFile={profileFiles[0] || null}
          onApply={handleCroppedPhoto}
          onCancel={() => setAvatarEditorOpen(false)}
          open={avatarEditorOpen}
        />
      </FormPage>
    </AppShell>
  )
}
