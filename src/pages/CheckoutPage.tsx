import { useRef, useState, type FormEvent } from 'react'
import { AppShell, ButtonLink, ChoiceCardGroup, ErrorSummary, FormPage, FormSection, Icon, InlineNotice, OrderSummary, StatePanel, StepIndicator, TextField } from '../components'
import { NavigationBackButton } from '../components/navigation'
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
  const [city, setCity] = useState('')
  const [street, setStreet] = useState('')
  const [method, setMethod] = useState<'pickup' | 'delivery'>('delivery')
  const [paymentMethod, setPaymentMethod] = useState<'cash_on_pickup' | 'paystack'>('paystack')
  const [step, setStep] = useState(0)
  const [validationAttempted, setValidationAttempted] = useState(false)
  const stepHeadingRef = useRef<HTMLHeadingElement | null>(null)
  const deliveryFeeDisplay = method === 'pickup' ? 0 : FIXED_DELIVERY_FEE
  const regionError = validationAttempted && !region.trim() ? 'Enter a delivery or pickup region.' : ''

  function goToStep(nextStep: number) {
    setStep(nextStep)
    window.requestAnimationFrame(() => {
      stepHeadingRef.current?.focus()
      window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
    })
  }

  function continueFromDelivery() {
    setValidationAttempted(true)
    if (!region.trim()) {
      return
    }
    setValidationAttempted(false)
    goToStep(1)
  }

  async function submitOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setError('')

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
            city: city.trim(),
            region: region.trim(),
            street: street.trim(),
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
      <NavigationBackButton className="mb-5" fallback={{ href: '/cart', label: 'Cart' }} />
      {!cart.items.length && (
        <StatePanel action={<ButtonLink to="/browse">Browse marketplace</ButtonLink>} body="Add items from the marketplace, then return here to complete your purchase." layout="page" title="No items to checkout" tone="empty" />
      )}
      {!!cart.items.length && (
        <FormPage description="Choose fulfilment, payment, and confirm your order." eyebrow="Secure checkout" title="Complete your order" width="wide">
          <form aria-busy={submitting} className="checkout-layout grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]" onSubmit={(event) => void submitOrder(event)}>
            <section className="min-w-0">
              <StepIndicator current={step} label="Checkout progress" onStepChange={(nextStep) => { if (nextStep < step) goToStep(nextStep) }} />
              <h2 className="sr-only" ref={stepHeadingRef} tabIndex={-1}>{step === 0 ? 'Delivery details' : step === 1 ? 'Payment method' : 'Review order'}</h2>

              {step === 0 && (
                <FormSection description="Select delivery or pickup, then tell the seller where the order should go." title="Delivery details">
                  <ChoiceCardGroup
                    label="Fulfilment method"
                    name="method"
                    onChange={(value) => {
                      const nextMethod = value as 'pickup' | 'delivery'
                      setMethod(nextMethod)
                      if (nextMethod === 'delivery') setPaymentMethod('paystack')
                    }}
                    options={[
                      { description: 'Delivered to the address you provide.', label: 'Standard delivery', value: 'delivery', visual: <Icon name="truck" /> },
                      { description: 'Arrange collection directly with the seller.', label: 'Pickup', value: 'pickup', visual: <Icon name="store" /> },
                    ]}
                    value={method}
                  />
                  {regionError && <ErrorSummary errors={[{ fieldId: 'checkout-region', message: regionError }]} focus />}
                  <div className="grid gap-5 sm:grid-cols-2">
                    <TextField error={regionError} id="checkout-region" label="Region" name="region" onChange={(event) => setRegion(event.target.value)} placeholder="Greater Accra" required value={region} />
                    <TextField id="checkout-city" label="City or area" name="city" onChange={(event) => setCity(event.target.value)} optional placeholder={method === 'pickup' ? 'Preferred pickup area' : 'e.g. East Legon'} value={city} />
                    <TextField id="checkout-street" label={method === 'pickup' ? 'Pickup note' : 'Street address'} name="street" onChange={(event) => setStreet(event.target.value)} optional placeholder={method === 'pickup' ? 'Preferred pickup point or note' : 'Digital Avenue, House No. 42'} value={street} wrapperClassName="sm:col-span-2" />
                  </div>
                  <InlineNotice tone="info">{method === 'pickup' ? 'Pickup orders have no delivery fee.' : 'Delivery is currently a fixed GHS 15.00.'}</InlineNotice>
                </FormSection>
              )}

              {step === 1 && (
                <FormSection description="Choose how you would like to pay for this order." title="Payment">
                  <ChoiceCardGroup
                    label="Payment method"
                    name="paymentMethod"
                    onChange={(value) => setPaymentMethod(value as 'cash_on_pickup' | 'paystack')}
                    options={[
                      { description: 'Continue securely to Paystack. Paid funds are held in escrow.', label: 'Pay online with Paystack', value: 'paystack', visual: <Icon name="shield" /> },
                      ...(method === 'pickup' ? [{ description: 'Pay the seller when you collect the order. No escrow is held.', label: 'Cash on pickup', value: 'cash_on_pickup', visual: <Icon name="money" /> }] : []),
                    ]}
                    value={paymentMethod}
                  />
                </FormSection>
              )}

              {step === 2 && (
                <FormSection description="Check these details before placing your order." title="Review and confirm">
                  <dl className="grid gap-4 rounded-xl bg-foose-surface-low p-4 text-sm sm:grid-cols-2">
                    <div><dt className="font-semibold text-foose-muted">Fulfilment</dt><dd className="mt-1 font-bold capitalize text-foose-text">{method}</dd></div>
                    <div><dt className="font-semibold text-foose-muted">Payment</dt><dd className="mt-1 font-bold text-foose-text">{paymentMethod === 'paystack' ? 'Paystack' : 'Cash on pickup'}</dd></div>
                    <div><dt className="font-semibold text-foose-muted">Region</dt><dd className="mt-1 font-bold text-foose-text">{region}</dd></div>
                    <div><dt className="font-semibold text-foose-muted">Items</dt><dd className="mt-1 font-bold text-foose-text">{cart.items.length} distinct {cart.items.length === 1 ? 'item' : 'items'}</dd></div>
                  </dl>
                  {error && <InlineNotice title="Checkout could not continue" tone="error">{error}</InlineNotice>}
                </FormSection>
              )}
            </section>

            <div className="lg:sticky lg:top-24 lg:self-start">
              <OrderSummary
                action={step === 0 ? 'Continue to payment' : step === 1 ? 'Review order' : submitting ? 'Preparing checkout...' : paymentMethod === 'cash_on_pickup' ? 'Place pickup order' : 'Pay with Paystack'}
                deliveryFee={deliveryFeeDisplay}
                disabled={submitting}
                items={cart.items}
                onAction={step === 0 ? continueFromDelivery : step === 1 ? () => goToStep(2) : undefined}
                submit={step === 2}
              />
            </div>
          </form>
        </FormPage>
      )}
    </AppShell>
  )
}
