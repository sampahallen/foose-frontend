import { create } from 'zustand'

type FilterDropdownState = {
  closeDropdown: () => void
  openDropdownId: string
  toggleDropdown: (id: string) => void
}

export const useFilterDropdownStore = create<FilterDropdownState>((set) => ({
  closeDropdown: () => set({ openDropdownId: '' }),
  openDropdownId: '',
  toggleDropdown: (id) => set((state) => ({ openDropdownId: state.openDropdownId === id ? '' : id })),
}))
