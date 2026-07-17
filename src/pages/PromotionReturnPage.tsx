import { IoMegaphone } from 'react-icons/io5'
import { AppShell, ButtonLink, StatePanel, SuccessState } from '../components'
import { OrderDetailSkeleton } from '../components/operational/OperationalStates'
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
        <StatePanel
          action={<ButtonLink to="/manage-shop">Back to shop</ButtonLink>}
          body="Open this page from Paystack with a valid promotion reference."
          layout="page"
          title="Promotion link unavailable"
          tone="unavailable"
        />
      )}
      {promotion.initialLoading && <OrderDetailSkeleton label="Verifying promotion payment" />}
      {promotion.error && !promotion.data && <StatePanel action={<button className="button button-secondary min-h-11 px-5" onClick={() => void promotion.refetch()} type="button">Retry</button>} body={promotion.error} layout="page" title="Promotion verification failed" tone="error" />}
      {promotion.data && (
        <section className="mx-auto flex max-w-2xl flex-col items-center gap-5 rounded-2xl border border-foose-border bg-foose-surface p-6 text-center shadow-sm md:p-8">
          <SuccessState
            layout="compact"
            message={targetType === 'listing' ? 'Your listing is now in Top Picks for the paid promotion window.' : 'Your event is now eligible for Featured Events until it ends.'}
            title="Promotion is live"
            visual={<span className="inline-flex size-16 items-center justify-center rounded-full bg-accent text-white"><IoMegaphone size={34} /></span>}
          />
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
