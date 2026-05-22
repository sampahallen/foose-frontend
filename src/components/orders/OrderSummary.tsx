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
    <aside className="order-summary">
      <h2>Order summary</h2>
      <div className="summary-row">
        <span>Subtotal</span>
        <strong>{formatMoney(subtotal)}</strong>
      </div>
      <div className="summary-row">
        <span>Delivery Fee</span>
        <strong>{deliveryLabel}</strong>
      </div>
      <div className="summary-row">
        <span>Service Fee</span>
        <strong>{formatMoney(serviceFee)}</strong>
      </div>
      <div className="summary-total">
        <span>Total</span>
        <strong>{formatMoney(total)}</strong>
      </div>
      {deliveryFee === null && <p className="muted-copy">Total updates when the delivery estimate is ready.</p>}
      <label className="promo-field">
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
          className="button button-primary full"
          disabled={disabled}
          onClick={onAction}
          type={submit ? 'submit' : 'button'}
        >
          {actionContent}
        </button>
      )}
      <div className="payment-icons">
        <Icon name="money" />
        <Icon name="wallet" />
        <Icon name="shield" />
      </div>
    </aside>
  )
}
