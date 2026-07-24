import type {
  Order,
  OrderAllowedAction,
  OrderSettlementStatus,
  PrivateOrderAsset,
  User,
} from '../types/api'

export type OrderViewer = 'buyer' | 'seller'
export type OrderBucket = 'needs_action' | 'in_progress' | 'under_review' | 'history'
export type OrderBadgeTone = 'neutral' | 'accent' | 'danger' | 'success' | 'warning'

const terminalSettlementStatuses = new Set<OrderSettlementStatus>([
  'cash_collected',
  'released',
  'refunded',
  'void',
])

const actionCopy: Record<OrderAllowedAction, {
  busyLabel: string
  confirmDescription?: string
  confirmLabel?: string
  confirmTitle?: string
  label: string
  tone?: 'default' | 'destructive'
}> = {
  cancel_cash_pickup: {
    busyLabel: 'Cancelling…',
    confirmDescription: 'The pickup request will close and every reserved item will return to the seller’s inventory.',
    confirmLabel: 'Cancel pickup',
    confirmTitle: 'Cancel this pickup request?',
    label: 'Cancel pickup',
    tone: 'destructive',
  },
  mark_pickup_ready: {
    busyLabel: 'Notifying buyer…',
    confirmDescription: 'The buyer will be told the order is ready. Their 72-hour collection window starts immediately.',
    confirmLabel: 'Mark ready',
    confirmTitle: 'Is this order ready for pickup?',
    label: 'Mark ready for pickup',
  },
  complete_cash_pickup: {
    busyLabel: 'Completing…',
    confirmDescription: 'Only confirm after the buyer has the complete order and you have received the cash payment.',
    confirmLabel: 'Complete order',
    confirmTitle: 'Item collected and cash received?',
    label: 'Collected & cash received',
  },
  release_unclaimed_pickup: {
    busyLabel: 'Returning items…',
    confirmDescription: 'This closes the unclaimed cash pickup and returns every item to your inventory. This cannot be undone.',
    confirmLabel: 'Return to inventory',
    confirmTitle: 'Release this unclaimed pickup?',
    label: 'Return to inventory',
    tone: 'destructive',
  },
  confirm_collection: {
    busyLabel: 'Releasing funds…',
    confirmDescription: 'Confirm only while you have the complete order. This immediately releases the protected payment to the seller and cannot be undone.',
    confirmLabel: 'Confirm & release funds',
    confirmTitle: 'Have you collected the complete order?',
    label: 'Confirm collection',
  },
  dispatch: {
    busyLabel: 'Sending details…',
    label: 'Add transit details & send',
  },
  confirm_receipt: {
    busyLabel: 'Releasing funds…',
    confirmDescription: 'Confirm only after checking the complete parcel. This immediately releases the protected payment to the seller.',
    confirmLabel: 'Confirm & release funds',
    confirmTitle: 'Have you received the complete order?',
    label: 'Confirm received',
  },
  close_no_action: {
    busyLabel: 'Requesting refund…',
    confirmDescription: 'The order will close, the items will return to inventory, and a full refund will be started to your original payment method.',
    confirmLabel: 'Close & refund',
    confirmTitle: 'Close this overdue order?',
    label: 'Close & request refund',
    tone: 'destructive',
  },
  report: {
    busyLabel: 'Opening report…',
    label: 'Report a problem',
  },
}

export function orderActionCopy(action: OrderAllowedAction) {
  return actionCopy[action]
}

export function orderAllowedActions(order: Pick<Order, 'workflow'>): OrderAllowedAction[] {
  if (!Array.isArray(order.workflow?.allowedActions)) return []
  return Array.from(new Set(order.workflow.allowedActions.map((action) => action === 'report_order' ? 'report' : action)))
}

export function orderHasAction(order: Pick<Order, 'workflow'>, action: OrderAllowedAction) {
  return orderAllowedActions(order).includes(action)
}

export function orderPrimaryAction(order: Pick<Order, 'workflow'>) {
  const actions = orderAllowedActions(order)
  const priority: OrderAllowedAction[] = [
    'complete_cash_pickup',
    'confirm_collection',
    'confirm_receipt',
    'dispatch',
    'mark_pickup_ready',
    'close_no_action',
    'release_unclaimed_pickup',
    'cancel_cash_pickup',
    'report',
  ]
  return priority.find((action) => actions.includes(action))
}

export function isHistoricalOrder(order: Pick<Order, 'fulfillmentStatus' | 'settlementStatus' | 'status'>) {
  if (order.fulfillmentStatus === 'completed') return true
  if (order.fulfillmentStatus === 'cancelled') {
    return order.settlementStatus ? terminalSettlementStatuses.has(order.settlementStatus) : true
  }
  return ['cancelled', 'delivered', 'refunded'].includes(order.status || '')
}

