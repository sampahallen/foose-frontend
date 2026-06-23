import { useCallback } from 'react'
import { MdVerified } from 'react-icons/md'
import { AppShell, Badge, EmptyState, ErrorState, LoadingState, SectionHeader } from '../components'
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
          {shop.bannerUrl ? <img alt="" src={shop.bannerUrl} /> : <span className="flex h-full items-center justify-center text-xs font-black text-foose-faint">DigiShop</span>}
        </div>
        <div className="p-4">
          <div className="-mt-11 mb-3">
            {shop.logoUrl ? (
              <img alt="" className="size-16 rounded-full border-4 border-white object-cover" src={shop.logoUrl} />
            ) : (
              <span className="inline-flex size-16 items-center justify-center rounded-full border-4 border-white bg-accent-light text-base font-black text-accent">{initials(shop.shopName)}</span>
            )}
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
      {shops.loading && <LoadingState label="Loading DigiShops..." />}
      {shops.error && <ErrorState message={shops.error} retry={shops.refetch} />}
      {!shops.loading && !shops.error && !shops.items.length && (
        <EmptyState body="DigiShops will appear here after sellers open their shops." title="No DigiShops yet" />
      )}
      {!!shops.items.length && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {shops.items.map((shop) => (
            <ShopCard key={shop._id} shop={shop} />
          ))}
        </div>
      )}
      <div ref={shops.sentinelRef} className="flex min-h-14 items-center justify-center py-4">
        {shops.loadingMore && <span className="size-6 animate-spin rounded-full border-2 border-foose-border border-t-accent" aria-label="Loading more DigiShops" />}
      </div>
    </AppShell>
  )
}
