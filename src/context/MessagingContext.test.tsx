import { act, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useMessaging } from '../hooks/useMessaging'
import { MessagingProvider } from './MessagingContext'

const socketMocks = vi.hoisted(() => {
  const handlers = new Map<string, (event: unknown) => void>()
  const socket = {
    connected: true,
    disconnect: vi.fn(),
    emit: vi.fn(),
    off: vi.fn((event: string) => handlers.delete(event)),
    on: vi.fn((event: string, handler: (payload: unknown) => void) => {
      handlers.set(event, handler)
    }),
  }
  return { handlers, io: vi.fn(() => socket), socket }
})

const authMocks = vi.hoisted(() => ({
  user: { _id: 'me', isEmailVerified: true },
}))

const apiMocks = vi.hoisted(() => ({
  apiGet: vi.fn(),
}))

vi.mock('socket.io-client', () => ({ io: socketMocks.io }))
vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({ status: 'authenticated', user: authMocks.user }),
}))
vi.mock('../lib/api', () => ({
  apiGet: apiMocks.apiGet,
  apiPut: vi.fn(async () => ({})),
  getStoredTokens: () => ({ accessToken: 'token' }),
}))

function ReactionState() {
  const { messageReactionEvent, messageReactionEvents, unreadMessageCount, unreadNotificationCount } = useMessaging()
  return (
    <>
      <output aria-label="Inbox count">{unreadMessageCount}</output>
      <output aria-label="System count">{unreadNotificationCount}</output>
      <output aria-label="Reaction message">{messageReactionEvent?.message._id || ''}</output>
      <output aria-label="Reaction event count">{messageReactionEvents.length}</output>
    </>
  )
}

describe('MessagingProvider reactions', () => {
  beforeEach(() => {
    authMocks.user.isEmailVerified = true
    apiMocks.apiGet.mockReset()
    apiMocks.apiGet.mockImplementation(async (path: string) => path.startsWith('/chat')
      ? {
          conversations: [{
            conversationId: 'me_other_general',
            latestMessage: { _id: 'message-1', content: 'Hello', senderId: 'other', receiverId: 'me' },
            unreadCount: 0,
            unreadReactionCount: 0,
          }],
        }
      : { notifications: [] })
    socketMocks.handlers.clear()
    socketMocks.io.mockClear()
    Object.values(socketMocks.socket).forEach((value) => {
      if (typeof value === 'function' && 'mockClear' in value) value.mockClear()
    })
  })

  it('loads and receives system notifications without exposing realtime chat for an unverified member', async () => {
    authMocks.user.isEmailVerified = false
    apiMocks.apiGet.mockResolvedValue({ notifications: [] })

    render(<MessagingProvider><ReactionState /></MessagingProvider>)

    await waitFor(() => expect(apiMocks.apiGet).toHaveBeenCalledWith('/notifications?limit=40'))
    expect(apiMocks.apiGet).not.toHaveBeenCalledWith('/chat?page=1&limit=40')
    await waitFor(() => expect(socketMocks.io).toHaveBeenCalledTimes(1))
    expect(socketMocks.handlers.has('new-notification')).toBe(true)
    expect(socketMocks.handlers.has('notification-read')).toBe(true)
    expect(socketMocks.handlers.has('new-message')).toBe(false)
    expect(socketMocks.handlers.has('message-reaction-updated')).toBe(false)

    act(() => socketMocks.handlers.get('new-notification')?.({
      _id: 'system-1',
      isRead: false,
      message: 'Your account settings were updated.',
      title: 'Account updated',
      type: 'system',
    }))

    expect(await screen.findByLabelText('System count')).toHaveTextContent('1')
    expect(screen.getByLabelText('Inbox count')).toHaveTextContent('0')
  })

  it('delivers reaction events live and updates the inbox notification count', async () => {
    render(<MessagingProvider><ReactionState /></MessagingProvider>)

    await waitFor(() => expect(socketMocks.handlers.has('message-reaction-updated')).toBe(true))
    await waitFor(() => expect(screen.getByLabelText('Inbox count')).toHaveTextContent('0'))

    act(() => socketMocks.handlers.get('message-reaction-updated')?.({
      conversationId: 'me_other_general',
      message: {
        _id: 'message-1',
        content: 'Hello',
        reactions: [{ isRead: false, reaction: 'heart', userId: 'other' }],
        receiverId: 'me',
        senderId: 'other',
      },
      reactedBy: 'other',
      removed: false,
      unreadReactionDelta: 1,
    }))

    expect(await screen.findByText('message-1')).toBeInTheDocument()
    expect(screen.getByLabelText('Inbox count')).toHaveTextContent('1')

    act(() => socketMocks.handlers.get('message-reaction-updated')?.({
      conversationId: 'me_other_general',
      message: { _id: 'message-1', content: 'Hello', reactions: [], receiverId: 'me', senderId: 'other' },
      reactedBy: 'other',
      removed: true,
      unreadReactionDelta: -1,
    }))

    await waitFor(() => expect(screen.getByLabelText('Inbox count')).toHaveTextContent('0'))
    expect(screen.getByLabelText('Reaction event count')).toHaveTextContent('2')
  })
})
