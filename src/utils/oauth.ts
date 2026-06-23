import { getApiBaseUrl } from '../config/env'

export type OAuthProvider = 'google' | 'apple'

export function startOAuth(provider: OAuthProvider, redirectTarget: string) {
  const base = getApiBaseUrl()
  const params = new URLSearchParams({ redirect: redirectTarget || '/' })
  window.location.assign(`${base}/auth/oauth/${provider}?${params.toString()}`)
}
