import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { LoginPage } from './LoginPage'
import { RegisterPage } from './RegisterPage'
import { ResetPasswordPage } from './ResetPasswordPage'

const authMocks = vi.hoisted(() => ({
  login: vi.fn(),
  register: vi.fn(),
}))

vi.mock('../components/layout/AppShell', () => ({
  AppShell: ({ children }: { children: ReactNode }) => <main>{children}</main>,
}))

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    login: authMocks.login,
    register: authMocks.register,
    status: 'guest',
    user: null,
  }),
}))

describe('authentication form experiences', () => {
  beforeEach(() => {
    authMocks.login.mockReset()
    authMocks.register.mockReset()
    HTMLElement.prototype.scrollTo = vi.fn()
    window.history.replaceState({}, '', '/')
  })

  it('associates login errors, focuses the first invalid field, and preserves a password while revealing it', async () => {
    const user = userEvent.setup()
    window.history.replaceState({}, '', '/login')
    render(<LoginPage />)

    const identifier = screen.getByRole('textbox', { name: 'Email or username' })
    const password = screen.getByLabelText(/^Password/)
    await user.click(screen.getByRole('button', { name: 'Log in' }))

    await waitFor(() => expect(identifier).toHaveFocus())
    expect(identifier).toHaveAttribute('aria-invalid', 'true')
    expect(identifier).toHaveAccessibleDescription('Enter your email or username.')
    expect(password).toHaveAttribute('aria-invalid', 'true')
    expect(authMocks.login).not.toHaveBeenCalled()

    await user.type(password, 'keep-this-secret')
    await user.click(screen.getByRole('button', { name: 'Show password' }))
    expect(password).toHaveAttribute('type', 'text')
    expect(password).toHaveValue('keep-this-secret')
    expect(screen.getByRole('button', { name: 'Hide password' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('summarizes registration errors and links each message to its field', async () => {
    const user = userEvent.setup()
    window.history.replaceState({}, '', '/register')
    render(<RegisterPage />)

    await user.click(screen.getByRole('button', { name: 'Create account' }))
    const summary = screen.getByRole('alert')

    await waitFor(() => expect(summary).toHaveFocus())
    const name = screen.getByRole('textbox', { name: 'Name' })
    expect(name).toHaveAttribute('aria-invalid', 'true')
    expect(name).toHaveAccessibleDescription('Enter at least 2 characters for your name.')

    await user.click(screen.getByRole('link', { name: 'Enter at least 2 characters for your name.' }))
    expect(name).toHaveFocus()
    expect(authMocks.register).not.toHaveBeenCalled()
  })

  it('keeps reset submission unavailable when the secure token is missing', () => {
    window.history.replaceState({}, '', '/reset-password')
    render(<ResetPasswordPage />)

    expect(screen.getByText(/missing its secure token/i)).toBeVisible()
    expect(screen.getByRole('button', { name: 'Reset password' })).toBeDisabled()
  })
})
