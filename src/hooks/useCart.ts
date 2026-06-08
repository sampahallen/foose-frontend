import { useCallback, useState } from 'react'
import { getCartStorageKey } from '../config/env'
import type { Listing } from '../types/api'
import { getListingImage, getShop, getShopName } from '../utils/format'

export type CartItem = {
  listingId: string
  title: string
  price: number
  currency: string
  quantity: number
  type?: 'retail' | 'wholesale'
  bulkMinQty?: number
  image?: string
  shopId?: string
  shopName: string
  sourceEventId?: string
  sourceEventTitle?: string
  availableFrom?: string
  availableUntil?: string
}

function storageKey() {
  return getCartStorageKey()
}

function readCart() {
  const rawCart = window.localStorage.getItem(storageKey())
  if (!rawCart) return []

  try {
    return JSON.parse(rawCart) as CartItem[]
  } catch {
    window.localStorage.removeItem(storageKey())
    return []
  }
}

function writeCart(items: CartItem[]) {
  window.localStorage.setItem(storageKey(), JSON.stringify(items))
}

export function useCart() {
  const [items, setItems] = useState<CartItem[]>(() => readCart())

  const commit = useCallback((nextItems: CartItem[]) => {
    setItems(nextItems)
    writeCart(nextItems)
  }, [])

  const addListing = useCallback(
    (
      listing: Listing,
      quantity = 1,
      options: Pick<CartItem, 'availableFrom' | 'availableUntil' | 'sourceEventId' | 'sourceEventTitle'> = {},
    ) => {
      const shop = getShop(listing)
      const listingType = listing.type || 'retail'
      const nextQuantity = listingType === 'retail' ? 1 : Math.max(quantity, listing.bulkMinQty || 1)
      const nextItem: CartItem = {
        bulkMinQty: listing.bulkMinQty,
        currency: listing.currency || 'GHS',
        image: getListingImage(listing),
        listingId: listing._id,
        price: listing.price,
        quantity: nextQuantity,
        shopId: shop?._id,
        shopName: getShopName(listing),
        ...options,
        title: listing.title,
        type: listingType,
      }
      const currentItems = readCart()
      const existing = currentItems.find((item) => item.listingId === listing._id)
      const nextItems = existing
        ? currentItems.map((item) =>
            item.listingId === listing._id
              ? { ...item, ...options, quantity: listingType === 'retail' ? 1 : item.quantity + nextQuantity }
              : item,
          )
        : [...currentItems, nextItem]

      commit(nextItems)
    },
    [commit],
  )

  const updateQuantity = useCallback(
    (listingId: string, quantity: number) => {
      commit(
        readCart()
          .map((item) =>
            item.listingId === listingId
              ? { ...item, quantity: item.type === 'wholesale' ? Math.max(quantity, item.bulkMinQty || 1) : 1 }
              : item,
          )
          .filter((item) => item.quantity > 0),
      )
    },
    [commit],
  )

  const removeItem = useCallback(
    (listingId: string) => {
      commit(readCart().filter((item) => item.listingId !== listingId))
    },
    [commit],
  )

  const clearCart = useCallback(() => {
    commit([])
  }, [commit])

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0)

  return { addListing, clearCart, items, removeItem, subtotal, updateQuantity }
}
