import { useContext } from 'react'
import { MessagingContext } from '../context/messaging-context'

export function useMessaging() {
  const context = useContext(MessagingContext)
  if (!context) {
    throw new Error('useMessaging must be used inside MessagingProvider')
  }
  return context
}
