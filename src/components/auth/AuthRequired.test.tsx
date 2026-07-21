import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthRequired } from './AuthRequired'

const mocks = vi.hoisted(() => ({
  apiPost: vi.fn(),
  navigateTo: vi.fn(),
  user: {
    _id: 'user-1',
    email: 'ama@example.com',
    isEmailVerified: false,
    role: 'buyer',
  },
}))

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({ status: 'authenticated', user: mocks.user }),
}))

vi.mock('../../lib/api', async (importOriginal) => ({
  ...await importOriginal<typeof import('../../lib/api')>(),
  apiPost: mocks.apiPost,
}))

vi.mock('../../utils/navigation', async (importOriginal) => ({
  ...await importOriginal<typeof import('../../utils/navigation')>(),
  navigateTo: mocks.navigateTo,
}))

vi.mock('../layout/AppShell', () => ({
  AppShell: ({ active, children }: { active?: string; children: ReactNode }) => <main data-active={active}>{children}</main>,
}))

describe('verified-only authentication gates', () => {
  beforeEach(() => {
    mocks.apiPost.mockReset()
    mocks.navigateTo.mockReset()
    mocks.user.isEmailVerified = false
    window.history.replaceState({}, '', '/')
  })

  it('blocks protected actions while preserving a route back to browsing', () => {
    render(<AuthRequired verifiedOnly="messaging"><p>Private inbox</p></AuthRequired>)

    expect(screen.queryByText('Private inbox')).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Verify your email to message members' })).toBeVisible()
    expect(screen.getByText(/browse, save favorites, and add items to your cart/i)).toBeVisible()
    expect(screen.getByRole('link', { name: 'View system notifications' })).toHaveAttribute('href', '/inbox?view=system')
    expect(screen.getByRole('link', { name: 'Keep browsing' })).toHaveAttribute('href', '/browse')
    expect(screen.getByRole('main')).toHaveAttribute('data-active', 'inbox')
  })

  it('sends another verification email and reports success without leaving the page', async () => {
    mocks.apiPost.mockResolvedValue({})
    const user = userEvent.setup()
    render(<AuthRequired verifiedOnly="checkout"><p>Checkout</p></AuthRequired>)

    await user.click(screen.getByRole('button', { name: 'Send new verification email' }))

    expect(mocks.apiPost).toHaveBeenCalledWith('/auth/resend-verification', {})
    expect(await screen.findByRole('status')).toHaveTextContent('A new verification email was sent to ama@example.com.')
  })

  it('shows resend failures and renders protected content once verified', async () => {
    mocks.apiPost.mockRejectedValue(new Error('Please wait before requesting another email'))
    const user = userEvent.setup()
    const { rerender } = render(<AuthRequired verifiedOnly="shop"><p>Shop setup</p></AuthRequired>)

    await user.click(screen.getByRole('button', { name: 'Send new verification email' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Please wait before requesting another email')

    mocks.user.isEmailVerified = true
    rerender(<AuthRequired verifiedOnly="shop"><p>Shop setup</p></AuthRequired>)
    expect(screen.getByText('Shop setup')).toBeVisible()
    expect(screen.queryByRole('heading', { name: /verify your email/i })).not.toBeInTheDocument()
  })
})
