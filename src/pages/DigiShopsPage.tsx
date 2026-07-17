/* eslint-disable react-hooks/refs -- the infinite-resource hook exposes reactive state through a stable facade */
import { useCallback } from 'react'
import { MdVerified } from 'react-icons/md'
import { AppShell, Badge, InlineNotice, RefreshIndicator, SafeImage, SectionHeader, StatePanel } from '../components'
import { AppendFeedback, ShopGridSkeleton } from '../components/feedback/DiscoverySkeletons'
import { DiscoveryImage } from '../components/feedback/DiscoveryMedia'
import { useInfiniteApiResource } from '../hooks/useInfiniteApiResource'
import type { PaginatedShops, Shop } from '../types/api'
import { initials } from '../utils/format'
import { withBasePath } from '../utils/navigation'

function digishopsPath(page: number) {
  return `/digishops?page=${page}&limit=18`
}

function ShopCard({ shop }: { shop: Shop }) {
  return (
    <article className="overflow-hidden rounded-2xl border border-foose-border bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-accent">
      <a className="block" href={withBasePath(`/shops/${shop.slug}`)}>
        <div className="h-28 bg-foose-surface-mid [&_img]:h-full [&_img]:w-full [&_img]:object-cover">
          <DiscoveryImage fallback="DigiShop" fallbackClassName="h-full w-full" src={shop.bannerUrl} />
        </div>
        <div className="p-4">
          <div className="-mt-11 mb-3">
            <SafeImage
              alt=""
              className="size-16 rounded-full border-4 border-white object-cover"
              fallback={initials(shop.shopName)}
              fallbackClassName="bg-accent-light text-base font-black text-accent"
              src={shop.logoUrl}
            />
          </div>
          <div className="flex min-w-0 items-center gap-1.5">
            <h2 className="truncate text-base font-black text-foose-text">{shop.shopName}</h2>
            <MdVerified className="shrink-0 text-accent" aria-label="Verified shop" />
          </div>
          <p className="mt-2 line-clamp-2 min-h-10 text-sm leading-5 text-foose-muted">{shop.bio || 'Curated finds from a Foose DigiShop.'}</p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {shop.category && <Badge tone="accent">{shop.category}</Badge>}
            <span className="rounded-full bg-foose-surface-low px-3 py-1 text-xs font-bold text-foose-muted">
              {shop.rating || 0} / 5
            </span>
            <span className="text-xs font-bold text-foose-faint">{shop.totalReviews || 0} reviews</span>
          </div>
        </div>
      </a>
    </article>
  )
}

export function DigiShopsPage() {
  const buildPath = useCallback((page: number) => digishopsPath(page), [])
  const extractShops = useCallback((data: PaginatedShops) => data.shops || [], [])
  const shops = useInfiniteApiResource(buildPath, extractShops, [])

  return (
    <AppShell active="browse" searchPlaceholder="Search DigiShops...">
      <section className="mb-8 rounded-2xl bg-foose-surface p-5 md:p-8">
        <h1 className="text-3xl font-black text-foose-text md:text-5xl">DigiShops</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-foose-muted md:text-base">
          Browse verified Foose shops, from retail closets to wholesale bale suppliers.
        </p>
      </section>
      <SectionHeader title="All shops" eyebrow={`${shops.total} live DigiShops`} />
      <RefreshIndicator active={shops.refreshing} className="mb-4" label="Refreshing DigiShops" />
      {shops.loading && !shops.items.length && <ShopGridSkeleton />}
      {shops.error && !shops.items.length && <StatePanel action={<button className="button button-secondary" onClick={shops.refetch} type="button">Try again</button>} body={shops.error} layout="section" title="DigiShops could not load" tone="error" />}
      {shops.error && !!shops.items.length && <InlineNotice action={<button className="font-black text-accent" onClick={shops.refetch} type="button">Retry</button>} tone="warning">Could not refresh DigiShops. The shops already loaded are still available.</InlineNotice>}
      {!shops.loading && !shops.error && !shops.items.length && (
        <StatePanel action={<a className="button button-secondary" href={withBasePath('/open-shop')}>Open a DigiShop</a>} body="Verified seller shops will appear here as members open them." layout="section" title="No DigiShops yet" tone="empty" />
      )}
      {!!shops.items.length && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {shops.items.map((shop) => (
            <ShopCard key={shop._id} shop={shop} />
          ))}
        </div>
      )}
      <div ref={shops.sentinelRef} className="min-h-14 py-2">
        <AppendFeedback error={shops.loadMoreError} label="Loading more DigiShops" loading={shops.loadingMore} retry={shops.retryLoadMore} />
      </div>
    </AppShell>
  )
}
