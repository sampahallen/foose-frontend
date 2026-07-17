import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiGet } from '../lib/api'
import { ProfileSettingsPage } from './ProfileSettingsPage'

const authMocks = vi.hoisted(() => ({
  refreshUser: vi.fn(),
  user: {
    _id: 'user-1',
    bio: 'Thrift lover',
    email: 'sam@example.com',
    name: 'Sam Mensah',
    phone: '0240000000',
    profilePhoto: 'https://images.example.test/sam.jpg',
    role: 'user',
    username: 'sam_mensah',
  },
}))

vi.mock('../components/layout/AppShell', () => ({
  AppShell: ({ children }: { children: ReactNode }) => <main>{children}</main>,
}))

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    refreshUser: authMocks.refreshUser,
    status: 'authenticated',
    user: authMocks.user,
  }),
}))

vi.mock('../lib/api', () => ({
  apiGet: vi.fn(),
  apiPut: vi.fn(),
}))

const mockedApiGet = vi.mocked(apiGet)

describe('ProfileSettingsPage', () => {
  beforeEach(() => {
    authMocks.refreshUser.mockReset()
    mockedApiGet.mockReset()
  })

  it('uses the avatar pencil as the profile-photo editing entry point', async () => {
    const user = userEvent.setup()
    render(<ProfileSettingsPage />)

    expect(screen.queryByLabelText('Choose profile photo')).not.toBeInTheDocument()
    expect(screen.queryByText(/Use the pencil to choose and crop/i)).not.toBeInTheDocument()
    const editPhoto = screen.getByRole('button', { name: 'Edit profile photo' })
    expect(editPhoto.parentElement).toHaveClass('w-fit', 'self-start')
    await user.click(editPhoto)

    expect(screen.getByRole('dialog', { name: 'Change profile photo' })).toBeVisible()
    expect(screen.getByLabelText('Choose profile photo')).toHaveAttribute('accept', 'image/jpeg,image/png,image/webp')
  })

  it('shows delayed green and red username availability bands while typing', async () => {
    mockedApiGet.mockImplementation(async (path: string) => ({
      available: path.includes('fresh_name'),
      username: path.includes('fresh_name') ? 'fresh_name' : 'taken_name',
    }))
    render(<ProfileSettingsPage />)
    const username = screen.getByRole('textbox', { name: 'Username' })

    fireEvent.change(username, { target: { value: 'fresh_name' } })
    expect(screen.getByRole('status')).toHaveTextContent('Checking @fresh_name')
    await waitFor(() => expect(mockedApiGet).toHaveBeenCalledTimes(1), { timeout: 2_000 })
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('@fresh_name is available.'), { timeout: 2_000 })
    expect(screen.getByRole('status')).toHaveClass('text-foose-success')

    fireEvent.change(username, { target: { value: 'taken_name' } })
    await waitFor(() => expect(mockedApiGet).toHaveBeenCalledTimes(2), { timeout: 2_000 })
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('@taken_name is already taken.'), { timeout: 2_000 })
    expect(screen.getByRole('status')).toHaveClass('text-foose-danger')
    expect(username).toHaveAttribute('aria-invalid', 'true')
  })
})
