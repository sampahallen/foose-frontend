import { fireEvent } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useNavigationStore } from '../stores/navigationMemoryStore'
import {
  APP_NAVIGATION_EVENT,
  clearNavigationSession,
  getCurrentNavigationEntry,
  initializeNavigation,
  navigateBack,
  navigateTo,
  registerNavigationBlocker,
  registerNavigationCapture,
  resetNavigationForTests,
  setNextNavigationContext,
} from './navigation'

describe('navigation controller', () => {
  beforeEach(() => {
    resetNavigationForTests()
    window.sessionStorage.clear()
    useNavigationStore.getState().resetSession('pre-test')
    window.history.replaceState({ retained: 'yes' }, '', '/browse?type=retail')
    initializeNavigation()
  })

  afterEach(() => resetNavigationForTests())

  it('stamps the initial history entry without dropping arbitrary state', () => {
    expect(window.history.state).toMatchObject({
      retained: 'yes',
      fooseNavigation: true,
      fooseNavigationIndex: 0,
      fooseNavigationOrigin: 'initial',
    })
    expect(getCurrentNavigationEntry()).toMatchObject({
      href: '/browse?type=retail',
      route: 'browse',
      index: 0,
    })
  })

  it('never session-persists OAuth credentials from the live callback URL', () => {
    resetNavigationForTests()
    useNavigationStore.getState().resetSession('oauth-test')
    window.history.replaceState({}, '', '/auth/callback?code=secret#accessToken=top-secret')

    initializeNavigation()

    expect(window.location.search).toBe('?code=secret')
    expect(window.location.hash).toBe('#accessToken=top-secret')
    expect(getCurrentNavigationEntry()?.href).toBe('/auth/callback')
    expect(window.sessionStorage.getItem('foose-navigation')).not.toContain('top-secret')
    expect(window.sessionStorage.getItem('foose-navigation')).not.toContain('secret')
  })

  it('does not persist a password-reset token embedded in the route path', () => {
    resetNavigationForTests()
    useNavigationStore.getState().resetSession('reset-test')
    window.history.replaceState({}, '', '/reset-password/private-reset-token')

    initializeNavigation()

    expect(window.location.pathname).toBe('/reset-password/private-reset-token')
    expect(getCurrentNavigationEntry()?.href).toBe('/reset-password')
    expect(window.sessionStorage.getItem('foose-navigation')).not.toContain('private-reset-token')
  })

  it('pushes an internal entry, preserves supplied state, and emits only the app event', () => {
    const appListener = vi.fn()
    const popListener = vi.fn()
    window.addEventListener(APP_NAVIGATION_EVENT, appListener)
    window.addEventListener('popstate', popListener)

    expect(navigateTo('/listing/42', {
      presentation: 'modal',
      sourceLabel: 'Browse',
      state: { custom: 42 },
    })).toBe(true)

    expect(window.location.pathname).toBe('/listing/42')
    expect(window.history.state.custom).toBe(42)
    expect(getCurrentNavigationEntry()).toMatchObject({
      index: 1,
      presentation: 'modal',
      sourceLabel: 'Browse',
      route: 'retailDetail',
    })
    expect(appListener).toHaveBeenCalledOnce()
    expect(popListener).not.toHaveBeenCalled()
    window.removeEventListener(APP_NAVIGATION_EVENT, appListener)
    window.removeEventListener('popstate', popListener)
  })

  it('replaces in place while retaining arbitrary history state', () => {
    window.history.replaceState({ ...window.history.state, retainedDuringReplace: true }, '', window.location.href)
    navigateTo('/search?q=coat', { replace: true, state: { focusSearch: false } })
    expect(window.history.state).toMatchObject({ retainedDuringReplace: true, focusSearch: false })
    expect(getCurrentNavigationEntry()).toMatchObject({ index: 0, route: 'search' })
    expect(useNavigationStore.getState().entries).toHaveLength(1)
  })

  it('blocks pushes and exposes a retry that performs the original transition once', () => {
    let retry: (() => void) | undefined
    const remove = registerNavigationBlocker((transition) => {
      retry = transition.retry
      return false
    })
    expect(navigateTo('/cart')).toBe(false)
    expect(window.location.pathname).toBe('/browse')
    remove()
    retry?.()
    expect(window.location.pathname).toBe('/cart')
  })

  it('does not leak a cancelled transition context into the next navigation', () => {
    setNextNavigationContext({ presentation: 'modal', sourceLabel: 'Browse' })
    const remove = registerNavigationBlocker(() => false)
    expect(navigateTo('/listing/blocked')).toBe(false)
    remove()

    navigateTo('/cart')

    expect(getCurrentNavigationEntry()).toMatchObject({ route: 'cart' })
    expect(getCurrentNavigationEntry()?.presentation).toBeUndefined()
  })

  it('throttles scroll persistence without serializing registered page snapshots', () => {
    vi.useFakeTimers()
    const capture = vi.fn()
    const unregister = registerNavigationCapture(capture)
    try {
      for (let index = 0; index < 20; index += 1) window.dispatchEvent(new Event('scroll'))
      expect(capture).not.toHaveBeenCalled()
      vi.advanceTimersByTime(120)
      expect(capture).not.toHaveBeenCalled()

      navigateTo('/cart')
      expect(capture).toHaveBeenCalledOnce()
    } finally {
      unregister()
      vi.useRealTimers()
    }
  })

  it('uses a safe replacement fallback when there is no tracked previous entry', () => {
    expect(navigateBack({ fallback: '/community?tab=finspo&scope=public' })).toBe(true)
    expect(window.location.pathname).toBe('/community')
    expect(window.location.search).toContain('tab=finspo')
    expect(getCurrentNavigationEntry()?.index).toBe(0)
  })

  it('intercepts ordinary same-origin links but ignores external, download, and modified links', () => {
    const local = document.createElement('a')
    local.href = '/cart'
    document.body.append(local)
    fireEvent.click(local)
    expect(window.location.pathname).toBe('/cart')

    const external = document.createElement('a')
    external.href = 'https://example.com/'
    document.body.append(external)
    const externalEvent = new MouseEvent('click', { bubbles: true, cancelable: true })
    external.dispatchEvent(externalEvent)
    expect(externalEvent.defaultPrevented).toBe(false)

    const download = document.createElement('a')
    download.href = '/download'
    download.download = 'file'
    document.body.append(download)
    const downloadEvent = new MouseEvent('click', { bubbles: true, cancelable: true })
    download.dispatchEvent(downloadEvent)
    expect(downloadEvent.defaultPrevented).toBe(false)

    const modified = new MouseEvent('click', { bubbles: true, cancelable: true, ctrlKey: true })
    local.dispatchEvent(modified)
    expect(modified.defaultPrevented).toBe(false)
  })

  it('clears entries and snapshots into a fresh same-page session', () => {
    const before = useNavigationStore.getState().sessionId
    navigateTo('/listing/1')
    clearNavigationSession()
    const state = useNavigationStore.getState()
    expect(state.sessionId).not.toBe(before)
    expect(state.entries).toHaveLength(1)
    expect(state.entries[0]?.href).toBe('/listing/1')
    expect(state.snapshots).toEqual({})
  })
})
