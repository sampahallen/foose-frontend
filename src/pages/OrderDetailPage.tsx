import { useState } from 'react'
import { AppShell, Badge, Dialog, InlineNotice, SafeImage, SectionHeader, StatePanel, useToast } from '../components'
import { OrderDetailSkeleton } from '../components/operational/OperationalStates'
import { NavigationBackButton } from '../components/navigation'
import { useAuth } from '../hooks/useAuth'
import { useApiResource } from '../hooks/useApiResource'
import { apiPut } from '../lib/api'
import type { Listing, Order } from '../types/api'
import { formatDateTime, formatMoney, getListingImage } from '../utils/format'
import { canBuyerConfirmOrder, canSellerMarkPickupReady, orderAddress, orderProgressLabel, participantContact, participantName } from '../utils/orderStatus'
import { getCurrentAppPathname, withBasePath } from '../utils/navigation'

function orderIdFromPath() {
  const match = getCurrentAppPathname().match(/^\/orders\/([^/]+)/)
  return match ? decodeURIComponent(match[1]).trim() : ''
}

function shopName(order: Order) {
  if (!order.shopId || typeof order.shopId === 'string') return 'Seller'
  return order.shopId.shopName || 'Seller'
}

function shopOwnerId(order: Order) {
  if (!order.shopId || typeof order.shopId === 'string') return ''
  const owner = order.shopId.ownerId
  if (!owner) return ''
  return typeof owner === 'string' ? owner : owner._id
}

function listingFromLine(item: Order['items'][number]): Listing | undefined {
  return item.listingId && typeof item.listingId === 'object' ? item.listingId : undefined
}

function itemImage(item: Order['items'][number]) {
  const listing = listingFromLine(item)
  return listing ? getListingImage(listing) : undefined
}

function deliveryLine(order: Order) {
  if (order.delivery?.method === 'pickup') return orderAddress(order) || 'Pickup details pending'
  return orderAddress(order) || 'Delivery address pending'
}

