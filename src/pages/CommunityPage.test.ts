import { describe, expect, it } from 'vitest'
import { communityMineRedirect } from '../utils/communityNavigation'

describe('Community legacy personal scopes', () => {
  it('redirects authenticated personal Event and Finspo URLs to Profile tabs', () => {
    expect(communityMineRedirect('?tab=events&scope=mine', true)).toBe('/profile?tab=events')
    expect(communityMineRedirect('?tab=finspo&scope=mine', true)).toBe('/profile?tab=finspo')
  })

  it('sends guests through login with the Profile tab as the return destination', () => {
    const eventLogin = communityMineRedirect('?tab=events&scope=mine', false) || ''
    const finspoLogin = communityMineRedirect('?tab=finspo&scope=mine', false) || ''

    expect(decodeURIComponent(eventLogin)).toContain('/profile?tab=events')
    expect(decodeURIComponent(finspoLogin)).toContain('/profile?tab=finspo')
  })

  it('does not redirect discovery scopes', () => {
    expect(communityMineRedirect('?tab=events&scope=public', true)).toBeNull()
    expect(communityMineRedirect('?tab=finspo&scope=following', false)).toBeNull()
  })
})
