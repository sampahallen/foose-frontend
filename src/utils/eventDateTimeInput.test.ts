import { describe, expect, it } from 'vitest'
import { formatDateInput, formatDateTyping, formatTimeTyping, parseDateInput, parseStoredTime, to24HourTime } from './eventDateTimeInput'

describe('typed event date and time fields', () => {
  it('formats and validates DD/MM/YYYY dates', () => {
    expect(formatDateInput('2026-07-23T00:00:00.000Z')).toBe('23/07/2026')
    expect(formatDateTyping('23072026')).toBe('23/07/2026')
    expect(parseDateInput('23/07/2026')).toBe('2026-07-23')
    expect(parseDateInput('31/02/2026')).toBeNull()
  })

  it('formats typed time and converts between 12-hour and stored 24-hour values', () => {
    expect(formatTimeTyping('0830')).toBe('08:30')
    expect(to24HourTime('12:15', 'AM')).toBe('00:15')
    expect(to24HourTime('01:45', 'PM')).toBe('13:45')
    expect(to24HourTime('13:00', 'PM')).toBeNull()
    expect(parseStoredTime('18:05')).toEqual({ period: 'PM', time: '06:05' })
  })
})
