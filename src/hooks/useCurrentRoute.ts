import { useSyncExternalStore } from 'react'

type CurrentRoute = {
  pathname: string
  search: string
}

function subscribe(onStoreChange: () => void) {
  window.addEventListener('popstate', onStoreChange)
  return () => window.removeEventListener('popstate', onStoreChange)
}

function getSnapshot() {
  return window.location.pathname + window.location.search
}

function getServerSnapshot() {
  return '/'
}

export function useCurrentRoute(): CurrentRoute {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  const queryStart = snapshot.indexOf('?')

  if (queryStart === -1) {
    return { pathname: snapshot, search: '' }
  }

  return {
    pathname: snapshot.slice(0, queryStart),
    search: snapshot.slice(queryStart),
  }
}
