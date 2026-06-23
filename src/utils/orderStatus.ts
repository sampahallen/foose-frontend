import type { Order, User } from '../types/api'

const historyStatuses = new Set<Order['status']>(['cancelled', 'delivered', 'refunded'])

export function isHistoricalOrder(order: Pick<Order, 'status'>) {
  return historyStatuses.has(order.status)
}

export function orderTitle(order: Pick<Order, 'items'>) {
  return order.items.map((item) => item.title).filter(Boolean).join(', ') || 'Order item'
}

export function orderAddress(order: Pick<Order, 'delivery'>) {
  const address = order.delivery?.address
  return [address?.street, address?.city, address?.region].filter(Boolean).join(', ')
}

export function participantName(user: User | string | undefined, fallback = 'Foose member') {
  if (!user || typeof user === 'string') return fallback
  return user.name || user.username || fallback
}

export function participantContact(user: User | string | undefined) {
  if (!user || typeof user === 'string') return ''
  return [user.phone, user.email].filter(Boolean).join(' / ')
}

export function orderProgressLabel(order: Order) {
  if (order.status === 'delivered') return 'Completed'
  if (order.status === 'cancelled') return 'Cancelled'
  if (order.status === 'refunded') return 'Refunded'
  if (order.status === 'disputed') return 'Disputed'
  if (order.delivery?.method === 'pickup' && order.sellerAction === 'pickup_ready') return 'Awaiting pickup'
  if (order.status === 'shipped') return 'On the way'
  if (order.status === 'processing') return 'Processing'
  if (order.status === 'paid') return 'Paid'
  return 'Pending'
}

export function canSellerMarkPickupReady(order: Order) {
  return order.delivery?.method === 'pickup' && order.sellerAction !== 'pickup_ready' && ['pending', 'paid', 'processing'].includes(order.status)
}

export function canBuyerConfirmOrder(order: Order) {
  if (order.delivery?.method === 'pickup') {
    return order.status === 'processing' && order.sellerAction === 'pickup_ready'
  }

  return order.status === 'shipped'
}
