import type { Event, Listing } from '../types/api'
import { formatDate } from './format'

export function normalizedEventType(event: Pick<Event, 'type'>) {
  if (event.type === 'online') return 'online-pop-up'
  if (event.type === 'pop-up' || event.type === 'fair') return 'in-person-pop-up'
  return event.type
}

export function isOnlinePopUp(event: Pick<Event, 'type'>) {
  return normalizedEventType(event) === 'online-pop-up'
}

export function eventTypeLabel(event: Pick<Event, 'type'>) {
  return isOnlinePopUp(event) ? 'Online pop-up' : 'In-person pop-up'
}

export function eventHostName(event: Pick<Event, 'organizerId' | 'shopId'>) {
  if (event.organizerId && typeof event.organizerId === 'object') return event.organizerId.username ? `@${event.organizerId.username}` : 'Foose member'
  if (event.shopId && typeof event.shopId === 'object') return event.shopId.shopName
  return 'Foose member'
}

export function eventHostHref(event: Pick<Event, 'organizerId' | 'shopId'>) {
  if (event.shopId && typeof event.shopId === 'object' && event.shopId.slug) return `/shops/${event.shopId.slug}`
  if (event.organizerId && typeof event.organizerId === 'object' && event.organizerId.username) return `/profile/${event.organizerId.username}`
  return ''
}

export function eventTimeLabel(event: Pick<Event, 'date' | 'endTime' | 'startTime'>) {
  const start = event.startTime || ''
  const end = event.endTime || ''
  const time = start && end ? `${start} - ${end}` : start || 'Time pending'
  return `${formatDate(event.date)} · ${time}`
}

export function eventTimeTerm(event: Pick<Event, 'type'>) {
  return isOnlinePopUp(event) ? 'Window' : 'Time'
}

export function concreteEventListings(event: Pick<Event, 'eventListings'>): Listing[] {
  return (event.eventListings || []).filter((listing): listing is Listing => typeof listing === 'object')
}

export function eventWindowHasOpened(event: Pick<Event, 'startsAt'>) {
  if (!event.startsAt) return false
  return Date.now() >= new Date(event.startsAt).getTime()
}

export function eventWindowHasClosed(event: Pick<Event, 'endsAt' | 'status'>) {
  if (event.status === 'past') return true
  if (!event.endsAt) return false
  return Date.now() > new Date(event.endsAt).getTime()
}
