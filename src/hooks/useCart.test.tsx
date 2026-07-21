import { act, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthContext, type AuthContextValue } from '../context/auth-context'
import type { Listing, User } from '../types/api'
import { useCart } from './useCart'

function authValue(user: User): AuthContextValue {
  return {
    completeOAuth: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
    refreshUser: vi.fn(),
    register: vi.fn(),
    status: 'authenticated',
    user,
  }
}

describe('useCart ownership guard', () => {
  beforeEach(() => window.localStorage.clear())

  it('refuses to add a listing owned by the signed-in seller', () => {
    const seller = { _id: 'seller-1', name: 'Seller', username: 'seller' } as User
    const listing = {
      _id: 'listing-1',
      currency: 'GHS',
      price: 10000,
      shopId: { _id: 'shop-1', ownerId: seller, shopName: 'Seller Shop', slug: 'seller-shop' },
      status: 'active',
      title: 'Own jacket',
      type: 'retail',
    } satisfies Listing
    const wrapper = ({ children }: { children: ReactNode }) => (
      <AuthContext.Provider value={authValue(seller)}>{children}</AuthContext.Provider>
    )
    const { result } = renderHook(() => useCart(), { wrapper })

    let added = true
    act(() => { added = result.current.addListing(listing) })

    expect(added).toBe(false)
    expect(result.current.items).toEqual([])
  })
})
