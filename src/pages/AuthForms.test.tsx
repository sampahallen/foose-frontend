import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as api from '../lib/api'
import { ApiError } from '../lib/api'
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
    HTMLElement.prototype.scrollIntoView = vi.fn()
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

  it('keeps the reset form open when the email is not in the account records', async () => {
    const request = vi.spyOn(api, 'apiPost').mockRejectedValueOnce(
      new ApiError('No Foose account was found with that email address', 404),
    )
    const user = userEvent.setup()
    window.history.replaceState({}, '', '/login')
    render(<LoginPage />)

    await user.click(screen.getByRole('button', { name: 'Forgot password?' }))
    await user.type(screen.getByRole('textbox', { name: 'Email' }), 'missing@example.com')
    await user.click(screen.getByRole('button', { name: 'Send reset email' }))

    expect(await screen.findByText('No Foose account was found with that email address')).toBeVisible()
    expect(screen.queryByText('Check your email')).not.toBeInTheDocument()
    expect(request).toHaveBeenCalledWith('/auth/forgot-password', { email: 'missing@example.com' }, { auth: false })
    request.mockRestore()
  })

  it('shows registration validation beside labels after blur and clears corrected errors', async () => {
    const user = userEvent.setup()
    window.history.replaceState({}, '', '/register')
    render(<RegisterPage />)

    const email = screen.getByRole('textbox', { name: 'Email' })
    await user.type(email, 'not-an-email')
    await user.tab()

    const emailError = screen.getByText('Enter a valid email address.')
    expect(email).toHaveAttribute('aria-invalid', 'true')
    expect(email).toHaveAccessibleDescription('Enter a valid email address.')
    expect(screen.getByText('Email').parentElement).toContainElement(emailError)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()

    await user.clear(email)
    await user.type(email, 'buyer@example.com')
    expect(screen.queryByText('Enter a valid email address.')).not.toBeInTheDocument()
  })

  it('focuses the first invalid signup field without rendering a top error summary', async () => {
    const user = userEvent.setup()
    window.history.replaceState({}, '', '/register')
    render(<RegisterPage />)

    await user.click(screen.getByRole('button', { name: 'Create account' }))
    const name = screen.getByRole('textbox', { name: 'Name' })
    await waitFor(() => expect(name).toHaveFocus())
    expect(name).toHaveAccessibleDescription('Enter at least 2 characters.')
    expect(screen.getByRole('combobox', { name: 'Region' })).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByRole('textbox', { name: 'City or town' })).toHaveAttribute('aria-invalid', 'true')
    expect(document.getElementById('register-password')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.queryByText('Complete the password requirements.')).not.toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(authMocks.register).not.toHaveBeenCalled()
  })

  it('validates password requirements with compact red and green indicators while typing', async () => {
    const user = userEvent.setup()
    window.history.replaceState({}, '', '/register')
    render(<RegisterPage />)

    const password = screen.getByLabelText(/^Password/)
    await user.type(password, 'Abc')

    const requirements = screen.getByRole('list', { name: 'Password requirements' })
    expect(requirements).toHaveClass('flex-col', 'text-xs')
    expect(within(requirements).getByText('One capital letter').closest('li')).toHaveClass('text-foose-success')
    expect(within(requirements).getByText('At least 8 characters').closest('li')).toHaveClass('text-foose-danger')
    expect(within(requirements).getByText('One number').closest('li')).toHaveClass('text-foose-danger')

    await user.type(password, 'def1!')
    expect(within(requirements).getAllByRole('listitem')).toHaveLength(4)
    within(requirements).getAllByRole('listitem').forEach((item) => expect(item).toHaveClass('text-foose-success'))
    expect(password).not.toHaveAttribute('aria-invalid', 'true')
  })

  it('offers all Ghana regions and submits the selected required location', async () => {
    authMocks.register.mockResolvedValue(undefined)
    window.history.replaceState({}, '', '/register')
    render(<RegisterPage />)

    fireEvent.change(screen.getByRole('textbox', { name: 'Name' }), { target: { value: 'Foose Buyer' } })
    fireEvent.change(screen.getByRole('textbox', { name: 'Email' }), { target: { value: 'buyer@example.com' } })
    fireEvent.change(screen.getByRole('textbox', { name: 'Username' }), { target: { value: 'foose.buyer' } })
    fireEvent.change(screen.getByRole('textbox', { name: 'City or town' }), { target: { value: 'Accra' } })
    fireEvent.change(screen.getByLabelText(/^Password/), { target: { value: 'Strong1!' } })

    const region = screen.getByRole('combobox', { name: 'Region' })
    fireEvent.click(region)
    const listbox = screen.getByRole('listbox')
    expect(listbox).toHaveStyle({ zIndex: '1500' })
    expect(within(listbox).getAllByRole('option')).toHaveLength(17)
    fireEvent.keyDown(region, { key: 'g' })
    fireEvent.keyDown(region, { key: 'Enter' })
    expect(region).toHaveTextContent('Greater Accra')
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }))

    await waitFor(() => expect(authMocks.register).toHaveBeenCalledWith({
      email: 'buyer@example.com',
      location: { city: 'Accra', region: 'Greater Accra' },
      name: 'Foose Buyer',
      password: 'Strong1!',
      phone: '',
      username: 'foose.buyer',
    }))
    expect(await screen.findByText(/You can log in now to browse, save favorites, and add items to your cart/i)).toBeVisible()
    expect(screen.getByRole('link', { name: 'Continue to login' })).toBeVisible()
  })

  it('submits silent browser autofill values even when no change events fire', async () => {
    authMocks.register.mockResolvedValue(undefined)
    window.history.replaceState({}, '', '/register')
    render(<RegisterPage />)

    const setInputValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
    const setSelectValue = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')?.set
    const setValue = (name: string, value: string) => {
      const input = document.querySelector<HTMLInputElement>(`input[name="${name}"]`)
      if (!input || !setInputValue) throw new Error(`Missing ${name} input`)
      setInputValue.call(input, value)
    }
    setValue('name', 'Autofilled Buyer')
    setValue('email', 'autofill@example.com')
    setValue('username', 'autofilled.buyer')
    setValue('city', 'Kumasi')
    setValue('password', 'Autofill1!')
    const nativeRegion = document.querySelector<HTMLSelectElement>('select[name="region"]')
    if (!nativeRegion || !setSelectValue) throw new Error('Missing native region select')
    setSelectValue.call(nativeRegion, 'Ashanti')

    const form = screen.getByRole('button', { name: 'Create account' }).closest('form')
    if (!form) throw new Error('Missing registration form')
    fireEvent.submit(form)

    await waitFor(() => expect(authMocks.register).toHaveBeenCalledWith({
      email: 'autofill@example.com',
      location: { city: 'Kumasi', region: 'Ashanti' },
      name: 'Autofilled Buyer',
      password: 'Autofill1!',
      phone: '',
      username: 'autofilled.buyer',
    }))
  })

  it('keeps reset submission unavailable when the secure token is missing', () => {
    window.history.replaceState({}, '', '/reset-password')
    render(<ResetPasswordPage />)

    expect(screen.getByText(/missing its secure token/i)).toBeVisible()
    expect(screen.getByRole('button', { name: 'Reset password' })).toBeDisabled()
  })
})
