import { useCallback, useMemo } from 'react'
import { AppShell, InlineNotice, ProductCard, RefreshIndicator, StatePanel, TopFilterBar } from '../components'
import { AppendFeedback, ProductGridSkeleton } from '../components/feedback/DiscoverySkeletons'
import { useAuth } from '../hooks/useAuth'
import { useInfiniteApiResource } from '../hooks/useInfiniteApiResource'
import { useScrollRevealBand } from '../hooks/useScrollRevealBand'
import type { PaginatedListings } from '../types/api'
import { withoutOwnListings } from '../utils/listingOwnership'
import { withBasePath } from '../utils/navigation'

function suggestedPath(page: number, search: string) {
  const query = new URLSearchParams(search)
  query.set('page', String(page))
  query.set('limit', '50')
  if (!query.has('type')) query.set('type', 'retail')
  return `/recommendations/suggested?${query.toString()}`
}

function modeHref(mode: 'retail' | 'wholesale', search: string) {
  const query = new URLSearchParams(search)
  query.set('type', mode)
  query.delete('page')
  query.delete('limit')
  return withBasePath(`/suggested-for-you?${query.toString()}`)
}

export function SuggestedForYouPage() {
  const { user } = useAuth()
  const search = window.location.search
  const query = useMemo(() => new URLSearchParams(search), [search])
  const activeMode = query.get('type') === 'wholesale' ? 'wholesale' : 'retail'
  const buildPath = useCallback((page: number) => suggestedPath(page, search), [search])
  const extractListings = useCallback((data: PaginatedListings) => data.results || [], [])
  const {
    data: listingData,
    error,
    items,
    loading,
    loadingMore,
    loadMoreError,
    refetch,
    refreshing,
    retryLoadMore,
    sentinelRef,
    total,
  } = useInfiniteApiResource(buildPath, extractListings, [search])
  const filterBandVisible = useScrollRevealBand()
  const feedListings = useMemo(() => withoutOwnListings(items, user), [items, user])

  return (
    <AppShell active="browse" searchPlaceholder="Search your suggestions...">
      <header className="mb-5 border-b border-foose-border pb-4">
        <h1 className="text-2xl font-bold text-foose-text md:text-3xl">Suggested for you</h1>
      </header>
      <div className={`sticky top-16 z-40 mb-6 space-y-3 bg-foose-bg transition duration-200 ${filterBandVisible ? 'translate-y-0 opacity-100' : 'pointer-events-none -translate-y-full opacity-0'}`}>
        <nav className="flex items-center justify-center border-b border-foose-border bg-foose-bg/95 py-2 backdrop-blur" aria-label="Suggested listing type">
          <div className="flex w-full max-w-md items-center justify-center gap-4 text-sm font-black md:justify-between">
            <a className={`border-b-2 px-4 py-2 transition ${activeMode === 'retail' ? 'border-accent text-accent' : 'border-transparent text-foose-muted hover:text-accent'}`} href={modeHref('retail', search)}>
              Retail
            </a>
            <a className={`border-b-2 px-4 py-2 transition ${activeMode === 'wholesale' ? 'border-accent text-accent' : 'border-transparent text-foose-muted hover:text-accent'}`} href={modeHref('wholesale', search)}>
              Bale
            </a>
          </div>
        </nav>
        <TopFilterBar actionPath="/suggested-for-you" hideType locationOptions={listingData?.filters?.locations || []} query={query} resultLabel={`${total} suggested ${activeMode === 'wholesale' ? 'bales' : 'items'}`} />
      </div>
      <section>
        <RefreshIndicator active={refreshing} className="mb-4" label="Refreshing personalized suggestions" />
        {loading && !feedListings.length && <ProductGridSkeleton label="Loading your personalized suggestions" />}
        {error && !feedListings.length && <StatePanel action={<button className="button button-secondary" onClick={refetch} type="button">Try again</button>} body={error} layout="section" title="Your suggestions could not load" tone="error" />}
        {error && !!feedListings.length && <InlineNotice action={<button className="font-black text-accent" onClick={refetch} type="button">Retry</button>} tone="warning">Could not refresh your suggestions. Your current picks are still available.</InlineNotice>}
        {!loading && !error && !feedListings.length && (
          <StatePanel action={<a className="button button-secondary" href={withBasePath('/browse')}>Explore marketplace items</a>} body="Browse, save, and shop a few more pieces to shape this feed." layout="section" title="Your suggestions are warming up" tone="info" />
        )}
        {!!feedListings.length && (
          <div className="masonry grid grid-cols-2 gap-x-2 gap-y-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {feedListings.map((listing) => (
              <ProductCard key={listing._id} listing={listing} />
            ))}
          </div>
        )}
        <div ref={sentinelRef} className="min-h-14 py-2">
          <AppendFeedback error={loadMoreError} label="Loading more suggestions" loading={loadingMore} retry={retryLoadMore} />
        </div>
      </section>
    </AppShell>
  )
}
