import { useCallback, useState } from 'react'
import type { Listing } from '../types/api'
import { getListingImage, getShop, getShopName } from '../utils/format'

const CART_STORAGE_KEY = 'foose.cart'

export type CartItem = {
  listingId: string
  title: string
  price: number
  currency: string
  quantity: number
  image?: string
  shopId?: string
  shopName: string
}

function readCart() {
  const rawCart = window.localStorage.getItem(CART_STORAGE_KEY)
  if (!rawCart) return []

  try {
    return JSON.parse(rawCart) as CartItem[]
  } catch {
    window.localStorage.removeItem(CART_STORAGE_KEY)
    return []
  }
}

function writeCart(items: CartItem[]) {
  window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items))
}

export function useCart() {
  const [items, setItems] = useState<CartItem[]>(() => readCart())

  const commit = useCallback((nextItems: CartItem[]) => {
    setItems(nextItems)
    writeCart(nextItems)
  }, [])

  const addListing = useCallback(
    (listing: Listing, quantity = 1) => {
      const shop = getShop(listing)
      const nextItem: CartItem = {
        currency: listing.currency || 'GHS',
        image: getListingImage(listing),
        listingId: listing._id,
        price: listing.price,
        quantity,
        shopId: shop?._id,
        shopName: getShopName(listing),
        title: listing.title,
      }
      const currentItems = readCart()
      const existing = currentItems.find((item) => item.listingId === listing._id)
      const nextItems = existing
        ? currentItems.map((item) =>
            item.listingId === listing._id ? { ...item, quantity: item.quantity + quantity } : item,
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
          .map((item) => (item.listingId === listingId ? { ...item, quantity: Math.max(quantity, 1) } : item))
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
