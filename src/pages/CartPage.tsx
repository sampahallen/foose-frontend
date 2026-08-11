import { AppShell, ButtonLink, Icon, InlineNotice, OrderSummary, StatePanel } from '../components'
import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useAcceptedBargainPrices } from '../hooks/useBargain'
import { useCart, type CartItem } from '../hooks/useCart'
import { apiGet } from '../lib/api'
import type { Listing } from '../types/api'
import { formatMoney } from '../utils/format'

type ShopGroup = { shopId: string; shopName: string; items: CartItem[] }

function isUnavailable(status?: Listing['status']) {
  return status === 'sold' || status === 'removed'
}

function groupItemsByShop(items: CartItem[]): ShopGroup[] {
  const groups = new Map<string, ShopGroup>()
  for (const item of items) {
    const shopId = item.shopId || item.shopName || item.listingId
    const existing = groups.get(shopId)
    if (existing) existing.items.push(item)
    else groups.set(shopId, { items: [item], shopId, shopName: item.shopName })
  }
  return [...groups.values()]
}

function CartItemImage({ image, title }: { image?: string; title: string }) {
  const [failed, setFailed] = useState(false)

  if (!image || failed) {
    return <span className="image-placeholder flex h-full min-h-24 items-center justify-center bg-foose-surface-mid px-2 text-center text-xs font-semibold text-foose-faint">Image unavailable</span>
  }

  return <img alt={title} loading="lazy" onError={() => setFailed(true)} src={image} />
}

function CartRow({
  bargainPrice,
  item,
  onRemove,
  onUpdateQuantity,
  status,
}: {
  /** Agreed unit price from this buyer's accepted bargain, if any. */
  bargainPrice?: number
  item: CartItem
  onRemove: () => void
  onUpdateQuantity: (quantity: number) => void
  status?: Listing['status']
}) {
  const unavailable = isUnavailable(status)
  const statusLabel = status === 'sold' ? 'Sold' : status === 'removed' ? 'Removed' : ''
  const wholesale = item.type === 'wholesale'
  const unitPrice = bargainPrice === undefined ? item.price : Math.min(bargainPrice, item.price)
  const bargained = unitPrice < item.price

  return (
    <article aria-label={unavailable ? `${item.title}, ${statusLabel.toLowerCase()}` : item.title} className="flex gap-4 p-4">
      <div className={`relative size-20 shrink-0 overflow-hidden rounded-lg bg-foose-surface-mid sm:size-24 [&_img]:h-full [&_img]:w-full [&_img]:object-cover ${unavailable ? '[&_img]:grayscale [&_img]:opacity-55' : ''}`}>
        {unavailable && (
          <span className="absolute left-1 top-1 z-10 rounded-full bg-foose-danger px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-white">
            {statusLabel}
          </span>
        )}
        <CartItemImage image={item.image} title={item.title} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <h3 className={`min-w-0 truncate font-display text-base font-semibold text-foose-text sm:text-lg ${unavailable ? 'text-foose-faint line-through' : ''}`}>{item.title}</h3>
          <button aria-label={`Remove ${item.title} from cart`} className="icon-button inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-transparent bg-transparent text-foose-faint transition hover:bg-accent-light hover:text-accent" onClick={onRemove} type="button">
            <Icon name="trash" size={18} />
          </button>
        </div>
        {item.sourceEventTitle && <p className="mt-0.5 text-xs font-semibold text-foose-faint">Pop-up: {item.sourceEventTitle}</p>}
        <div className={`mt-3 flex items-center gap-3 ${wholesale ? 'justify-between' : 'justify-end'}`}>
          {wholesale && (
            <div className="qty flex w-fit items-center gap-3 rounded-lg border border-foose-border [&_button]:flex [&_button]:size-8 [&_button]:items-center [&_button]:justify-center [&_button]:hover:text-accent [&_button]:disabled:opacity-40">
              <button aria-label="Decrease quantity" disabled={unavailable} onClick={() => onUpdateQuantity(item.quantity - 1)} type="button">
                <Icon name="minus" size={16} />
              </button>
              <span aria-live="polite" className="min-w-4 text-center text-sm font-bold">{item.quantity}</span>
              <button aria-label="Increase quantity" disabled={unavailable} onClick={() => onUpdateQuantity(item.quantity + 1)} type="button">
                <Icon name="plus" size={16} />
              </button>
            </div>
          )}
          <div className="flex items-baseline gap-2">
            {bargained && !unavailable && (
              <span className="text-sm font-semibold text-foose-muted line-through">{formatMoney(item.price * item.quantity, item.currency)}</span>
            )}
            <strong className={`font-display text-lg font-bold ${unavailable ? 'text-foose-faint line-through' : 'text-accent'}`}>{formatMoney(unitPrice * item.quantity, item.currency)}</strong>
          </div>
        </div>
        {bargained && !unavailable && (
          <p className="mt-1 text-right text-xs font-bold text-foose-success">Bargained</p>
        )}
      </div>
    </article>
  )
}

