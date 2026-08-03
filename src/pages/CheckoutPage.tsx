import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { AppShell, ButtonLink, ChoiceCardGroup, ErrorSummary, FormPage, FormSection, Icon, InlineNotice, OrderSummary, SelectControl, StatePanel, StepIndicator, TextField } from '../components'
import { NavigationBackButton } from '../components/navigation'
import { useAuth } from '../hooks/useAuth'
import { useCart, type CartItem } from '../hooks/useCart'
import { apiDelete, apiGet, apiPost } from '../lib/api'
import type { Order, PaystackPaymentSession } from '../types/api'
import { getErrorMessage } from '../utils/errorMessage'
import { navigateTo } from '../utils/navigation'
import { deliveryMethodLabel } from '../utils/orderStatus'
import { openPaystackInline } from '../utils/paystackInline'

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

type DeliveryMethod = 'station_pickup' | 'shop_pickup' | 'airport_to_airport'

type ShopDeliveryState = {
  method: DeliveryMethod
  company: string
  recipientName: string
  recipientPhone: string
  region: string
  town: string
  preferredTerminal: string
}

type RouteStop = { label: string; region: string; terminal: string; town: string }
type RouteOptions = { eligible: boolean; destinations: RouteStop[] }

type ShopDeliveryOption = {
  shopId: string
  shopName: string
  location: { city: string; region: string }
  intercityStc: RouteOptions
  twoMExpress: RouteOptions
  vipJeoun: RouteOptions
}

const ROUTE_VALIDATED_COMPANIES = ['2M Express', 'Intercity STC', 'VIP Jeoun'] as const

function routeOptionsFor(shopOption: ShopDeliveryOption | undefined, company: string): RouteOptions | undefined {
  if (company === '2M Express') return shopOption?.twoMExpress
  if (company === 'Intercity STC') return shopOption?.intercityStc
  if (company === 'VIP Jeoun') return shopOption?.vipJeoun
  return undefined
}

type ShopGroup = { shopId: string; shopName: string; items: CartItem[] }

const STATION_PICKUP_COMPANIES = ['Intercity STC', '2M Express', 'VIP Jeoun'] as const
const AIRPORT_COURIER = 'Passion Air Courier'

function unavailablePopUpItems(items: CartItem[]) {
  const now = Date.now()
  return items.filter((item) => {
    if (!item.sourceEventId || !item.availableFrom) return false
    const startsAt = new Date(item.availableFrom).getTime()
    const endsAt = item.availableUntil ? new Date(item.availableUntil).getTime() : Number.POSITIVE_INFINITY
    return Number.isFinite(startsAt) && (now < startsAt || now > endsAt)
  })
}

