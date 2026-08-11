import { useState } from 'react'
import type { Bargain, BargainAction, ChatMessage, Listing } from '../../types/api'
import { formatMoney, getListingImage } from '../../utils/format'
import { OfferAmountField } from './OfferAmountField'

type OfferActionHandler = (bargainId: string, action: BargainAction, amount?: number) => void

const STATUS_LABELS: Record<Bargain['status'], string> = {
  accepted: 'Accepted',
  awaiting_buyer: 'Waiting on buyer',
  awaiting_seller: 'Waiting on seller',
  cancelled: 'Withdrawn',
  closed: 'Closed',
  consumed: 'Used at checkout',
  declined: 'Declined',
}

const STATUS_TONES: Record<Bargain['status'], string> = {
  accepted: 'bg-foose-success-bg text-foose-success',
  awaiting_buyer: 'bg-foose-surface-high text-foose-muted',
  awaiting_seller: 'bg-foose-surface-high text-foose-muted',
  cancelled: 'bg-foose-surface-high text-foose-muted',
  closed: 'bg-foose-surface-high text-foose-muted',
  consumed: 'bg-foose-success-bg text-foose-success',
  declined: 'bg-foose-danger-bg text-foose-danger',
}

function listingOf(value: Listing | string | undefined) {
  return value && typeof value === 'object' ? value : undefined
}

function actionSummary(message: ChatMessage, mine: boolean) {
  const who = mine ? 'You' : 'They'
  switch (message.offer?.action) {
    case 'open':
      return `${who} offered`
    case 'counter':
      return `${who} countered`
    case 'accept':
      return `${who} accepted`
    case 'decline':
      return `${who} declined`
    case 'cancel':
      return `${who} withdrew`
    default:
      return 'Bargain closed'
  }
}

/**
 * One round of a negotiation, rendered inline in the conversation. The amount
 * shown is the snapshot stored on the message, so old rounds keep reading
 * correctly; only the newest card is interactive, and only for the side the
 * server says may act.
 */
