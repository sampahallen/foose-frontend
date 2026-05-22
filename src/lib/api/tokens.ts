import { getAuthStorageKey } from '../../config/env'
import type { AuthTokens } from '../../types/api'

function storageKey() {
  return getAuthStorageKey()
}

export function getStoredTokens(): AuthTokens | null {
  const rawTokens = window.localStorage.getItem(storageKey())
  if (!rawTokens) return null

  try {
    return JSON.parse(rawTokens) as AuthTokens
  } catch {
    window.localStorage.removeItem(storageKey())
    return null
  }
}

export function storeTokens(tokens: AuthTokens) {
  window.localStorage.setItem(storageKey(), JSON.stringify(tokens))
}

export function clearStoredTokens() {
  window.localStorage.removeItem(storageKey())
}
