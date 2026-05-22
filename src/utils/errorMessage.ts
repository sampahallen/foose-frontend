import { ApiError } from '../lib/api'

function validationDetail(details: unknown): string | null {
  if (!Array.isArray(details) || details.length === 0) return null
  const first = details[0]
  if (first && typeof first === 'object' && 'message' in first && typeof first.message === 'string') {
    return first.message
  }
  return null
}

export function getErrorMessage(error: unknown, fallback = 'Something went wrong'): string {
  if (error instanceof ApiError) {
    const fromIssues = validationDetail(error.details)
    if (fromIssues) return fromIssues
    return error.message
  }
  if (error instanceof Error) return error.message
  return fallback
}