export function OrderDetailPage() {
  const { showToast } = useToast()
  const orderId = orderIdFromPath()
  const { user } = useAuth()
  const orderResource = useApiResource<{ order: Order }>(orderId ? `/orders/${encodeURIComponent(orderId)}` : null, Boolean(orderId))
  const order = orderResource.data?.order
  const [actionId, setActionId] = useState('')
  const [actionError, setActionError] = useState('')
  const [selectedItemIndexes, setSelectedItemIndexes] = useState<number[]>([])
  const [selectedItem, setSelectedItem] = useState<Order['items'][number] | null>(null)
  const sellerMode = Boolean(order && user?._id && shopOwnerId(order) === user._id)

  async function updateOrder(action: 'process' | 'shipped' | 'pickup-ready' | 'confirm-delivery') {
    if (!order) return
    setActionId(action)
    setActionError('')
    try {
      await apiPut(`/orders/${order._id}/${action}`, {})
      await orderResource.refetch()
      const messages = { 'confirm-delivery': 'Receipt confirmed and escrow can continue.', 'pickup-ready': 'The buyer was notified that pickup is ready.', process: 'The order was accepted.', shipped: 'The buyer can now track this order as sent.' } as const
      showToast({ message: messages[action], title: 'Order updated', tone: 'success' })
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Unable to update order')
    } finally {
      setActionId('')
    }
  }

  function toggleItem(index: number) {
    setSelectedItemIndexes((current) => (current.includes(index) ? current.filter((item) => item !== index) : [...current, index]))
  }

  async function markReceived() {
    await updateOrder('confirm-delivery')
    setSelectedItemIndexes([])
  }

  function renderActions() {
    if (!order) return null

    if (sellerMode) {
      return (
        <>
          {['pending', 'paid'].includes(order.status) && (
            <button className="inline-flex min-h-11 items-center justify-center rounded-xl border border-foose-border bg-white px-4 text-sm font-bold text-foose-text transition hover:border-accent hover:text-accent disabled:opacity-60" disabled={actionId === 'process'} onClick={() => void updateOrder('process')} type="button">
              {actionId === 'process' ? 'Accepting...' : 'Accept order'}
            </button>
          )}
          {order.delivery?.method === 'delivery' && ['paid', 'processing'].includes(order.status) && (
            <button className="inline-flex min-h-11 items-center justify-center rounded-xl border border-accent bg-accent px-4 text-sm font-bold text-white transition hover:bg-accent-hover disabled:opacity-60" disabled={actionId === 'shipped'} onClick={() => void updateOrder('shipped')} type="button">
              {actionId === 'shipped' ? 'Sending...' : 'Mark sent'}
            </button>
          )}
          {order.delivery?.method === 'pickup' && order.sellerAction === 'pickup_ready' && <Badge tone="warning">Awaiting pickup</Badge>}
          {canSellerMarkPickupReady(order) && (
            <button className="inline-flex min-h-11 items-center justify-center rounded-xl border border-accent bg-accent px-4 text-sm font-bold text-white transition hover:bg-accent-hover disabled:opacity-60" disabled={actionId === 'pickup-ready'} onClick={() => void updateOrder('pickup-ready')} type="button">
              {actionId === 'pickup-ready' ? 'Notifying...' : 'Pickup ready'}
            </button>
          )}
        </>
      )
    }

    if (!canBuyerConfirmOrder(order)) return null
    return (
      <button className="inline-flex min-h-11 items-center justify-center rounded-xl border border-accent bg-accent px-4 text-sm font-bold text-white transition hover:bg-accent-hover disabled:opacity-60" disabled={actionId === 'confirm-delivery'} onClick={() => void updateOrder('confirm-delivery')} type="button">
        {actionId === 'confirm-delivery' ? 'Confirming...' : order.delivery?.method === 'pickup' ? 'Confirm pickup done' : 'Confirm received'}
      </button>
    )
  }

  return (
    <AppShell active="profile" searchPlaceholder="Search orders..." showFooter={false}>
      <NavigationBackButton
        className="mb-5"
        fallback={sellerMode
          ? { href: '/manage-shop/orders', label: 'Order management' }
          : { href: '/orders/history', label: 'Orders' }}
      />
      {!orderId && <StatePanel action={<a className="button button-secondary min-h-11 px-5" href={withBasePath('/orders')}>View orders</a>} body="This order link is missing an order id." layout="page" title="Order unavailable" tone="unavailable" />}
      {orderResource.initialLoading && <OrderDetailSkeleton />}
      {orderResource.error && !orderResource.data && <StatePanel action={<button className="button button-secondary min-h-11 px-5" onClick={() => void orderResource.refetch()} type="button">Retry</button>} body={orderResource.error} layout="page" title="Order unavailable" tone="unavailable" />}
      {actionError && <InlineNotice title="Order was not updated" tone="error">{actionError}</InlineNotice>}
      {order && (
        <div className="space-y-6">
          <div className="rounded-2xl bg-accent-light/60 p-3 shadow-sm md:p-4">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="mb-2 flex flex-wrap items-center gap-1.5">
                  <Badge>{order.delivery?.method || 'delivery'}</Badge>
                  {order.status !== 'paid' && <Badge tone={order.status === 'disputed' ? 'danger' : order.status === 'delivered' ? 'success' : 'accent'}>{orderProgressLabel(order)}</Badge>}
                </div>
                <h1 className="text-lg font-black text-foose-text md:text-2xl">Order #{order._id.slice(-8)}</h1>
                <p className="mt-1 text-xs text-foose-muted md:text-sm">{order.createdAt ? formatDateTime(order.createdAt) : 'Order date pending'}</p>
              </div>
              <strong className="text-lg font-black text-accent md:text-xl">{formatMoney(order.totalAmount, order.currency)}</strong>
            </div>
          </div>

          <section className="space-y-2 rounded-2xl bg-foose-surface p-4 text-sm shadow-sm md:p-5">
            <p>
              <strong className="text-foose-text">{sellerMode ? 'Buyer:' : 'Shop:'}</strong>{' '}
              <span className="text-foose-muted">{sellerMode ? participantName(order.buyerId, 'Buyer') : shopName(order)}</span>
            </p>
            {sellerMode && (
              <p>
                <strong className="text-foose-text">Contact:</strong>{' '}
                <span className="text-foose-muted">{participantContact(order.buyerId) || 'No contact saved'}</span>
              </p>
            )}
            <p>
              <strong className="text-foose-text">{order.delivery?.method === 'pickup' ? 'Pickup:' : 'Delivery:'}</strong>{' '}
              <span className="text-foose-muted">{deliveryLine(order)}</span>
            </p>
            <p>
              <strong className="text-foose-text">Deadline:</strong>{' '}
              <span className="text-foose-muted">{formatDateTime(order.sellerActionDeadline)}</span>
            </p>
            <p>
              <strong className="text-foose-text">Escrow:</strong>{' '}
              <span className="text-foose-muted">{order.escrowStatus || 'not held'}</span>
            </p>
          </section>

          <section className="rounded-2xl bg-foose-surface p-4 shadow-sm md:p-6">
            <SectionHeader
              action={
                !sellerMode && order.status === 'shipped' ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <button className="inline-flex min-h-11 items-center justify-center rounded-xl border border-foose-border bg-white px-3 text-xs font-bold text-foose-text hover:border-accent hover:text-accent disabled:opacity-60" disabled={!selectedItemIndexes.length || actionId === 'confirm-delivery'} onClick={() => void markReceived()} type="button">
                      Mark selected received
                    </button>
                    <button className="inline-flex min-h-11 items-center justify-center rounded-xl border border-accent bg-accent px-3 text-xs font-bold text-white hover:bg-accent-hover disabled:opacity-60" disabled={actionId === 'confirm-delivery'} onClick={() => void markReceived()} type="button">
                      Received all
                    </button>
                  </div>
                ) : undefined
              }
              eyebrow={`${order.items.length} ${order.items.length === 1 ? 'item' : 'items'}`}
              title="Items in this order"
            />
            <div className="divide-y divide-foose-border overflow-hidden rounded-xl bg-foose-surface-low">
              {order.items.map((item, index) => (
                <article className="flex min-w-0 cursor-pointer items-center gap-2 bg-white p-2 transition hover:bg-accent-light/40 sm:gap-3 sm:p-3" key={`${item.title}-${index}`} onClick={() => setSelectedItem(item)}>
                  {!sellerMode && (
                    <input
                      aria-label={`Select ${item.title}`}
                      checked={selectedItemIndexes.includes(index)}
                      className="size-5 shrink-0 accent-accent"
                      disabled={order.status !== 'shipped'}
                      onChange={() => toggleItem(index)}
                      onClick={(event) => event.stopPropagation()}
                      type="checkbox"
                    />
                  )}
                  <SafeImage alt={item.title} className="size-12 shrink-0 rounded-lg object-cover sm:size-16" fallback="No image" fallbackClassName="text-[9px] font-bold" src={itemImage(item)} />
                  <div className="grid min-w-0 flex-1 grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2 sm:gap-3">
                    <div className="min-w-0">
                      <h2 className="truncate text-sm font-black text-foose-text">{item.title}</h2>
                      <p className="text-xs text-foose-muted">Qty {item.quantity}</p>
                    </div>
                    <strong className="whitespace-nowrap text-xs text-accent sm:text-sm">{formatMoney(item.price * item.quantity, order.currency)}</strong>
                    <div className="flex min-w-fit items-center justify-end gap-1 [&_.badge]:whitespace-nowrap [&_button]:min-h-8 [&_button]:whitespace-nowrap [&_button]:rounded-md [&_button]:px-2 [&_button]:text-xs sm:[&_button]:min-h-10 sm:[&_button]:px-4 sm:[&_button]:text-sm" onClick={(event) => event.stopPropagation()}>
                      {!sellerMode && order.status === 'shipped' ? renderActions() : !sellerMode ? <Badge tone="warning">Awaiting shipping</Badge> : renderActions()}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
          <footer className="flex flex-col gap-2 border-t border-foose-border py-5 text-xs text-foose-muted sm:flex-row sm:items-center sm:justify-between">
            <span>Foose order support</span>
            <span className="font-semibold text-foose-text">Order #{order._id.slice(-8)}</span>
          </footer>
          <Dialog
            description="Item details from this order"
            onClose={() => setSelectedItem(null)}
            open={Boolean(selectedItem)}
            size="sm"
            title={selectedItem?.title || 'Order item'}
          >
            {selectedItem && (
              <div className="grid gap-4">
                <SafeImage alt={selectedItem.title} className="aspect-square w-full rounded-2xl object-cover" fallback="No image" fallbackClassName="text-sm font-bold" src={itemImage(selectedItem)} />
                <div className="grid gap-2 rounded-xl bg-foose-surface-low p-4 text-sm text-foose-muted">
                  <p><strong className="text-foose-text">Quantity:</strong> {selectedItem.quantity}</p>
                  <p><strong className="text-foose-text">Unit price:</strong> {formatMoney(selectedItem.price, order.currency)}</p>
                  <p><strong className="text-foose-text">Total:</strong> {formatMoney(selectedItem.price * selectedItem.quantity, order.currency)}</p>
                </div>
              </div>
            )}
          </Dialog>
        </div>
      )}
    </AppShell>
  )
}
