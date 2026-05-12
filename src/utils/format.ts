import type { Listing, Shop } from '../types/api'

export function formatMoney(value = 0, currency = 'GHS') {
  const majorValue = value / 100
  return new Intl.NumberFormat('en-GH', {
    currency,
    currencyDisplay: 'code',
    style: 'currency',
  }).format(majorValue)
}

export function formatDate(value?: string) {
  if (!value) return 'Not set'
  return new Intl.DateTimeFormat('en-GH', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value))
}

export function formatDateTime(value?: string) {
  if (!value) return 'Not set'
  return new Intl.DateTimeFormat('en-GH', {
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value))
}

export function getListingImage(listing: Listing) {
  return listing.images?.find(Boolean)
}

export function getShop(listing: Listing): Shop | undefined {
  return typeof listing.shopId === 'object' ? listing.shopId : undefined
}

export function getShopName(listing: Listing) {
  return getShop(listing)?.shopName || 'Independent seller'
}

export function listingMeta(listing: Listing) {
  return [listing.category, listing.size, listing.gender].filter(Boolean).join(' - ') || listing.type
}

export function initials(name?: string) {
  return (name || 'User')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}
