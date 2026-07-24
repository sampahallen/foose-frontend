function validDate(value?: string | null) {
  if (!value) return null
  const timestamp = new Date(value).getTime()
  return Number.isFinite(timestamp) ? timestamp : null
}

export function formatOrderCountdown(
  deadline?: string | null,
  serverNow?: string | null,
  clientNow = Date.now(),
  clientReceivedAt = clientNow,
) {
  const deadlineTime = validDate(deadline)
  if (deadlineTime === null) return ''
  const serverTime = validDate(serverNow)
  const effectiveNow = clientNow + (serverTime === null ? 0 : serverTime - clientReceivedAt)
  const remaining = deadlineTime - effectiveNow
  if (remaining <= 0) return 'Window reached'

  const totalMinutes = Math.ceil(remaining / 60_000)
  const days = Math.floor(totalMinutes / (24 * 60))
  const hours = Math.floor((totalMinutes % (24 * 60)) / 60)
  const minutes = totalMinutes % 60
  if (days) return `${days}d ${hours}h remaining`
  if (hours) return `${hours}h ${minutes}m remaining`
  return `${Math.max(minutes, 1)}m remaining`
}
