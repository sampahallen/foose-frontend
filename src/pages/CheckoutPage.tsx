import { useState } from 'react'
import { AppShell, EmptyState, ErrorState, Icon, OrderSummary, StepIndicator } from '../components'
import { apiPost } from '../lib/api'
import { useCart } from '../hooks/useCart'
import type { Order } from '../types/api'

const deliveryFee = 2500

export function CheckoutPage() {
  const cart = useCart()
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function submitOrder(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setError('')

    const formData = new FormData(event.currentTarget)

    try {
      const data = await apiPost<{ order: Order }>('/orders', {
        delivery: {
          address: {
            city: String(formData.get('city') || ''),
            region: String(formData.get('region') || ''),
            street: String(formData.get('street') || ''),
          },
          method: String(formData.get('method') || 'delivery'),
        },
        items: cart.items.map((item) => ({
          listingId: item.listingId,
          quantity: item.quantity,
        })),
      })
      cart.clearCart()
      window.location.href = `/order-confirmed?orderId=${data.order._id}`
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to place order')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AppShell>
      {!cart.items.length && (
        <EmptyState body="Checkout starts empty until a logged-in buyer adds real listings to the cart." title="No items to checkout" />
      )}
      {!!cart.items.length && (
        <form className="checkout-layout" onSubmit={(event) => void submitOrder(event)}>
          <section>
            <StepIndicator />
            <div className="checkout-card">
              <h1>How do you want your find?</h1>
              <div className="delivery-toggle">
                <label className="active">
                  <input defaultChecked name="method" type="radio" value="delivery" />
                  <Icon name="truck" /> Standard Delivery
                </label>
                <label>
                  <input name="method" type="radio" value="pickup" />
                  <Icon name="store" /> Pickup Points
                </label>
              </div>
              <div className="form-grid">
                <label>
                  Region
                  <input name="region" placeholder="Greater Accra" required />
                </label>
                <label>
                  City
                  <input name="city" placeholder="e.g. East Legon" />
                </label>
                <label className="wide">
                  Street Address
                  <input name="street" placeholder="Digital Avenue, House No. 42" />
                </label>
              </div>
              <div className="info-card">
                <Icon name="info" />
                <div>
                  <strong>Estimated Delivery Fee</strong>
                  <p>The API recalculates the official delivery fee when the order is created.</p>
                </div>
              </div>
              {error && <ErrorState message={error} />}
            </div>
          </section>
          <OrderSummary action={submitting ? 'Placing order...' : 'Place order'} deliveryFee={deliveryFee} items={cart.items} />
        </form>
      )}
    </AppShell>
  )
}
