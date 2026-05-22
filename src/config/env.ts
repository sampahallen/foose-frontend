/**
 * Vite injects only variables prefixed with VITE_. See `.env.example`.
 */
function normalizeBaseUrl(url: string): string {
  return url.trim().replace(/\/$/, '')
}

/**
 * Base URL for REST calls, including the `/api` prefix (matches Express mounting).
 */
export function getApiBaseUrl(): string {
  const fromEnv = import.meta.env.VITE_API_BASE_URL
  if (typeof fromEnv === 'string' && fromEnv.trim()) {
    return normalizeBaseUrl(fromEnv)
  }

  if (import.meta.env.DEV) {
    // Same-origin `/api` + Vite proxy → backend (see `vite.config.ts`). Override with VITE_API_BASE_URL if needed.
    return '/api'
  }

  throw new Error(
    'VITE_API_BASE_URL is required for production builds. Set it in your environment or `.env.production`.',
  )
}

export function getAppName(): string {
  const name = import.meta.env.VITE_APP_NAME
  return typeof name === 'string' && name.trim() ? name.trim() : 'Foose'
}

export function getAuthStorageKey(): string {
  const key = import.meta.env.VITE_AUTH_STORAGE_KEY
  return typeof key === 'string' && key.trim() ? key.trim() : 'thrift.auth.tokens'
}

export function getCartStorageKey(): string {
  const key = import.meta.env.VITE_CART_STORAGE_KEY
  return typeof key === 'string' && key.trim() ? key.trim() : 'thrift.cart'
}
