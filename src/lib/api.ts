import type { ApiEnvelope, AuthTokens } from '../types/api'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api'
const TOKEN_STORAGE_KEY = 'foose.auth.tokens'

export class ApiError extends Error {
  status: number
  details?: unknown

  constructor(message: string, status: number, details?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.details = details
  }
}

export function getStoredTokens(): AuthTokens | null {
  const rawTokens = window.localStorage.getItem(TOKEN_STORAGE_KEY)
  if (!rawTokens) return null

  try {
    return JSON.parse(rawTokens) as AuthTokens
  } catch {
    window.localStorage.removeItem(TOKEN_STORAGE_KEY)
    return null
  }
}

export function storeTokens(tokens: AuthTokens) {
  window.localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(tokens))
}

export function clearStoredTokens() {
  window.localStorage.removeItem(TOKEN_STORAGE_KEY)
}

type RequestOptions = Omit<RequestInit, 'body'> & {
  body?: unknown
  auth?: boolean
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}) {
  const headers = new Headers(options.headers)
  const tokens = getStoredTokens()
  const isFormData = options.body instanceof FormData

  if (!isFormData && options.body !== undefined) {
    headers.set('Content-Type', 'application/json')
  }

  if (options.auth !== false && tokens?.accessToken) {
    headers.set('Authorization', `Bearer ${tokens.accessToken}`)
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    body: isFormData ? options.body : options.body === undefined ? undefined : JSON.stringify(options.body),
    headers,
  } as RequestInit)
  const payload = (await response.json().catch(() => null)) as ApiEnvelope<T> | null

  if (!response.ok || !payload?.success) {
    throw new ApiError(
      payload && 'error' in payload ? payload.error : 'Request failed',
      response.status,
      payload && 'details' in payload ? payload.details : undefined,
    )
  }

  return payload.data
}

export function apiGet<T>(path: string, options?: RequestOptions) {
  return apiRequest<T>(path, { ...options, method: 'GET' })
}

export function apiPost<T>(path: string, body?: unknown, options?: RequestOptions) {
  return apiRequest<T>(path, { ...options, body, method: 'POST' })
}

export function apiPut<T>(path: string, body?: unknown, options?: RequestOptions) {
  return apiRequest<T>(path, { ...options, body, method: 'PUT' })
}

export function apiDelete<T>(path: string, options?: RequestOptions) {
  return apiRequest<T>(path, { ...options, method: 'DELETE' })
}
