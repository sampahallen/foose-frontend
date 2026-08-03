import { create } from 'zustand'

type ShopManagementLayoutState = {
  collapsed: boolean
  toggle: () => void
}

export const useShopManagementLayoutStore = create<ShopManagementLayoutState>((set) => ({
  collapsed: true,
  toggle: () => set((state) => ({ collapsed: !state.collapsed })),
}))
