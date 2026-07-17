import { useSyncExternalStore } from 'react'
import { getCurrentAppHref, subscribeToNavigation } from '../utils/navigation'

export type CurrentRoute = {
  pathname: string
  search: string
}

function getSnapshot() {
  return getCurrentAppHref()
}

function getServerSnapshot() {
  return '/'
}

export function useCurrentRoute(): CurrentRoute {
  const snapshot = useSyncExternalStore(subscribeToNavigation, getSnapshot, getServerSnapshot)
  const hashStart = snapshot.indexOf('#')
  const withoutHash = hashStart === -1 ? snapshot : snapshot.slice(0, hashStart)
  const queryStart = withoutHash.indexOf('?')

  if (queryStart === -1) return { pathname: withoutHash || '/', search: '' }
  return {
    pathname: withoutHash.slice(0, queryStart) || '/',
    search: withoutHash.slice(queryStart),
  }
}
