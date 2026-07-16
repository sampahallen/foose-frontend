import { getCurrentAppPathname, stripBasePath, withBasePath } from './navigation'

type AuthHrefOptions = {
  closeToHome?: boolean
}

function currentAuthSearchParams() {
  if (typeof window === 'undefined') return new URLSearchParams()
  if (window.location.hash.startsWith('#/')) {
    const queryStart = window.location.hash.indexOf('?')
    return new URLSearchParams(queryStart === -1 ? '' : window.location.hash.slice(queryStart + 1))
  }

  return new URLSearchParams(window.location.search)
}

export function shouldCloseAuthModalToHome() {
  return currentAuthSearchParams().get('close') === 'home'
}

export function sanitizeRedirect(value?: string | null) {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return '/'
  const target = stripBasePath(value)
  if (target.startsWith('/login') || target.startsWith('/register') || target.startsWith('/reset-password')) return '/'
  return target
}

export function currentRedirectTarget() {
  if (typeof window === 'undefined') return '/'
  const target = `${getCurrentAppPathname()}${window.location.search}`
  return sanitizeRedirect(target)
}

export function redirectFromSearch(fallback = '/') {
  if (typeof window === 'undefined') return fallback
  const params = currentAuthSearchParams()
  return sanitizeRedirect(params.get('redirect') || fallback)
}

export function closeTargetForAuthModal(redirect = redirectFromSearch()) {
  if (shouldCloseAuthModalToHome()) return '/'

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
    '/orders',
    '/saved',
    '/suggested-for-you',
    '/wallet',
  ]

  if (target === '/profile') return '/'
  if (protectedPrefixes.some((prefix) => target === prefix || target.startsWith(`${prefix}/`) || target.startsWith(`${prefix}?`))) {
    return '/'
  }

  return target
}

export function authHref(
  path: '/login' | '/register' = '/login',
  redirect = currentRedirectTarget(),
  options: AuthHrefOptions = {},
) {
  const params = new URLSearchParams({ redirect: sanitizeRedirect(redirect) })
  const closeToHome = options.closeToHome ?? shouldCloseAuthModalToHome()
  if (closeToHome) params.set('close', 'home')
  return withBasePath(`${path}?${params.toString()}`)
}
