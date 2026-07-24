import { useContext, useEffect, useRef } from 'react'
import { MessagingContext } from '../context/messaging-context'

/**
 * Refreshes server-authored order views as soon as an order notification
 * arrives. The provider exposes only socket events here, so loading historical
 * notifications does not create a refetch burst.
 */
export function useOrderRealtimeRefresh(
  refetch: () => Promise<void>,
  enabled = true,
  orderId?: string,
) {
  const messaging = useContext(MessagingContext)
  const notification = messaging?.notificationEvent
  const refetchRef = useRef(refetch)

  useEffect(() => {
    refetchRef.current = refetch
  }, [refetch])

  useEffect(() => {
    if (!enabled || notification?.type !== 'order') return
    if (orderId && notification.link && !notification.link.includes(`/orders/${orderId}`)) return
    void refetchRef.current()
  }, [enabled, notification, orderId])
}