function createCheckoutIdempotencyKey() {
  const random = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`
  return `checkout:${random}`
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

function stopKey(stop: { region: string; town: string; terminal: string }) {
  return `${stop.region}|${stop.town}|${stop.terminal}`
}

function defaultShopDelivery(user: ReturnType<typeof useAuth>['user']): ShopDeliveryState {
  return {
    company: '',
    method: 'station_pickup',
    preferredTerminal: '',
    recipientName: user?.name || '',
    recipientPhone: user?.phone || '',
    region: user?.location?.region || 'Greater Accra',
    town: '',
  }
}

export function CheckoutPage() {
  const { user } = useAuth()
  const cart = useCart()
  const [error, setError] = useState('')
  const [paymentMessage, setPaymentMessage] = useState('')
  const [paymentSession, setPaymentSession] = useState<PaystackPaymentSession | null>(null)
  const [completedReference, setCompletedReference] = useState('')
  const [cancellationReference, setCancellationReference] = useState('')
  const [confirmedOrderIds, setConfirmedOrderIds] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [deliveryByShop, setDeliveryByShop] = useState<Record<string, ShopDeliveryState>>({})
  const [shopOptions, setShopOptions] = useState<Record<string, ShopDeliveryOption>>({})
  const [optionsError, setOptionsError] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<'cash_on_pickup' | 'paystack'>('paystack')
  const [step, setStep] = useState(0)
  const [validationAttempted, setValidationAttempted] = useState(false)
  const stepHeadingRef = useRef<HTMLHeadingElement | null>(null)
  const checkoutIdempotencyKeyRef = useRef(createCheckoutIdempotencyKey())
  const cartFingerprint = cart.items.map((item) => `${item.listingId}:${item.quantity}`).sort().join('|')
  const cartFingerprintRef = useRef(cartFingerprint)

  const shopGroups = useMemo(() => groupItemsByShop(cart.items), [cart.items])
  const shopIdsKey = useMemo(() => [...new Set(shopGroups.map((group) => group.shopId))].sort().join(','), [shopGroups])

  useEffect(() => {
    if (!shopIdsKey) return
    let cancelled = false
    apiGet<{ shops: ShopDeliveryOption[] }>(`/orders/checkout/delivery-options?shopIds=${encodeURIComponent(shopIdsKey)}`)
      .then((response) => {
        if (cancelled) return
        setOptionsError('')
        setShopOptions(Object.fromEntries((response.shops || []).map((shop) => [shop.shopId, shop])))
      })
      .catch((fetchError) => {
        if (cancelled) return
        setOptionsError(getErrorMessage(fetchError, 'Unable to load delivery options for these sellers'))
      })
    return () => {
      cancelled = true
    }
  }, [shopIdsKey])

  function shopDeliveryFor(shopId: string): ShopDeliveryState {
    return deliveryByShop[shopId] || defaultShopDelivery(user)
  }

  function updateShopDelivery(shopId: string, patch: Partial<ShopDeliveryState>) {
    setDeliveryByShop((current) => ({
      ...current,
      [shopId]: { ...(current[shopId] || defaultShopDelivery(user)), ...patch },
    }))
  }

  const allShopPickup = shopGroups.length > 0 && shopGroups.every((group) => shopDeliveryFor(group.shopId).method === 'shop_pickup')
  const deliveryFeeDisplay = 0
  const usesPaystack = !allShopPickup || paymentMethod === 'paystack'

  function shopErrors(shopId: string) {
    const state = shopDeliveryFor(shopId)
    const requiresDestination = state.method !== 'shop_pickup'
    const isRouteValidated = state.method === 'station_pickup' && (ROUTE_VALIDATED_COMPANIES as readonly string[]).includes(state.company)
    return {
      company: state.method === 'station_pickup' && !state.company ? 'Choose a bus transit company.' : '',
      recipientName: requiresDestination && !state.recipientName.trim() ? 'Enter the recipient’s full name.' : '',
      recipientPhone: requiresDestination && state.recipientPhone.replace(/\D/g, '').length < 9 ? 'Enter a valid recipient phone number.' : '',
      region: requiresDestination && !state.region.trim() ? (isRouteValidated ? 'Choose a destination.' : 'Enter a delivery region.') : '',
      town: requiresDestination && !state.town.trim() && !isRouteValidated ? 'Enter the destination town.' : '',
    }
  }

  function goToStep(nextStep: number) {
    setStep(nextStep)
    window.requestAnimationFrame(() => {
      stepHeadingRef.current?.focus()
      window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
    })
  }

  function continueFromDelivery() {
    setValidationAttempted(true)
    const hasInvalidShop = shopGroups.some((group) => Object.values(shopErrors(group.shopId)).some(Boolean))
    if (hasInvalidShop) return
    setValidationAttempted(false)
    goToStep(1)
  }

  async function verifyCompletedPayment(reference: string) {
    setPaymentMessage('Payment completed. Confirming it securely with Paystack...')
    try {
      const verified = await apiPost<VerifyPaymentResponse>(
        `/payments/${encodeURIComponent(reference)}/actions/verify`,
        {},
        { headers: { 'Idempotency-Key': `${checkoutIdempotencyKeyRef.current}:verify` } },
      )
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
    checkoutIdempotencyKeyRef.current = createCheckoutIdempotencyKey()
    setPaymentMessage(`Payment cancelled. ${cancellation.releasedItemCount === 1 ? 'The item is' : 'The items are'} available in inventory again.`)
  }

  function finishOnlineCheckout() {
    if (!confirmedOrderIds.length) return
    checkoutIdempotencyKeyRef.current = createCheckoutIdempotencyKey()
    cart.clearCart()
    navigateTo(`/order-confirmed?orderIds=${encodeURIComponent(confirmedOrderIds.join(','))}`)
  }

  useEffect(() => {
    if (cartFingerprintRef.current === cartFingerprint) return
    if (paymentSession || completedReference || cancellationReference) return
    cartFingerprintRef.current = cartFingerprint
    checkoutIdempotencyKeyRef.current = createCheckoutIdempotencyKey()
    const resetTimer = window.setTimeout(() => {
      setPaymentSession(null)
      setCompletedReference('')
      setCancellationReference('')
      setConfirmedOrderIds([])
    }, 0)
    return () => window.clearTimeout(resetTimer)
  }, [cancellationReference, cartFingerprint, completedReference, paymentSession])

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

      const resolvedPaymentMethod = allShopPickup ? paymentMethod : 'paystack'
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
        const deliveryPayload = Object.fromEntries(
          shopGroups.map((group) => {
            const state = shopDeliveryFor(group.shopId)
            const requiresDestination = state.method !== 'shop_pickup'
            return [
              group.shopId,
              requiresDestination
                ? {
                    company: state.method === 'station_pickup' ? state.company : undefined,
                    destination: {
                      preferredTerminal: state.preferredTerminal.trim() || undefined,
                      recipientName: state.recipientName.trim(),
                      recipientPhone: state.recipientPhone.trim(),
                      region: state.region.trim(),
                      town: state.town.trim(),
                    },
                    method: state.method,
                  }
                : { method: state.method },
            ]
          }),
        )
        data = await apiPost<PlaceOrderResponse>(
          '/orders',
          {
            deliveryByShop: deliveryPayload,
            items: cart.items.map((item) => ({
              listingId: item.listingId,
              quantity: item.type === 'wholesale' ? item.quantity : 1,
            })),
            paymentMethod: resolvedPaymentMethod,
          },
          { headers: { 'Idempotency-Key': checkoutIdempotencyKeyRef.current } },
        )
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
      checkoutIdempotencyKeyRef.current = createCheckoutIdempotencyKey()
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
                <FormSection description="Choose a fulfilment method for each seller in your cart." title="Delivery details">
                  {optionsError && <InlineNotice tone="warning">{optionsError}</InlineNotice>}
                  <div className="grid gap-5">
                    {shopGroups.map((group) => {
                      const state = shopDeliveryFor(group.shopId)
                      const errors = shopErrors(group.shopId)
                      const requiresDestination = state.method !== 'shop_pickup'
                      const isRouteValidated = state.method === 'station_pickup' && (ROUTE_VALIDATED_COMPANIES as readonly string[]).includes(state.company)
                      const routeOptions = routeOptionsFor(shopOptions[group.shopId], state.company)
                      const selectedStopKey = state.region || state.town ? stopKey({ region: state.region, terminal: state.preferredTerminal, town: state.town }) : ''
                      return (
                        <div className="rounded-xl border border-foose-border p-4 sm:p-5" key={group.shopId}>
                          <h3 className="mb-3 font-display text-base font-semibold text-foose-text">{group.shopName}</h3>
                          <ChoiceCardGroup<DeliveryMethod>
                            label="Fulfilment method"
                            name={`method-${group.shopId}`}
                            onChange={(value) => updateShopDelivery(group.shopId, {
                              company: value === 'station_pickup' ? state.company : '',
                              method: value,
                              preferredTerminal: '',
                              region: value === 'station_pickup' ? '' : state.region,
                              town: '',
                            })}
                            options={[
                              { description: 'Collect at a bus station via Intercity STC, 2M Express, or VIP Jeoun. Pay the transit fee directly at the station.', label: 'Station pickup', value: 'station_pickup', visual: <Icon name="truck" /> },
                              { description: "Collect from the seller's physical shop, when available. No delivery fee.", label: 'Shop pickup', value: 'shop_pickup', visual: <Icon name="store" /> },
                              { description: `${AIRPORT_COURIER} sends an air waybill. Pay the courier fee at the collection point.`, label: 'Express delivery (airport-to-airport)', value: 'airport_to_airport', visual: <Icon name="send" /> },
                            ]}
                            value={state.method}
                          />

                          {validationAttempted && (errors.company || errors.recipientName || errors.recipientPhone || errors.region || errors.town) && (
                            <ErrorSummary
                              className="mt-4"
                              errors={[
                                { fieldId: `company-${group.shopId}`, message: errors.company },
                                { fieldId: `recipient-name-${group.shopId}`, message: errors.recipientName },
                                { fieldId: `recipient-phone-${group.shopId}`, message: errors.recipientPhone },
                                { fieldId: isRouteValidated ? `destination-${group.shopId}` : `region-${group.shopId}`, message: errors.region },
                                { fieldId: `town-${group.shopId}`, message: errors.town },
                              ].filter((item) => item.message)}
                              focus
                            />
                          )}

                          {state.method === 'station_pickup' && (
                            <ChoiceCardGroup
                              className="mt-4"
                              error={validationAttempted ? errors.company : undefined}
                              id={`company-${group.shopId}`}
                              label="Bus transit company"
                              name={`company-${group.shopId}`}
                              onChange={(value) => updateShopDelivery(group.shopId, (ROUTE_VALIDATED_COMPANIES as readonly string[]).includes(value)
                                ? { company: value, preferredTerminal: '', region: '', town: '' }
                                : { company: value })}
                              options={STATION_PICKUP_COMPANIES.map((name) => ({ label: name, value: name }))}
                              value={state.company}
                            />
                          )}

                          {isRouteValidated && (
                            routeOptions?.eligible ? (
                              <label className="mt-4 grid gap-1.5 sm:gap-2" htmlFor={`destination-${group.shopId}`}>
                                <span className="text-[13px] font-extrabold leading-5 text-foose-text sm:text-sm">Destination<span aria-hidden="true" className="ml-1 text-foose-danger">*</span></span>
                                <SelectControl
                                  id={`destination-${group.shopId}`}
                                  menuZIndex={1500}
                                  onChange={(event) => {
                                    const stop = routeOptions.destinations.find((candidate) => stopKey(candidate) === event.target.value)
                                    if (stop) updateShopDelivery(group.shopId, { preferredTerminal: stop.terminal, region: stop.region, town: stop.town })
                                  }}
                                  value={selectedStopKey}
                                >
                                  <option value="">Choose a destination</option>
                                  {routeOptions.destinations.map((stopOption) => (
                                    <option key={stopKey(stopOption)} value={stopKey(stopOption)}>{stopOption.label}</option>
                                  ))}
                                </SelectControl>
                              </label>
                            ) : (
                              <InlineNotice className="mt-4" title={`${state.company} isn't available here`} tone="warning">
                                {state.company} doesn't serve a route from {group.shopName}'s location. Choose a different company for this seller.
                              </InlineNotice>
                            )
                          )}

                          {requiresDestination && (
                            <div className="mt-4 grid gap-5 sm:grid-cols-2">
                              <TextField error={validationAttempted ? errors.recipientName : undefined} id={`recipient-name-${group.shopId}`} label="Recipient full name" onChange={(event) => updateShopDelivery(group.shopId, { recipientName: event.target.value })} placeholder="Name on the parcel" required value={state.recipientName} />
                              <TextField error={validationAttempted ? errors.recipientPhone : undefined} id={`recipient-phone-${group.shopId}`} inputMode="tel" label="Recipient phone" onChange={(event) => updateShopDelivery(group.shopId, { recipientPhone: event.target.value })} placeholder="024 000 0000" required type="tel" value={state.recipientPhone} />
                              {!isRouteValidated && (
                                <>
                                  <TextField error={validationAttempted ? errors.region : undefined} id={`region-${group.shopId}`} label="Region" onChange={(event) => updateShopDelivery(group.shopId, { region: event.target.value })} placeholder="Greater Accra" required value={state.region} />
                                  <TextField error={validationAttempted ? errors.town : undefined} id={`town-${group.shopId}`} label="Destination town" onChange={(event) => updateShopDelivery(group.shopId, { town: event.target.value })} placeholder="e.g. Kumasi" required value={state.town} />
                                  <TextField hint="Add this only if you already know the terminal you prefer. The seller still records the actual last stop when sending." id={`terminal-${group.shopId}`} label="Preferred terminal" onChange={(event) => updateShopDelivery(group.shopId, { preferredTerminal: event.target.value })} optional placeholder="e.g. Asafo station" value={state.preferredTerminal} wrapperClassName="sm:col-span-2" />
                                </>
                              )}
                            </div>
                          )}

                          <InlineNotice className="mt-4" tone="info">
                            {state.method === 'shop_pickup'
                              ? "Shop pickup means collecting from the seller's physical shop. The seller will mark the order ready, and there is no delivery fee."
                              : 'Pay the transit or courier fee directly at the station or collection point — it is not charged through Foose.'}
                          </InlineNotice>
                        </div>
                      )
                    })}
                  </div>
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
                      ...(allShopPickup ? [{ description: 'Pay the seller when you collect the order. No escrow is held.', label: 'Cash on pickup', value: 'cash_on_pickup', visual: <Icon name="money" /> }] : []),
                    ]}
                    value={paymentMethod}
                  />
                  {paymentMessage && <InlineNotice title={completedReference ? 'Payment completed' : cancellationReference ? 'Cancelling payment' : 'Payment not completed'} tone="info">{paymentMessage}</InlineNotice>}
                  {error && <InlineNotice title={completedReference ? 'Payment confirmation unavailable' : cancellationReference ? 'Cancellation incomplete' : 'Checkout could not continue'} tone="error">{error}</InlineNotice>}
                </FormSection>
              )}

              {step === 2 && (
                <FormSection description={usesPaystack ? 'Payment is complete. Review the confirmed order details.' : 'Check these details before placing your order.'} title="Review and confirm">
                  <div className="grid gap-4">
                    {shopGroups.map((group) => {
                      const state = shopDeliveryFor(group.shopId)
                      const requiresDestination = state.method !== 'shop_pickup'
                      return (
                        <dl className="grid gap-3 rounded-xl bg-foose-surface-low p-4 text-sm sm:grid-cols-2" key={group.shopId}>
                          <div className="sm:col-span-2"><dt className="font-semibold text-foose-muted">Seller</dt><dd className="mt-1 font-bold text-foose-text">{group.shopName}</dd></div>
                          <div><dt className="font-semibold text-foose-muted">Fulfilment</dt><dd className="mt-1 font-bold text-foose-text">{deliveryMethodLabel(state.method)}{state.method === 'station_pickup' && state.company ? ` · ${state.company}` : ''}</dd></div>
                          <div><dt className="font-semibold text-foose-muted">{requiresDestination ? 'Recipient' : 'Collection'}</dt><dd className="mt-1 font-bold text-foose-text">{requiresDestination ? `${state.recipientName} · ${state.recipientPhone}` : "Seller's physical shop"}</dd></div>
                          {requiresDestination && <div className="sm:col-span-2"><dt className="font-semibold text-foose-muted">Destination</dt><dd className="mt-1 font-bold text-foose-text">{[state.preferredTerminal, state.town, state.region].filter(Boolean).join(', ')}</dd></div>}
                        </dl>
                      )
                    })}
                    <dl className="grid gap-4 rounded-xl bg-foose-surface-low p-4 text-sm sm:grid-cols-2">
                      <div><dt className="font-semibold text-foose-muted">Payment</dt><dd className="mt-1 font-bold text-foose-text">{paymentMethod === 'paystack' ? 'Paystack' : 'Cash on pickup'}</dd></div>
                      <div><dt className="font-semibold text-foose-muted">Items</dt><dd className="mt-1 font-bold text-foose-text">{cart.items.length} distinct {cart.items.length === 1 ? 'item' : 'items'}</dd></div>
                      <div><dt className="font-semibold text-foose-muted">Seller parcels</dt><dd className="mt-1 font-bold text-foose-text">{shopGroups.length}</dd></div>
                    </dl>
                  </div>
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
                deliveryParcelCount={!allShopPickup ? shopGroups.length : undefined}
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
