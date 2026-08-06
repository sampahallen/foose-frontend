import { useThemeStore } from '../stores/themeStore'

export function useTheme() {
  const preference = useThemeStore((state) => state.preference)
  const resolvedTheme = useThemeStore((state) => state.resolvedTheme)
  const setPreference = useThemeStore((state) => state.setPreference)
  return { preference, resolvedTheme, setPreference }
}
