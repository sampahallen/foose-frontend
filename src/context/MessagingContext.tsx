import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { io, type Socket } from 'socket.io-client'
import { getSocketBaseUrl } from '../config/env'
import { useAuth } from '../hooks/useAuth'
import { apiGet, apiPut, getStoredTokens } from '../lib/api'
import type { ChatConversation, ChatMessage, Notification, User } from '../types/api'
import { getErrorMessage } from '../utils/errorMessage'
import {
  MessagingContext,
  type MessagesReadEvent,
  type RealtimeMessageEvent,
  type SendSocketMessageAck,
  type SendSocketMessagePayload,
} from './messaging-context'

type NotificationReadEvent = {
  all?: boolean
  notification?: Notification
  notificationId?: string
}

function idValue(value: User | string | undefined) {
  if (!value) return ''
  return typeof value === 'string' ? value : value._id
}

function participantForMessage(message: ChatMessage, userId: string) {
  const senderId = idValue(message.senderId)
  return senderId === userId ? message.receiverId : message.senderId
}

function normalizeMessageEvent(value: RealtimeMessageEvent | ChatMessage | null | undefined): RealtimeMessageEvent | null {
  if (!value) return null
  if ('message' in value && value.message && value.conversationId) return value
  if ('_id' in value && value.conversationId) {
    return {
      conversationId: value.conversationId,
      message: value,
    }
  }
  return null
}

function upsertConversationFromMessage(conversations: ChatConversation[], event: RealtimeMessageEvent, userId: string) {
  const message = event.message
  const senderId = idValue(message.senderId)
  const receiverId = idValue(message.receiverId)
  const incoming = Boolean(userId && receiverId === userId && senderId !== userId)
  const participant = participantForMessage(message, userId)
  const index = conversations.findIndex((conversation) => conversation.conversationId === event.conversationId)

  if (index === -1) {
    return [
      {
        conversationId: event.conversationId,
        latestMessage: message,
        listing: message.listingId,
        participant,
        unreadCount: incoming ? 1 : 0,
      },
      ...conversations,
    ]
  }

  const next = [...conversations]
  const current = next[index]
  next[index] = {
    ...current,
    latestMessage: message,
    listing: message.listingId || current.listing,
    participant: current.participant || participant,
    unreadCount: incoming ? current.unreadCount + 1 : current.unreadCount,
  }

  return [next[index], ...next.filter((_, itemIndex) => itemIndex !== index)]
}

function upsertNotification(notifications: Notification[], notification: Notification) {
  if (notification.type === 'chat') return notifications

  const index = notifications.findIndex((item) => item._id === notification._id)
  if (index === -1) return [notification, ...notifications]

  const next = [...notifications]
  next[index] = notification
  return next
}

