import { useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Order, OrderEvent } from '../../types/api'
import { formatDateTime, formatMoney } from '../../utils/format'
import { formatOrderCountdown } from '../../utils/orderCountdown'
import {
  orderActionCopy,
  orderAddress,
  orderDeadlineLabel,
  orderEventLabel,
  orderNextStep,
  orderPrimaryAction,
  orderProgressLabel,
  orderRecipient,
  orderSettlementLabel,
  orderStatusTone,
  orderTitle,
  type OrderViewer,
} from '../../utils/orderStatus'
import { withBasePath } from '../../utils/navigation'
import { Icon } from '../icons/Icon'
import { Badge } from '../ui/Badge'

export function OrderCountdown({
  at,
  className = '',
  serverNow,
}: {
  at?: string | null
  className?: string
  serverNow?: string | null
}) {
  return <LiveOrderCountdown at={at} className={className} key={`${at || ''}:${serverNow || ''}`} serverNow={serverNow} />
}

function LiveOrderCountdown({
  at,
  className,
  serverNow,
}: {
  at?: string | null
  className: string
  serverNow?: string | null
}) {
  const [clock, setClock] = useState(() => {
    const now = Date.now()
    return { clientNow: now, receivedAt: now }
  })

  useEffect(() => {
    if (!at) return undefined
    const timer = window.setInterval(() => {
      setClock((current) => ({ ...current, clientNow: Date.now() }))
    }, 30_000)
    return () => window.clearInterval(timer)
  }, [at])

  const label = formatOrderCountdown(at, serverNow, clock.clientNow, clock.receivedAt)
  if (!label) return null

  return (
    <span
      aria-label={`${label}. Deadline ${formatDateTime(at || undefined)}`}
      className={`inline-flex items-center gap-1.5 font-bold tabular-nums ${label === 'Window reached' ? 'text-foose-danger' : 'text-foose-text'} ${className}`}
      title={formatDateTime(at || undefined)}
    >
      <Icon name="clock" size={16} />
      {label}
    </span>
  )
}

export function OrderStatusBadge({ order }: { order: Order }) {
  return <Badge tone={orderStatusTone(order)}>{orderProgressLabel(order)}</Badge>
}

export function OrderEscrowCard({ order, viewer }: { order: Order; viewer: OrderViewer }) {
  const cash = order.paymentMethod === 'cash_on_pickup' || order.settlementStatus === 'cash_due'
  const heading = cash ? 'Pay at pickup' : orderSettlementLabel(order.settlementStatus, order.paymentMethod)
  const explanation = order.workflow?.settlementExplanation
    || (cash
      ? 'No online payment is held. Pay the seller only when you collect the complete order.'
      : order.settlementStatus === 'held'
        ? 'Foose is protecting this payment until the order completes or a refund is due.'
        : viewer === 'seller'
          ? 'Settlement activity for this order appears here.'
          : 'Payment and refund activity for this order appears here.')

  return (
    <section aria-labelledby="order-settlement-title" className="overflow-hidden rounded-2xl border border-accent/20 bg-white shadow-sm">
      <div className="flex items-center gap-3 border-b border-accent/15 bg-accent-light/55 px-4 py-3 sm:px-5">
        <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-xl bg-white text-accent shadow-sm">
          <Icon name={cash ? 'money' : 'shield'} size={21} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-accent">{cash ? 'Payment arrangement' : 'Protected payment'}</p>
          <h2 className="mt-0.5 font-display text-lg font-semibold text-foose-text" id="order-settlement-title">{heading}</h2>
        </div>
        <strong className="shrink-0 text-lg font-black text-accent">{formatMoney(order.totalAmount, order.currency)}</strong>
      </div>
      <p className="px-4 py-4 text-sm leading-6 text-foose-muted sm:px-5">{explanation}</p>
    </section>
  )
}

