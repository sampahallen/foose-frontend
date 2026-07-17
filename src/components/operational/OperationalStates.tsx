import { LoadingRegion, SkeletonBlock } from '../feedback'

function FieldSkeleton({ wide = false }: { wide?: boolean }) {
  return (
    <div className={`grid gap-2 ${wide ? 'sm:col-span-2' : ''}`}>
      <SkeletonBlock className="h-3 w-24" />
      <SkeletonBlock className="h-12 w-full rounded-xl" />
    </div>
  )
}

export function FormPageSkeleton({
  label = 'Loading form',
  media = false,
}: {
  label?: string
  media?: boolean
}) {
  return (
    <LoadingRegion className="mx-auto w-full max-w-5xl" label={label} layout="page">
      <div className="mb-6 grid gap-2">
        <SkeletonBlock className="h-4 w-24" />
        <SkeletonBlock className="h-9 w-56 max-w-full" />
        <SkeletonBlock className="h-4 w-96 max-w-full" />
      </div>
      <div className="rounded-2xl border border-foose-border bg-foose-surface p-4 shadow-sm sm:p-6 md:p-8">
        <div className="grid gap-5 sm:grid-cols-2">
          <FieldSkeleton />
          <FieldSkeleton />
          <FieldSkeleton wide />
          <div className="grid gap-2 sm:col-span-2">
            <SkeletonBlock className="h-3 w-28" />
            <SkeletonBlock className="h-28 w-full rounded-xl" />
          </div>
          {Array.from({ length: 4 }).map((_, index) => <FieldSkeleton key={index} />)}
          {media && (
            <div className="grid gap-3 sm:col-span-2">
              <SkeletonBlock className="h-3 w-32" />
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {Array.from({ length: 4 }).map((_, index) => (
                  <SkeletonBlock className="aspect-square w-full rounded-xl" key={index} />
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row">
          <SkeletonBlock className="h-11 w-full rounded-lg sm:w-28" />
          <SkeletonBlock className="h-11 w-full rounded-lg sm:w-40" />
        </div>
      </div>
    </LoadingRegion>
  )
}

export function SettingsSkeleton({ label = 'Loading settings' }: { label?: string }) {
  return (
    <LoadingRegion className="mx-auto w-full max-w-3xl" label={label} layout="page">
      <div className="mb-6 grid gap-2">
        <SkeletonBlock className="h-4 w-20" />
        <SkeletonBlock className="h-10 w-64 max-w-full" />
        <SkeletonBlock className="h-4 w-80 max-w-full" />
      </div>
      <div className="rounded-2xl border border-foose-border bg-foose-surface p-4 shadow-sm sm:p-6 md:p-8">
        <div className="mb-6 flex items-center gap-4 rounded-2xl bg-accent-light/50 p-4">
          <SkeletonBlock className="size-20 shrink-0 rounded-full" />
          <div className="grid flex-1 gap-2">
            <SkeletonBlock className="h-5 w-36" />
            <SkeletonBlock className="h-4 w-52 max-w-full" />
          </div>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => <FieldSkeleton key={index} />)}
          <FieldSkeleton wide />
        </div>
        <SkeletonBlock className="mt-6 h-11 w-full rounded-xl sm:w-40" />
      </div>
    </LoadingRegion>
  )
}

function ShopSettingsSectionSkeleton({ fields = 2, wide = false }: { fields?: number; wide?: boolean }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-foose-border bg-foose-surface shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-foose-border bg-accent-light/50 px-3 py-4 sm:px-4 md:px-6">
        <div className="grid min-w-0 flex-1 gap-2">
          <SkeletonBlock className="h-5 w-40 max-w-full" />
          <SkeletonBlock className="h-3 w-64 max-w-full" />
        </div>
        <SkeletonBlock className="size-11 shrink-0 rounded-lg sm:w-20" />
      </div>
      <div className="grid gap-4 p-3 sm:p-4 md:grid-cols-2 md:p-6">
        {Array.from({ length: fields }, (_, index) => (
          <div className={`rounded-xl border border-foose-border p-3 ${wide && index === fields - 1 ? 'md:col-span-2' : ''}`} key={index}>
            <div className="flex items-center justify-between gap-3">
              <SkeletonBlock className="h-4 w-24" />
              <SkeletonBlock className="size-11 rounded-lg sm:w-16" />
            </div>
            <SkeletonBlock className={`${wide && index === fields - 1 ? 'h-28' : 'h-12'} mt-3 w-full rounded-xl`} />
          </div>
        ))}
      </div>
    </section>
  )
}

export function ShopSettingsSkeleton({ label = 'Loading shop settings' }: { label?: string }) {
  return (
    <LoadingRegion label={label} layout="compact">
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-5">
          <ShopSettingsSectionSkeleton fields={3} wide />
          <ShopSettingsSectionSkeleton />
          <ShopSettingsSectionSkeleton fields={2} />
          <ShopSettingsSectionSkeleton fields={4} />
        </div>
        <aside className="space-y-5">
          <section className="overflow-hidden rounded-2xl border border-foose-border bg-foose-surface shadow-sm">
            <div className="border-b border-foose-border bg-accent-light/50 px-4 py-4">
              <SkeletonBlock className="h-5 w-32" />
            </div>
            <div className="grid gap-4 p-3 sm:p-4 md:grid-cols-2 xl:grid-cols-1">
              {Array.from({ length: 2 }, (_, index) => (
                <div className="rounded-xl border border-foose-border p-3" key={index}>
                  <SkeletonBlock className="h-4 w-24" />
                  <SkeletonBlock className={`${index === 0 ? 'aspect-square max-w-40' : 'aspect-[16/7]'} mt-3 w-full rounded-xl`} />
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>
      <div className="sticky bottom-[var(--foose-bottom-nav-inset)] z-20 -mx-3 mt-5 border-t border-foose-border bg-white/95 px-3 py-3 backdrop-blur md:-mx-6 md:px-6 lg:static lg:mx-0 lg:bg-transparent lg:px-0">
        <SkeletonBlock className="h-12 w-full rounded-xl sm:ml-auto sm:w-40" />
      </div>
    </LoadingRegion>
  )
}

export function SellerOverviewSkeleton({ label = 'Loading seller workspace' }: { label?: string }) {
  return (
    <LoadingRegion label={label} layout="compact">
      <div className="-mx-3 mb-6 flex snap-x gap-3 overflow-hidden px-3 sm:mx-0 sm:grid sm:grid-cols-3 sm:px-0">
        {Array.from({ length: 3 }, (_, index) => (
          <div className="min-w-[min(78vw,17rem)] rounded-xl border border-foose-border bg-foose-surface p-4 sm:min-w-0" key={index}>
            <div className="flex items-center justify-between gap-3">
              <SkeletonBlock className="h-3 w-28" />
              <SkeletonBlock className="size-9 rounded-full" />
            </div>
            <SkeletonBlock className="mt-4 h-8 w-28" />
            <SkeletonBlock className="mt-2 h-3 w-24" />
          </div>
        ))}
      </div>
      <section className="rounded-none bg-transparent p-0 shadow-none sm:rounded-2xl sm:bg-foose-surface sm:p-4 sm:shadow-sm md:p-6">
        <div className="mb-5 grid gap-2">
          <SkeletonBlock className="h-7 w-44" />
          <SkeletonBlock className="h-4 w-72 max-w-full" />
        </div>
        <div className="grid gap-4">
          {Array.from({ length: 2 }, (_, index) => (
            <article className="rounded-xl border border-foose-border bg-foose-surface p-3 sm:p-4" key={index}>
              <div className="flex gap-2"><SkeletonBlock className="h-6 w-20 rounded-full" /><SkeletonBlock className="h-6 w-16 rounded-full" /></div>
              <SkeletonBlock className="mt-4 h-5 w-3/5" />
              <SkeletonBlock className="mt-2 h-5 w-28" />
              <div className="mt-4 grid gap-3 min-[360px]:grid-cols-2">
                {Array.from({ length: 4 }, (_, detailIndex) => <SkeletonBlock className="h-16 w-full rounded-lg" key={detailIndex} />)}
              </div>
              <SkeletonBlock className="mt-4 h-11 w-full rounded-lg sm:ml-auto sm:w-28" />
            </article>
          ))}
        </div>
      </section>
    </LoadingRegion>
  )
}

export function ManagementSkeleton({ label = 'Loading workspace' }: { label?: string }) {
  return (
    <LoadingRegion label={label} layout="page">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="grid gap-2">
          <SkeletonBlock className="h-9 w-60 max-w-full" />
          <SkeletonBlock className="h-4 w-96 max-w-full" />
        </div>
        <SkeletonBlock className="h-11 w-full rounded-xl sm:w-40" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div className="rounded-xl border border-foose-border bg-foose-surface p-4" key={index}>
            <SkeletonBlock className="h-3 w-24" />
            <SkeletonBlock className="mt-3 h-8 w-20" />
            <SkeletonBlock className="mt-2 h-3 w-32" />
          </div>
        ))}
      </div>
      <div className="mt-6 rounded-xl border border-foose-border bg-foose-surface p-4">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row">
          <SkeletonBlock className="h-11 flex-1 rounded-xl" />
          <SkeletonBlock className="h-11 w-full rounded-xl sm:w-44" />
        </div>
        <div className="grid gap-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <div className="flex items-center gap-3 border-t border-foose-border py-3 first:border-t-0" key={index}>
              <SkeletonBlock className="size-16 shrink-0 rounded-lg" />
              <div className="grid min-w-0 flex-1 gap-2">
                <SkeletonBlock className="h-4 w-2/3" />
                <SkeletonBlock className="h-3 w-1/2" />
              </div>
              <SkeletonBlock className="hidden h-9 w-24 rounded-lg sm:block" />
            </div>
          ))}
        </div>
      </div>
    </LoadingRegion>
  )
}

