import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { io, type Socket } from 'socket.io-client'
import { getSocketBaseUrl } from '../config/env'
import { useAuth } from '../hooks/useAuth'
import { getStoredTokens } from '../lib/api'
import { MessagingContext } from './messaging-context'

export function MessagingProvider({ children }: { children: ReactNode }) {
  const { status, user } = useAuth()
  const socketRef = useRef<Socket | null>(null)
  const [connected, setConnected] = useState(false)
  const [refreshSignal, setRefreshSignal] = useState(0)

  const triggerMessagingRefresh = useCallback(() => {
    setRefreshSignal((current) => current + 1)
  }, [])

  useEffect(() => {
    const token = getStoredTokens()?.accessToken
    if (status !== 'authenticated' || !user || !token) {
      return undefined
    }

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

    nextSocket.on('connect', handleConnect)
    nextSocket.on('disconnect', handleDisconnect)
    nextSocket.on('new_message', triggerMessagingRefresh)
    nextSocket.on('conversation_message', triggerMessagingRefresh)
    nextSocket.on('messages_read', triggerMessagingRefresh)
    nextSocket.on('notification', triggerMessagingRefresh)
    socketRef.current = nextSocket

    return () => {
      nextSocket.off('connect', handleConnect)
      nextSocket.off('disconnect', handleDisconnect)
      nextSocket.off('new_message', triggerMessagingRefresh)
      nextSocket.off('conversation_message', triggerMessagingRefresh)
      nextSocket.off('messages_read', triggerMessagingRefresh)
      nextSocket.off('notification', triggerMessagingRefresh)
      nextSocket.disconnect()
      setConnected(false)
      socketRef.current = null
    }
  }, [status, triggerMessagingRefresh, user])

  const joinConversation = useCallback(
    (conversationId: string) => {
      if (!conversationId) return
      socketRef.current?.emit('join_conversation', { conversationId })
    },
    [],
  )

  const value = useMemo(
    () => ({ connected, joinConversation, refreshSignal, triggerMessagingRefresh }),
    [connected, joinConversation, refreshSignal, triggerMessagingRefresh],
  )

  return <MessagingContext.Provider value={value}>{children}</MessagingContext.Provider>
}
