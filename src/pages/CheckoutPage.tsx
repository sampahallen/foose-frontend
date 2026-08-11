import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { AppShell, ButtonLink, ErrorSummary, FormField, FormPage, FormSection, Icon, InlineNotice, OrderSummary, SelectControl, StatePanel, StepIndicator, TextField } from '../components'
import { NavigationBackButton } from '../components/navigation'
import { useAuth } from '../hooks/useAuth'
import { useAcceptedBargainPrices } from '../hooks/useBargain'
import { useCart, type CartItem } from '../hooks/useCart'
import { apiDelete, apiGet, apiPost } from '../lib/api'
import type { CourierProviderId, Order, PaystackPaymentSession } from '../types/api'
import { getErrorMessage } from '../utils/errorMessage'
import { GHANA_REGION_OPTIONS } from '../utils/ghanaRegions'
import { townOptionsForRegion } from '../utils/ghanaTowns'
import { navigateTo } from '../utils/navigation'
import { formatMoney } from '../utils/format'
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

type DeliveryMethod = 'station_pickup' | 'shop_pickup' | 'intra_city_courier' | 'inter_city_courier'

const COURIER_METHODS: readonly DeliveryMethod[] = ['intra_city_courier', 'inter_city_courier']

type ShopDeliveryState = {
  method: DeliveryMethod
  company: string
  recipientName: string
  recipientPhone: string
  region: string
  town: string
  preferredTerminal: string
  provider: string
  deliveryAddress: string
  secondAddress: string
  deliveryNote: string
}

type RouteStop = { estimatedFeePesewas?: number; label: string; region: string; terminal: string; town: string }
type RouteOptions = { eligible: boolean; destinations: RouteStop[] }

type ShopDeliveryOption = {
  shopId: string
  shopName: string
  location: { city: string; region: string }
  courier: { intraCityPossible: boolean; interCityPossible: boolean }
  intercityStc: RouteOptions
  twoMExpress: RouteOptions
  vipJeoun: RouteOptions
}

type CourierQuote = {
  distanceKm: number
  feePesewas: number
  providerId: CourierProviderId | string
  providerName: string
  trackingNotice: string
}

type DeliveryQuoteResponse = { interCity: CourierQuote | null; intraCity: CourierQuote[] }

