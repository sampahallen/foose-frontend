import { IoMegaphone } from 'react-icons/io5'
import { AppShell, ButtonLink, EmptyState, ErrorState, LoadingState } from '../components'
import { useApiResource } from '../hooks/useApiResource'
import type { Event, Listing } from '../types/api'
import { formatDate, formatMoney } from '../utils/format'

type PromotionVerifyResponse = {
  event?: Event
  listing?: Listing
  promotion?: {
    amountGhs?: number
    endsAt?: string
    reference?: string
  }
  targetType?: 'event' | 'listing'
}

function paymentReference() {
  const params = new URLSearchParams(window.location.search)
  return params.get('reference') || params.get('trxref') || ''
}

export function PromotionReturnPage() {
  const reference = paymentReference()
  const promotion = useApiResource<PromotionVerifyResponse>(
    reference ? `/payments/promotions/verify/${encodeURIComponent(reference)}` : null,
    Boolean(reference),
  )
  const listing = promotion.data?.listing
  const event = promotion.data?.event
  const title = listing?.title || event?.title || 'Promotion confirmed'
  const targetType = promotion.data?.targetType

  return (
    <AppShell active={targetType === 'event' ? 'community' : 'profile'}>
      {!reference && (
        <EmptyState
          action={<ButtonLink to="/manage-shop">Back to shop</ButtonLink>}
          body="Open this page from Paystack with a valid promotion reference."
          title="No promotion selected"
        />
      )}
      {promotion.loading && <LoadingState label="Verifying promotion payment..." />}
      {promotion.error && <ErrorState message={promotion.error} retry={promotion.refetch} />}
      {promotion.data && (
        <section className="mx-auto flex max-w-2xl flex-col items-center gap-5 rounded-2xl border border-foose-border bg-foose-surface p-6 text-center shadow-sm md:p-8">
          <span className="inline-flex size-16 items-center justify-center rounded-full bg-accent text-white">
            <IoMegaphone size={34} />
          </span>
          <div>
            <h1 className="text-3xl font-bold text-foose-text md:text-4xl">Promotion is live</h1>
            <p className="mt-2 text-sm leading-6 text-foose-muted">
              {targetType === 'listing'
                ? 'Your listing is now in Top Picks for the paid promotion window.'
                : 'Your event is now eligible for Featured Events until it ends.'}
            </p>
          </div>
          <div className="w-full rounded-xl border border-foose-border bg-foose-surface-low p-4 text-left">
            <span className="text-xs font-bold uppercase tracking-widest text-foose-faint">{targetType === 'event' ? 'Event' : 'Listing'}</span>
            <strong className="mt-1 block text-xl text-foose-text">{title}</strong>
            <p className="mt-2 text-sm text-foose-muted">
              Charged {formatMoney((promotion.data.promotion?.amountGhs || 0) * 100)}.
              {promotion.data.promotion?.endsAt ? ` Promotion ends ${formatDate(promotion.data.promotion.endsAt)}.` : ''}
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {targetType === 'listing' && (
              <>
                <ButtonLink to="/top-picks">Explore Top Picks</ButtonLink>
                <ButtonLink to="/manage-shop" variant="secondary">
                  Back to shop
                </ButtonLink>
              </>
            )}
            {targetType === 'event' && event && (
              <>
                <ButtonLink to={`/community/events/${event._id}`}>View event</ButtonLink>
                <ButtonLink to={`/community/events/${event._id}/manage`} variant="secondary">
                  Manage event
                </ButtonLink>
              </>
            )}
          </div>
        </section>
      )}
    </AppShell>
  )
}