export function isOrderUnderReview(order: Pick<Order, 'workflow' | 'activeReportId' | 'status'>) {
  return Boolean(order.workflow?.report?.active || order.activeReportId || order.status === 'disputed')
}

export function orderBucket(order: Order, viewer: OrderViewer): OrderBucket {
  if (isOrderUnderReview(order)) return 'under_review'
  if (order.settlementStatus === 'refund_attention' || order.settlementStatus === 'refund_failed') {
    return 'under_review'
  }
  if (isHistoricalOrder(order)) return 'history'
  if (!order.workflow) return 'needs_action'
  if (
    [viewer, 'buyer_or_seller'].includes(order.workflow?.nextActor || '')
    && orderAllowedActions(order).some((action) => action !== 'report')
  ) {
    return 'needs_action'
  }
  return 'in_progress'
}

export function orderTitle(order: Pick<Order, 'items'>) {
  if (order.items.length > 1) return `${order.items[0]?.title || 'Order item'} + ${order.items.length - 1} more`
  return order.items[0]?.title || 'Order item'
}

export function orderAddress(order: Pick<Order, 'delivery'>) {
  const destination = order.delivery?.destination
  if (destination) {
    return [destination.preferredTerminal, destination.town, destination.region].filter(Boolean).join(', ')
  }
  const address = order.delivery?.address
  return [address?.street, address?.city, address?.region].filter(Boolean).join(', ')
}

export function orderRecipient(order: Pick<Order, 'delivery'>) {
  const destination = order.delivery?.destination
  return [
    destination?.recipientName || order.delivery?.recipient?.name,
    destination?.recipientPhone || order.delivery?.recipient?.phone,
  ].filter(Boolean).join(' · ')
}

export function participantName(user: User | string | undefined, fallback = 'Foose member') {
  if (!user || typeof user === 'string') return fallback
  return user.name || user.username || fallback
}

export function participantContact(user: User | string | undefined) {
  if (!user || typeof user === 'string') return ''
  return [user.phone, user.email].filter(Boolean).join(' / ')
}

export function privateOrderAssetUrl(asset: PrivateOrderAsset | undefined) {
  if (!asset) return ''
  if (typeof asset === 'string') return asset
  return asset.signedUrl || asset.url || ''
}

export function orderProgressLabel(order: Order) {
  if (isOrderUnderReview(order)) return 'Funds frozen — under review'
  switch (order.fulfillmentStatus) {
    case 'awaiting_seller':
      return 'Waiting for seller'
    case 'ready_for_pickup':
      return 'Ready for pickup'
    case 'in_transit':
      return 'On the way'
    case 'completed':
      return 'Completed'
    case 'cancelled':
      if (order.settlementStatus === 'refund_pending') return 'Refund started'
      if (order.settlementStatus === 'refund_attention') return 'Refund needs attention'
      if (order.settlementStatus === 'refund_failed') return 'Refund failed'
      if (order.settlementStatus === 'refunded') return 'Refunded'
      return 'Cancelled'
    default:
      break
  }

  if (order.status === 'delivered') return 'Completed'
  if (order.status === 'cancelled') return 'Cancelled'
  if (order.status === 'refunded') return 'Refunded'
  if (order.status === 'disputed') return 'Funds frozen — under review'
  if (order.delivery?.method === 'pickup' && order.sellerAction === 'pickup_ready') return 'Ready for pickup'
  if (order.status === 'shipped') return 'On the way'
  if (order.status === 'processing') return 'Preparing order'
  if (order.status === 'paid') return 'Payment protected'
  return 'Order placed'
}

export function orderStatusTone(order: Order): OrderBadgeTone {
  if (isOrderUnderReview(order) || order.settlementStatus === 'refund_failed' || order.settlementStatus === 'refund_attention') {
    return 'danger'
  }
  if (order.fulfillmentStatus === 'completed' || ['released', 'cash_collected'].includes(order.settlementStatus || '')) {
    return 'success'
  }
  if (order.fulfillmentStatus === 'cancelled' || order.settlementStatus === 'refunded') return 'neutral'
  if (order.fulfillmentStatus === 'ready_for_pickup' || order.settlementStatus === 'refund_pending') return 'warning'
  return 'accent'
}

export function orderSettlementLabel(status: Order['settlementStatus'], paymentMethod?: Order['paymentMethod']) {
  if (!status) {
    return paymentMethod === 'cash_on_pickup' ? 'Cash due at pickup' : 'Payment status pending'
  }
  const labels: Record<OrderSettlementStatus, string> = {
    payment_pending: 'Payment pending',
    cash_due: 'Cash due at pickup',
    cash_collected: 'Cash collected',
    held: 'Protected in escrow',
    released: 'Released to seller',
    refund_pending: 'Refund in progress',
    refund_attention: 'Refund needs attention',
    refunded: 'Refunded to buyer',
    refund_failed: 'Refund failed',
    void: 'No payment due',
  }
  return labels[status]
}

