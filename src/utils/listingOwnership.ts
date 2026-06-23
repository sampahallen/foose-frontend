import type { Listing, Shop, User } from '../types/api'

function idValue(value: Shop['ownerId'] | Shop | User | string | undefined) {
  if (!value) return ''
  if (typeof value === 'string') return value
  return value._id || ''
}

export function listingBelongsToUser(listing: Listing, user?: User | null) {
  if (!user?._id || !listing.shopId || typeof listing.shopId === 'string') return false
  return idValue(listing.shopId.ownerId) === user._id
}

export function withoutOwnListings<T extends Listing>(listings: T[], user?: User | null) {
  return listings.filter((listing) => !listingBelongsToUser(listing, user))
}
