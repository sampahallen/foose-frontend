type LoadingVariant =
  | 'admin'
  | 'cards'
  | 'detail'
  | 'form'
  | 'home'
  | 'inbox'
  | 'list'
  | 'orders'
  | 'profile'
  | 'spinner'

function SkeletonBlock({ className = '' }: { className?: string }) {
  return <span aria-hidden className={`block animate-pulse rounded-lg bg-foose-surface-mid ${className}`} />
}

function ProductCardSkeleton() {
  return (
    <div className="flex min-h-full flex-col gap-2">
      <SkeletonBlock className="aspect-[4/5] w-full rounded-md" />
      <SkeletonBlock className="h-3 w-2/3" />
      <SkeletonBlock className="h-3 w-1/2" />
      <SkeletonBlock className="h-4 w-20" />
      <SkeletonBlock className="h-3 w-3/4" />
    </div>
  )
}

function ProductGridSkeleton() {
  return (
    <div className="grid gap-3 grid-cols-[repeat(auto-fill,minmax(132px,1fr))] sm:grid-cols-[repeat(auto-fill,minmax(148px,1fr))] md:grid-cols-[repeat(auto-fill,minmax(160px,1fr))] lg:grid-cols-[repeat(auto-fill,minmax(172px,1fr))]">
      {Array.from({ length: 12 }).map((_, index) => (
        <ProductCardSkeleton key={index} />
      ))}
    </div>
  )
}

function HeaderSkeleton() {
  return (
    <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div className="grid gap-2">
        <SkeletonBlock className="h-8 w-48" />
        <SkeletonBlock className="h-4 w-72 max-w-full" />
      </div>
      <SkeletonBlock className="h-10 w-40" />
    </div>
  )
}

function ListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="grid gap-3">
      {Array.from({ length: rows }).map((_, index) => (
        <div className="rounded-xl border border-foose-border bg-foose-surface p-4" key={index}>
          <div className="flex items-center gap-4">
            <SkeletonBlock className="size-14 shrink-0 rounded-full" />
            <div className="grid flex-1 gap-2">
              <SkeletonBlock className="h-4 w-3/5" />
              <SkeletonBlock className="h-3 w-4/5" />
            </div>
            <SkeletonBlock className="hidden h-9 w-24 sm:block" />
          </div>
        </div>
      ))}
    </div>
  )
}

function TableSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-foose-border bg-foose-surface">
      <div className="grid gap-0">
        {Array.from({ length: 7 }).map((_, index) => (
          <div className="grid grid-cols-[1.4fr_1fr_0.8fr_0.8fr] gap-4 border-b border-foose-border p-4 last:border-b-0" key={index}>
            <SkeletonBlock className="h-4 w-full" />
            <SkeletonBlock className="h-4 w-4/5" />
            <SkeletonBlock className="h-4 w-3/4" />
            <SkeletonBlock className="h-4 w-2/3" />
          </div>
        ))}
      </div>
    </div>
  )
}

function DetailSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(320px,0.62fr)]">
      <div className="grid gap-3">
        <SkeletonBlock className="aspect-[4/5] min-h-72 w-full" />
        <div className="grid grid-cols-5 gap-2">
          {Array.from({ length: 5 }).map((_, index) => (
            <SkeletonBlock className="aspect-square" key={index} />
          ))}
        </div>
      </div>
      <div className="grid content-start gap-4">
        <div className="rounded-xl border border-foose-border bg-foose-surface p-5">
          <div className="mb-4 flex gap-2">
            <SkeletonBlock className="h-6 w-16 rounded-full" />
            <SkeletonBlock className="h-6 w-20 rounded-full" />
          </div>
          <SkeletonBlock className="h-8 w-4/5" />
          <SkeletonBlock className="mt-3 h-4 w-2/3" />
          <SkeletonBlock className="mt-6 h-10 w-40" />
          <div className="mt-6 grid gap-2">
            <SkeletonBlock className="h-11 w-full" />
            <SkeletonBlock className="h-11 w-full" />
            <SkeletonBlock className="h-11 w-full" />
          </div>
        </div>
        <div className="rounded-xl border border-foose-border bg-foose-surface p-5">
          <SkeletonBlock className="h-5 w-32" />
          <SkeletonBlock className="mt-4 h-4 w-full" />
          <SkeletonBlock className="mt-2 h-4 w-5/6" />
          <SkeletonBlock className="mt-2 h-4 w-3/4" />
        </div>
      </div>
    </div>
  )
}

