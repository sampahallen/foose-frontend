import { create } from 'zustand'

export type PreviewItem = {
  alt?: string
  src: string
  type?: 'image' | 'video'
}

type ImagePreviewState = {
  index: number
  items: PreviewItem[]
  closePreview: () => void
  nextPreview: () => void
  openPreview: (items: PreviewItem[], index?: number) => void
  previousPreview: () => void
}

export const useImagePreviewStore = create<ImagePreviewState>((set, get) => ({
  index: 0,
  items: [],
  closePreview: () => set({ index: 0, items: [] }),
  nextPreview: () => {
    const { index, items } = get()
    if (items.length <= 1) return
    set({ index: (index + 1) % items.length })
  },
  openPreview: (items, index = 0) =>
    set({
      index: Math.min(Math.max(index, 0), Math.max(items.length - 1, 0)),
      items: items.filter((item) => item.src),
    }),
  previousPreview: () => {
    const { index, items } = get()
    if (items.length <= 1) return
    set({ index: (index - 1 + items.length) % items.length })
  },
}))
