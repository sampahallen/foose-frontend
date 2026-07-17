import { InlineNotice } from './InlineNotice'
import { LoadingRegion } from './LoadingRegion'
import { SkeletonBlock } from './SkeletonBlock'

const productGridClasses = 'grid grid-cols-2 gap-x-2 gap-y-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6'

function ProductTileSkeleton() {
  return (
    <div aria-hidden className="min-w-0 space-y-2">
      <SkeletonBlock className="aspect-[4/5] w-full rounded-lg" />
      <SkeletonBlock className="h-3 w-4/5" />
      <SkeletonBlock className="h-3 w-1/2" />
      <SkeletonBlock className="h-5 w-20" />
    </div>
  )
}

export function ProductGridSkeleton({ count = 12, label = 'Loading listings' }: { count?: number; label?: string }) {
  return (
    <LoadingRegion label={label} layout="section">
      <div className={productGridClasses}>
        {Array.from({ length: count }, (_, index) => <ProductTileSkeleton key={index} />)}
      </div>
    </LoadingRegion>
  )
}

export function ProductBandSkeleton({ count = 6, label = 'Loading products' }: { count?: number; label?: string }) {
  return (
    <LoadingRegion label={label} layout="section">
      <div className="flex gap-3 overflow-hidden">
        {Array.from({ length: count }, (_, index) => (
          <div className="w-[132px] shrink-0 space-y-2 sm:w-[148px] md:w-[160px] lg:w-[172px]" key={index}>
            <ProductTileSkeleton />
          </div>
        ))}
      </div>
    </LoadingRegion>
  )
}

export function EventCarouselSkeleton({ label = 'Loading featured events' }: { label?: string }) {
  return (
    <LoadingRegion label={label} layout="section">
      <div className="flex gap-3 overflow-hidden">
        {Array.from({ length: 3 }, (_, index) => (
          <div className="w-[82vw] max-w-sm shrink-0 overflow-hidden rounded-xl border border-foose-border bg-foose-surface" key={index}>
            <SkeletonBlock className="aspect-[16/9] w-full rounded-none" />
            <div className="space-y-2 p-4">
              <SkeletonBlock className="h-5 w-4/5" />
              <SkeletonBlock className="h-3 w-3/5" />
              <SkeletonBlock className="h-3 w-2/5" />
            </div>
          </div>
        ))}
      </div>
    </LoadingRegion>
  )
}

export function EventGridSkeleton({ count = 6, label = 'Loading events' }: { count?: number; label?: string }) {
  return (
    <LoadingRegion label={label} layout="section">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: count }, (_, index) => (
          <div className="overflow-hidden rounded-xl border border-foose-border bg-foose-surface" key={index}>
            <SkeletonBlock className="aspect-[16/9] w-full rounded-none" />
            <div className="space-y-3 p-4">
              <SkeletonBlock className="h-5 w-4/5" />
              <SkeletonBlock className="h-3 w-2/3" />
              <SkeletonBlock className="h-9 w-full" />
            </div>
          </div>
        ))}
      </div>
    </LoadingRegion>
  )
}

export function ShopGridSkeleton({ count = 6, label = 'Loading DigiShops' }: { count?: number; label?: string }) {
  return (
    <LoadingRegion label={label} layout="section">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: count }, (_, index) => (
          <div className="overflow-hidden rounded-2xl border border-foose-border bg-foose-surface" key={index}>
            <SkeletonBlock className="h-28 w-full rounded-none" />
            <div className="space-y-3 p-4">
              <SkeletonBlock className="-mt-11 size-16 rounded-full ring-4 ring-foose-surface" />
              <SkeletonBlock className="h-5 w-3/5" />
              <SkeletonBlock className="h-10 w-full" />
              <SkeletonBlock className="h-7 w-2/5 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </LoadingRegion>
  )
}

export function ShopDetailSkeleton() {
  return (
    <LoadingRegion label="Loading shop" layout="page">
      <div className="overflow-hidden rounded-2xl border border-foose-border bg-foose-surface">
        <SkeletonBlock className="h-36 w-full rounded-none sm:h-48" />
        <div className="space-y-4 p-4 sm:p-6">
          <div className="flex items-end gap-4">
            <SkeletonBlock className="-mt-14 size-24 shrink-0 rounded-full ring-4 ring-foose-surface" />
            <div className="min-w-0 flex-1 space-y-2 pb-1">
              <SkeletonBlock className="h-7 w-52 max-w-full" />
              <SkeletonBlock className="h-4 w-72 max-w-full" />
            </div>
          </div>
          <SkeletonBlock className="h-12 w-full" />
        </div>
      </div>
      <div className="mt-6">
        <ProductGridSkeleton count={10} label="Loading shop listings" />
      </div>
    </LoadingRegion>
  )
}

