import { AppShell, ButtonLink, Icon, InlineNotice, OrderSummary, StatePanel } from '../components'
import { useEffect, useMemo, useState } from 'react'
import { useCart } from '../hooks/useCart'
import { apiGet } from '../lib/api'
import type { Listing } from '../types/api'
import { formatMoney } from '../utils/format'

function CartItemImage({ image, title }: { image?: string; title: string }) {
  const [failed, setFailed] = useState(false)

  if (!image || failed) {
    return <span className="image-placeholder flex h-full min-h-24 items-center justify-center bg-foose-surface-mid px-2 text-center text-xs font-semibold text-foose-faint">Image unavailable</span>
  }

  return <img alt={title} loading="lazy" onError={() => setFailed(true)} src={image} />
}

export function CartPage() {
  const cart = useCart()
  const [listingStatuses, setListingStatuses] = useState<Record<string, Listing['status']>>({})
  const [availabilityLoading, setAvailabilityLoading] = useState(false)
  const [availabilityError, setAvailabilityError] = useState('')
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
    void Promise.all(
      ids.map((id) =>
        apiGet<{ listing: Listing }>(`/listings/${encodeURIComponent(id)}`)
          .then((result) => [id, result.listing.status] as const)
          .catch(() => [id, undefined] as const),
      ),
    ).then((entries) => {
      if (!mounted) return
      const resolved = entries.filter((entry): entry is readonly [string, Listing['status']] => Boolean(entry[1]))
      setListingStatuses(Object.fromEntries(resolved))
      if (resolved.length !== ids.length) setAvailabilityError('Some item availability could not be refreshed. You can review it again at checkout.')
    }).finally(() => {
      if (mounted) setAvailabilityLoading(false)
    })

    return () => {
      mounted = false
    }
  }, [listingIds])

  return (
    <AppShell active="cart" searchPlaceholder="Search curated finds...">
      <section className="page-hero [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:md:text-4xl [&_p]:text-sm [&_p]:leading-6 [&_p]:text-foose-muted [&_p]:md:text-base mb-8 rounded-xl border border-foose-border bg-foose-surface p-5 md:p-8 [&.small]:py-6 max-md:[&_h1]:text-2xl small">
        <h1>Your cart</h1>
        <p>
          {cart.items.length} item{cart.items.length === 1 ? '' : 's'} ready for checkout.
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
            {availabilityLoading && <InlineNotice tone="info">Checking current item availability…</InlineNotice>}
            {availabilityError && <InlineNotice title="Availability check incomplete" tone="warning">{availabilityError}</InlineNotice>}
            {cart.items.map((item) => (
              <article className="cart-item [&_img]:h-full [&_img]:w-full [&_img]:object-cover grid gap-4 rounded-xl border border-foose-border bg-foose-surface p-4 sm:grid-cols-[120px_minmax(0,1fr)_auto] [&_img]:aspect-square [&_img]:rounded-lg [&_h2]:text-xl [&_h2]:font-bold [&_.qty]:w-fit [&_.qty]:rounded-lg [&_.qty]:border [&_.qty]:border-foose-border [&>strong]:font-display [&>strong]:text-xl [&>strong]:text-accent max-md:grid-cols-[84px_minmax(0,1fr)] max-md:[&>strong]:col-span-2" key={item.listingId}>
                <div className="relative">
                  {(listingStatuses[item.listingId] || item.status) === 'sold' && (
                    <span className="absolute left-2 top-2 z-10 rounded-full bg-foose-danger px-2 py-1 text-[10px] font-black uppercase tracking-wide text-white">
                      Sold
                    </span>
                  )}
                  <CartItemImage image={item.image} title={item.title} />
                </div>
                <div>
                  <h2>{item.title}</h2>
                  <p>Shop: {item.shopName}</p>
                  {item.type === 'wholesale' ? (
                    <div className="qty flex flex-wrap items-center gap-3 [&_button]:rounded-lg [&_button]:border [&_button]:border-foose-border [&_button]:bg-foose-surface [&_button]:px-3 [&_button]:py-2 [&_button]:text-sm [&_button]:font-semibold [&_button]:hover:border-accent [&_button]:hover:text-accent w-fit rounded-lg border border-foose-border">
                      <button onClick={() => cart.updateQuantity(item.listingId, item.quantity - 1)} type="button">
                        <Icon name="minus" />
                      </button>
                      <strong>{item.quantity}</strong>
                      <button onClick={() => cart.updateQuantity(item.listingId, item.quantity + 1)} type="button">
                        <Icon name="plus" />
                      </button>
                    </div>
                  ) : (
                    <p className="muted-copy text-sm leading-6 text-foose-muted md:text-base">Single retail item</p>
                  )}
                  {item.sourceEventTitle && <p className="muted-copy text-sm leading-6 text-foose-muted md:text-base">Pop-up: {item.sourceEventTitle}</p>}
                </div>
                <strong>{formatMoney(item.price * item.quantity, item.currency)}</strong>
                <button aria-label={`Remove ${item.title}`} className="icon-button inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-transparent bg-transparent text-current transition hover:bg-accent-light hover:text-accent" onClick={() => cart.removeItem(item.listingId)} type="button">
                  <Icon name="trash" />
                </button>
              </article>
            ))}
          </section>
          <OrderSummary action="Proceed to checkout" href="/checkout" items={cart.items} />
        </div>
      )}
    </AppShell>
  )
}
