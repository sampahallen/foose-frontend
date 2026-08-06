import { useState, type FormEvent, type ReactNode } from 'react'
import { MdDarkMode, MdDevices, MdOutlineLightMode } from 'react-icons/md'
import { AppShell, Dialog, InlineNotice, TextField, ToggleSwitch } from '../components'
import { FormField, PasswordField } from '../components/forms/FormField'
import { SubmitButton } from '../components/forms/FormControls'
import { FormActions, FormPage, FormSection } from '../components/forms/FormLayout'
import { SettingsSkeleton } from '../components/operational/OperationalStates'
import { NavigationBackButton } from '../components/navigation'
import { useAuth } from '../hooks/useAuth'
import { useTheme } from '../hooks/useTheme'
import { apiDelete, apiPost, apiPut } from '../lib/api'
import type { NotificationCategory, UserPreferences } from '../types/api'
import { getErrorMessage } from '../utils/errorMessage'
import { getCurrentAppHref, withBasePath } from '../utils/navigation'

type SettingsTab = 'security' | 'preferences' | 'account'
type AccountAction = 'deactivate' | 'delete'

const SETTINGS_TABS: Array<{ label: string; value: SettingsTab }> = [
  { label: 'Security', value: 'security' },
  { label: 'Preferences', value: 'preferences' },
  { label: 'Account', value: 'account' },
]

const DEFAULT_PREFERENCES: UserPreferences = {
  notifications: {
    chat: { email: true },
    order: { email: true },
    review: { email: true },
    system: { email: true, inApp: true },
  },
  theme: 'system',
}

const THEME_OPTIONS: Array<{ icon: typeof MdOutlineLightMode; label: string; value: UserPreferences['theme'] }> = [
  { icon: MdOutlineLightMode, label: 'Light', value: 'light' },
  { icon: MdDarkMode, label: 'Dark', value: 'dark' },
  { icon: MdDevices, label: 'System', value: 'system' },
]

const NOTIFICATION_CATEGORIES: { category: NotificationCategory; description: string; label: string }[] = [
  { category: 'order', description: 'Order confirmations, status changes, and delivery updates.', label: 'Orders' },
  { category: 'chat', description: 'New messages from buyers and sellers.', label: 'Messages' },
  { category: 'review', description: 'New reviews on your shop.', label: 'Reviews' },
  { category: 'system', description: 'New followers, likes, and comments on your posts.', label: 'Follows and likes' },
]

type PreferencesUpdateBody = {
  notifications?: Partial<Record<NotificationCategory, Partial<{ email: boolean; inApp: boolean }>>>
  theme?: UserPreferences['theme']
}

function currentSettingsTab(): SettingsTab {
  const tab = new URL(getCurrentAppHref(), window.location.origin).searchParams.get('tab')
  return SETTINGS_TABS.some((item) => item.value === tab) ? tab as SettingsTab : 'security'
}

function settingsPageHref(tab: SettingsTab) {
  return `/settings?tab=${tab}`
}

function SettingsPanel({ active, children, id }: { active: boolean; children: ReactNode; id: SettingsTab }) {
  return (
    <section aria-labelledby={`settings-tab-${id}`} hidden={!active} id={`settings-panel-${id}`}>
      {children}
    </section>
  )
}

function ThemeChoiceGroup({
  onChange,
  value,
}: {
  onChange: (value: UserPreferences['theme']) => void
  value: UserPreferences['theme']
}) {
  const groupId = 'preferences-theme'
  return (
    <FormField htmlFor={groupId} label="Theme" labelId={`${groupId}-label`}>
      <div aria-labelledby={`${groupId}-label`} className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-3" id={groupId} role="radiogroup">
        {THEME_OPTIONS.map((option) => {
          const optionId = `${groupId}-${option.value}`
          const active = value === option.value
          const Icon = option.icon
          return (
            <label
              className={`flex min-h-11 min-w-0 cursor-pointer items-center justify-center gap-2 rounded-full border px-4 text-sm font-bold outline-none transition focus-within:ring-2 focus-within:ring-accent/20 ${active ? 'border-accent bg-accent-light text-accent' : 'border-foose-border bg-foose-surface text-foose-text hover:border-accent/50 hover:text-accent'}`}
              htmlFor={optionId}
              key={option.value}
            >
              <input
                checked={active}
                className="sr-only"
                id={optionId}
                name="theme"
                onChange={() => onChange(option.value)}
                type="radio"
                value={option.value}
              />
              <Icon aria-hidden="true" size={18} />
              {option.label}
            </label>
          )
        })}
      </div>
    </FormField>
  )
}

