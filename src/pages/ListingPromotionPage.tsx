import { useMemo, useState } from 'react'
import { IoMegaphone } from 'react-icons/io5'
import { AppShell, Badge, FloatingCreateButton, Icon, InlineNotice, SafeImage, SectionHeader, ShopManagementMobileNav, ShopManagementSidebar, SkeletonBlock, StatePanel } from '../components'
import { useAuth } from '../hooks/useAuth'
import { useApiResource } from '../hooks/useApiResource'
import { NavigationBackButton } from '../components/navigation'
import type { Listing } from '../types/api'
import { getErrorMessage } from '../utils/errorMessage'
import { formatMoney, getListingImage } from '../utils/format'
import { isActiveTopPick, listingPromotionPackages, startListingBundlePromotionCheckout, type PromotionPackageName } from '../utils/promotions'

function PromotionListingSelectionSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading listings available for promotion" role="status">
      <span className="sr-only">Loading listings available for promotion</span>
      <div aria-hidden="true" className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 6 }).map((_, index) => (
          <div className="rounded-xl border border-foose-border bg-foose-surface p-2" key={index}>
            <SkeletonBlock className="aspect-[4/5] w-full rounded-lg" />
            <SkeletonBlock className="mt-2 h-4 w-4/5" />
            <SkeletonBlock className="mt-2 h-4 w-2/5" />
          </div>
        ))}
      </div>
    </div>
  )
}

export function ListingPromotionPage() {
  const { user } = useAuth()
  const listings = useApiResource<{ listings: Listing[] }>('/listings/me', Boolean(user?.hasShop))
  const [packageName, setPackageName] = useState<PromotionPackageName>('basic')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [error, setError] = useState('')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const selectedPackage = listingPromotionPackages.find((item) => item.value === packageName) || listingPromotionPackages[0]
  const eligibleListings = useMemo(
    () => (listings.data?.listings || []).filter((listing) => !listing.status || listing.status === 'active'),
    [listings.data?.listings],
  )
  const limitReached = selectedIds.length >= selectedPackage.itemLimit
  const promotionCtaLabel = submitting
    ? 'Opening Paystack...'
    : selectedIds.length
      ? `Promote ${selectedIds.length} listing${selectedIds.length === 1 ? '' : 's'}`
      : 'Select listings to promote'

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
    <AppShell active="shop" searchPlaceholder="Search marketplace..." showFooter={false}>
      <ShopManagementSidebar activePanel="listings" collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed((value) => !value)} />
      <div className={`${sidebarCollapsed ? 'lg:pl-24' : 'lg:pl-72'} min-w-0 pb-16 lg:pb-0`}>
        <ShopManagementMobileNav activePanel="listings" />
        <section className="mx-auto w-full max-w-[1280px] space-y-5">

        <div className="rounded-2xl bg-accent-light/60 p-4 shadow-sm md:p-6">
          <NavigationBackButton className="mb-3" fallback={{ href: '/manage-shop/listings', label: 'Active listings' }} />
          <SectionHeader
            eyebrow="Bundle promotion"
            title="Promote listings to Top Picks"
          />
          <p className="max-w-3xl text-sm leading-6 text-foose-muted">
            Pick a bundle, select listings, then complete payment with Paystack. Each selected item appears in Top Picks for the package window.
          </p>
        </div>

        {error && <InlineNotice title="Promotion could not start" tone="error">{error}</InlineNotice>}
        <section className="grid gap-3 sm:grid-cols-3">
          {listingPromotionPackages.map((item) => {
            const active = packageName === item.value
            return (
              <button
                aria-pressed={active}
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
            action={eligibleListings.length ? (
              <button
                className="hidden min-h-11 items-center justify-center gap-2 rounded-lg border border-accent bg-accent px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-accent/15 transition hover:bg-accent-hover disabled:pointer-events-none disabled:opacity-50 lg:inline-flex"
                disabled={!selectedIds.length || submitting}
                onClick={() => void startCheckout()}
                type="button"
              >
                <IoMegaphone /> {promotionCtaLabel}
              </button>
            ) : undefined}
            eyebrow={`${selectedIds.length}/${selectedPackage.itemLimit} selected`}
            title="Choose listings"
          />

          {listings.initialLoading && !listings.data ? (
            <PromotionListingSelectionSkeleton />
          ) : listings.error && !listings.data ? (
            <StatePanel action={<button className="button button-secondary min-h-11 px-5" onClick={() => void listings.refetch()} type="button">Retry</button>} body={listings.error} layout="section" title="Listings unavailable" tone="error" />
          ) : listings.data && !eligibleListings.length ? (
            <StatePanel body="Add an active listing before starting a promotion bundle." layout="section" title="No listings can be promoted yet" tone="empty" />
          ) : eligibleListings.length ? (
            <>
              {listings.error && listings.data && <InlineNotice className="mb-4" tone="warning">Eligible listings could not refresh. Your current selection is still available.</InlineNotice>}
              {listings.refreshing && <InlineNotice className="mb-4" tone="info">Refreshing eligible listings...</InlineNotice>}
              {limitReached && (
                <InlineNotice className="mb-4" tone="info">Package limit reached. Unselect an item to choose another listing.</InlineNotice>
              )}
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
                {eligibleListings.map((listing) => {
                  const active = selectedIds.includes(listing._id)
                  const promoted = isActiveTopPick(listing.promotionTags, listing.promotionExpiresAt)
                  return (
                    <button
                      aria-pressed={active}
                      className={`group rounded-xl border bg-foose-surface p-2 text-left transition hover:border-accent ${active ? 'border-accent ring-2 ring-accent/20' : 'border-transparent'} ${!active && limitReached ? 'opacity-60' : ''}`}
                      disabled={!active && limitReached}
                      key={listing._id}
                      onClick={() => toggleListing(listing._id)}
                      type="button"
                    >
                      <span className="relative block aspect-[4/5] overflow-hidden rounded-lg bg-foose-surface-low">
                        <SafeImage alt="" className="h-full w-full object-cover" fallback="No image" fallbackClassName="text-xs font-bold" src={getListingImage(listing)} />
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
          ) : null}

          {!!eligibleListings.length && (
            <>
              <div aria-hidden="true" className="h-20 lg:hidden" />
              <div className="fixed inset-x-0 bottom-[var(--foose-bottom-nav-inset)] z-40 border-t border-foose-border bg-white/95 px-3 py-3 shadow-[0_-8px_24px_rgba(15,16,32,0.08)] backdrop-blur lg:hidden">
                <button
                  className="mx-auto inline-flex min-h-11 w-full max-w-xl items-center justify-center gap-2 rounded-xl border border-accent bg-accent px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-accent/15 transition hover:bg-accent-hover disabled:pointer-events-none disabled:opacity-50"
                  disabled={!selectedIds.length || submitting}
                  onClick={() => void startCheckout()}
                  type="button"
                >
                  <IoMegaphone /> {promotionCtaLabel}
                </button>
              </div>
            </>
          )}
        </section>
      </section>
      </div>
      <FloatingCreateButton className={eligibleListings.length ? '!bottom-[var(--foose-fab-with-actions-inset)] lg:!bottom-6' : ''} href="/listings/new" label="Add listing" />
    </AppShell>
  )
}