export function orderNextStep(order: Order, viewer: OrderViewer) {
  if (isOrderUnderReview(order)) {
    return 'Automatic release is paused. Foose support will review the report before any money moves.'
  }
  if (
    viewer === 'seller'
    && order.fulfillmentStatus === 'ready_for_pickup'
    && order.settlementStatus === 'held'
  ) {
    return 'Ask the buyer to inspect the complete order and confirm collection here while you are together. Their confirmation releases your payment immediately.'
  }
  const primary = orderPrimaryAction(order)
  if (primary && [viewer, 'buyer_or_seller'].includes(order.workflow?.nextActor || '')) {
    const prompts: Partial<Record<OrderAllowedAction, string>> = {
      cancel_cash_pickup: 'You can cancel this cash pickup until the seller marks it ready.',
      mark_pickup_ready: 'Prepare every item, then tell the buyer the order is ready.',
      complete_cash_pickup: 'At handoff, confirm only after the buyer has the order and you have the cash.',
      release_unclaimed_pickup: 'The collection window has passed. You may return the items to inventory.',
      confirm_collection: 'Collect and inspect the order, then confirm while you are with the seller.',
      dispatch: 'Take the parcel to the station, then add the complete transit details and bill.',
      confirm_receipt: 'Inspect the complete parcel, then confirm receipt to release payment.',
      close_no_action: 'The seller action window has passed. You may close the order for a full refund.',
      report: 'If something is wrong, submit a report before the release window ends.',
    }
    return prompts[primary] || 'This order needs your attention.'
  }

  if (order.workflow?.nextActor === 'system') {
    return 'No action is needed from you right now. Foose will apply the deadline automatically.'
  }
  if (order.workflow?.nextActor === 'support' || order.workflow?.nextActor === 'review') {
    return 'Foose support is reviewing this order.'
  }
  if (order.workflow?.nextActor && order.workflow.nextActor !== 'none') {
    return `Waiting for the ${order.workflow.nextActor} to take the next step.`
  }
  if (isHistoricalOrder(order)) return 'This order is closed. Its activity remains available below.'
  return 'No action is needed from you right now.'
}

export function orderDeadlineLabel(type?: string) {
  const labels: Record<string, string> = {
    buyer_close_eligible: 'Seller action window',
    delivery_auto_release: 'Automatic payment release',
    pickup_auto_refund: 'Pickup collection window',
    pickup_window: 'Pickup collection window',
    pickup_release_eligible: 'Pickup collection window',
    seller_action: 'Seller action window',
    delivery_confirmation: 'Delivery confirmation window',
  }
  return (type && labels[type]) || 'Action window'
}

export function orderEventLabel(type: string) {
  const labels: Record<string, string> = {
    order_created: 'Order placed',
    payment_confirmed: 'Payment protected in escrow',
    pickup_ready: 'Order marked ready for pickup',
    cash_pickup_cancelled: 'Cash pickup cancelled and inventory restored',
    cash_pickup_completed: 'Pickup completed and cash received',
    pickup_released: 'Unclaimed pickup returned to inventory',
    delivery_dispatched: 'Parcel sent with transit details',
    funds_released: 'Protected payment released to seller',
    refund_pending: 'Full refund requested',
    collection_confirmed: 'Collection confirmed and payment released',
    dispatched: 'Parcel sent',
    receipt_confirmed: 'Delivery confirmed and payment released',
    delivery_auto_released: 'Payment released after delivery window',
    refund_requested: 'Refund requested',
    refund_processed: 'Refund completed',
    refund_attention: 'Refund needs provider attention',
    refund_failed: 'Refund attempt failed',
    order_reported: 'Problem reported and automatic settlement frozen',
    report_submitted: 'Problem reported and funds frozen',
    late_payment_refund_started: 'Late payment refund started',
    order_cancelled: 'Order cancelled',
  }
  return labels[type] || type.replaceAll('_', ' ').replace(/^\w/, (letter) => letter.toUpperCase())
}

/** Legacy helpers remain exported for older page code during the migration. */
export function canSellerMarkPickupReady(order: Order) {
  return orderHasAction(order, 'mark_pickup_ready')
}

export function canBuyerConfirmOrder(order: Order) {
  return orderHasAction(order, order.delivery?.method === 'pickup' ? 'confirm_collection' : 'confirm_receipt')
}
