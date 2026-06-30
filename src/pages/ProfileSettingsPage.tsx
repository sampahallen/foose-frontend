import { useEffect, useState, type FormEvent } from 'react'
import { AppShell, ErrorState, ImagePreviewInput, LoadingState } from '../components'
import { useAuth } from '../hooks/useAuth'
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
  const [touched, setTouched] = useState({ name: false, username: false })
  const [bioLength, setBioLength] = useState(user?.bio?.length || 0)
  const canSubmit = name.trim().length >= 2 && usernameLooksValid(username)
  const nameInvalid = touched.name && name.trim().length < 2
  const usernameInvalid = touched.username && !usernameLooksValid(username)

  function requiredBadge(invalid: boolean) {
    return <span className={`ml-auto text-[10px] font-bold ${invalid ? 'text-foose-danger' : 'text-foose-faint'}`}>Required</span>
  }

  useEffect(() => {
    if (!user) return
    setName(user.name || '')
    setUsername(user.username || '')
    setBioLength(user.bio?.length || 0)
  }, [user])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const formData = new FormData(form)

    setError('')
    setSaved(false)
    setSubmitting(true)
    try {
      await apiPut<{ user: User }>('/users/me', formData)
      await refreshUser()
      setSaved(true)
    } catch (err) {
      setError(getErrorMessage(err, 'Could not update your profile'))
    } finally {
      setSubmitting(false)
    }
  }

  if (status === 'checking' || !user) return <LoadingState label="Loading profile settings..." />

  return (
    <AppShell active="profile" searchPlaceholder="Search Foose...">
      <section className="mx-auto w-full max-w-3xl">
        <div className="mb-6 flex flex-col gap-2 [&_h1]:font-display [&_h1]:text-3xl [&_h1]:font-bold [&_h1]:text-foose-text md:[&_h1]:text-5xl [&_p]:text-sm [&_p]:leading-6 [&_p]:text-foose-muted">
          <a className="w-fit text-sm font-bold text-accent hover:underline" href={withBasePath('/profile')}>
            Profile
          </a>
          <h1>Profile settings</h1>
          <p>Update the public identity shoppers and sellers see across Foose.</p>
        </div>

        <form
          className="rounded-2xl border border-foose-border bg-white p-4 shadow-sm sm:p-6 md:p-8 [&_input]:w-full [&_input]:rounded-xl [&_input]:border [&_input]:border-foose-border [&_input]:bg-foose-surface-low [&_input]:px-4 [&_input]:py-3 [&_input]:outline-none [&_input]:transition [&_input]:focus:border-accent [&_input]:focus:bg-white [&_input]:focus:ring-2 [&_input]:focus:ring-accent/15 [&_label]:flex [&_label]:flex-col [&_label]:gap-2 [&_label]:text-sm [&_label]:font-bold [&_label]:text-foose-text [&_textarea]:w-full [&_textarea]:rounded-xl [&_textarea]:border [&_textarea]:border-foose-border [&_textarea]:bg-foose-surface-low [&_textarea]:px-4 [&_textarea]:py-3 [&_textarea]:outline-none [&_textarea]:transition [&_textarea]:focus:border-accent [&_textarea]:focus:bg-white [&_textarea]:focus:ring-2 [&_textarea]:focus:ring-accent/15"
          onSubmit={(event) => void handleSubmit(event)}
        >
          <div className="mb-6 flex flex-col gap-4 rounded-2xl bg-accent-light/60 p-4 sm:flex-row sm:items-center">
            {user.profilePhoto ? (
              <img alt="" className="size-20 rounded-full object-cover ring-4 ring-white" src={user.profilePhoto} />
            ) : (
              <span className="inline-flex size-20 items-center justify-center rounded-full bg-white text-xl font-black text-accent ring-4 ring-white">
                {initials(user.name)}
              </span>
            )}
            <div className="min-w-0">
              <strong className="block truncate text-lg text-foose-text">{user.name}</strong>
              <span className="block truncate text-sm font-semibold text-foose-muted">@{user.username}</span>
            </div>
          </div>

          <div className="grid gap-5">
            <label>
              Profile photo
              <ImagePreviewInput accept="image/*" maxFiles={1} name="profilePhoto" />
            </label>

            <div className="grid gap-5 md:grid-cols-2">
              <label>
                <span className="flex items-center gap-2">Name {requiredBadge(nameInvalid)}</span>
                <input defaultValue={user.name} name="name" onBlur={() => setTouched((current) => ({ ...current, name: true }))} onChange={(event) => setName(event.target.value)} required />
                {nameInvalid && <span className="text-xs font-semibold text-foose-danger">Enter at least 2 characters.</span>}
              </label>
              <label>
                <span className="flex items-center gap-2">Username {requiredBadge(usernameInvalid)}</span>
                <input defaultValue={user.username} name="username" onBlur={() => setTouched((current) => ({ ...current, username: true }))} onChange={(event) => setUsername(event.target.value)} pattern="[a-zA-Z0-9_]{3,20}" required title="3-20 letters, numbers, or underscore" />
                {usernameInvalid && <span className="text-xs font-semibold text-foose-danger">Use 3-20 letters, numbers, or underscores.</span>}
              </label>
            </div>

            <label>
              Phone
              <input autoComplete="tel" defaultValue={user.phone || ''} name="phone" onBlur={(event) => { event.currentTarget.value = normalizePhone(event.currentTarget.value) }} placeholder="0240000000" />
            </label>

            <label>
              Bio
              <textarea defaultValue={user.bio || ''} maxLength={280} name="bio" onChange={(event) => setBioLength(event.target.value.length)} placeholder="Tell the Foose community what you thrift, sell, or collect." rows={5} />
              <span className="text-xs font-semibold text-foose-muted">{bioLength}/280 characters</span>
            </label>
          </div>

          {error && <div className="mt-5"><ErrorState message={error} /></div>}
          {saved && <p className="mt-5 rounded-xl bg-foose-success-bg px-4 py-3 text-sm font-bold text-foose-success">Profile updated.</p>}

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
            <a className="inline-flex min-h-11 items-center justify-center rounded-xl border border-foose-border bg-white px-5 text-sm font-bold text-foose-text transition hover:border-accent hover:text-accent" href={withBasePath('/profile')}>
              Cancel
            </a>
            <button className="inline-flex min-h-11 items-center justify-center rounded-xl border border-accent bg-accent px-5 text-sm font-bold text-white shadow-md shadow-accent/15 transition hover:bg-accent-hover disabled:pointer-events-none disabled:border-foose-border disabled:bg-foose-surface-mid disabled:text-foose-faint disabled:shadow-none" disabled={submitting || !canSubmit} type="submit">
              {submitting ? 'Saving...' : 'Save profile'}
            </button>
          </div>
        </form>
      </section>
    </AppShell>
  )
}