export function OrderWorkflowCard({
  action,
  order,
  viewer,
}: {
  action?: ReactNode
  order: Order
  viewer: OrderViewer
}) {
  const primaryAction = orderPrimaryAction(order)
  const deadline = order.workflow?.deadline
  const destination = orderAddress(order)
  const recipient = orderRecipient(order)

  return (
    <article className="group flex min-w-0 flex-col rounded-2xl border border-foose-border bg-white p-4 shadow-sm transition hover:border-accent/40 hover:shadow-md sm:p-5">
      <header className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <OrderStatusBadge order={order} />
            <Badge>{order.delivery?.method === 'pickup' ? 'Pickup' : 'Standard delivery'}</Badge>
          </div>
          <h2 className="line-clamp-2 font-display text-lg font-semibold text-foose-text">{orderTitle(order)}</h2>
          <p className="mt-1 text-xs font-semibold text-foose-faint">
            #{order._id.slice(-8).toUpperCase()} · {order.createdAt ? formatDateTime(order.createdAt) : 'Date pending'}
          </p>
        </div>
        <strong className="shrink-0 text-base font-black text-accent sm:text-lg">{formatMoney(order.totalAmount, order.currency)}</strong>
      </header>

      <div className="mt-4 rounded-xl bg-foose-surface-low p-3">
        <p className="text-sm font-semibold leading-6 text-foose-text">{orderNextStep(order, viewer)}</p>
        {deadline?.at && (
          <div className="mt-2 border-t border-foose-border/70 pt-2 text-xs text-foose-muted">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span>{orderDeadlineLabel(deadline.type)}</span>
              <OrderCountdown at={deadline.at} serverNow={order.workflow?.serverNow} />
            </div>
            {deadline.consequence && <p className="mt-1.5 leading-5">{deadline.consequence}</p>}
          </div>
        )}
      </div>

      {(destination || recipient) && (
        <p className="mt-3 flex items-start gap-2 text-sm leading-6 text-foose-muted">
          <span aria-hidden="true" className="mt-1 text-accent"><Icon name="location" size={16} /></span>
          <span>{[recipient, destination].filter(Boolean).join(' · ')}</span>
        </p>
      )}

      <footer className="mt-auto flex flex-col gap-2 pt-4 sm:flex-row sm:items-center sm:justify-between">
        {primaryAction && (
          <span className="text-xs font-black uppercase tracking-wide text-accent">
            {orderActionCopy(primaryAction).label}
          </span>
        )}
        <div className="flex w-full flex-col gap-2 sm:ml-auto sm:w-auto sm:flex-row">
          {action}
          <a
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-accent bg-accent px-4 text-sm font-black text-white transition hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:w-auto"
            href={withBasePath(`/orders/${order._id}`)}
          >
            {primaryAction && primaryAction !== 'report' ? orderActionCopy(primaryAction).label : 'View order'}
            <Icon name="arrow" size={16} />
          </a>
        </div>
      </footer>
    </article>
  )
}

export function OrderTimeline({
  events,
  fallbackOrder,
}: {
  events?: OrderEvent[]
  fallbackOrder: Order
}) {
  const timeline = useMemo(() => {
    if (events?.length) {
      return [...events].sort((left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime())
    }

    const fallback: OrderEvent[] = []
    const add = (type: string, createdAt?: string) => {
      if (createdAt) fallback.push({ _id: `${type}-${createdAt}`, createdAt, type })
    }
    add('order_created', fallbackOrder.createdAt)
    add('payment_confirmed', fallbackOrder.paidAt)
    add('pickup_ready', fallbackOrder.readyAt)
    add('dispatched', fallbackOrder.sentAt)
    add('receipt_confirmed', fallbackOrder.completedAt || fallbackOrder.buyerConfirmedAt)
    add('refund_processed', fallbackOrder.settlementStatus === 'refunded' ? fallbackOrder.settledAt : undefined)
    add('order_cancelled', fallbackOrder.cancelledAt)
    return fallback.sort((left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime())
  }, [events, fallbackOrder])

  if (!timeline.length) {
    return <p className="rounded-xl bg-foose-surface-low p-4 text-sm text-foose-muted">Order activity will appear here as the order progresses.</p>
  }

  return (
    <ol className="relative space-y-0">
      {timeline.map((event, index) => (
        <li className="relative grid grid-cols-[28px_minmax(0,1fr)] gap-3 pb-5 last:pb-0" key={event._id || `${event.type}-${event.createdAt}-${index}`}>
          {index < timeline.length - 1 && <span aria-hidden="true" className="absolute bottom-0 left-[13px] top-7 w-px bg-foose-border" />}
          <span aria-hidden="true" className="relative z-10 mt-0.5 grid size-7 place-items-center rounded-full border-4 border-white bg-accent text-white">
            <span className="size-1.5 rounded-full bg-current" />
          </span>
          <div className="min-w-0">
            <h3 className="text-sm font-black text-foose-text">{event.label || orderEventLabel(event.type || event.eventType || 'order_updated')}</h3>
            {(event.description || event.message) && <p className="mt-0.5 text-sm leading-5 text-foose-muted">{event.description || event.message}</p>}
            <time className="mt-1 block text-xs font-semibold text-foose-faint" dateTime={event.createdAt}>{formatDateTime(event.createdAt)}</time>
          </div>
        </li>
      ))}
    </ol>
  )
}
