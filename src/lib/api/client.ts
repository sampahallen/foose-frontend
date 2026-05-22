import { getApiBaseUrl } from '../../config/env'
import type { ApiEnvelope } from '../../types/api'
import { ApiError } from './errors'
import { getStoredTokens } from './tokens'

export type RequestOptions = Omit<RequestInit, 'body'> & {
  body?: unknown
  /** When false, do not send Bearer token (login, refresh, etc.) */
  auth?: boolean
}

async function parseJsonBody(response: Response): Promise<unknown | null> {
  const text = await response.text()
  if (!text) return null
  try {
    return JSON.parse(text) as unknown
  } catch {
    return null
  }
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const base = getApiBaseUrl()
  const headers = new Headers(options.headers)
  const tokens = getStoredTokens()
  const isFormData = options.body instanceof FormData

  if (!isFormData && options.body !== undefined) {
    headers.set('Content-Type', 'application/json')
  }

  if (options.auth !== false && tokens?.accessToken) {
    headers.set('Authorization', `Bearer ${tokens.accessToken}`)
  }

  const url = path.startsWith('http') ? path : `${base}${path.startsWith('/') ? path : `/${path}`}`

  const response = await fetch(url, {
    ...options,
    body: isFormData ? options.body : options.body === undefined ? undefined : JSON.stringify(options.body),
    headers,
  } as RequestInit)

  const payload = (await parseJsonBody(response)) as ApiEnvelope<T> | null

  if (!response.ok || !payload || payload.success !== true) {
    const message =
      payload && 'error' in payload && typeof payload.error === 'string'
        ? payload.error
        : response.statusText || 'Request failed'
    const details = payload && 'details' in payload ? payload.details : undefined
    throw new ApiError(message, response.status, details)
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
