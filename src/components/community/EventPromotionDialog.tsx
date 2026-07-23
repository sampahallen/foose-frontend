import { useState } from 'react'
import { IoMegaphone } from 'react-icons/io5'
import type { Event } from '../../types/api'
import { getErrorMessage } from '../../utils/errorMessage'
import { formatDate, formatMoney } from '../../utils/format'
import { startEventPromotionCheckout } from '../../utils/promotions'
import { Dialog } from '../forms/Dialog'
import { SafeImage } from '../ui/SafeImage'

function eventPromotionExpiry(event: Event) {
  const sevenDays = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  const eventEnd = new Date(event.endsAt || event.date)
  return eventEnd < sevenDays ? eventEnd : sevenDays
}

export function EventPromotionDialog({ event, onClose }: { event: Event | null; onClose: () => void }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const expiry = event ? eventPromotionExpiry(event) : null

  async function pay() {
    if (!event) return
    setBusy(true)
    setError('')
    try {
      const result = await startEventPromotionCheckout(event._id)
      if (result.status === 'cancelled') setError('Payment was cancelled. You were not charged.')
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Could not start event promotion'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog
      description="Put this event in the Featured events banner beneath the marketplace hero."
      dismissible={!busy}
      footer={(
        <>
          <button className="rounded-xl border border-foose-border bg-white px-5 py-2.5 text-sm font-bold" disabled={busy} onClick={onClose} type="button">Not now</button>
          <button className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-sm font-black text-white disabled:opacity-60" disabled={busy} onClick={() => void pay()} type="button">
            <IoMegaphone /> {busy ? 'Opening Paystack…' : `Pay ${formatMoney(3000)}`}
          </button>
        </>
      )}
      onClose={onClose}
      open={Boolean(event)}
      title="Feature this event"
    >
      {event && (
        <div className="space-y-4">
          <div className="overflow-hidden rounded-2xl border border-foose-border bg-foose-surface-low">
            <SafeImage alt="" className="aspect-[16/7] w-full object-cover" fallback="Event banner" src={event.coverImage} />
            <div className="p-4"><strong className="text-lg text-foose-text">{event.title}</strong></div>
          </div>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl bg-foose-surface-low p-3"><dt className="text-foose-muted">Duration</dt><dd className="mt-1 font-black">Up to 7 days</dd></div>
            <div className="rounded-xl bg-foose-surface-low p-3"><dt className="text-foose-muted">Ends</dt><dd className="mt-1 font-black">{expiry ? formatDate(expiry.toISOString()) : '—'}</dd></div>
          </dl>
          <p className="text-sm leading-6 text-foose-muted">Pay securely with Mobile Money, card, or another available Paystack method. If the event ends sooner, the promotion ends with it.</p>
          {error && <p className="rounded-xl bg-foose-danger-bg p-3 text-sm font-semibold text-foose-danger">{error}</p>}
        </div>
      )}
    </Dialog>
  )
}
