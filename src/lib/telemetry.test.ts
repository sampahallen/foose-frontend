import { describe, expect, it } from 'vitest'
import { sanitizeTelemetryUrl } from './telemetry'

describe('telemetry URL sanitization', () => {
  it('removes tokens from hash-based verification and reset links', () => {
    expect(sanitizeTelemetryUrl('https://foose.example/app/#/verify-email/private-token'))
      .toBe('https://foose.example/app/')
    expect(sanitizeTelemetryUrl('https://foose.example/app/#/reset-password/private-token'))
      .toBe('https://foose.example/app/')
  })

  it('removes credentials from direct sensitive auth routes', () => {
    expect(sanitizeTelemetryUrl('https://foose.example/auth/callback?code=secret#accessToken=secret'))
      .toBe('https://foose.example/auth/callback')
    expect(sanitizeTelemetryUrl('https://foose.example/verify-email/private-token?source=email'))
      .toBe('https://foose.example/verify-email')
  })

  it('preserves ordinary application URLs', () => {
    expect(sanitizeTelemetryUrl('https://foose.example/browse?type=retail#section'))
      .toBe('https://foose.example/browse?type=retail#section')
  })
})