export function AdminTableSkeleton({ label = 'Loading admin records' }: { label?: string }) {
  return (
    <LoadingRegion label={label} layout="section">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div className="rounded-xl border border-foose-border bg-foose-surface p-4" key={index}>
            <SkeletonBlock className="h-3 w-28" />
            <SkeletonBlock className="mt-3 h-8 w-16" />
          </div>
        ))}
      </div>
      <div className="mt-5 overflow-hidden rounded-xl border border-foose-border bg-foose-surface">
        {Array.from({ length: 6 }).map((_, index) => (
          <div className="grid gap-3 border-b border-foose-border p-4 last:border-b-0 sm:grid-cols-[1.4fr_1fr_0.8fr_auto]" key={index}>
            <SkeletonBlock className="h-4 w-full" />
            <SkeletonBlock className="h-4 w-4/5" />
            <SkeletonBlock className="h-4 w-24" />
            <SkeletonBlock className="h-9 w-full rounded-lg sm:w-20" />
          </div>
        ))}
      </div>
    </LoadingRegion>
  )
}

export function OrderListSkeleton({ label = 'Loading orders' }: { label?: string }) {
  return (
    <LoadingRegion label={label} layout="section">
      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <article className="rounded-xl border border-foose-border bg-foose-surface p-3 sm:p-4 md:p-5" key={index}>
            <div className="grid gap-3 border-b border-foose-border pb-3 sm:grid-cols-[minmax(0,1fr)_auto]">
              <div className="grid gap-2">
                <SkeletonBlock className="h-4 w-32" />
                <SkeletonBlock className="h-3 w-24" />
              </div>
              <SkeletonBlock className="h-6 w-24 rounded-full sm:justify-self-end" />
            </div>
            <div className="mt-4 grid gap-3">
              <SkeletonBlock className="h-4 w-3/4" />
              <SkeletonBlock className="h-3 w-full" />
              <SkeletonBlock className="h-3 w-4/5" />
              <SkeletonBlock className="h-11 w-full rounded-lg sm:ml-auto sm:w-24" />
            </div>
          </article>
        ))}
      </div>
    </LoadingRegion>
  )
}

