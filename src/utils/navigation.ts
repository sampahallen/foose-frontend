export function getAppBasePath() {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '')
  return base === '' || base === '/' ? '' : base
}

export function stripBasePath(pathname: string) {
  const base = getAppBasePath()
  if (!base) return pathname || '/'
  if (pathname === base) return '/'
  if (pathname.startsWith(`${base}/`)) return pathname.slice(base.length) || '/'
  return pathname || '/'
}

export function getCurrentAppPathname() {
  if (typeof window === 'undefined') return '/'
  if (window.location.hash.startsWith('#/')) return window.location.hash.slice(1).split('?')[0] || '/'
  return stripBasePath(window.location.pathname)
}

export function withBasePath(path: string) {
  const base = getAppBasePath()
  if (!base || !path || path.startsWith('#') || /^[a-z][a-z0-9+.-]*:/i.test(path)) return path
  if (path === base || path.startsWith(`${base}/`)) return path
  if (path === '/') return `${base}/`
  return path.startsWith('/') ? `${base}${path}` : `${base}/${path}`
}

export function navigateTo(path: string) {
  window.history.pushState(null, '', withBasePath(path))
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
