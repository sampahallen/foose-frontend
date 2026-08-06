import { useState } from 'react'
import { AppShell, ChoiceCardGroup, InlineNotice, ToggleSwitch } from '../components'
import { FormPage, FormSection } from '../components/forms/FormLayout'
import { SettingsSkeleton } from '../components/operational/OperationalStates'
import { NavigationBackButton } from '../components/navigation'
import { useAuth } from '../hooks/useAuth'
import { useTheme } from '../hooks/useTheme'
import { apiPut } from '../lib/api'
import type { NotificationCategory, UserPreferences } from '../types/api'
import { getErrorMessage } from '../utils/errorMessage'

const DEFAULT_PREFERENCES: UserPreferences = {
  notifications: {
    chat: { email: true },
    order: { email: true },
    review: { email: true },
    system: { email: true, inApp: true },
  },
  theme: 'system',
}

const CATEGORIES: { category: NotificationCategory; description: string; label: string }[] = [
  { category: 'order', description: 'Order confirmations, status changes, and delivery updates.', label: 'Orders' },
  { category: 'chat', description: 'New messages from buyers and sellers.', label: 'Messages' },
  { category: 'review', description: 'New reviews on your shop.', label: 'Reviews' },
  { category: 'system', description: 'New followers, likes, and comments on your posts.', label: 'Follows and likes' },
]

type PreferencesUpdateBody = {
  notifications?: Partial<Record<NotificationCategory, Partial<{ email: boolean; inApp: boolean }>>>
  theme?: UserPreferences['theme']
}

export function PreferencesSettingsPage() {
  const { refreshUser, status, user } = useAuth()
  const { setPreference: setThemePreference } = useTheme()
  const [pendingKey, setPendingKey] = useState<string | null>(null)
  const [error, setError] = useState('')
  const preferences = user?.preferences ?? DEFAULT_PREFERENCES

  async function updatePreference(key: string, body: PreferencesUpdateBody) {
    setError('')
    setPendingKey(key)
    try {
      await apiPut('/users/me/preferences', body)
      await refreshUser()
    } catch (err) {
      setError(getErrorMessage(err, 'Could not save this preference'))
    } finally {
      setPendingKey(null)
    }
  }

  if (status === 'checking' || !user) return <AppShell active="profile"><NavigationBackButton className="mb-5" fallback={{ href: '/profile', label: 'Profile' }} /><SettingsSkeleton label="Loading preferences" /></AppShell>

  return (
    <AppShell active="profile" searchPlaceholder="Search Foose...">
      <FormPage
        aside={(
          <nav aria-label="Preferences sections" className="hidden rounded-2xl border border-foose-border bg-foose-surface p-3 shadow-sm lg:grid">
            <a className="min-h-11 rounded-xl px-3 py-3 text-sm font-bold text-foose-text transition hover:bg-accent-light hover:text-accent" href="#preferences-appearance">Appearance</a>
            <a className="min-h-11 rounded-xl px-3 py-3 text-sm font-bold text-foose-text transition hover:bg-accent-light hover:text-accent" href="#preferences-notifications">Notifications</a>
          </nav>
        )}
        description="Choose how Foose looks and which activity notifies you."
        eyebrow={<NavigationBackButton fallback={{ href: '/profile', label: 'Profile' }} />}
        title="Preferences"
        width="standard"
      >
        {error && <InlineNotice tone="error">{error}</InlineNotice>}

        <FormSection description="Choose how Foose looks on this device." id="preferences-appearance" title="Appearance">
          <ChoiceCardGroup<UserPreferences['theme']>
            label="Theme"
            name="theme"
            onChange={(value) => {
              setThemePreference(value)
              void updatePreference('theme', { theme: value })
            }}
            options={[
              { description: 'Always use the light theme.', label: 'Light', value: 'light' },
              { description: 'Always use the dark theme.', label: 'Dark', value: 'dark' },
              { description: "Follow this device's setting.", label: 'Match system', value: 'system' },
            ]}
            value={preferences.theme}
          />
        </FormSection>

        <FormSection description="Choose which activity sends you an email. Follows and likes can also be muted in-app entirely." id="preferences-notifications" title="Notifications">
          {CATEGORIES.map(({ category, description, label }) => (
            <div className="rounded-xl border border-foose-border p-4" key={category}>
              <h3 className="font-display text-base font-semibold text-foose-text">{label}</h3>
              <p className="mt-1 text-sm leading-6 text-foose-muted">{description}</p>
              <div className="mt-4 space-y-3">
                <ToggleSwitch
                  checked={preferences.notifications[category].email}
                  disabled={pendingKey === `${category}.email`}
                  label="Email"
                  onChange={(checked) => void updatePreference(`${category}.email`, { notifications: { [category]: { email: checked } } })}
                />
                {category === 'system' && (
                  <ToggleSwitch
                    checked={preferences.notifications.system.inApp}
                    description="Turn off to stop these appearing in your notification bell."
                    disabled={pendingKey === 'system.inApp'}
                    label="In-app"
                    onChange={(checked) => void updatePreference('system.inApp', { notifications: { system: { inApp: checked } } })}
                  />
                )}
              </div>
            </div>
          ))}
        </FormSection>
      </FormPage>
    </AppShell>
  )
}
