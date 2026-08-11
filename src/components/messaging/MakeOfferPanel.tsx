import { useState } from 'react'
import { useApiResource } from '../../hooks/useApiResource'
import { useCart } from '../../hooks/useCart'
import { apiPost } from '../../lib/api'
import type { Bargain, BargainResponse, Listing } from '../../types/api'
import { getErrorMessage } from '../../utils/errorMessage'
import { formatMoney } from '../../utils/format'
import { InlineNotice } from '../feedback/InlineNotice'
import { OfferAmountField } from './OfferAmountField'

function statusLine(bargain: Bargain, currency: string) {
  switch (bargain.status) {
    case 'accepted':
      return {
        body: 'This price is yours until you check out. Other buyers can still buy at the listed price.',
        title: `Your price: ${formatMoney(bargain.agreedPrice || 0, currency)}`,
        tone: 'success' as const,
      }
    case 'awaiting_seller':
      return {
        body: 'It is in your cart while you wait. If the seller accepts, checkout uses the agreed price.',
        title: 'Offer sent',
        tone: 'info' as const,
      }
    case 'awaiting_buyer':
      return {
        body: 'The seller countered your offer. Open the conversation to accept, counter, or drop it.',
        title: 'Counter-offer waiting',
        tone: 'warning' as const,
      }
    default:
      return null
  }
}

/**
 * Buyer-side entry point for a negotiation, shown on listing detail. Only the
 * caller's own bargain is ever loaded here, so one buyer can never see the
 * price another buyer agreed.
 */
export function MakeOfferPanel({
  inboxHref,
  listing,
}: {
  inboxHref: string
  listing: Listing
}) {
  const cart = useCart()
  const enabled = Boolean(listing.bargainingAllowed) && listing.status === 'active'
  const resource = useApiResource<{ bargain: Bargain | null }>(
    enabled ? `/bargains/listing/${encodeURIComponent(listing._id)}/mine` : null,
    enabled,
  )
  const [composerOpen, setComposerOpen] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [warning, setWarning] = useState('')
  const [sent, setSent] = useState<Bargain | null>(null)

  if (!enabled) return null

  const bargain = sent || resource.data?.bargain || null
  const currency = listing.currency || 'GHS'
  const status = bargain ? statusLine(bargain, currency) : null

  async function sendOffer(amount: number) {
    setSending(true)
    setError('')
    setWarning('')
    try {
      const result = await apiPost<BargainResponse>('/bargains', { amount, listingId: listing._id })
      setSent(result.bargain)
      setComposerOpen(false)
      // Sending an offer is a buying intent, so the item goes straight into the
      // cart at the listed price. If the seller accepts, checkout picks up the
      // agreed price automatically.
      if (!cart.items.some((item) => item.listingId === listing._id)) cart.addListing(listing)
      if (result.belowSellerMinimum) {
        setWarning('That is below what this seller usually accepts, so they may turn it down. You can send a higher offer if they do.')
      }
    } catch (sendError) {
      setError(getErrorMessage(sendError))
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="mt-3 grid gap-2">
      {status ? (
        <InlineNotice
          action={<a className="text-sm font-bold text-accent" href={inboxHref}>Open conversation</a>}
          title={status.title}
          tone={status.tone}
        >
          {status.body}
        </InlineNotice>
      ) : composerOpen ? (
        <div className="rounded-xl border border-foose-border bg-foose-surface-low p-3">
          <p className="mb-2 text-xs font-semibold text-foose-muted">
            Listed at {formatMoney(listing.price, currency)}. Offer what you think it is worth — the seller can accept,
            counter, or decline. Sending an offer also adds this item to your cart.
          </p>
          <OfferAmountField
            busy={sending}
            currency={currency}
            listPrice={listing.price}
            onCancel={() => setComposerOpen(false)}
            onSubmit={(amount) => void sendOffer(amount)}
          />
        </div>
      ) : (
        <button
          className="inline-flex h-11 items-center justify-center rounded-md border border-accent bg-foose-surface px-4 text-sm font-black text-accent transition hover:bg-accent-light"
          onClick={() => setComposerOpen(true)}
          type="button"
        >
          Make an offer
        </button>
      )}
      {warning && <InlineNotice title="Heads up" tone="warning">{warning}</InlineNotice>}
      {error && <InlineNotice title="Offer not sent" tone="error">{error}</InlineNotice>}
    </div>
  )
}
