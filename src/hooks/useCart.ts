import { useCallback, useEffect, useState } from 'react'
import { getCartStorageKey } from '../config/env'
import type { Listing } from '../types/api'
import { getListingImage, getShop, getShopName } from '../utils/format'
import { recordListingSignal } from '../utils/recommendations'
import { useAuth } from './useAuth'

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
  status?: Listing['status']
  sourceEventId?: string
  sourceEventTitle?: string
  availableFrom?: string
  availableUntil?: string
}

function storageKey() {
  return getCartStorageKey()
}

const cartChangeEvent = 'foose:cart-change'

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
  const { user } = useAuth()
  const userId = user?._id
  const [items, setItems] = useState<CartItem[]>(() => readCart())

  const commit = useCallback((nextItems: CartItem[]) => {
    setItems(nextItems)
    writeCart(nextItems)
    window.dispatchEvent(new Event(cartChangeEvent))
  }, [])

  useEffect(() => {
    function syncCart() {
      setItems(readCart())
    }

    function syncStoredCart(event: StorageEvent) {
      if (event.key === storageKey()) syncCart()
    }

    window.addEventListener(cartChangeEvent, syncCart)
    window.addEventListener('storage', syncStoredCart)
    return () => {
      window.removeEventListener(cartChangeEvent, syncCart)
      window.removeEventListener('storage', syncStoredCart)
    }
  }, [])

  const addListing = useCallback(
    (
      listing: Listing,
      quantity = 1,
      options: Pick<CartItem, 'availableFrom' | 'availableUntil' | 'sourceEventId' | 'sourceEventTitle'> = {},
    ) => {
      const shop = getShop(listing)
      const ownerId = typeof shop?.ownerId === 'string' ? shop.ownerId : shop?.ownerId?._id
      if (userId && ownerId === userId) return false

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
        status: listing.status,
        ...options,
        title: listing.title,
        type: listingType,
      }
      const currentItems = readCart()
      const existing = currentItems.find((item) => item.listingId === listing._id)
      const nextItems = existing
        ? currentItems.map((item) =>
            item.listingId === listing._id
              ? { ...item, ...options, status: listing.status, quantity: listingType === 'retail' ? 1 : item.quantity + nextQuantity }
              : item,
          )
        : [...currentItems, nextItem]

      commit(nextItems)
      void recordListingSignal(listing._id, 'add_to_cart')
      return true
    },
    [commit, userId],
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
