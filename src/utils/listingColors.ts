import type { Listing } from '../types/api'

export function listingColors(listing: Pick<Listing, 'color' | 'colors'>): NonNullable<Listing['color']>[] {
  return listing.colors?.length ? listing.colors : listing.color ? [listing.color] : []
}