export function CartPage() {
  const { user } = useAuth()
  const cart = useCart()
  const bargainPrices = useAcceptedBargainPrices(Boolean(user) && cart.items.length > 0)
  const [listingStatuses, setListingStatuses] = useState<Record<string, Listing['status']>>({})
  const [availabilityLoading, setAvailabilityLoading] = useState(false)
  const [availabilityError, setAvailabilityError] = useState('')
  const [removedOwnItems, setRemovedOwnItems] = useState(0)
  const removeCartItem = cart.removeItem
  const listingIds = useMemo(() => cart.items.map((item) => item.listingId).join(','), [cart.items])

  useEffect(() => {
    const ids = listingIds.split(',').filter(Boolean)
    if (!ids.length) {
      return undefined
    }

    let mounted = true
    queueMicrotask(() => {
      if (!mounted) return
      setAvailabilityLoading(true)
      setAvailabilityError('')
    })
    const batches = Array.from({ length: Math.ceil(ids.length / 50) }, (_, index) => ids.slice(index * 50, index * 50 + 50))
    void Promise.all(batches.map((batch) => (
      apiGet<{ ownedListingIds: string[]; statuses: Record<string, Listing['status']> }>(`/listings/availability?ids=${encodeURIComponent(batch.join(','))}`)
    ))).then((results) => {
      if (!mounted) return
      setListingStatuses(Object.assign({}, ...results.map((result) => result.statuses)))
      const ownedIds = Array.from(new Set(results.flatMap((result) => result.ownedListingIds || [])))
      ownedIds.forEach((id) => removeCartItem(id))
      if (ownedIds.length) setRemovedOwnItems((count) => count + ownedIds.length)
    }).catch(() => {
      if (mounted) setAvailabilityError('Some item availability could not be refreshed. You can review it again at checkout.')
    }).finally(() => {
      if (mounted) setAvailabilityLoading(false)
    })

    return () => {
      mounted = false
    }
  }, [listingIds, removeCartItem])

  const availableItems = cart.items.filter((item) => !isUnavailable(listingStatuses[item.listingId] || item.status))
  const unavailableCount = cart.items.length - availableItems.length
  const checkoutBlocked = availabilityLoading || unavailableCount > 0
  const shopGroups = useMemo(() => groupItemsByShop(cart.items), [cart.items])

  function removeUnavailableItems() {
    cart.items
      .filter((item) => isUnavailable(listingStatuses[item.listingId] || item.status))
      .forEach((item) => cart.removeItem(item.listingId))
  }

  return (
    <AppShell active="cart" searchPlaceholder="Search curated finds...">
      <section className="page-hero [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:md:text-4xl [&_p]:text-sm [&_p]:leading-6 [&_p]:text-foose-muted [&_p]:md:text-base mb-8 rounded-xl border border-foose-border bg-foose-surface p-5 md:p-8 [&.small]:py-6 max-md:[&_h1]:text-2xl small">
        <h1>Your cart</h1>
        <p>
          {unavailableCount > 0
            ? `${availableItems.length} of ${cart.items.length} items ready for checkout.`
            : `${cart.items.length} item${cart.items.length === 1 ? '' : 's'} ready for checkout.`}
        </p>
      </section>
      {!cart.items.length && (
        <StatePanel
          action={<ButtonLink to="/browse">Browse marketplace</ButtonLink>}
          body="Browse the marketplace and add a listing to your cart."
          layout="page"
          title="Your cart is empty"
          tone="empty"
        />
      )}
      {!!cart.items.length && (
        <div className="cart-layout grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px] items-start max-lg:grid-cols-1">
          <section className="cart-items space-y-4">
            {unavailableCount > 0 && (
              <InlineNotice
                action={<button className="font-black text-foose-warning underline" onClick={removeUnavailableItems} type="button">Remove all</button>}
                title="Some items are no longer available"
                tone="warning"
              >
                Sold or removed items are excluded from your total and must be removed before checkout.
              </InlineNotice>
            )}
            {removedOwnItems > 0 && <InlineNotice tone="info">Your own listing{removedOwnItems === 1 ? ' was' : 's were'} removed from this cart.</InlineNotice>}
            {availabilityError && <InlineNotice title="Availability check incomplete" tone="warning">{availabilityError}</InlineNotice>}
            {availabilityLoading && (
              <p className="flex items-center gap-2 px-1 text-sm text-foose-muted">
                <span aria-hidden="true" className="size-1.5 animate-pulse rounded-full bg-accent" />
                Checking item availability…
              </p>
            )}
            {shopGroups.map((group) => (
              <div className="rounded-xl border border-foose-border bg-foose-surface" key={group.shopId}>
                <header className="flex items-center gap-2 border-b border-foose-border px-4 py-3">
                  <Icon name="store" size={16} />
                  <h2 className="min-w-0 truncate text-sm font-bold text-foose-text">{group.shopName}</h2>
                </header>
                <div className="divide-y divide-foose-border">
                  {group.items.map((item) => (
                    <CartRow
                      bargainPrice={bargainPrices[item.listingId]}
                      item={item}
                      key={item.listingId}
                      onRemove={() => cart.removeItem(item.listingId)}
                      onUpdateQuantity={(quantity) => cart.updateQuantity(item.listingId, quantity)}
                      status={listingStatuses[item.listingId] || item.status}
                    />
                  ))}
                </div>
              </div>
            ))}
          </section>
          <OrderSummary
            bargainPrices={bargainPrices}
            action={unavailableCount > 0 ? 'Remove unavailable items' : availabilityLoading ? 'Checking availability' : user && !user.isEmailVerified ? 'Verify email to checkout' : 'Proceed to checkout'}
            disabled={checkoutBlocked}
            href={checkoutBlocked ? undefined : '/checkout'}
            items={availableItems}
            pendingFees
          />
        </div>
      )}
    </AppShell>
  )
}
