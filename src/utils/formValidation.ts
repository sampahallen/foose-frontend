export const passwordRules = [
  { id: 'length', label: 'At least 8 characters', test: (value: string) => value.length >= 8 },
  { id: 'number', label: 'One number', test: (value: string) => /\d/.test(value) },
  { id: 'symbol', label: 'One symbol', test: (value: string) => /[^A-Za-z0-9]/.test(value) },
  { id: 'capital', label: 'One capital letter', test: (value: string) => /[A-Z]/.test(value) },
] as const

export function passwordMeetsRequirements(value: string) {
  return passwordRules.every((rule) => rule.test(value))
}

export function emailLooksValid(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
}

export function usernameLooksValid(value: string) {
  return /^[a-zA-Z0-9_.]{3,20}$/.test(value.trim())
}

export function normalizePhone(value: string) {
  const digits = value.replace(/\D/g, '')
  if (!digits) return ''
  if (digits.startsWith('233')) return `0${digits.slice(3)}`
  if (digits.startsWith('00233')) return `0${digits.slice(5)}`
  return digits.startsWith('0') ? digits : `0${digits}`
}

export function formIsValid(form: HTMLFormElement | null) {
  if (!form) return false
  return form.checkValidity()
}
