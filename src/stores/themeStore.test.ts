import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { THEME_STORAGE_KEY, useThemeStore } from './themeStore'

describe('useThemeStore', () => {
  beforeEach(() => {
    window.localStorage.clear()
    document.documentElement.removeAttribute('data-theme')
  })

  afterEach(() => {
    useThemeStore.setState({ preference: 'system', resolvedTheme: 'light' })
  })

  it('setPreference applies the theme to the document and persists it', () => {
    useThemeStore.getState().setPreference('dark')

    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark')
    expect(useThemeStore.getState().preference).toBe('dark')
    expect(useThemeStore.getState().resolvedTheme).toBe('dark')
  })

  it('resolves "system" using the OS preference', () => {
    vi.stubGlobal('matchMedia', (query: string) => ({
      addEventListener: () => {},
      matches: true,
      media: query,
      removeEventListener: () => {},
    }))

    useThemeStore.getState().setPreference('system')

    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(useThemeStore.getState().resolvedTheme).toBe('dark')
  })

  it('syncFromServer applies a preference saved on the account', () => {
    useThemeStore.getState().syncFromServer('dark')

    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(useThemeStore.getState().preference).toBe('dark')
  })

  it('syncFromServer is a no-op when the preference already matches', () => {
    useThemeStore.getState().setPreference('light')
    document.documentElement.dataset.theme = 'dark'

    useThemeStore.getState().syncFromServer('light')

    expect(document.documentElement.dataset.theme).toBe('dark')
  })
})
