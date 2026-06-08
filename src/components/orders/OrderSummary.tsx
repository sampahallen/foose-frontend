import type { CartItem } from '../../hooks/useCart'
import { formatMoney } from '../../utils/format'
import { Icon } from '../icons/Icon'
import { ButtonLink } from '../ui/ButtonLink'

export function OrderSummary({
  action,
  deliveryFee,
  disabled = false,
  href,
  items,
  onAction,
  serviceFee = 0,
  submit = false,
}: {
  action: string
  /** Estimated delivery from API; null while loading or unknown */
  deliveryFee?: number | null
  disabled?: boolean
  href?: string
  items: CartItem[]
  onAction?: () => void
  serviceFee?: number
  /** Use inside a `<form>` to trigger submit (e.g. checkout). */
  submit?: boolean
}) {
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const resolvedDelivery = deliveryFee ?? 0
  const total = subtotal + resolvedDelivery + serviceFee

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
    <aside className="order-summary rounded-xl border border-foose-border bg-foose-surface shadow-sm p-4 md:p-5 [&_h2]:mb-4 [&_h2]:text-2xl [&_h2]:font-bold">
      <h2>Order summary</h2>
      <div className="summary-row flex flex-wrap items-center gap-3 justify-between border-b border-foose-border py-3">
        <span>Subtotal</span>
        <strong>{formatMoney(subtotal)}</strong>
      </div>
      <div className="summary-row flex flex-wrap items-center gap-3 justify-between border-b border-foose-border py-3">
        <span>Delivery Fee</span>
        <strong>{deliveryLabel}</strong>
      </div>
      <div className="summary-row flex flex-wrap items-center gap-3 justify-between border-b border-foose-border py-3">
        <span>Service Fee</span>
        <strong>{formatMoney(serviceFee)}</strong>
      </div>
      <div className="summary-total flex flex-wrap items-center gap-3 [&_strong]:font-display [&_strong]:text-xl [&_strong]:font-bold [&_strong]:text-accent [&_strong]:md:text-2xl justify-between border-b border-foose-border py-3">
        <span>Total</span>
        <strong>{formatMoney(total)}</strong>
      </div>
      {deliveryFee === null && <p className="muted-copy text-sm leading-6 text-foose-muted md:text-base">Total updates when the delivery estimate is ready.</p>}
      <label className="promo-field text-sm font-semibold text-foose-text mt-5 flex flex-col gap-2 [&_input]:h-12 [&_input]:px-3">
        Promo code
        <span>
          <input placeholder="Enter code" />
          <button type="button">Apply</button>
        </span>
      </label>
      {href ? (
        <ButtonLink className="full" to={href}>
          {actionContent}
        </ButtonLink>
      ) : (
        <button
          className="button inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border px-5 py-2.5 text-center text-sm font-bold transition disabled:pointer-events-none disabled:opacity-50 [&.full]:w-full button-primary border-accent bg-accent text-white shadow-md shadow-accent/15 hover:bg-accent-hover full"
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
    </aside>
  )
}
