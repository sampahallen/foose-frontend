export function sanitizeRedirect(value?: string | null) {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return '/'
  if (value.startsWith('/login') || value.startsWith('/register')) return '/'
  return value
}

export function currentRedirectTarget() {
  if (typeof window === 'undefined') return '/'
  const target = `${window.location.pathname}${window.location.search}`
  return sanitizeRedirect(target)
}

export function redirectFromSearch(fallback = '/') {
  if (typeof window === 'undefined') return fallback
  const params = new URLSearchParams(window.location.search)
  return sanitizeRedirect(params.get('redirect') || fallback)
}

export function closeTargetForAuthModal(redirect = redirectFromSearch()) {
  const target = sanitizeRedirect(redirect)
  const protectedPrefixes = [
    '/admin',
    '/checkout',
    '/inbox',
    '/kyc',
    '/listings/new',
    '/manage-shop',
    '/open-shop',
    '/order-confirmed',
    '/saved',
    '/wallet',
  ]

  if (target === '/profile') return '/'
  if (protectedPrefixes.some((prefix) => target === prefix || target.startsWith(`${prefix}/`) || target.startsWith(`${prefix}?`))) {
    return '/'
  }

  return target
}

export function authHref(path: '/login' | '/register' = '/register', redirect = currentRedirectTarget()) {
  return `${path}?redirect=${encodeURIComponent(sanitizeRedirect(redirect))}`
}
