import { create } from 'zustand'

type ListingReturnState = {
  href: string
  scrollY: number
}

type NavigationMemoryState = {
  listingReturn?: ListingReturnState
  clearListingReturn: () => void
  setListingReturn: (state: ListingReturnState) => void
}

export const useNavigationMemoryStore = create<NavigationMemoryState>((set) => ({
  clearListingReturn: () => set({ listingReturn: undefined }),
  setListingReturn: (listingReturn) => set({ listingReturn }),
}))
