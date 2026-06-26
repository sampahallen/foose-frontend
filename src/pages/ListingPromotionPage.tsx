import { useMemo, useState } from 'react'
import { IoMegaphone } from 'react-icons/io5'
import { AppShell, Badge, ButtonLink, EmptyState, ErrorState, Icon, LoadingState, SectionHeader } from '../components'
import { useAuth } from '../hooks/useAuth'
import { useApiResource } from '../hooks/useApiResource'
import type { Listing } from '../types/api'
import { getErrorMessage } from '../utils/errorMessage'
import { formatMoney, getListingImage } from '../utils/format'
import { withBasePath } from '../utils/navigation'
import { isActiveTopPick, listingPromotionPackages, startListingBundlePromotionCheckout, type PromotionPackageName } from '../utils/promotions'

export function ListingPromotionPage() {
  const { user } = useAuth()
  const listings = useApiResource<{ listings: Listing[] }>('/listings/me', Boolean(user?.hasShop))
  const [packageName, setPackageName] = useState<PromotionPackageName>('basic')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const selectedPackage = listingPromotionPackages.find((item) => item.value === packageName) || listingPromotionPackages[0]
  const eligibleListings = useMemo(
    () => (listings.data?.listings || []).filter((listing) => listing.status !== 'sold' && listing.status !== 'removed'),
    [listings.data?.listings],
  )
  const limitReached = selectedIds.length >= selectedPackage.itemLimit

  function choosePackage(value: PromotionPackageName) {
    const nextPackage = listingPromotionPackages.find((item) => item.value === value) || listingPromotionPackages[0]
    setPackageName(value)
    setSelectedIds((current) => current.slice(0, nextPackage.itemLimit))
  }

  function toggleListing(id: string) {
    setSelectedIds((current) => {
      if (current.includes(id)) return current.filter((item) => item !== id)
      if (current.length >= selectedPackage.itemLimit) return current
      return [...current, id]
    })
  }

  async function startCheckout() {
    if (!selectedIds.length) {
      setError('Choose at least one listing to promote.')
      return
    }

    setError('')
    setSubmitting(true)
    try {
      await startListingBundlePromotionCheckout(selectedIds, packageName)
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Unable to start promotion checkout'))
      setSubmitting(false)
    }
  }

  return (
    <AppShell active="profile" searchPlaceholder="Search marketplace..." showFooter={false}>
      <section className="mx-auto w-full max-w-[1280px] space-y-5">
        <a className="inline-flex items-center gap-2 text-sm font-bold text-foose-muted transition hover:text-accent" href={withBasePath('/manage-shop/listings')}>
          <Icon name="arrow" /> Back to shop listings
        </a>

        <div className="rounded-2xl bg-accent-light/60 p-4 shadow-sm md:p-6">
          <SectionHeader
            action={
              <ButtonLink to="/manage-shop/listings" variant="secondary">
                Shop listings
              </ButtonLink>
            }
            eyebrow="Bundle promotion"
            title="Promote listings to Top Picks"
          />
          <p className="max-w-3xl text-sm leading-6 text-foose-muted">
            Pick a bundle, select listings, then complete payment with Paystack. Each selected item appears in Top Picks for the package window.
          </p>
        </div>

        {error && <ErrorState message={error} />}
        {listings.loading && <LoadingState label="Loading your listings..." />}
        {listings.error && <ErrorState message={listings.error} retry={listings.refetch} />}

        <section className="grid gap-3 lg:grid-cols-3">
          {listingPromotionPackages.map((item) => {
            const active = packageName === item.value
            return (
              <button
                className={`rounded-2xl border p-4 text-left shadow-sm transition hover:border-accent hover:shadow-md ${active ? 'border-accent bg-accent text-white' : 'border-foose-border bg-foose-surface text-foose-text'}`}
                key={item.value}
                onClick={() => choosePackage(item.value)}
                type="button"
              >
                <span className={`mb-3 inline-flex size-10 items-center justify-center rounded-full ${active ? 'bg-white text-accent' : 'bg-accent-light text-accent'}`}>
                  <IoMegaphone />
                </span>
                <h2 className="text-xl font-black capitalize">{item.value}</h2>
                <p className={`mt-1 text-sm ${active ? 'text-white/85' : 'text-foose-muted'}`}>
                  {formatMoney(item.priceGhs * 100)} for {item.days} days
                </p>
                <strong className="mt-4 block text-sm">{item.itemLimit} listings included</strong>
              </button>
            )
          })}
        </section>

        <section className="rounded-2xl bg-foose-surface p-4 shadow-sm md:p-5">
          <SectionHeader
            action={
              <button
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-accent bg-accent px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-accent/15 transition hover:bg-accent-hover disabled:pointer-events-none disabled:opacity-50"
                disabled={!selectedIds.length || submitting}
                onClick={() => void startCheckout()}
                type="button"
              >
                <IoMegaphone /> {submitting ? 'Opening Paystack...' : `Promote ${selectedIds.length || ''} selected`}
              </button>
            }
            eyebrow={`${selectedIds.length}/${selectedPackage.itemLimit} selected`}
            title="Choose listings"
          />

          {!eligibleListings.length && !listings.loading && <EmptyState body="Add active listings before starting a promotion bundle." title="No eligible listings" />}
          {!!eligibleListings.length && (
            <>
              {limitReached && (
                <p className="mb-4 rounded-xl bg-accent-light px-4 py-3 text-sm font-semibold text-accent">
                  Package limit reached. Unselect an item to choose another listing.
                </p>
              )}
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
                {eligibleListings.map((listing) => {
                  const active = selectedIds.includes(listing._id)
                  const promoted = isActiveTopPick(listing.promotionTags, listing.promotionExpiresAt)
                  return (
                    <button
                      className={`group rounded-xl border bg-foose-surface p-2 text-left transition hover:border-accent ${active ? 'border-accent ring-2 ring-accent/20' : 'border-transparent'} ${!active && limitReached ? 'opacity-60' : ''}`}
                      disabled={!active && limitReached}
                      key={listing._id}
                      onClick={() => toggleListing(listing._id)}
                      type="button"
                    >
                      <span className="relative block aspect-[4/5] overflow-hidden rounded-lg bg-foose-surface-low">
                        {getListingImage(listing) ? <img alt="" className="h-full w-full object-cover" src={getListingImage(listing)} /> : <span className="flex h-full items-center justify-center text-xs font-bold text-foose-faint">No image</span>}
                        <span className={`absolute right-2 top-2 inline-flex size-7 items-center justify-center rounded-full border text-xs font-black ${active ? 'border-accent bg-accent text-white' : 'border-white bg-white/90 text-foose-muted'}`}>
                          {active ? <Icon name="check" size={16} /> : ''}
                        </span>
                        {promoted && <span className="absolute left-2 top-2"><Badge tone="success">Active</Badge></span>}
                      </span>
                      <strong className="mt-2 line-clamp-2 block text-sm text-foose-text">{listing.title}</strong>
                      <span className="mt-1 block text-sm font-black text-accent">{formatMoney(listing.price, listing.currency)}</span>
                    </button>
                  )
                })}
              </div>
            </>
          )}
        </section>
      </section>
    </AppShell>
  )
}
