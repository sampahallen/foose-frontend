import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

export const DEFAULT_DRAFT_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000
const DRAFT_PREFIX = 'foose:draft:'
const SENSITIVE_KEY = /(?:password|passcode|token|secret|kyc|ghana.?card|identity.?number|id.?number|card.?number|cvv|cvc|payout|payment|account.?number|mobile.?money)/i

type DraftEnvelope<T> = {
  savedAt: number
  userId: string
  value: Partial<T>
  version: number
}

export type LocalDraftOptions<T extends Record<string, unknown>> = {
  debounceMs?: number
  enabled?: boolean
  expiresInMs?: number
  formId: string
  onRestore?: (draft: Partial<T>) => void
  resourceId?: string
  sensitiveFields?: Array<keyof T | string>
  userId?: string | null
  value: T
  version?: number
}

function storageAvailable() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function safePart(value: string) {
  return encodeURIComponent(value.trim() || 'default')
}

export function localDraftKey({
  formId,
  resourceId = 'new',
  userId = 'guest',
  version = 1,
}: {
  formId: string
  resourceId?: string
  userId?: string | null
  version?: number
}) {
  return `${DRAFT_PREFIX}v${version}:${safePart(userId || 'guest')}:${safePart(formId)}:${safePart(resourceId)}`
}

function isFileValue(value: unknown) {
  return (typeof File !== 'undefined' && value instanceof File)
    || (typeof Blob !== 'undefined' && value instanceof Blob)
    || (typeof FileList !== 'undefined' && value instanceof FileList)
}

function cleanDraftValue(value: unknown, excluded: Set<string>, key = '', seen = new WeakSet<object>()): unknown {
  if (key && (SENSITIVE_KEY.test(key) || excluded.has(key.toLowerCase()))) return undefined
  if (value === null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value
  if (value === undefined || typeof value === 'function' || typeof value === 'symbol' || typeof value === 'bigint' || isFileValue(value)) return undefined
  if (value instanceof Date) return value.toISOString()
  if (typeof value !== 'object') return undefined
  if (seen.has(value)) return undefined
  seen.add(value)

  if (Array.isArray(value)) {
    return value.flatMap((item) => {
      const cleaned = cleanDraftValue(item, excluded, key, seen)
      return cleaned === undefined ? [] : [cleaned]
    })
  }

  const result: Record<string, unknown> = {}
  for (const [childKey, childValue] of Object.entries(value)) {
    const cleaned = cleanDraftValue(childValue, excluded, childKey, seen)
    if (cleaned !== undefined) result[childKey] = cleaned
  }
  return result
}

export function sanitizeDraftValue<T extends Record<string, unknown>>(
  value: T,
  sensitiveFields: Array<keyof T | string> = [],
): Partial<T> {
  const excluded = new Set(sensitiveFields.map((field) => String(field).toLowerCase()))
  return (cleanDraftValue(value, excluded) || {}) as Partial<T>
}

function readDraft<T extends Record<string, unknown>>(
  key: string,
  expectedUserId: string,
  version: number,
  expiresInMs: number,
): DraftEnvelope<T> | null {
  if (!storageAvailable()) return null
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return null
    const parsed = JSON.parse(raw) as DraftEnvelope<T>
    const valid = parsed
      && parsed.version === version
      && parsed.userId === expectedUserId
      && Number.isFinite(parsed.savedAt)
      && Date.now() - parsed.savedAt <= expiresInMs
      && parsed.value
      && typeof parsed.value === 'object'
    if (valid) return parsed
    window.localStorage.removeItem(key)
  } catch {
    // Corrupt or unavailable storage should never block a form.
  }
  return null
}

export function clearLocalDrafts(userId?: string | null) {
  if (!storageAvailable()) return
  const userSegment = userId ? `:${safePart(userId)}:` : ''
  try {
    for (let index = window.localStorage.length - 1; index >= 0; index -= 1) {
      const key = window.localStorage.key(index)
      if (key?.startsWith(DRAFT_PREFIX) && (!userSegment || key.includes(userSegment))) {
        window.localStorage.removeItem(key)
      }
    }
  } catch {
    // Clearing drafts is best-effort in restricted storage contexts.
  }
}

export function useLocalDraft<T extends Record<string, unknown>>({
  debounceMs = 500,
  enabled = true,
  expiresInMs = DEFAULT_DRAFT_EXPIRY_MS,
  formId,
  onRestore,
  resourceId,
  sensitiveFields = [],
  userId,
  value,
  version = 1,
}: LocalDraftOptions<T>) {
  const resolvedUserId = userId || 'guest'
  const key = useMemo(
    () => localDraftKey({ formId, resourceId, userId: resolvedUserId, version }),
    [formId, resourceId, resolvedUserId, version],
  )
  const sensitiveFieldKey = sensitiveFields.map(String).sort().join('\u0000')
  const serializedValue = JSON.stringify(sanitizeDraftValue(value, sensitiveFieldKey ? sensitiveFieldKey.split('\u0000') : []))
  const clearedValueRef = useRef<string | null>(null)
  const [recovery, setRecovery] = useState(() => {
    const draft = enabled ? readDraft<T>(key, resolvedUserId, version, expiresInMs) : null
    return { draft: draft?.value || null, pending: Boolean(draft), savedAt: draft?.savedAt || null }
  })

  const discardDraft = useCallback(() => {
    try {
      window.localStorage.removeItem(key)
    } catch {
      // Forms remain usable without local storage.
    }
    setRecovery({ draft: null, pending: false, savedAt: null })
  }, [key])

  const clearDraft = useCallback(() => {
    try {
      window.localStorage.removeItem(key)
    } catch {
      // Forms remain usable without local storage.
    }
    clearedValueRef.current = serializedValue
    setRecovery({ draft: null, pending: false, savedAt: null })
  }, [key, serializedValue])

  const resumeDraft = useCallback(() => {
    if (!recovery.draft) return null
    onRestore?.(recovery.draft)
    setRecovery((current) => ({ ...current, pending: false }))
    return recovery.draft
  }, [onRestore, recovery.draft])

  useEffect(() => {
    if (!enabled || recovery.pending || !storageAvailable() || clearedValueRef.current === serializedValue) return undefined
    const timer = window.setTimeout(() => {
      const savedAt = Date.now()
      const envelope: DraftEnvelope<T> = { savedAt, userId: resolvedUserId, value: JSON.parse(serializedValue) as Partial<T>, version }
      try {
        window.localStorage.setItem(key, JSON.stringify(envelope))
        clearedValueRef.current = null
        setRecovery((current) => ({ ...current, savedAt }))
      } catch {
        // Quota and privacy-mode failures should not interrupt the form.
      }
    }, Math.max(0, debounceMs))
    return () => window.clearTimeout(timer)
  }, [debounceMs, enabled, key, recovery.pending, resolvedUserId, serializedValue, version])

  return {
    clearDraft,
    discardDraft,
    hasRecoverableDraft: recovery.pending && Boolean(recovery.draft),
    lastSavedAt: recovery.savedAt,
    recoverableDraft: recovery.draft,
    resumeDraft,
    storageKey: key,
  }
}
