import { useState, type FormEvent } from 'react'
import { AppShell, EmptyState, ErrorState, Icon, OrderSummary, StepIndicator } from '../components'
import { useCart, type CartItem } from '../hooks/useCart'
import { apiPost } from '../lib/api'
import type { Order } from '../types/api'
import { getErrorMessage } from '../utils/errorMessage'
import { navigateTo, withBasePath } from '../utils/navigation'

const FIXED_DELIVERY_FEE = 1500

type PlaceOrderResponse = {
  order: Order
  orders?: Order[]
  payment?: {
    authorizationUrl?: string
    reference?: string
    status?: string
  }
}

function unavailablePopUpItems(items: CartItem[]) {
  const now = Date.now()
  return items.filter((item) => {
    if (!item.sourceEventId || !item.availableFrom) return false
    const startsAt = new Date(item.availableFrom).getTime()
    const endsAt = item.availableUntil ? new Date(item.availableUntil).getTime() : Number.POSITIVE_INFINITY
    return Number.isFinite(startsAt) && (now < startsAt || now > endsAt)
  })
}

export function CheckoutPage() {
  const cart = useCart()
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [region, setRegion] = useState('Greater Accra')
  const [method, setMethod] = useState<'pickup' | 'delivery'>('delivery')
  const [paymentMethod, setPaymentMethod] = useState<'cash_on_pickup' | 'paystack'>('paystack')
  const deliveryFeeDisplay = method === 'pickup' ? 0 : FIXED_DELIVERY_FEE

  async function submitOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setError('')

    const formData = new FormData(event.currentTarget)

    try {
      const blockedItems = unavailablePopUpItems(cart.items)
      if (blockedItems.length) {
        setError(`Checkout opens during the pop-up window for ${blockedItems[0].sourceEventTitle || blockedItems[0].title}.`)
        return
      }

      const resolvedPaymentMethod = method === 'delivery' ? 'paystack' : paymentMethod
      const data = await apiPost<PlaceOrderResponse>('/orders', {
        callbackUrl: `${window.location.origin}${withBasePath('/order-confirmed')}`,
        delivery: {
          address: {
            city: String(formData.get('city') || ''),
            region: String(formData.get('region') || ''),
            street: String(formData.get('street') || ''),
          },
          method,
        },
        items: cart.items.map((item) => ({
          listingId: item.listingId,
          quantity: item.type === 'wholesale' ? item.quantity : 1,
        })),
        paymentMethod: resolvedPaymentMethod,
      })

      if (data.payment?.authorizationUrl) {
        window.location.assign(data.payment.authorizationUrl)
        return
      }

      cart.clearCart()
      const orderIds = (data.orders?.length ? data.orders : [data.order]).map((order) => order._id).join(',')
      navigateTo(`/order-confirmed?orderIds=${encodeURIComponent(orderIds)}`)
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Unable to place order'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AppShell>
      {!cart.items.length && (
        <EmptyState body="Add items from the marketplace, then return here to complete your purchase." title="No items to checkout" />
      )}
      {!!cart.items.length && (
        <form className="checkout-layout grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px] max-lg:grid-cols-1" onSubmit={(event) => void submitOrder(event)}>
          <section>
            <StepIndicator />
            <div className="checkout-card rounded-xl border border-foose-border bg-foose-surface shadow-sm p-4 md:p-5 [&_h1]:mb-6 [&_h1]:text-3xl [&_h1]:font-bold">
              <h1>How do you want your find?</h1>
              <div className="delivery-toggle mb-6 grid gap-3 sm:grid-cols-2 [&_button]:flex [&_button]:items-center [&_button]:justify-center [&_button]:gap-3 [&_button]:rounded-lg [&_button]:border [&_button]:border-foose-border [&_button]:bg-foose-surface [&_button]:px-4 [&_button]:py-3 [&_button]:font-semibold [&_label]:flex [&_label]:items-center [&_label]:justify-center [&_label]:gap-3 [&_label]:rounded-lg [&_label]:border [&_label]:border-foose-border [&_label]:bg-foose-surface [&_label]:px-4 [&_label]:py-3 [&_label]:font-semibold [&_button.active]:border-accent [&_button.active]:bg-accent-light [&_button.active]:text-accent [&_label.active]:border-accent [&_label.active]:bg-accent-light [&_label.active]:text-accent">
                <label className={method === 'delivery' ? 'active' : ''}>
                  <input
                    checked={method === 'delivery'}
                    name="method"
                    onChange={() => {
                      setMethod('delivery')
                      setPaymentMethod('paystack')
                    }}
                    type="radio"
                    value="delivery"
                  />
                  <Icon name="truck" /> Standard Delivery
                </label>
                <label className={method === 'pickup' ? 'active' : ''}>
                  <input
                    checked={method === 'pickup'}
                    name="method"
                    onChange={() => setMethod('pickup')}
                    type="radio"
                    value="pickup"
                  />
                  <Icon name="store" /> Pickup
                </label>
              </div>
              <div className="form-grid grid gap-4 sm:grid-cols-2 [&_.wide]:sm:col-span-2 [&_label]:flex [&_label]:flex-col [&_label]:gap-2 [&_input]:w-full [&_input]:px-3 [&_input]:py-3 [&_select]:w-full [&_select]:px-3 [&_select]:py-3 [&_textarea]:w-full [&_textarea]:px-3 [&_textarea]:py-3">
                <label>
                  Region
                  <input
                    name="region"
                    onChange={(event) => setRegion(event.target.value)}
                    placeholder="Greater Accra"
                    required
                    value={region}
                  />
                </label>
                <label>
                  City
                  <input name="city" placeholder={method === 'pickup' ? 'Preferred pickup area' : 'e.g. East Legon'} />
                </label>
                <label className="wide">
                  {method === 'pickup' ? 'Pickup note' : 'Street address'}
                  <input name="street" placeholder={method === 'pickup' ? 'Preferred pickup point or note' : 'Digital Avenue, House No. 42'} />
                </label>
              </div>
              <div className="payment-method-card rounded-xl border border-foose-border bg-foose-surface shadow-sm p-4 md:p-5 [&_label]:flex [&_label]:items-center [&_label]:justify-center [&_label]:gap-3 [&_label]:rounded-lg [&_label]:border [&_label]:border-foose-border [&_label]:bg-foose-surface [&_label]:px-4 [&_label]:py-3 [&_label]:font-semibold [&_label.active]:border-accent [&_label.active]:bg-accent-light [&_label.active]:text-accent">
                <h2>Payment</h2>
                <label className={paymentMethod === 'paystack' ? 'active' : ''}>
                  <input
                    checked={paymentMethod === 'paystack'}
                    name="paymentMethod"
                    onChange={() => setPaymentMethod('paystack')}
                    type="radio"
                    value="paystack"
                  />
                  <span>
                    <strong>Pay online with Paystack</strong>
                    <small>You will be redirected to Paystack. Funds are held in escrow after payment succeeds.</small>
                  </span>
                </label>
                {method === 'pickup' && (
                  <label className={paymentMethod === 'cash_on_pickup' ? 'active' : ''}>
                    <input
                      checked={paymentMethod === 'cash_on_pickup'}
                      name="paymentMethod"
                      onChange={() => setPaymentMethod('cash_on_pickup')}
                      type="radio"
                      value="cash_on_pickup"
                    />
                    <span>
                      <strong>Cash on pickup</strong>
                      <small>No escrow is held for cash pickup.</small>
                    </span>
                  </label>
                )}
              </div>
              <div className="info-card rounded-xl border border-foose-border bg-foose-surface shadow-sm p-4 md:p-5">
                <Icon name="info" />
                <div>
                  <strong>Delivery fee</strong>
                  <p>
                    {method === 'pickup'
                      ? 'No delivery fee for pickup orders.'
                      : 'Fixed at GHS 15.00 while the delivery algorithm is being built.'}
                  </p>
                </div>
              </div>
              {error && <ErrorState message={error} />}
            </div>
          </section>
          <OrderSummary
            action={submitting ? 'Preparing checkout...' : paymentMethod === 'cash_on_pickup' ? 'Place pickup order' : 'Pay with Paystack'}
            deliveryFee={deliveryFeeDisplay}
            disabled={submitting}
            items={cart.items}
            submit
          />
        </form>
      )}
    </AppShell>
  )
}
