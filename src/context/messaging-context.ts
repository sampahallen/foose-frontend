import { createContext } from 'react'

export type MessagingContextValue = {
  connected: boolean
  joinConversation: (conversationId: string) => void
  refreshSignal: number
  triggerMessagingRefresh: () => void
}

export const MessagingContext = createContext<MessagingContextValue | undefined>(undefined)
