import { useRef, useState, type FormEvent } from 'react'
import { AppShell, ButtonLink, ChoiceCardGroup, ErrorSummary, FormPage, FormSection, Icon, InlineNotice, OrderSummary, StatePanel, StepIndicator, TextField } from '../components'
import { NavigationBackButton } from '../components/navigation'
import { useCart, type CartItem } from '../hooks/useCart'
import { apiDelete, apiGet, apiPost } from '../lib/api'
import type { Order, PaystackPaymentSession } from '../types/api'
import { getErrorMessage } from '../utils/errorMessage'
import { navigateTo } from '../utils/navigation'
import { openPaystackInline } from '../utils/paystackInline'

const FIXED_DELIVERY_FEE = 1500

type PlaceOrderResponse = {
  order: Order
  orders?: Order[]
  payment?: Partial<PaystackPaymentSession>
}

type VerifyPaymentResponse = {
  order?: Order
  orders?: Order[]
}

type CancelPaymentResponse = {
  cancelled: boolean
  paid: boolean
  releasedItemCount: number
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
  const [paymentMessage, setPaymentMessage] = useState('')
  const [paymentSession, setPaymentSession] = useState<PaystackPaymentSession | null>(null)
  const [completedReference, setCompletedReference] = useState('')
  const [cancellationReference, setCancellationReference] = useState('')
  const [confirmedOrderIds, setConfirmedOrderIds] = useState<string[]>([])
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
  const usesPaystack = method === 'delivery' || paymentMethod === 'paystack'
  const regionError = validationAttempted && method === 'delivery' && !region.trim() ? 'Enter a delivery region.' : ''
  const streetError = validationAttempted && method === 'delivery' && !street.trim() ? 'Enter a street address.' : ''

  function goToStep(nextStep: number) {
    setStep(nextStep)
    window.requestAnimationFrame(() => {
      stepHeadingRef.current?.focus()
      window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
    })
  }

  function continueFromDelivery() {
    setValidationAttempted(true)
    if (method === 'delivery' && (!region.trim() || !street.trim())) {
      return
    }
    setValidationAttempted(false)
    goToStep(1)
  }

  async function verifyCompletedPayment(reference: string) {
    setPaymentMessage('Payment completed. Confirming it securely with Paystack...')
    try {
      const verified = await apiGet<VerifyPaymentResponse>(`/payments/verify/${encodeURIComponent(reference)}`)
      const verifiedOrders = verified.orders?.length ? verified.orders : verified.order ? [verified.order] : []
      if (!verifiedOrders.length) throw new Error('Payment was received, but the confirmed order could not be loaded')
      setConfirmedOrderIds(verifiedOrders.map((order) => order._id))
      setPaymentMessage('')
      goToStep(2)
    } catch (verificationError) {
      setPaymentMessage('Your payment was completed, but confirmation could not be loaded. Retry confirmation; you will not be charged again.')
      throw verificationError
    }
  }

  async function cancelPendingPayment(reference: string) {
    setPaymentMessage('Cancelling payment and releasing the reserved item...')
    const cancellation = await apiDelete<CancelPaymentResponse>(`/payments/${encodeURIComponent(reference)}`)
    if (cancellation.paid) {
      setCancellationReference('')
      setCompletedReference(reference)
      await verifyCompletedPayment(reference)
      return
    }
    if (!cancellation.cancelled) throw new Error('The pending payment could not be cancelled')
    setCancellationReference('')
    setCompletedReference('')
    setConfirmedOrderIds([])
    setPaymentSession(null)
    setPaymentMessage(`Payment cancelled. ${cancellation.releasedItemCount === 1 ? 'The item is' : 'The items are'} available in inventory again.`)
  }

  function finishOnlineCheckout() {
    if (!confirmedOrderIds.length) return
    cart.clearCart()
    navigateTo(`/order-confirmed?orderIds=${encodeURIComponent(confirmedOrderIds.join(','))}`)
  }

  async function submitOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    setPaymentMessage('')

    try {
      const blockedItems = unavailablePopUpItems(cart.items)
      if (blockedItems.length) {
        setError(`Checkout opens during the pop-up window for ${blockedItems[0].sourceEventTitle || blockedItems[0].title}.`)
        return
      }

      const resolvedPaymentMethod = method === 'delivery' ? 'paystack' : paymentMethod
      let data: PlaceOrderResponse | undefined
      let onlinePayment = paymentSession

      if (resolvedPaymentMethod === 'paystack' && cancellationReference) {
        await cancelPendingPayment(cancellationReference)
        return
      }

      if (resolvedPaymentMethod === 'paystack' && completedReference) {
        await verifyCompletedPayment(completedReference)
        return
      }

      if (!onlinePayment || resolvedPaymentMethod === 'cash_on_pickup') {
        data = await apiPost<PlaceOrderResponse>('/orders', {
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
      }

      if (resolvedPaymentMethod === 'paystack') {
        if (!onlinePayment) {
          if (!data?.payment?.accessCode || !data.payment.reference) {
            throw new Error('Paystack did not return a payment access code')
          }
          onlinePayment = {
            accessCode: data.payment.accessCode,
            provider: 'paystack',
            reference: data.payment.reference,
            status: 'pending',
          }
          setPaymentSession(onlinePayment)
        }

        if (!onlinePayment) throw new Error('Paystack payment is unavailable')
        const result = await openPaystackInline(onlinePayment.accessCode, {
          onLoad: () => setPaymentMessage('Secure payment is ready.'),
        })
        if (result.status === 'cancelled') {
          setCancellationReference(onlinePayment.reference)
          await cancelPendingPayment(onlinePayment.reference)
          return
        }
        if (result.reference !== onlinePayment.reference) {
          throw new Error('Paystack returned an unexpected transaction reference')
        }
        setCompletedReference(result.reference)
        await verifyCompletedPayment(result.reference)
        return
      }

      cart.clearCart()
      if (!data) throw new Error('The pickup order could not be created')
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
              <StepIndicator current={step} label="Checkout progress" onStepChange={paymentSession ? undefined : (nextStep) => { if (nextStep < step) goToStep(nextStep) }} />
              <h2 className="sr-only" ref={stepHeadingRef} tabIndex={-1}>{step === 0 ? 'Delivery details' : step === 1 ? 'Payment method' : 'Review order'}</h2>

              {step === 0 && (
                <FormSection description="Choose delivery, shop pickup, or a future meet-up option." title="Delivery details">
                  <ChoiceCardGroup<'pickup' | 'delivery' | 'meetup'>
                    label="Fulfilment method"
                    name="method"
                    onChange={(value) => {
                      if (value === 'meetup') return
                      const nextMethod = value
                      setMethod(nextMethod)
                      if (nextMethod === 'delivery') setPaymentMethod('paystack')
                    }}
                    options={[
                      { description: 'Delivered to the address you provide.', label: 'Standard delivery', value: 'delivery', visual: <Icon name="truck" /> },
                      { description: "Collect from the seller's physical shop, when available.", label: 'Pickup', value: 'pickup', visual: <Icon name="store" /> },
                      { description: 'Choose a meet point with the seller. Coming soon.', disabled: true, label: 'Meet up', value: 'meetup', visual: <Icon name="location" /> },
                    ]}
                    value={method}
                  />
                  {(regionError || streetError) && <ErrorSummary errors={[{ fieldId: 'checkout-region', message: regionError }, { fieldId: 'checkout-street', message: streetError }].filter((item) => item.message)} focus />}
                  {method === 'delivery' && (
                    <div className="grid gap-5 sm:grid-cols-2">
                      <TextField error={regionError} id="checkout-region" label="Region" name="region" onChange={(event) => setRegion(event.target.value)} placeholder="Greater Accra" required value={region} />
                      <TextField id="checkout-city" label="City or area" name="city" onChange={(event) => setCity(event.target.value)} optional placeholder="e.g. East Legon" value={city} />
                      <TextField error={streetError} id="checkout-street" label="Street address" name="street" onChange={(event) => setStreet(event.target.value)} placeholder="Digital Avenue, House No. 42" required value={street} wrapperClassName="sm:col-span-2" />
                    </div>
                  )}
                  <InlineNotice tone="info">{method === 'pickup' ? "Pickup means collecting from the seller's physical shop. The seller will confirm collection details, and there is no delivery fee." : 'Delivery is currently a fixed GHS 15.00.'}</InlineNotice>
                </FormSection>
              )}

              {step === 1 && (
                <FormSection description="Choose how you would like to pay for this order." title="Payment">
                  <ChoiceCardGroup
                    label="Payment method"
                    name="paymentMethod"
                    onChange={(value) => setPaymentMethod(value as 'cash_on_pickup' | 'paystack')}
                    options={[
                      { description: 'Pay in a secure Paystack window without leaving Foose. Paid funds are held in escrow.', label: 'Pay online with Paystack', value: 'paystack', visual: <Icon name="shield" /> },
                      ...(method === 'pickup' ? [{ description: 'Pay the seller when you collect the order. No escrow is held.', label: 'Cash on pickup', value: 'cash_on_pickup', visual: <Icon name="money" /> }] : []),
                    ]}
                    value={paymentMethod}
                  />
                  {paymentMessage && <InlineNotice title={completedReference ? 'Payment completed' : cancellationReference ? 'Cancelling payment' : 'Payment not completed'} tone="info">{paymentMessage}</InlineNotice>}
                  {error && <InlineNotice title={completedReference ? 'Payment confirmation unavailable' : cancellationReference ? 'Cancellation incomplete' : 'Checkout could not continue'} tone="error">{error}</InlineNotice>}
                </FormSection>
              )}

              {step === 2 && (
                <FormSection description={usesPaystack ? 'Payment is complete. Review the confirmed order details.' : 'Check these details before placing your order.'} title="Review and confirm">
                  <dl className="grid gap-4 rounded-xl bg-foose-surface-low p-4 text-sm sm:grid-cols-2">
                    <div><dt className="font-semibold text-foose-muted">Fulfilment</dt><dd className="mt-1 font-bold capitalize text-foose-text">{method}</dd></div>
                    <div><dt className="font-semibold text-foose-muted">Payment</dt><dd className="mt-1 font-bold text-foose-text">{paymentMethod === 'paystack' ? 'Paystack' : 'Cash on pickup'}</dd></div>
                    <div><dt className="font-semibold text-foose-muted">{method === 'delivery' ? 'Delivery address' : 'Collection'}</dt><dd className="mt-1 font-bold text-foose-text">{method === 'delivery' ? [street, city, region].filter(Boolean).join(', ') : "Seller's physical shop"}</dd></div>
                    <div><dt className="font-semibold text-foose-muted">Items</dt><dd className="mt-1 font-bold text-foose-text">{cart.items.length} distinct {cart.items.length === 1 ? 'item' : 'items'}</dd></div>
                  </dl>
                  {usesPaystack && <InlineNotice title="Payment confirmed" tone="success">Paystack has confirmed your payment. Your funds are now protected by Foose escrow.</InlineNotice>}
                  {!usesPaystack && error && <InlineNotice title="Checkout could not continue" tone="error">{error}</InlineNotice>}
                </FormSection>
              )}
            </section>

            <div className="lg:sticky lg:top-24 lg:self-start">
              <OrderSummary
                action={step === 0
                  ? 'Continue to payment'
                  : step === 1
                    ? !usesPaystack
                      ? 'Review order'
                      : submitting
                        ? cancellationReference ? 'Releasing item...' : completedReference ? 'Confirming payment...' : paymentSession ? 'Opening secure payment...' : 'Preparing secure payment...'
                        : cancellationReference ? 'Retry cancellation' : completedReference ? 'Retry payment confirmation' : paymentSession ? 'Resume payment' : 'Pay with Paystack'
                    : usesPaystack
                      ? 'View order confirmation'
                      : submitting ? 'Placing pickup order...' : 'Place pickup order'}
                deliveryFee={deliveryFeeDisplay}
                disabled={submitting}
                items={cart.items}
                onAction={step === 0 ? continueFromDelivery : step === 1 && !usesPaystack ? () => goToStep(2) : step === 2 && usesPaystack ? finishOnlineCheckout : undefined}
                submit={(step === 1 && usesPaystack) || (step === 2 && !usesPaystack)}
              />
            </div>
          </form>
        </FormPage>
      )}
    </AppShell>
  )
}