export function MessagingProvider({ children }: { children: ReactNode }) {
  const { status, user } = useAuth()
  const userId = user?._id || ''
  const socketRef = useRef<Socket | null>(null)
  const [connected, setConnected] = useState(false)
  const [conversations, setConversations] = useState<ChatConversation[]>([])
  const [messageEvent, setMessageEvent] = useState<RealtimeMessageEvent | null>(null)
  const [messageConfirmedEvent, setMessageConfirmedEvent] = useState<RealtimeMessageEvent | null>(null)
  const [messagesReadEvent, setMessagesReadEvent] = useState<MessagesReadEvent | null>(null)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [notificationError, setNotificationError] = useState('')
  const [notificationLoading, setNotificationLoading] = useState(false)
  const [refreshSignal, setRefreshSignal] = useState(0)

  const triggerMessagingRefresh = useCallback(() => {
    setRefreshSignal((current) => current + 1)
  }, [])

  useEffect(() => {
    if (status !== 'authenticated' || !userId) {
      setConversations([])
      setNotifications([])
      setNotificationLoading(false)
      setNotificationError('')
      return undefined
    }

    let mounted = true
    setNotificationLoading(true)
    setNotificationError('')

    Promise.all([
      apiGet<{ conversations: ChatConversation[] }>('/chat?page=1&limit=40'),
      apiGet<{ notifications: Notification[] }>('/notifications?limit=40'),
    ])
      .then(([conversationData, notificationData]) => {
        if (!mounted) return
        setConversations(conversationData.conversations || [])
        setNotifications((notificationData.notifications || []).filter((notification) => notification.type !== 'chat'))
      })
      .catch((error) => {
        if (mounted) setNotificationError(getErrorMessage(error, 'Unable to load live inbox data'))
      })
      .finally(() => {
        if (mounted) setNotificationLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [status, userId])

  useEffect(() => {
    const token = getStoredTokens()?.accessToken
    if (status !== 'authenticated' || !userId || !token) {
      socketRef.current?.disconnect()
      socketRef.current = null
      setConnected(false)
      return undefined
    }

    socketRef.current?.disconnect()

    const nextSocket = io(getSocketBaseUrl(), {
      auth: { token },
      transports: ['websocket', 'polling'],
    })

    function handleConnect() {
      setConnected(true)
    }

    function handleDisconnect() {
      setConnected(false)
    }

    function handleNewMessage(rawEvent: RealtimeMessageEvent | ChatMessage) {
      const event = normalizeMessageEvent(rawEvent)
      if (!event) return
      setMessageEvent({ ...event })
      setConversations((current) => upsertConversationFromMessage(current, event, userId))
    }

    function handleMessageConfirmed(rawEvent: RealtimeMessageEvent | ChatMessage) {
      const event = normalizeMessageEvent(rawEvent)
      if (!event) return
      setMessageConfirmedEvent({ ...event })
      setConversations((current) => upsertConversationFromMessage(current, event, userId))
    }

    function handleMessagesRead(event: MessagesReadEvent) {
      setMessagesReadEvent({ ...event })
      if (event.readBy !== userId) return
      setConversations((current) =>
        current.map((conversation) =>
          conversation.conversationId === event.conversationId
            ? { ...conversation, unreadCount: 0 }
            : conversation,
        ),
      )
    }

    function handleNotification(notification: Notification) {
      if (notification.type === 'chat') return
      setNotifications((current) => upsertNotification(current, notification))
    }

    function handleNotificationRead(event: NotificationReadEvent) {
      if (event.all) {
        setNotifications((current) => current.map((notification) => ({ ...notification, isRead: true })))
        return
      }

      if (event.notification) {
        setNotifications((current) => upsertNotification(current, event.notification as Notification))
        return
      }

      if (event.notificationId) {
        setNotifications((current) =>
          current.map((notification) =>
            notification._id === event.notificationId ? { ...notification, isRead: true } : notification,
          ),
        )
      }
    }

    nextSocket.on('connect', handleConnect)
    nextSocket.on('disconnect', handleDisconnect)
    nextSocket.on('new-message', handleNewMessage)
    nextSocket.on('message-confirmed', handleMessageConfirmed)
    nextSocket.on('messages-read', handleMessagesRead)
    nextSocket.on('notification', handleNotification)
    nextSocket.on('new-notification', handleNotification)
    nextSocket.on('notification-read', handleNotificationRead)
    socketRef.current = nextSocket

    return () => {
      nextSocket.off('connect', handleConnect)
      nextSocket.off('disconnect', handleDisconnect)
      nextSocket.off('new-message', handleNewMessage)
      nextSocket.off('message-confirmed', handleMessageConfirmed)
      nextSocket.off('messages-read', handleMessagesRead)
      nextSocket.off('notification', handleNotification)
      nextSocket.off('new-notification', handleNotification)
      nextSocket.off('notification-read', handleNotificationRead)
      nextSocket.disconnect()
      setConnected(false)
      if (socketRef.current === nextSocket) socketRef.current = null
    }
  }, [status, userId])

  const joinConversation = useCallback((conversationId: string) => {
    if (!conversationId) return
    socketRef.current?.emit('join_conversation', { conversationId })
  }, [])

  const markConversationRead = useCallback((conversationId: string) => {
    if (!conversationId) return
    socketRef.current?.emit('mark-read', { conversationId })
    setConversations((current) =>
      current.map((conversation) =>
        conversation.conversationId === conversationId ? { ...conversation, unreadCount: 0 } : conversation,
      ),
    )
  }, [])

  const markNotificationRead = useCallback(async (notificationId: string) => {
    if (!notificationId) return
    const result = await apiPut<{ notification: Notification }>(`/notifications/${encodeURIComponent(notificationId)}/read`)
    setNotifications((current) => upsertNotification(current, result.notification))
  }, [])

  const markAllNotificationsRead = useCallback(async () => {
    await apiPut('/notifications/read-all')
    setNotifications((current) => current.map((notification) => ({ ...notification, isRead: true })))
  }, [])

  const sendMessage = useCallback((payload: SendSocketMessagePayload) => {
    const socket = socketRef.current
    if (!socket?.connected) {
      return Promise.resolve({
        error: 'Messaging is still connecting. Please try again.',
        success: false,
      } satisfies SendSocketMessageAck)
    }

    return new Promise<SendSocketMessageAck>((resolve) => {
      const timer = window.setTimeout(() => {
        resolve({
          clientMessageId: payload.clientMessageId,
          error: 'Message send timed out',
          success: false,
        })
      }, 15000)

      socket.emit('send-message', payload, (ack: SendSocketMessageAck) => {
        window.clearTimeout(timer)
        resolve(ack)
      })
    })
  }, [])

  const unreadMessageCount = conversations.reduce((sum, conversation) => sum + (conversation.unreadCount || 0), 0)
  const unreadNotificationCount = notifications.filter((notification) => notification.type !== 'chat' && !notification.isRead).length
  const hasUnreadMessages = unreadMessageCount > 0

  const value = useMemo(
    () => ({
      connected,
      conversations,
      hasUnreadMessages,
      joinConversation,
      markAllNotificationsRead,
      markConversationRead,
      markNotificationRead,
      messageConfirmedEvent,
      messageEvent,
      messagesReadEvent,
      notificationError,
      notificationLoading,
      notifications,
      refreshSignal,
      sendMessage,
      triggerMessagingRefresh,
      unreadMessageCount,
      unreadNotificationCount,
    }),
    [
      connected,
      conversations,
      hasUnreadMessages,
      joinConversation,
      markAllNotificationsRead,
      markConversationRead,
      markNotificationRead,
      messageConfirmedEvent,
      messageEvent,
      messagesReadEvent,
      notificationError,
      notificationLoading,
      notifications,
      refreshSignal,
      sendMessage,
      triggerMessagingRefresh,
      unreadMessageCount,
      unreadNotificationCount,
    ],
  )

  return <MessagingContext.Provider value={value}>{children}</MessagingContext.Provider>
}
