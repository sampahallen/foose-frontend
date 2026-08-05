import type { GalleryPost } from '../types/api'

export const MAX_FINSPO_IMAGES = 8

export function finspoImages(post: Pick<GalleryPost, 'imageUrl' | 'images'>) {
  const values = post.images?.length ? post.images : [post.imageUrl]
  return Array.from(new Set(values.map((value) => value?.trim()).filter((value): value is string => Boolean(value))))
}

export function finspoCoverImage(post: Pick<GalleryPost, 'imageUrl' | 'images'>) {
  return finspoImages(post)[0] || ''
}
