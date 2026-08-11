import { describe, expect, it } from 'vitest'
import type { Order } from '../types/api'
import {
  orderAllowedActions,
  orderBucket,
  orderDeliveryFee,
  orderNextStep,
  orderProgressLabel,
  orderSettlementLabel,
} from './orderStatus'

function order(overrides: Partial<Order> = {}): Order {
  return {
    _id: 'order-1',
    buyerId: 'buyer-1',
    currency: 'GHS',
    delivery: { method: 'shop_pickup' },
    fulfillmentStatus: 'awaiting_seller',
    items: [{ _id: 'line-1', price: 12000, quantity: 1, title: 'Vintage jacket' }],
    settlementStatus: 'held',
    totalAmount: 12000,
    workflow: {
      allowedActions: [],
      deadline: null,
      nextActor: 'seller',
      report: null,
      serverNow: '2026-07-24T12:00:00.000Z',
      settlementExplanation: 'Payment is protected.',
    },
    ...overrides,
  }
}

describe('order workflow view model', () => {
  it('uses server-authored actions and normalizes the temporary report alias', () => {
    const current = order({
      workflow: {
        allowedActions: ['confirm_collection', 'report_order'],
        deadline: null,
        nextActor: 'buyer',
        report: null,
        serverNow: '2026-07-24T12:00:00.000Z',
        settlementExplanation: 'Payment is held.',
      },
    })

    expect(orderAllowedActions(current)).toEqual(['confirm_collection', 'report'])
    expect(orderBucket(current, 'buyer')).toBe('needs_action')
    expect(orderBucket(current, 'seller')).toBe('in_progress')
  })

  it('keeps reported orders out of action queues and explains the frozen settlement', () => {
    const reported = order({
      activeReportId: 'report-1',
      workflow: {
        allowedActions: [],
        deadline: null,
        nextActor: 'review',
        report: { active: true, id: 'report-1', status: 'submitted' },
        serverNow: '2026-07-24T12:00:00.000Z',
        settlementExplanation: 'Frozen.',
      },
    })

    expect(orderBucket(reported, 'buyer')).toBe('under_review')
    expect(orderProgressLabel(reported)).toBe('Funds frozen — under review')
    expect(orderNextStep(reported, 'buyer')).toMatch(/Automatic release is paused/)
  })

  it('tells a seller to have the buyer confirm an online pickup in person', () => {
    const ready = order({ fulfillmentStatus: 'ready_for_pickup', settlementStatus: 'held' })

    expect(orderNextStep(ready, 'seller')).toMatch(/confirm collection here while you are together/i)
    expect(orderNextStep(ready, 'seller')).toMatch(/releases your payment immediately/i)
  })

  it('provides plain-language settlement labels', () => {
    expect(orderSettlementLabel('refund_attention', 'paystack')).toBe('Refund needs attention')
    expect(orderSettlementLabel('cash_due', 'cash_on_pickup')).toBe('Cash due at pickup')
  })

  it('never guesses a fee: shop pickup is free, a station pickup is TBD until the seller reports what the bus charged', () => {
    expect(orderDeliveryFee(order({ delivery: { method: 'shop_pickup' } }))).toBe(0)
    expect(orderDeliveryFee(order({ delivery: { method: 'station_pickup' } }))).toBeNull()
    expect(orderDeliveryFee(order({
      delivery: { method: 'station_pickup', transit: { amount: 7000, driverPhone: '0241112222' } },
    }))).toBe(7000)
    // Whichever field actually carries the known fee should win.
    expect(orderDeliveryFee(order({ delivery: { fee: 500, method: 'station_pickup' } }))).toBe(500)
    expect(orderDeliveryFee(order({ deliveryFee: 500, delivery: { method: 'station_pickup' } }))).toBe(500)
  })

  it('does not archive cancelled orders until their financial settlement is terminal', () => {
    expect(orderBucket(order({
      fulfillmentStatus: 'cancelled',
      settlementStatus: 'refund_pending',
      workflow: { ...order().workflow!, nextActor: 'system' },
    }), 'buyer')).toBe('in_progress')
    expect(orderBucket(order({
      fulfillmentStatus: 'cancelled',
      settlementStatus: 'refund_attention',
      workflow: { ...order().workflow!, nextActor: 'support' },
    }), 'buyer')).toBe('under_review')
    expect(orderBucket(order({
      fulfillmentStatus: 'cancelled',
      settlementStatus: 'refunded',
      workflow: { ...order().workflow!, nextActor: 'none' },
    }), 'buyer')).toBe('history')
  })
})
