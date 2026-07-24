import type { Order, OrderAllowedAction } from '../types/api'
import { apiPost } from './api'

const endpointByAction: Record<Exclude<OrderAllowedAction, 'report'>, string> = {
  cancel_cash_pickup: 'cancel-cash-pickup',
  mark_pickup_ready: 'mark-pickup-ready',
  complete_cash_pickup: 'complete-cash-pickup',
  release_unclaimed_pickup: 'release-unclaimed-pickup',
  confirm_collection: 'confirm-collection',
  dispatch: 'dispatch',
  confirm_receipt: 'confirm-receipt',
  close_no_action: 'close-no-action',
}

export function createOrderIdempotencyKey(orderId: string, action: string) {
  const random = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`
  return `order:${orderId}:${action}:${random}`
}

export function postOrderAction(
  orderId: string,
  action: Exclude<OrderAllowedAction, 'report'>,
  body: unknown = {},
  idempotencyKey = createOrderIdempotencyKey(orderId, action),
) {
  return apiPost<{ order: Order }>(
    `/orders/${encodeURIComponent(orderId)}/actions/${endpointByAction[action]}`,
    body,
    { headers: { 'Idempotency-Key': idempotencyKey } },
  )
}

export function postOrderReport(
  orderId: string,
  body: FormData,
  idempotencyKey = createOrderIdempotencyKey(orderId, 'report'),
) {
  return apiPost<{ order: Order }>(
    `/orders/${encodeURIComponent(orderId)}/reports`,
    body,
    { headers: { 'Idempotency-Key': idempotencyKey } },
  )
}
