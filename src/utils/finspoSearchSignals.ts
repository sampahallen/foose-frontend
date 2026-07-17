import { apiPost } from '../lib/api'
import type { GalleryPost } from '../types/api'

const SESSION_PREFIX = 'finspo-search-click:'

function postOwnerId(post: GalleryPost) {
  if (!post.userId) return ''
  return typeof post.userId === 'object' ? post.userId._id : String(post.userId)
}

export function recordFinspoSearchClick(post: GalleryPost, currentUserId?: string) {
  if (!currentUserId || postOwnerId(post) === currentUserId || post.isArchived) return

  const key = `${SESSION_PREFIX}${post._id}`
  try {
    if (window.sessionStorage.getItem(key)) return
    window.sessionStorage.setItem(key, '1')
  } catch {
    // Session deduplication is best-effort; the API remains safe to call without it.
  }

  void apiPost('/recommendations/finspo-signals', {
    postId: post._id,
    type: 'finspo_search_click',
  }, { keepalive: true }).catch(() => {
    try {
      window.sessionStorage.removeItem(key)
    } catch {
      // A failed background signal must never interrupt navigation.
    }
  })
}
