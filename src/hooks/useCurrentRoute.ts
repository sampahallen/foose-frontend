import { useSyncExternalStore } from 'react'
import { stripBasePath, withBasePath } from '../utils/navigation'

type CurrentRoute = {
  pathname: string
  search: string
}

function subscribe(onStoreChange: () => void) {
  function handleClick(event: MouseEvent) {
    if (event.defaultPrevented || event.button !== 0 || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return

    const target = event.target
    if (!(target instanceof Element)) return

    const anchor = target.closest('a[href]')
    if (!(anchor instanceof HTMLAnchorElement)) return
    if (anchor.target && anchor.target !== '_self') return
    if (anchor.hasAttribute('download')) return

    const url = new URL(anchor.href, window.location.href)
    if (url.origin !== window.location.origin) return
    const targetUrl = new URL(withBasePath(`${url.pathname}${url.search}${url.hash}`), window.location.origin)
    if (targetUrl.pathname === window.location.pathname && targetUrl.search === window.location.search && targetUrl.hash) return

    event.preventDefault()
    window.history.pushState(null, '', `${targetUrl.pathname}${targetUrl.search}${targetUrl.hash}`)
    window.scrollTo({ top: 0 })
    onStoreChange()
  }

  window.addEventListener('popstate', onStoreChange)
  window.addEventListener('click', handleClick)
  return () => {
    window.removeEventListener('popstate', onStoreChange)
    window.removeEventListener('click', handleClick)
  }
}

function getSnapshot() {
  if (window.location.hash.startsWith('#/')) {
    return window.location.hash.slice(1)
  }

  return stripBasePath(window.location.pathname) + window.location.search
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