function FormSkeleton() {
  return (
    <div className="rounded-xl border border-foose-border bg-foose-surface p-5 shadow-sm md:p-7">
      <div className="grid gap-5 lg:grid-cols-2">
        <SkeletonBlock className="h-12 w-full lg:col-span-2" />
        <SkeletonBlock className="h-32 w-full lg:col-span-2" />
        {Array.from({ length: 6 }).map((_, index) => (
          <SkeletonBlock className="h-12 w-full" key={index} />
        ))}
        <SkeletonBlock className="h-40 w-full lg:col-span-2" />
      </div>
      <div className="mt-6 flex gap-3">
        <SkeletonBlock className="h-11 w-28" />
        <SkeletonBlock className="h-11 w-36" />
      </div>
    </div>
  )
}

function HomeSkeleton() {
  return (
    <div className="grid gap-8">
      <HeaderSkeleton />
      <div className="grid gap-3 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <SkeletonBlock className="h-44 w-full" key={index} />
        ))}
      </div>
      <ProductGridSkeleton />
    </div>
  )
}

function InboxSkeleton() {
  return (
    <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
      <div className="rounded-xl border border-foose-border bg-foose-surface p-3">
        <ListSkeleton rows={6} />
      </div>
      <div className="rounded-xl border border-foose-border bg-foose-surface p-4">
        <SkeletonBlock className="h-12 w-52" />
        <div className="mt-8 grid gap-4">
          <SkeletonBlock className="ml-auto h-16 w-2/3 rounded-2xl" />
          <SkeletonBlock className="h-16 w-3/5 rounded-2xl" />
          <SkeletonBlock className="ml-auto h-20 w-3/4 rounded-2xl" />
        </div>
        <SkeletonBlock className="mt-10 h-12 w-full" />
      </div>
    </div>
  )
}

function SpinnerState({ label }: { label: string }) {
  return (
    <div className="state-panel mx-auto my-10 flex max-w-xl flex-col items-center gap-4 rounded-xl border border-foose-border bg-foose-surface p-8 text-center">
      <span className="loading-dot size-8 animate-spin rounded-full border-4 border-foose-surface-high border-t-accent" />
      <p>{label}</p>
    </div>
  )
}

function variantForLabel(label: string): LoadingVariant {
  const normalized = label.toLowerCase()

  if (/(finishing|redirecting|checking|verifying promotion|payment)/.test(normalized)) return 'spinner'
  if (/(marketplace|top picks|fresh drops|bales|listings|saved items|your listings)/.test(normalized)) return 'cards'
  if (/(listing|event|order details|shop|finspo)/.test(normalized) && !normalized.includes('listings')) return 'detail'
  if (/(form|settings|kyc status|catalog)/.test(normalized)) return 'form'
  if (/(admin|kyc records|disputes)/.test(normalized)) return 'admin'
  if (/(orders|order\.\.\.)/.test(normalized)) return 'orders'
  if (/(conversations|conversation|notifications|inbox)/.test(normalized)) return 'inbox'
  if (/(profile)/.test(normalized)) return 'profile'
  if (/(featured|popular|sellers)/.test(normalized)) return 'home'
  return 'list'
}

export function LoadingState({ label = 'Loading...' }: { label?: string }) {
  const variant = variantForLabel(label)

  if (variant === 'spinner') return <SpinnerState label={label} />

  return (
    <section aria-label={label} aria-busy="true" className="my-6" role="status">
      <span className="sr-only">{label}</span>
      {variant !== 'detail' && variant !== 'form' && variant !== 'inbox' && <HeaderSkeleton />}
      {variant === 'admin' && <TableSkeleton />}
      {variant === 'cards' && <ProductGridSkeleton />}
      {variant === 'detail' && <DetailSkeleton />}
      {variant === 'form' && <FormSkeleton />}
      {variant === 'home' && <HomeSkeleton />}
      {variant === 'inbox' && <InboxSkeleton />}
      {variant === 'list' && <ListSkeleton />}
      {variant === 'orders' && <ListSkeleton rows={5} />}
      {variant === 'profile' && (
        <div className="rounded-xl border border-foose-border bg-foose-surface p-5">
          <div className="flex items-center gap-4">
            <SkeletonBlock className="size-24 rounded-full" />
            <div className="grid flex-1 gap-3">
              <SkeletonBlock className="h-8 w-48" />
              <SkeletonBlock className="h-4 w-72 max-w-full" />
            </div>
          </div>
          <div className="mt-6">
            <ProductGridSkeleton />
          </div>
        </div>
      )}
    </section>
  )
}
