import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../lib/api'
import { VerifyEmailPage } from './VerifyEmailPage'

const apiMocks = vi.hoisted(() => ({ apiPost: vi.fn() }))
const authMocks = vi.hoisted(() => ({
  refreshUser: vi.fn(),
  user: null as null | { _id: string; email: string; isEmailVerified: boolean },
}))

vi.mock('../lib/api', async (importOriginal) => {
  const original = await importOriginal<typeof import('../lib/api')>()
  return { ...original, apiPost: apiMocks.apiPost }
})

vi.mock('../components/layout/AppShell', () => ({
  AppShell: ({ children }: { children: ReactNode }) => <main>{children}</main>,
}))

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({ refreshUser: authMocks.refreshUser, user: authMocks.user }),
}))

const token = 'a'.repeat(64)

describe('email verification page', () => {
  beforeEach(() => {
    apiMocks.apiPost.mockReset()
    authMocks.refreshUser.mockReset()
    authMocks.user = null
    window.history.replaceState({}, '', '/')
  })

  it('refreshes an authenticated session and continues inside Foose after verification', async () => {
    authMocks.user = { _id: 'buyer-1', email: ' Buyer@Example.com ', isEmailVerified: false }
    authMocks.refreshUser.mockResolvedValue({ email: 'buyer@example.com', isEmailVerified: true })
    apiMocks.apiPost.mockResolvedValue({ email: 'buyer@example.com' })
    window.history.replaceState({}, '', `/#/verify-email/${token}`)

    render(<VerifyEmailPage />)

    await waitFor(() => expect(authMocks.refreshUser).toHaveBeenCalledTimes(1))
    expect(await screen.findByRole('link', { name: 'Continue to Foose' })).toHaveAttribute('href', '/browse')
  })

  it('does not refresh or unlock a logged-in session belonging to another email', async () => {
    authMocks.user = { _id: 'viewer-1', email: 'viewer@example.com', isEmailVerified: false }
    apiMocks.apiPost.mockResolvedValue({ email: 'buyer@example.com' })
    window.history.replaceState({}, '', `/#/verify-email/${token}`)

    render(<VerifyEmailPage />)

    expect(await screen.findByRole('link', { name: 'Continue to login' })).toHaveAttribute('href', '/login')
    expect(screen.getByText(/buyer@example.com is verified/i)).toBeVisible()
    expect(authMocks.refreshUser).not.toHaveBeenCalled()
    expect(screen.queryByRole('link', { name: 'Continue to Foose' })).not.toBeInTheDocument()
  })

  it('only unlocks the matching session after refresh confirms verification', async () => {
    authMocks.user = { _id: 'buyer-1', email: 'buyer@example.com', isEmailVerified: false }
    authMocks.refreshUser.mockResolvedValue({ email: 'buyer@example.com', isEmailVerified: false })
    apiMocks.apiPost.mockResolvedValue({ email: 'buyer@example.com' })
    window.history.replaceState({}, '', `/#/verify-email/${token}`)

    render(<VerifyEmailPage />)

    await waitFor(() => expect(authMocks.refreshUser).toHaveBeenCalledTimes(1))
    expect(await screen.findByRole('link', { name: 'Continue to login' })).toHaveAttribute('href', '/login')
    expect(screen.queryByRole('link', { name: 'Continue to Foose' })).not.toBeInTheDocument()
  })

  it('shows progress, scrubs the token, and finishes successfully', async () => {
    let finish!: (value: { email: string }) => void
    apiMocks.apiPost.mockReturnValue(new Promise((resolve) => { finish = resolve }))
    window.history.replaceState({}, '', `/#/verify-email/${token}`)

    render(<VerifyEmailPage />)

    expect(screen.getByRole('status', { name: 'Verifying your email' })).toBeVisible()
    expect(window.location.hash).toBe('#/verify-email')
    expect(apiMocks.apiPost).toHaveBeenCalledWith('/auth/verify-email', { token }, { auth: false })

    finish({ email: 'buyer@example.com' })
    expect(await screen.findByText('Email verified')).toBeVisible()
    expect(screen.getByRole('link', { name: 'Continue to login' })).toHaveAttribute('href', '/login')
  })

  it('shows an invalid state without calling the API when the token is malformed', async () => {
    window.history.replaceState({}, '', '/#/verify-email/not-a-token')
    render(<VerifyEmailPage />)

    expect(await screen.findByText('Verification link unavailable')).toBeVisible()
    expect(apiMocks.apiPost).not.toHaveBeenCalled()
  })

  it('shows the invalid state for an expired or already-used token', async () => {
    apiMocks.apiPost.mockRejectedValue(new ApiError('Invalid or expired email verification token', 400))
    window.history.replaceState({}, '', `/#/verify-email/${token}`)
    render(<VerifyEmailPage />)

    expect(await screen.findByText('Verification link unavailable')).toBeVisible()
  })

  it('shows a retryable network error and retries with the captured token', async () => {
    const user = userEvent.setup()
    apiMocks.apiPost
      .mockRejectedValueOnce(new TypeError('Network request failed'))
      .mockResolvedValueOnce({ email: 'buyer@example.com' })
    window.history.replaceState({}, '', `/#/verify-email/${token}`)
    render(<VerifyEmailPage />)

    expect(await screen.findByText('Email verification could not finish')).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Try again' }))

    await waitFor(() => expect(apiMocks.apiPost).toHaveBeenCalledTimes(2))
    expect(await screen.findByText('Email verified')).toBeVisible()
  })
})
