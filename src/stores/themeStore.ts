import { create } from 'zustand'

export const THEME_STORAGE_KEY = 'foose-theme'

export type ThemePreference = 'light' | 'dark' | 'system'
export type ResolvedTheme = 'light' | 'dark'

type ThemeState = {
  preference: ThemePreference
  resolvedTheme: ResolvedTheme
  setPreference: (preference: ThemePreference) => void
  syncFromServer: (preference: ThemePreference) => void
}

function prefersDark() {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-color-scheme: dark)').matches
}

function resolveTheme(preference: ThemePreference): ResolvedTheme {
  return preference === 'system' ? (prefersDark() ? 'dark' : 'light') : preference
}

function readStoredPreference(): ThemePreference {
  if (typeof window === 'undefined') return 'system'
  const stored = window.localStorage.getItem(THEME_STORAGE_KEY)
  return stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'system'
}

function applyTheme(resolvedTheme: ResolvedTheme) {
  if (typeof document !== 'undefined') document.documentElement.dataset.theme = resolvedTheme
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  preference: readStoredPreference(),
  resolvedTheme: resolveTheme(readStoredPreference()),
  setPreference: (preference) => {
    const resolvedTheme = resolveTheme(preference)
    if (typeof window !== 'undefined') window.localStorage.setItem(THEME_STORAGE_KEY, preference)
    applyTheme(resolvedTheme)
    set({ preference, resolvedTheme })
  },
  syncFromServer: (preference) => {
    if (get().preference === preference) return
    const resolvedTheme = resolveTheme(preference)
    if (typeof window !== 'undefined') window.localStorage.setItem(THEME_STORAGE_KEY, preference)
    applyTheme(resolvedTheme)
    set({ preference, resolvedTheme })
  },
}))

if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (useThemeStore.getState().preference !== 'system') return
    const resolvedTheme = resolveTheme('system')
    applyTheme(resolvedTheme)
    useThemeStore.setState({ resolvedTheme })
  })
}
