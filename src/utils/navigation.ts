export function navigateTo(path: string) {
  window.history.pushState(null, '', path)
  window.dispatchEvent(new PopStateEvent('popstate'))
  window.scrollTo({ top: 0 })
}

export function cacheFinspoPreview<T extends { _id: string }>(post: T) {
  try {
    window.sessionStorage.setItem(`finspo-preview:${post._id}`, JSON.stringify(post))
  } catch {
    // Storage is a convenience only; navigation still works without it.
  }
}

export function readFinspoPreview<T>(postId: string): T | null {
  try {
    const cached = window.sessionStorage.getItem(`finspo-preview:${postId}`)
    return cached ? (JSON.parse(cached) as T) : null
  } catch {
    return null
  }
}
