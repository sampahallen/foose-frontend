import {
  navigateTo,
  type NavigationFlashMessage,
} from './navigation'

export const NAVIGATION_FLASH_KEY = 'fooseFlash'

function isFlashMessage(value: unknown): value is NavigationFlashMessage {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Partial<NavigationFlashMessage>
  return (
    typeof candidate.message === 'string'
    && ['success', 'error', 'info', 'warning'].includes(candidate.tone || '')
  )
}

export function flashNavigationState(message: NavigationFlashMessage) {
  return { [NAVIGATION_FLASH_KEY]: message }
}

export function readNavigationFlash(): NavigationFlashMessage | null {
  if (typeof window === 'undefined') return null
  const state: unknown = window.history.state
  if (!state || typeof state !== 'object') return null
  const flash = (state as Record<string, unknown>)[NAVIGATION_FLASH_KEY]
  return isFlashMessage(flash) ? flash : null
}

export function consumeNavigationFlash(): NavigationFlashMessage | null {
  const flash = readNavigationFlash()
  if (!flash) return null

  const state = window.history.state as Record<string, unknown>
  const nextState = { ...state }
  delete nextState[NAVIGATION_FLASH_KEY]
  window.history.replaceState(nextState, '', window.location.href)
  return flash
}

export function navigateWithFlash(
  path: string,
  flash: NavigationFlashMessage,
  options: { replace?: boolean; state?: Record<string, unknown> } = {},
) {
  navigateTo(path, { ...options, flash })
}

export type { NavigationFlashMessage }
