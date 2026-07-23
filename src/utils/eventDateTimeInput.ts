export type Meridiem = 'AM' | 'PM'

export function formatDateInput(value?: string) {
  if (!value) return ''
  const iso = value.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!iso) return value
  return `${iso[3]}/${iso[2]}/${iso[1]}`
}

export function formatDateTyping(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 8)
  if (digits.length <= 2) return digits
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`
}

export function parseDateInput(value: string) {
  const match = value.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (!match) return null
  const [, dayText, monthText, yearText] = match
  const day = Number(dayText)
  const month = Number(monthText)
  const year = Number(yearText)
  const parsed = new Date(Date.UTC(year, month - 1, day))
  if (parsed.getUTCFullYear() !== year || parsed.getUTCMonth() !== month - 1 || parsed.getUTCDate() !== day) return null
  return `${yearText}-${monthText}-${dayText}`
}

export function formatTimeTyping(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 4)
  if (digits.length <= 2) return digits
  return `${digits.slice(0, 2)}:${digits.slice(2)}`
}

export function parseStoredTime(value?: string): { period: Meridiem; time: string } {
  const match = String(value || '').match(/^(\d{1,2}):(\d{2})$/)
  if (!match) return { period: 'AM', time: '' }
  const hour = Number(match[1])
  const minute = Number(match[2])
  if (hour > 23 || minute > 59) return { period: 'AM', time: '' }
  const period: Meridiem = hour >= 12 ? 'PM' : 'AM'
  const displayHour = hour % 12 || 12
  return { period, time: `${String(displayHour).padStart(2, '0')}:${String(minute).padStart(2, '0')}` }
}

export function to24HourTime(value: string, period: Meridiem) {
  const match = value.trim().match(/^(\d{2}):(\d{2})$/)
  if (!match) return null
  const hour = Number(match[1])
  const minute = Number(match[2])
  if (hour < 1 || hour > 12 || minute > 59) return null
  const normalizedHour = (hour % 12) + (period === 'PM' ? 12 : 0)
  return `${String(normalizedHour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}
