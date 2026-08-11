import type { CartItem } from '../../hooks/useCart'
import { formatMoney } from '../../utils/format'
import { Icon } from '../icons/Icon'
import { ButtonLink } from '../ui/ButtonLink'

export function OrderSummary({
  action,
  bargainPrices,
  deliveryFee,
  deliveryParcelCount,
  disabled = false,
  href,
  items,
  onAction,
  pendingFees = false,
  serviceFee = 0,
  submit = false,
}: {
  action: string
  /**
   * Agreed unit prices from the buyer's accepted bargains, keyed by listing.
   * Display only — the server re-resolves the price when the order is placed.
   */
  bargainPrices?: Record<string, number>
  /** Estimated delivery from API; null while loading or unknown */
  deliveryFee?: number | null
  /** Standard delivery is charged once for each seller parcel. */
  deliveryParcelCount?: number
  disabled?: boolean
  href?: string
  items: CartItem[]
  onAction?: () => void
  /** Delivery and service fees aren't known yet (cart, before checkout) — show subtotal only. */
  pendingFees?: boolean
  serviceFee?: number
  /** Use inside a `<form>` to trigger submit (e.g. checkout). */
  submit?: boolean
}) {
  // Bargained prices are shown on the items themselves; the summary just needs
  // the totals to agree with them.
  const subtotal = items.reduce((sum, item) => {
    const agreed = bargainPrices?.[item.listingId]
    const unitPrice = agreed !== undefined ? Math.min(agreed, item.price) : item.price
    return sum + unitPrice * item.quantity
  }, 0)
  // Delivery here is an informational planning estimate, not a charge Foose
  // collects — buyers/sellers settle it directly, so it never joins the total.
  const total = subtotal + serviceFee

  let deliveryLabel: string
  if (deliveryFee === undefined) {
    deliveryLabel = '—'
  } else if (deliveryFee === null) {
    deliveryLabel = '…'
  } else {
    deliveryLabel = formatMoney(deliveryFee)
  }

  const actionContent = (
    <>
      {action} <Icon name="arrow" />
    </>
  )

  return (
    <aside className="order-summary rounded-2xl border border-foose-border/80 bg-foose-surface p-4 shadow-sm md:p-6 [&_h2]:mb-1 [&_h2]:font-display [&_h2]:text-2xl [&_h2]:font-semibold max-lg:[&>.button]:sticky max-lg:[&>.button]:bottom-[calc(5rem+env(safe-area-inset-bottom))] max-lg:[&>.button]:z-20">
      <h2>Order summary</h2>
      {pendingFees ? (
        <>
          <p className="mb-4 text-sm leading-6 text-foose-muted">Delivery and fees are added at checkout.</p>
          <div aria-live="polite" className="summary-total flex flex-wrap items-center gap-3 [&_strong]:font-display [&_strong]:text-xl [&_strong]:font-bold [&_strong]:text-accent [&_strong]:md:text-2xl justify-between border-b border-foose-border py-3">
            <span>Items total</span>
            <strong>{formatMoney(subtotal)}</strong>
          </div>
        </>
      ) : (
        <>
          <p className="mb-4 text-sm leading-6 text-foose-muted">Review the costs before continuing.</p>
          <div className="summary-row flex flex-wrap items-center gap-3 justify-between border-b border-foose-border py-3">
            <span>Subtotal</span>
            <strong>{formatMoney(subtotal)}</strong>
          </div>
          <div className="summary-row flex flex-wrap items-center gap-3 justify-between border-b border-foose-border py-3">
            <span>Service Fee</span>
            <strong>{formatMoney(serviceFee)}</strong>
          </div>
          <div aria-live="polite" className="summary-total flex flex-wrap items-center gap-3 [&_strong]:font-display [&_strong]:text-xl [&_strong]:font-bold [&_strong]:text-accent [&_strong]:md:text-2xl justify-between border-b border-foose-border py-3">
            <span>Total</span>
            <strong>{formatMoney(total)}</strong>
          </div>
        </>
      )}
      {href ? (
        <ButtonLink className="full mt-5" to={href}>
          {actionContent}
        </ButtonLink>
      ) : (
        <button
          className="button mt-5 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border px-5 py-3 text-center text-sm font-bold transition disabled:pointer-events-none disabled:opacity-50 [&.full]:w-full button-primary border-accent bg-accent text-white shadow-md shadow-accent/15 hover:bg-accent-hover full"
          disabled={disabled}
          onClick={onAction}
          type={submit ? 'submit' : 'button'}
        >
          {actionContent}
        </button>
      )}
      <div className="payment-icons mt-5 flex items-center justify-center gap-4 text-foose-faint">
        <Icon name="money" />
        <Icon name="wallet" />
        <Icon name="shield" />
      </div>
      {!pendingFees && deliveryFee !== undefined && (
        <p className="muted-copy mt-4 text-center text-sm leading-6 text-foose-muted">
          {deliveryFee === null
            ? 'Calculating the delivery estimate…'
            : `Estimated delivery${deliveryParcelCount && deliveryParcelCount > 1 ? ` (${deliveryParcelCount} seller parcels)` : ''}: ${deliveryLabel}`}
        </p>
      )}
    </aside>
  )
}