function courierQuoteKey(shopId: string, region: string, town: string) {
  return `${shopId}|${region}|${town}`
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

/** A shop's planning-only delivery estimate in pesewas, or null while a courier quote is still loading. */
function estimatedDeliveryFeeForShop(
  group: ShopGroup,
  state: ShopDeliveryState,
  shopOptions: Record<string, ShopDeliveryOption>,
  courierQuotesByKey: Record<string, DeliveryQuoteResponse>,
): number | null {
  if (state.method === 'station_pickup') {
    const routeOptions = routeOptionsFor(shopOptions[group.shopId], state.company)
    const selectedStopKey = state.region || state.town ? stopKey({ region: state.region, terminal: state.preferredTerminal, town: state.town }) : ''
    const selectedStop = routeOptions?.destinations.find((candidate) => stopKey(candidate) === selectedStopKey)
    if (selectedStop?.estimatedFeePesewas === undefined) return 0
    // Displayed transit estimate is a third of the published fare, rounded down to a whole cedi.
    return Math.floor(selectedStop.estimatedFeePesewas / 3 / 100) * 100
  }
  if (COURIER_METHODS.includes(state.method)) {
    if (!state.region || !state.town) return 0
    const quote = courierQuotesByKey[courierQuoteKey(group.shopId, state.region, state.town)]
    if (!quote) return null
    const options = state.method === 'intra_city_courier' ? quote.intraCity : quote.interCity ? [quote.interCity] : []
    const selected = options.find((option) => option.providerId === state.provider)
    return selected?.feePesewas ?? 0
  }
  return 0
}

function defaultShopDelivery(user: ReturnType<typeof useAuth>['user']): ShopDeliveryState {
  return {
    company: '',
    deliveryAddress: '',
    deliveryNote: '',
    method: 'station_pickup',
    preferredTerminal: '',
    provider: '',
    recipientName: user?.name || '',
    recipientPhone: user?.phone || '',
    region: user?.location?.region || 'Greater Accra',
    secondAddress: '',
    town: '',
  }
}

export function CheckoutPage() {
  const { user } = useAuth()
  const cart = useCart()
  const bargainPrices = useAcceptedBargainPrices(cart.items.length > 0)
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
  const [courierQuotesByKey, setCourierQuotesByKey] = useState<Record<string, DeliveryQuoteResponse>>({})
  const [courierQuoteErrorByKey, setCourierQuoteErrorByKey] = useState<Record<string, string>>({})
  const [paymentMethod, setPaymentMethod] = useState<'cash_on_pickup' | 'paystack'>('paystack')
  const [step, setStep] = useState(0)
  const [validationAttempted, setValidationAttempted] = useState(false)
  // The order summary's primary button sits in the same on-screen spot across
  // steps (it's sticky on mobile), and its very next label is often a live
  // Paystack submit — so a double-click/tap that follows "Continue to
  // payment" can land its second hit on "Pay with Paystack". This briefly
  // disables the button after any step change so that only a genuinely new
  // click can fire it.
  const [stepTransitionLocked, setStepTransitionLocked] = useState(false)
  const stepLockTimeoutRef = useRef<number | undefined>(undefined)
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

  // Intra-city courier only ever ships within the seller's own region, so the
  // region isn't a buyer choice - it tracks the seller's location, which may
  // still be loading when the buyer picks this method.
  useEffect(() => {
    const syncTimer = window.setTimeout(() => {
      for (const group of shopGroups) {
        const state = shopDeliveryFor(group.shopId)
        if (state.method !== 'intra_city_courier') continue
        const sellerRegion = shopOptions[group.shopId]?.location.region
        if (sellerRegion && state.region !== sellerRegion) {
          updateShopDelivery(group.shopId, { provider: '', region: sellerRegion, town: '' })
        }
      }
    }, 0)
    return () => window.clearTimeout(syncTimer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shopGroups, shopOptions])

  // Live, distance-based courier pricing. Keyed by shop+region+town so
  // switching the buyer's destination naturally invalidates the old price
  // instead of needing separate stale-tracking state.
  const courierQuoteFingerprint = shopGroups
    .map((group) => {
      const state = shopDeliveryFor(group.shopId)
      return COURIER_METHODS.includes(state.method) ? `${group.shopId}:${state.region}:${state.town}` : ''
    })
    .filter(Boolean)
    .join('|')

  useEffect(() => {
    const pending = shopGroups
      .map((group) => ({ group, state: shopDeliveryFor(group.shopId) }))
      .filter(({ state }) => COURIER_METHODS.includes(state.method) && state.region && state.town)
      .filter(({ group, state }) => !(courierQuoteKey(group.shopId, state.region, state.town) in courierQuotesByKey))
    if (!pending.length) return
    let cancelled = false
    Promise.all(
      pending.map(({ group, state }) =>
        apiGet<DeliveryQuoteResponse>(
          `/orders/checkout/delivery-quote?shopId=${encodeURIComponent(group.shopId)}&region=${encodeURIComponent(state.region)}&town=${encodeURIComponent(state.town)}`,
        )
          .then((response) => ({ error: '', groupId: group.shopId, key: courierQuoteKey(group.shopId, state.region, state.town), response }))
          .catch((fetchError: unknown) => ({
            error: getErrorMessage(fetchError, 'Unable to load delivery pricing'),
            groupId: group.shopId,
            key: courierQuoteKey(group.shopId, state.region, state.town),
            response: undefined,
          })),
      ),
    ).then((results) => {
      if (cancelled) return
      setCourierQuotesByKey((current) => {
        const next = { ...current }
        for (const result of results) if (result.response) next[result.key] = result.response
        return next
      })
      setCourierQuoteErrorByKey((current) => {
        const next = { ...current }
        for (const result of results) next[result.key] = result.error
        return next
      })
      // Exactly one available provider is an unambiguous choice - pick it for the buyer.
      for (const result of results) {
        if (!result.response) continue
        const state = shopDeliveryFor(result.groupId)
        const options = state.method === 'intra_city_courier'
          ? result.response.intraCity
          : result.response.interCity ? [result.response.interCity] : []
        if (options.length === 1 && !state.provider) {
          updateShopDelivery(result.groupId, { provider: options[0].providerId })
        }
      }
    })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courierQuoteFingerprint])

  const allShopPickup = shopGroups.length > 0 && shopGroups.every((group) => shopDeliveryFor(group.shopId).method === 'shop_pickup')
  const shopDeliveryEstimates = shopGroups.map((group) => estimatedDeliveryFeeForShop(group, shopDeliveryFor(group.shopId), shopOptions, courierQuotesByKey))
  const deliveryFeeDisplay = shopDeliveryEstimates.some((fee) => fee === null)
    ? null
    : shopDeliveryEstimates.reduce((sum: number, fee) => sum + (fee ?? 0), 0)
  const usesPaystack = !allShopPickup || paymentMethod === 'paystack'

  function shopErrors(shopId: string) {
    const state = shopDeliveryFor(shopId)
    const requiresDestination = state.method !== 'shop_pickup'
    const isRouteValidated = state.method === 'station_pickup' && (ROUTE_VALIDATED_COMPANIES as readonly string[]).includes(state.company)
    const isCourierMethod = COURIER_METHODS.includes(state.method)
    return {
      company: state.method === 'station_pickup' && !state.company ? 'Choose a bus transit company.' : '',
      deliveryAddress: isCourierMethod && !state.deliveryAddress.trim() ? 'Enter a delivery address.' : '',
      provider: isCourierMethod && state.region && state.town && !state.provider ? 'Choose a delivery provider.' : '',
      recipientName: requiresDestination && !state.recipientName.trim() ? 'Enter the recipient’s full name.' : '',
      recipientPhone: requiresDestination && state.recipientPhone.replace(/\D/g, '').length < 9 ? 'Enter a valid recipient phone number.' : '',
      region: (isRouteValidated || isCourierMethod) && !state.region.trim() ? 'Choose a destination.' : '',
      town: isCourierMethod && !state.town.trim() ? 'Choose a town.' : '',
    }
  }

  function goToStep(nextStep: number) {
    setStep(nextStep)
    setStepTransitionLocked(true)
    window.clearTimeout(stepLockTimeoutRef.current)
    stepLockTimeoutRef.current = window.setTimeout(() => setStepTransitionLocked(false), 500)
    window.requestAnimationFrame(() => {
      stepHeadingRef.current?.focus()
      window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
    })
  }

  useEffect(() => () => window.clearTimeout(stepLockTimeoutRef.current), [])

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
            const isCourierMethod = COURIER_METHODS.includes(state.method)
            return [
              group.shopId,
              requiresDestination
                ? {
                    company: state.method === 'station_pickup' ? state.company : undefined,
                    destination: {
                      deliveryAddress: isCourierMethod ? state.deliveryAddress.trim() : undefined,
                      deliveryNote: isCourierMethod ? state.deliveryNote.trim() || undefined : undefined,
                      preferredTerminal: state.preferredTerminal.trim() || undefined,
                      recipientName: state.recipientName.trim(),
                      recipientPhone: state.recipientPhone.trim(),
                      region: state.region.trim(),
                      secondAddress: isCourierMethod ? state.secondAddress.trim() || undefined : undefined,
                      town: state.town.trim(),
                    },
                    method: state.method,
                    provider: isCourierMethod ? state.provider : undefined,
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
                    {shopGroups.map((group, groupIndex) => {
                      const state = shopDeliveryFor(group.shopId)
                      const errors = shopErrors(group.shopId)
                      const requiresDestination = state.method !== 'shop_pickup'
                      const isCourierMethod = COURIER_METHODS.includes(state.method)
                      const isRouteValidated = state.method === 'station_pickup' && (ROUTE_VALIDATED_COMPANIES as readonly string[]).includes(state.company)
                      const routeOptions = routeOptionsFor(shopOptions[group.shopId], state.company)
                      const selectedStopKey = state.region || state.town ? stopKey({ region: state.region, terminal: state.preferredTerminal, town: state.town }) : ''
                      const courierAvailability = shopOptions[group.shopId]?.courier
                      const shopLocation = shopOptions[group.shopId]?.location
                      const quote = state.region && state.town ? courierQuotesByKey[courierQuoteKey(group.shopId, state.region, state.town)] : undefined
                      const quoteError = state.region && state.town ? courierQuoteErrorByKey[courierQuoteKey(group.shopId, state.region, state.town)] : undefined
                      const courierOptions = !quote ? [] : state.method === 'intra_city_courier' ? quote.intraCity : quote.interCity ? [quote.interCity] : []
                      const selectedProvider = courierOptions.find((option) => option.providerId === state.provider)
                      const estimatedFee = estimatedDeliveryFeeForShop(group, state, shopOptions, courierQuotesByKey)
                      const itemsSubtotal = group.items.reduce((sum, item) => {
                        const agreed = bargainPrices[item.listingId]
                        const unitPrice = agreed === undefined ? item.price : Math.min(agreed, item.price)
                        return sum + unitPrice * item.quantity
                      }, 0)
                      return (
                        <div className="rounded-xl border border-foose-border bg-foose-surface-low/40 p-4 sm:p-5" key={group.shopId}>
                          <div className="mb-4 flex items-center justify-between gap-2.5 border-b border-foose-border pb-3">
                            <div className="flex min-w-0 items-center gap-2.5">
                              <span aria-hidden="true" className="grid size-9 shrink-0 place-items-center rounded-lg bg-accent-light text-accent"><Icon name="store" size={17} /></span>
                              <div className="min-w-0">
                                <h3 className="truncate font-display text-base font-semibold text-foose-text">
                                  {group.shopName}
                                  {shopLocation && <span className="font-normal text-foose-muted"> · {shopLocation.city}, {shopLocation.region}</span>}
                                </h3>
                                <p className="text-xs text-foose-muted">Seller {groupIndex + 1} of {shopGroups.length} · {group.items.length} {group.items.length === 1 ? 'item' : 'items'}</p>
                              </div>
                            </div>
                            <div className="shrink-0 text-right text-xs">
                              <p className="text-foose-muted">Items <span className="font-black text-foose-text">{formatMoney(itemsSubtotal)}</span></p>
                              <p className="text-foose-muted">Estimated delivery <span className="font-black text-foose-text">{estimatedFee === null ? '…' : formatMoney(estimatedFee)}</span></p>
                            </div>
                          </div>

                          <div className="mb-4 grid gap-3 rounded-lg bg-foose-surface p-3">
                            {group.items.map((item) => {
                              const agreed = bargainPrices[item.listingId]
                              const unitPrice = agreed === undefined ? item.price : Math.min(agreed, item.price)
                              return (
                                <div className="flex items-center gap-3" key={item.listingId}>
                                  <div className="size-12 shrink-0 overflow-hidden rounded-lg bg-foose-surface-mid [&_img]:size-full [&_img]:object-cover">
                                    {item.image && <img alt="" src={item.image} />}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-semibold text-foose-text">{item.title}</p>
                                    <p className="text-xs text-foose-muted">Qty {item.quantity} · {formatMoney(unitPrice * item.quantity, item.currency)}</p>
                                  </div>
                                  <button aria-label={`Remove ${item.title} from checkout`} className="inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-transparent bg-transparent text-foose-faint transition hover:bg-accent-light hover:text-accent" onClick={() => cart.removeItem(item.listingId)} type="button">
                                    <Icon name="trash" size={16} />
                                  </button>
                                </div>
                              )
                            })}
                          </div>

                          <FormField htmlFor={`method-${group.shopId}`} label="Fulfilment method" required>
                            <SelectControl
                              id={`method-${group.shopId}`}
                              onChange={(event) => {
                                const value = event.target.value as DeliveryMethod
                                updateShopDelivery(group.shopId, {
                                  company: value === 'station_pickup' ? state.company : '',
                                  method: value,
                                  preferredTerminal: '',
                                  provider: '',
                                  region: value === 'station_pickup'
                                    ? ''
                                    : value === 'intra_city_courier'
                                      ? shopLocation?.region || ''
                                      : state.region,
                                  town: '',
                                })
                              }}
                              value={state.method}
                            >
                              <option value="station_pickup">Station pickup</option>
                              <option value="shop_pickup">Shop pickup</option>
                              <option disabled={courierAvailability?.intraCityPossible === false} value="intra_city_courier">
                                Intra-city courier{courierAvailability?.intraCityPossible === false ? ' (not available)' : ''}
                              </option>
                              <option disabled={courierAvailability?.interCityPossible === false} value="inter_city_courier">
                                Inter-city courier{courierAvailability?.interCityPossible === false ? ' (not available)' : ''}
                              </option>
                            </SelectControl>
                          </FormField>

                          {validationAttempted && (errors.company || errors.recipientName || errors.recipientPhone || errors.region || errors.town || errors.deliveryAddress || errors.provider) && (
                            <ErrorSummary
                              className="mt-4"
                              errors={[
                                { fieldId: `company-${group.shopId}`, message: errors.company },
                                { fieldId: `recipient-name-${group.shopId}`, message: errors.recipientName },
                                { fieldId: `recipient-phone-${group.shopId}`, message: errors.recipientPhone },
                                { fieldId: `destination-${group.shopId}`, message: errors.region || errors.town },
                                { fieldId: `delivery-address-${group.shopId}`, message: errors.deliveryAddress },
                                { fieldId: `provider-${group.shopId}`, message: errors.provider },
                              ].filter((item) => item.message)}
                              focus
                            />
                          )}

                          {state.method === 'station_pickup' && (
                            <FormField className="mt-4" error={validationAttempted ? errors.company : undefined} htmlFor={`company-${group.shopId}`} label="Bus transit company" required>
                              <SelectControl
                                id={`company-${group.shopId}`}
                                onChange={(event) => {
                                  const value = event.target.value
                                  updateShopDelivery(group.shopId, (ROUTE_VALIDATED_COMPANIES as readonly string[]).includes(value)
                                    ? { company: value, preferredTerminal: '', region: '', town: '' }
                                    : { company: value })
                                }}
                                value={state.company}
                              >
                                <option value="">Choose a company</option>
                                {STATION_PICKUP_COMPANIES.map((name) => <option key={name} value={name}>{name}</option>)}
                              </SelectControl>
                            </FormField>
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

                          {isCourierMethod && (
                            <div className="mt-4 grid gap-4">
                              <div className="grid gap-4 sm:grid-cols-2">
                                {state.method === 'intra_city_courier' ? (
                                  <div className="grid gap-1.5 sm:gap-2">
                                    <span className="text-[13px] font-extrabold leading-5 text-foose-text sm:text-sm">Your region</span>
                                    <div className="flex min-h-11 items-center rounded-xl border border-foose-border bg-foose-surface-low px-3 text-sm font-semibold text-foose-text sm:min-h-12 sm:px-4">
                                      {state.region || 'Loading seller region…'}
                                    </div>
                                  </div>
                                ) : (
                                  <label className="grid gap-1.5 sm:gap-2" htmlFor={`destination-${group.shopId}`}>
                                    <span className="text-[13px] font-extrabold leading-5 text-foose-text sm:text-sm">Your region<span aria-hidden="true" className="ml-1 text-foose-danger">*</span></span>
                                    <SelectControl
                                      id={`destination-${group.shopId}`}
                                      menuZIndex={1500}
                                      onChange={(event) => updateShopDelivery(group.shopId, { provider: '', region: event.target.value, town: '' })}
                                      value={state.region}
                                    >
                                      <option value="">Choose a region</option>
                                      {GHANA_REGION_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                                    </SelectControl>
                                  </label>
                                )}
                                <label className="grid gap-1.5 sm:gap-2" htmlFor={`town-${group.shopId}`}>
                                  <span className="text-[13px] font-extrabold leading-5 text-foose-text sm:text-sm">Your town<span aria-hidden="true" className="ml-1 text-foose-danger">*</span></span>
                                  <SelectControl
                                    disabled={!state.region}
                                    id={`town-${group.shopId}`}
                                    menuZIndex={1500}
                                    onChange={(event) => updateShopDelivery(group.shopId, { provider: '', town: event.target.value })}
                                    value={state.town}
                                  >
                                    <option value="">Choose a town</option>
                                    {townOptionsForRegion(state.region).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                                  </SelectControl>
                                </label>
                              </div>

                              {state.region && state.town && quoteError && <InlineNotice tone="warning">{quoteError}</InlineNotice>}
                              {state.region && state.town && !quote && !quoteError && <p className="text-sm text-foose-muted">Checking delivery availability…</p>}
                              {state.region && state.town && quote && !courierOptions.length && (
                                <InlineNotice title="Not available for this route" tone="warning">
                                  {state.method === 'intra_city_courier'
                                    ? 'No intra-city courier serves this seller and destination combination. Try inter-city courier or station pickup instead.'
                                    : "ShaQ Express doesn't serve one of these regions yet. Try a different delivery method."}
                                </InlineNotice>
                              )}
                              {!!courierOptions.length && (
                                <FormField error={validationAttempted ? errors.provider : undefined} htmlFor={`provider-${group.shopId}`} label="Delivery provider" required>
                                  <SelectControl
                                    id={`provider-${group.shopId}`}
                                    onChange={(event) => updateShopDelivery(group.shopId, { provider: event.target.value })}
                                    value={state.provider}
                                  >
                                    <option value="">Choose a provider</option>
                                    {courierOptions.map((option) => (
                                      <option key={option.providerId} value={option.providerId}>{option.providerName}</option>
                                    ))}
                                  </SelectControl>
                                  {selectedProvider && (
                                    <InlineNotice className="mt-3" tone="info">~{selectedProvider.distanceKm}km · {selectedProvider.trackingNotice}</InlineNotice>
                                  )}
                                </FormField>
                              )}

                              <TextField error={validationAttempted ? errors.deliveryAddress : undefined} id={`delivery-address-${group.shopId}`} label="Delivery address" onChange={(event) => updateShopDelivery(group.shopId, { deliveryAddress: event.target.value })} placeholder="House number, street" required value={state.deliveryAddress} />
                              <TextField id={`second-address-${group.shopId}`} label="Second address / landmark (optional)" onChange={(event) => updateShopDelivery(group.shopId, { secondAddress: event.target.value })} placeholder="Nearest landmark" value={state.secondAddress} />
                              <TextField id={`delivery-note-${group.shopId}`} label="Delivery note (optional)" onChange={(event) => updateShopDelivery(group.shopId, { deliveryNote: event.target.value })} placeholder="Gate code, preferred time, etc." value={state.deliveryNote} />
                            </div>
                          )}

                          {requiresDestination && !isCourierMethod && (
                            <div className="mt-4 grid gap-5 sm:grid-cols-2">
                              <TextField error={validationAttempted ? errors.recipientName : undefined} id={`recipient-name-${group.shopId}`} label="Recipient full name" onChange={(event) => updateShopDelivery(group.shopId, { recipientName: event.target.value })} placeholder="Name on the parcel" required value={state.recipientName} />
                              <TextField error={validationAttempted ? errors.recipientPhone : undefined} id={`recipient-phone-${group.shopId}`} inputMode="tel" label="Recipient phone" onChange={(event) => updateShopDelivery(group.shopId, { recipientPhone: event.target.value })} placeholder="024 000 0000" required type="tel" value={state.recipientPhone} />
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </FormSection>
              )}

              {step === 1 && (
                <FormSection description="Choose how you would like to pay for this order." title="Payment">
                  <FormField htmlFor="paymentMethod" label="Payment method" required>
                    <SelectControl
                      id="paymentMethod"
                      onChange={(event) => setPaymentMethod(event.target.value as 'cash_on_pickup' | 'paystack')}
                      value={paymentMethod}
                    >
                      <option value="paystack">Pay online with Paystack</option>
                      {allShopPickup && <option value="cash_on_pickup">Cash on pickup</option>}
                    </SelectControl>
                  </FormField>
                  <InlineNotice tone="info">
                    {paymentMethod === 'paystack'
                      ? 'Pay in a secure Paystack window without leaving Foose. Paid funds are held in escrow.'
                      : 'Pay the seller when you collect the order. No escrow is held.'}
                  </InlineNotice>
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
                      const isCourierMethod = COURIER_METHODS.includes(state.method)
                      const quote = isCourierMethod && state.region && state.town
                        ? courierQuotesByKey[courierQuoteKey(group.shopId, state.region, state.town)]
                        : undefined
                      const providerName = (state.method === 'intra_city_courier' ? quote?.intraCity : quote?.interCity ? [quote.interCity] : [])
                        ?.find((option) => option.providerId === state.provider)?.providerName
                      return (
                        <dl className="grid gap-3 rounded-xl bg-foose-surface-low p-4 text-sm sm:grid-cols-2" key={group.shopId}>
                          <div className="sm:col-span-2"><dt className="font-semibold text-foose-muted">Seller</dt><dd className="mt-1 font-bold text-foose-text">{group.shopName}</dd></div>
                          <div><dt className="font-semibold text-foose-muted">Fulfilment</dt><dd className="mt-1 font-bold text-foose-text">{deliveryMethodLabel(state.method)}{state.method === 'station_pickup' && state.company ? ` · ${state.company}` : ''}{isCourierMethod && providerName ? ` · ${providerName}` : ''}</dd></div>
                          {isCourierMethod ? (
                            <div><dt className="font-semibold text-foose-muted">Delivery address</dt><dd className="mt-1 font-bold text-foose-text">{[state.deliveryAddress, state.secondAddress].filter(Boolean).join(', ')}</dd></div>
                          ) : (
                            <div><dt className="font-semibold text-foose-muted">{requiresDestination ? 'Recipient' : 'Collection'}</dt><dd className="mt-1 font-bold text-foose-text">{requiresDestination ? `${state.recipientName} · ${state.recipientPhone}` : "Seller's physical shop"}</dd></div>
                          )}
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
                bargainPrices={bargainPrices}
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
                disabled={submitting || stepTransitionLocked}
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
