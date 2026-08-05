import { authHref } from './authRedirect'

export function communityMineRedirect(search: string, authenticated: boolean) {
  const params = new URLSearchParams(search)
  if (params.get('scope') !== 'mine') return null
  const tab = params.get('tab') === 'events' ? 'events' : 'finspo'
  const destination = `/profile?tab=${tab}`
  return authenticated ? destination : authHref('/login', destination)
}