export function OrderDetailSkeleton({ label = 'Loading order details' }: { label?: string }) {
  return (
    <LoadingRegion label={label} layout="page">
      <div className="mb-5 grid gap-2">
        <SkeletonBlock className="h-4 w-24" />
        <SkeletonBlock className="h-9 w-64 max-w-full" />
      </div>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="grid gap-4">
          <div className="rounded-xl border border-foose-border bg-foose-surface p-5">
            <SkeletonBlock className="h-5 w-40" />
            <div className="mt-5 flex gap-4">
              <SkeletonBlock className="size-24 shrink-0 rounded-lg" />
              <div className="grid flex-1 content-start gap-3">
                <SkeletonBlock className="h-5 w-3/4" />
                <SkeletonBlock className="h-4 w-1/2" />
                <SkeletonBlock className="h-4 w-24" />
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-foose-border bg-foose-surface p-5">
            <SkeletonBlock className="h-5 w-44" />
            <SkeletonBlock className="mt-5 h-3 w-full" />
            <div className="mt-4 grid grid-cols-4 gap-2">
              {Array.from({ length: 4 }).map((_, index) => <SkeletonBlock className="h-10" key={index} />)}
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-foose-border bg-foose-surface p-5">
          <SkeletonBlock className="h-5 w-36" />
          {Array.from({ length: 5 }).map((_, index) => (
            <div className="mt-4 flex justify-between gap-4" key={index}>
              <SkeletonBlock className="h-4 w-24" />
              <SkeletonBlock className="h-4 w-20" />
            </div>
          ))}
          <SkeletonBlock className="mt-6 h-11 w-full rounded-lg" />
        </div>
      </div>
    </LoadingRegion>
  )
}

