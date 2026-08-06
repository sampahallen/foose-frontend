import { useEffect } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { useThemeStore } from '../../stores/themeStore'

// The signed-in user's saved theme preference wins over whatever a guest
// session had chosen locally on this device.
export function ThemeSync() {
  const { user } = useAuth()
  const serverTheme = user?.preferences?.theme

  useEffect(() => {
    if (!serverTheme) return
    useThemeStore.getState().syncFromServer(serverTheme)
  }, [serverTheme])

  return null
}