export function OfferCard({
  bargain,
  busy = false,
  currentUserId = '',
  incoming = false,
  isLatest = false,
  message,
  onAction,
  subtitle,
}: {
  bargain?: Bargain
  busy?: boolean
  currentUserId?: string
  incoming?: boolean
  isLatest?: boolean
  message: ChatMessage
  onAction?: OfferActionHandler
  subtitle?: string
}) {
  const [counterOpen, setCounterOpen] = useState(false)
  const offer = message.offer
  const listing = listingOf(message.listingId) || listingOf(bargain?.listingId)
  const currency = bargain?.currency || listing?.currency || 'GHS'
  const listPrice = bargain?.listPriceAtOpen ?? listing?.price
  const bargainId = typeof message.bargainId === 'string' ? message.bargainId : message.bargainId?._id

  if (offer?.actor === 'system') {
    return (
      <div className="my-1 flex justify-center">
        <p className="rounded-full bg-foose-surface-high px-4 py-1.5 text-center text-xs font-bold text-foose-muted">
          {message.content}
        </p>
      </div>
    )
  }

  const mine = Boolean(currentUserId) && !incoming
  const allowed = (isLatest && bargainId && onAction ? bargain?.allowedActions : []) || []
  const canAct = allowed.length > 0
  const settled = bargain ? bargain.status !== 'awaiting_buyer' && bargain.status !== 'awaiting_seller' : false

  function act(action: BargainAction, amount?: number) {
    if (!bargainId || !onAction) return
    setCounterOpen(false)
    onAction(bargainId, action, amount)
  }

  return (
    <div className={`flex w-full ${incoming ? 'justify-start' : 'justify-end'}`}>
      <article
        className={`flex w-full max-w-[41%] flex-col gap-1.5 rounded-xl border-2 border-accent/25 bg-foose-surface p-2 shadow-sm max-md:max-w-[46%] ${incoming ? 'rounded-bl-sm' : 'rounded-br-sm'}`}
        id={`chat-message-${message._id}`}
      >
        <header className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-black uppercase tracking-wide text-accent">Offer</span>
          {bargain && (
            <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${STATUS_TONES[bargain.status]}`}>
              {STATUS_LABELS[bargain.status]}
            </span>
          )}
        </header>

        {listing && (
          <div className="grid grid-cols-[24px_minmax(0,1fr)] items-center gap-1.5 rounded-md bg-foose-surface-low p-1">
            {getListingImage(listing) ? (
              <img alt="" className="size-6 rounded object-cover" src={getListingImage(listing)} />
            ) : (
              <span className="size-6 rounded bg-foose-surface-mid" />
            )}
            <strong className="min-w-0 truncate text-[11px] font-black text-foose-text">{listing.title}</strong>
          </div>
        )}

        <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
          {offer?.amount !== undefined ? (
            <p className="flex flex-wrap items-baseline gap-1.5">
              <span className="text-[11px] font-semibold text-foose-muted">{actionSummary(message, mine)}</span>
              {listPrice !== undefined && listPrice !== offer.amount && (
                <span className="text-[11px] font-semibold text-foose-muted line-through">{formatMoney(listPrice, currency)}</span>
              )}
              <span className="text-base font-black text-foose-text">{formatMoney(offer.amount, currency)}</span>
            </p>
          ) : (
            <p className="text-xs font-semibold text-foose-text">{message.content}</p>
          )}
          {subtitle && <time className="shrink-0 text-[10px] font-semibold text-foose-faint">{subtitle}</time>}
        </div>

        {bargain?.status === 'accepted' && (
          <p className="rounded-lg bg-foose-success-bg px-2 py-1.5 text-[11px] font-semibold text-foose-success">
            {bargain.viewerRole === 'seller'
              ? 'This price is locked for this buyer until they check out.'
              : 'This price is yours until you check out. Others can still buy at the listed price.'}
          </p>
        )}
        {bargain?.isFinalRound && !settled && (
          <p className="rounded-lg bg-foose-surface-high px-2 py-1.5 text-[11px] font-semibold text-foose-muted">
            Final round — this offer can be accepted or declined, but not countered again.
          </p>
        )}

        {canAct && !counterOpen && (
          <div className="flex flex-wrap gap-1.5">
            {allowed.includes('accept') && (
              <button
                className="min-h-8 rounded-full bg-accent px-3 text-[11px] font-black text-white transition hover:bg-accent-strong disabled:opacity-50"
                disabled={busy}
                onClick={() => act('accept')}
                type="button"
              >
                Accept {offer?.amount !== undefined ? formatMoney(offer.amount, currency) : ''}
              </button>
            )}
            {allowed.includes('counter') && (
              <button
                className="min-h-8 rounded-full border border-foose-border px-3 text-[11px] font-black text-foose-text transition hover:bg-foose-surface-high disabled:opacity-50"
                disabled={busy}
                onClick={() => setCounterOpen(true)}
                type="button"
              >
                Counter
              </button>
            )}
            {allowed.includes('decline') && (
              <button
                className="min-h-8 rounded-full border border-foose-border px-3 text-[11px] font-black text-foose-danger transition hover:bg-foose-danger-bg/40 disabled:opacity-50"
                disabled={busy}
                onClick={() => act('decline')}
                type="button"
              >
                Decline
              </button>
            )}
            {allowed.includes('cancel') && !allowed.includes('decline') && (
              <button
                className="min-h-8 rounded-full border border-foose-border px-3 text-[11px] font-black text-foose-danger transition hover:bg-foose-danger-bg/40 disabled:opacity-50"
                disabled={busy}
                onClick={() => act('cancel')}
                type="button"
              >
                Drop bargain
              </button>
            )}
          </div>
        )}

        {counterOpen && (
          <OfferAmountField
            busy={busy}
            currency={currency}
            listPrice={listPrice}
            onCancel={() => setCounterOpen(false)}
            onSubmit={(amount) => act('counter', amount)}
            submitLabel="Send counter"
          />
        )}
      </article>
    </div>
  )
}