export function InboxListSkeleton({ label }: { label: string }) {
  return (
    <LoadingRegion className="p-3" label={label} layout="pane">
      <div className="grid gap-2">
        {Array.from({ length: 7 }).map((_, index) => (
          <div className="flex items-center gap-3 rounded-xl p-3" key={index}>
            <SkeletonBlock className="size-11 shrink-0 rounded-full" />
            <div className="grid min-w-0 flex-1 gap-2">
              <SkeletonBlock className="h-4 w-3/5" />
              <SkeletonBlock className="h-3 w-4/5" />
            </div>
            <SkeletonBlock className="h-3 w-10" />
          </div>
        ))}
      </div>
    </LoadingRegion>
  )
}

export function ConversationSkeleton({ label = 'Loading conversation' }: { label?: string }) {
  return (
    <LoadingRegion className="flex min-h-0 flex-1 flex-col p-4" label={label} layout="pane">
      <div className="flex items-center gap-3 border-b border-foose-border pb-4">
        <SkeletonBlock className="size-11 rounded-full" />
        <div className="grid gap-2">
          <SkeletonBlock className="h-4 w-32" />
          <SkeletonBlock className="h-3 w-20" />
        </div>
      </div>
      <div className="grid flex-1 content-end gap-4 py-6">
        <SkeletonBlock className="h-16 w-3/5 rounded-2xl" />
        <SkeletonBlock className="ml-auto h-20 w-2/3 rounded-2xl" />
        <SkeletonBlock className="h-14 w-1/2 rounded-2xl" />
        <SkeletonBlock className="ml-auto h-16 w-3/5 rounded-2xl" />
      </div>
      <SkeletonBlock className="h-12 w-full rounded-xl" />
    </LoadingRegion>
  )
}

export function CheckoutSkeleton({ label = 'Preparing checkout' }: { label?: string }) {
  return (
    <LoadingRegion label={label} layout="page">
      <div className="mb-6 flex items-center gap-2">
        {Array.from({ length: 3 }).map((_, index) => (
          <div className="contents" key={index}>
            <SkeletonBlock className="size-8 shrink-0 rounded-full" />
            {index < 2 && <SkeletonBlock className="h-1 flex-1" />}
          </div>
        ))}
      </div>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="rounded-xl border border-foose-border bg-foose-surface p-5">
          <SkeletonBlock className="h-6 w-48" />
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            {Array.from({ length: 6 }).map((_, index) => <FieldSkeleton key={index} wide={index > 3} />)}
          </div>
          <SkeletonBlock className="mt-6 h-12 w-full rounded-xl" />
        </div>
        <div className="rounded-xl border border-foose-border bg-foose-surface p-5">
          <SkeletonBlock className="h-6 w-36" />
          {Array.from({ length: 3 }).map((_, index) => (
            <div className="mt-4 flex gap-3" key={index}>
              <SkeletonBlock className="size-14 rounded-lg" />
              <div className="grid flex-1 gap-2"><SkeletonBlock className="h-4 w-3/4" /><SkeletonBlock className="h-3 w-1/2" /></div>
            </div>
          ))}
        </div>
      </div>
    </LoadingRegion>
  )
}
