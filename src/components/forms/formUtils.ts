import type { ReactNode } from 'react'

export function fieldDescriptionIds(id: string, hint?: ReactNode, error?: ReactNode) {
  return [hint ? `${id}-hint` : '', error ? `${id}-error` : ''].filter(Boolean).join(' ') || undefined
}