function AccountConfirmModal({
  action,
  busy,
  confirmText,
  onClose,
  onConfirm,
  setConfirmText,
}: {
  action: AccountAction
  busy: boolean
  confirmText: string
  onClose: () => void
  onConfirm: () => void
  setConfirmText: (value: string) => void
}) {
  const isDelete = action === 'delete'
  const canConfirm = !busy && (!isDelete || confirmText === 'DELETE')

  return (
    <Dialog
      description={isDelete
        ? 'Your account will be removed. Your username and email may be used again. This cannot be undone.'
        : 'Your account will be hidden and you will be signed out. You can come back by logging in and verifying again.'}
      dismissible={!busy}
      footer={(
        <>
          <button
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-foose-border bg-foose-surface px-5 text-sm font-bold text-foose-text transition hover:border-accent hover:text-accent disabled:pointer-events-none disabled:opacity-60"
            disabled={busy}
            onClick={onClose}
            type="button"
          >
            Cancel
          </button>
          <button
            aria-busy={busy || undefined}
            className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border px-5 text-sm font-bold text-white transition disabled:pointer-events-none disabled:border-foose-border disabled:bg-foose-surface-mid disabled:text-foose-faint ${isDelete ? 'border-foose-danger bg-foose-danger hover:brightness-95' : 'border-accent bg-accent hover:bg-accent-hover'}`}
            disabled={!canConfirm}
            onClick={onConfirm}
            type="button"
          >
            {busy && <span aria-hidden className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent motion-reduce:animate-none" />}
            {busy ? 'Working…' : isDelete ? 'Delete account' : 'Deactivate account'}
          </button>
        </>
      )}
      onClose={onClose}
      open
      size="sm"
      title={isDelete ? 'Delete account?' : 'Deactivate account?'}
    >
      {isDelete ? (
        <TextField
          autoComplete="off"
          autoFocus
          hint="This confirmation is case-sensitive."
          id="account-delete-confirmation"
          label={<>Type <strong>DELETE</strong> to confirm</>}
          onChange={(event) => setConfirmText(event.target.value)}
          value={confirmText}
        />
      ) : (
        <InlineNotice tone="warning">You will be signed out immediately after deactivation.</InlineNotice>
      )}
    </Dialog>
  )
}

export function SettingsPage() {
  const { logout, refreshUser, status, user } = useAuth()
  const { setPreference: setThemePreference } = useTheme()
  const activeTab = currentSettingsTab()

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

  const [pendingPreferenceKey, setPendingPreferenceKey] = useState<string | null>(null)
  const [preferencesError, setPreferencesError] = useState('')
  const preferences = user?.preferences ?? DEFAULT_PREFERENCES

  const [modalAction, setModalAction] = useState<AccountAction | null>(null)
  const [busyAction, setBusyAction] = useState<AccountAction | null>(null)
  const [confirmText, setConfirmText] = useState('')
  const [accountError, setAccountError] = useState('')

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

  async function updatePreference(key: string, body: PreferencesUpdateBody) {
    setPreferencesError('')
    setPendingPreferenceKey(key)
    try {
      await apiPut('/users/me/preferences', body)
      await refreshUser()
    } catch (err) {
      setPreferencesError(getErrorMessage(err, 'Could not save this preference'))
    } finally {
      setPendingPreferenceKey(null)
    }
  }

  function closeAccountModal() {
    if (busyAction) return
    setModalAction(null)
    setConfirmText('')
  }

  function openAccountModal(action: AccountAction) {
    setAccountError('')
    setConfirmText('')
    setModalAction(action)
  }

  async function confirmAccountAction() {
    if (!modalAction) return
    setBusyAction(modalAction)
    setAccountError('')

    try {
      if (modalAction === 'deactivate') {
        await apiPost<{ scheduledDeletionAt: string }>('/users/me/deactivate')
      } else {
        await apiDelete('/users/me', { body: { confirmation: 'DELETE' } })
      }
      await logout()
    } catch (err) {
      setAccountError(getErrorMessage(err, modalAction === 'delete' ? 'Could not delete your account' : 'Could not deactivate your account'))
      setBusyAction(null)
      setModalAction(null)
      setConfirmText('')
    }
  }

  if (status === 'checking' || !user) return <AppShell active="profile"><NavigationBackButton className="mb-5" fallback={{ href: '/profile', label: 'Profile' }} /><SettingsSkeleton label="Loading settings" /></AppShell>

  return (
    <AppShell active="profile" searchPlaceholder="Search Foose...">
      <FormPage
        description="Manage your password, notifications, and account access."
        eyebrow={<NavigationBackButton fallback={{ href: '/profile', label: 'Profile' }} />}
        title="Settings"
        width="standard"
      >
        <nav aria-label="Settings sections" className="sticky top-16 z-30 mb-2 overflow-hidden border-b border-foose-border bg-foose-bg/95 backdrop-blur">
          <div className="grid w-full grid-cols-3">
            {SETTINGS_TABS.map((tab) => {
              const active = activeTab === tab.value
              return (
                <a
                  aria-current={active ? 'page' : undefined}
                  className={`inline-flex min-h-12 min-w-0 items-center justify-center whitespace-nowrap border-b-2 px-1 text-xs font-black transition focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent sm:px-3 sm:text-sm ${active ? 'border-accent text-accent' : 'border-transparent text-foose-muted hover:border-accent/40 hover:text-accent'}`}
                  href={withBasePath(settingsPageHref(tab.value))}
                  id={`settings-tab-${tab.value}`}
                  key={tab.value}
                >
                  {tab.label}
                </a>
              )
            })}
          </div>
        </nav>

        <SettingsPanel active={activeTab === 'security'} id="security">
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

          <form className="mt-4 sm:mt-6" id="security-email" noValidate onSubmit={(event) => void submitEmailChange(event)}>
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
        </SettingsPanel>

        <SettingsPanel active={activeTab === 'preferences'} id="preferences">
          {preferencesError && <InlineNotice tone="error">{preferencesError}</InlineNotice>}

          <FormSection description="Choose how Foose looks on this device." title="Appearance">
            <ThemeChoiceGroup
              onChange={(value) => {
                setThemePreference(value)
                void updatePreference('theme', { theme: value })
              }}
              value={preferences.theme}
            />
          </FormSection>

          <FormSection className="mt-4 sm:mt-6" description="Choose which activity sends you an email. Follows and likes can also be muted in-app entirely." title="Notifications">
            {NOTIFICATION_CATEGORIES.map(({ category, description, label }) => (
              <div className="rounded-xl border border-foose-border p-4" key={category}>
                <h3 className="font-display text-base font-semibold text-foose-text">{label}</h3>
                <p className="mt-1 text-sm leading-6 text-foose-muted">{description}</p>
                <div className="mt-4 space-y-3">
                  <ToggleSwitch
                    checked={preferences.notifications[category].email}
                    disabled={pendingPreferenceKey === `${category}.email`}
                    label="Email"
                    onChange={(checked) => void updatePreference(`${category}.email`, { notifications: { [category]: { email: checked } } })}
                  />
                  {category === 'system' && (
                    <ToggleSwitch
                      checked={preferences.notifications.system.inApp}
                      description="Turn off to stop these appearing in your notification bell."
                      disabled={pendingPreferenceKey === 'system.inApp'}
                      label="In-app"
                      onChange={(checked) => void updatePreference('system.inApp', { notifications: { system: { inApp: checked } } })}
                    />
                  )}
                </div>
              </div>
            ))}
          </FormSection>
        </SettingsPanel>

        <SettingsPanel active={activeTab === 'account'} id="account">
          {accountError && <InlineNotice className="mb-5" title="Account action failed" tone="error">{accountError}</InlineNotice>}

          <section className="rounded-2xl border border-foose-danger/25 bg-foose-surface p-4 shadow-sm sm:p-6 md:p-8">
            <div className="flex flex-col gap-2 border-b border-foose-border pb-5">
              <span className="text-xs font-black uppercase tracking-[0.18em] text-foose-danger">Account actions</span>
              <h2 className="font-display text-2xl font-bold text-foose-text">Deactivate or delete account</h2>
              <p className="text-sm leading-6 text-foose-muted">These actions are serious. We will ask you to confirm before continuing.</p>
            </div>

            <div className="grid gap-4 pt-5 md:grid-cols-2">
              <div className="rounded-xl border border-foose-border bg-foose-surface-low p-4">
                <h3 className="text-base font-bold text-foose-text">Deactivate account</h3>
                <p className="mt-2 text-sm leading-6 text-foose-muted">Hide your account for now. You can come back later.</p>
                <button
                  className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-foose-border bg-foose-surface px-5 text-sm font-bold text-foose-text transition hover:border-foose-danger hover:text-foose-danger disabled:pointer-events-none disabled:bg-foose-surface-mid disabled:text-foose-faint"
                  disabled={busyAction !== null}
                  onClick={() => openAccountModal('deactivate')}
                  type="button"
                >
                  Deactivate account
                </button>
              </div>

              <div className="rounded-xl border border-foose-danger/30 bg-foose-danger/5 p-4">
                <h3 className="text-base font-bold text-foose-danger">Delete account</h3>
                <p className="mt-2 text-sm leading-6 text-foose-muted">Remove your account from Foose. This cannot be undone.</p>
                <button
                  className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-foose-danger bg-foose-danger px-5 text-sm font-bold text-white transition hover:brightness-95 disabled:pointer-events-none disabled:border-foose-border disabled:bg-foose-surface-mid disabled:text-foose-faint"
                  disabled={busyAction !== null}
                  onClick={() => openAccountModal('delete')}
                  type="button"
                >
                  Delete account
                </button>
              </div>
            </div>
          </section>
        </SettingsPanel>
      </FormPage>

      {modalAction && (
        <AccountConfirmModal
          action={modalAction}
          busy={busyAction === modalAction}
          confirmText={confirmText}
          onClose={closeAccountModal}
          onConfirm={() => void confirmAccountAction()}
          setConfirmText={setConfirmText}
        />
      )}
    </AppShell>
  )
}