export function ListingDetailSkeleton() {
  return (
    <LoadingRegion label="Loading listing details" layout="page">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(320px,0.62fr)] lg:items-start">
        <div className="space-y-3">
          <SkeletonBlock className="aspect-[4/5] max-h-[calc(100dvh-9rem)] w-full" />
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
            {Array.from({ length: 5 }, (_, index) => <SkeletonBlock className="aspect-square" key={index} />)}
          </div>
        </div>
        <div className="space-y-4">
          <div className="space-y-4 rounded-xl border border-foose-border bg-foose-surface p-4 sm:p-5">
            <div className="flex gap-2"><SkeletonBlock className="h-6 w-16 rounded-full" /><SkeletonBlock className="h-6 w-20 rounded-full" /></div>
            <SkeletonBlock className="h-8 w-4/5" />
            <SkeletonBlock className="h-4 w-2/3" />
            <SkeletonBlock className="h-9 w-32" />
            {Array.from({ length: 3 }, (_, index) => <SkeletonBlock className="h-11 w-full" key={index} />)}
          </div>
          <div className="space-y-3 rounded-xl border border-foose-border bg-foose-surface p-4 sm:p-5">
            <SkeletonBlock className="h-5 w-32" />
            <SkeletonBlock className="h-4 w-full" />
            <SkeletonBlock className="h-4 w-5/6" />
          </div>
        </div>
      </div>
    </LoadingRegion>
  )
}

export function EventDetailSkeleton() {
  return (
    <LoadingRegion label="Loading event details" layout="page">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4">
          <SkeletonBlock className="aspect-[16/9] w-full" />
          <SkeletonBlock className="h-8 w-4/5" />
          <SkeletonBlock className="h-4 w-full" />
          <SkeletonBlock className="h-4 w-5/6" />
        </div>
        <div className="space-y-3 rounded-xl border border-foose-border bg-foose-surface p-5">
          <SkeletonBlock className="h-6 w-24 rounded-full" />
          <SkeletonBlock className="h-5 w-4/5" />
          <SkeletonBlock className="h-5 w-3/5" />
          <SkeletonBlock className="h-11 w-full" />
        </div>
      </div>
    </LoadingRegion>
  )
}

export function ProfilePageSkeleton() {
  return (
    <LoadingRegion label="Loading profile" layout="page">
      <div className="rounded-xl border border-foose-border bg-foose-surface p-4 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <SkeletonBlock className="size-24 shrink-0 rounded-full" />
          <div className="flex-1 space-y-3">
            <SkeletonBlock className="h-7 w-52 max-w-full" />
            <SkeletonBlock className="h-4 w-72 max-w-full" />
            <div className="flex gap-2"><SkeletonBlock className="h-9 w-24" /><SkeletonBlock className="h-9 w-24" /></div>
          </div>
        </div>
      </div>
      <div className="mt-6"><ProductGridSkeleton count={10} label="Loading profile listings" /></div>
    </LoadingRegion>
  )
}

export function SavedPageSkeleton() {
  return (
    <LoadingRegion label="Loading saved collections" layout="page">
      <SkeletonBlock className="mb-4 h-8 w-52" />
      <div className="grid gap-8">
        <ProductBandSkeleton label="Loading saved items" />
        <EventGridSkeleton count={3} label="Loading saved events" />
      </div>
    </LoadingRegion>
  )
}

export function FinspoFormSkeleton() {
  return (
    <LoadingRegion label="Loading Finspo editor" layout="page">
      <div className="grid gap-5 rounded-xl border border-foose-border bg-foose-surface p-4 sm:p-6 lg:grid-cols-[minmax(240px,0.7fr)_minmax(0,1fr)]">
        <SkeletonBlock className="aspect-[4/5] w-full" />
        <div className="space-y-5">
          <SkeletonBlock className="h-28 w-full" />
          <SkeletonBlock className="h-12 w-full" />
          <SkeletonBlock className="h-12 w-full" />
          <SkeletonBlock className="h-11 w-36" />
        </div>
      </div>
    </LoadingRegion>
  )
}

export function CompactListSkeleton({ label = 'Loading activity', rows = 3 }: { label?: string; rows?: number }) {
  return (
    <LoadingRegion label={label} layout="compact">
      <div className="space-y-3">
        {Array.from({ length: rows }, (_, index) => (
          <div className="flex items-center gap-3" key={index}>
            <SkeletonBlock className="size-10 shrink-0 rounded-full" />
            <div className="flex-1 space-y-2"><SkeletonBlock className="h-4 w-3/5" /><SkeletonBlock className="h-3 w-4/5" /></div>
          </div>
        ))}
      </div>
    </LoadingRegion>
  )
}

export function AppendFeedback({ error, label, loading, retry }: { error?: string; label: string; loading?: boolean; retry?: () => void }) {
  if (error) {
    return (
      <InlineNotice
        action={retry ? <button className="text-sm font-black text-accent hover:underline" onClick={retry} type="button">Try again</button> : undefined}
        className="mx-auto my-3 max-w-xl"
        title="More results did not load"
        tone="error"
      >
        {error}
      </InlineNotice>
    )
  }

  if (!loading) return null

  return (
    <LoadingRegion className="py-3" label={label} layout="compact">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => <SkeletonBlock className="aspect-[4/5] w-full" key={index} />)}
      </div>
    </LoadingRegion>
  )
}
