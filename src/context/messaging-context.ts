import { createContext } from 'react'
import type { ChatConversation, ChatMessage, Notification } from '../types/api'

export type RealtimeMessageEvent = {
  clientMessageId?: string
  conversationId: string
  message: ChatMessage
}

export type MessagesReadEvent = {
  conversationId: string
  readBy?: string
}

export type SendSocketMessagePayload = {
  clientMessageId?: string
  content: string
  conversationId?: string
  listingId?: string
  receiverId?: string
  replyTo?: string
}

export type SendSocketMessageAck = {
  clientMessageId?: string
  conversationId?: string
  error?: string
  message?: ChatMessage
  success: boolean
}

export type MessagingContextValue = {
  connected: boolean
  conversations: ChatConversation[]
  hasUnreadMessages: boolean
  joinConversation: (conversationId: string) => void
  markAllNotificationsRead: () => Promise<void>
  markConversationRead: (conversationId: string) => void
  markNotificationRead: (notificationId: string) => Promise<void>
  messageConfirmedEvent: RealtimeMessageEvent | null
  messageEvent: RealtimeMessageEvent | null
  messagesReadEvent: MessagesReadEvent | null
  notificationError: string
  notificationLoading: boolean
  notifications: Notification[]
  refreshSignal: number
  sendMessage: (payload: SendSocketMessagePayload) => Promise<SendSocketMessageAck>
  triggerMessagingRefresh: () => void
  unreadMessageCount: number
  unreadNotificationCount: number
}

export const MessagingContext = createContext<MessagingContextValue | undefined>(undefined)
