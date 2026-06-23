import { useEffect, useMemo, useState } from 'react'
import { AppShell, ButtonLink, EmptyState, ErrorState, Icon, LoadingState, ProductCard, PromotedEventCarousel, SectionHeader } from '../components'
import { useAuth } from '../hooks/useAuth'
import { useApiResource } from '../hooks/useApiResource'
import type { Event, PaginatedListings, PopularSearch, WeeklyTopSeller } from '../types/api'
import { initials } from '../utils/format'
import { withoutOwnListings } from '../utils/listingOwnership'
import { withBasePath } from '../utils/navigation'

const homeListingGrid =
  "grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 [&_.product-card]:min-w-0 [&_.product-card]:rounded-lg [&_.product-card]:p-1.5 [&_.product-body]:gap-1 [&_.product-body]:p-2 [&_.product-body_h3]:text-xs [&_.product-foot_strong]:text-base"
const searchItems = ['jackets', 'Adidas', 'denim', 'graphic tees', 'sneakers', 'bales']

export function HomePage() {
  const { user } = useAuth()
  const freshDrops = useApiResource<PaginatedListings>('/search?page=1&limit=21&sort=newest')
  const promotedEvents = useApiResource<{ events: Event[] }>('/community/events/featured')
  const topPicks = useApiResource<PaginatedListings>('/search/top-picks?page=1&limit=21&sort=newest')
  const freshBales = useApiResource<PaginatedListings>('/search?page=1&limit=21&sort=newest&type=wholesale')
  const popularSearches = useApiResource<{ searches: PopularSearch[] }>('/search/popular-searches?limit=8')
  const topSellers = useApiResource<{ sellers: WeeklyTopSeller[] }>('/search/top-sellers?limit=3')
  const greetingName = user?.name || user?.username || 'friend'
  const [searchItemIndex, setSearchItemIndex] = useState(0)
  const [searchCharacterCount, setSearchCharacterCount] = useState(0)
  const [isDeletingSearchItem, setIsDeletingSearchItem] = useState(false)
  const currentSearchItem = searchItems[searchItemIndex % searchItems.length]
  const typedSearchItem = currentSearchItem.slice(0, searchCharacterCount) || currentSearchItem.slice(0, 1)
  const topPickItems = useMemo(() => withoutOwnListings(topPicks.data?.results || [], user), [topPicks.data?.results, user])
  const freshDropItems = useMemo(() => withoutOwnListings(freshDrops.data?.results || [], user), [freshDrops.data?.results, user])
  const freshBaleItems = useMemo(() => withoutOwnListings(freshBales.data?.results || [], user), [freshBales.data?.results, user])

  useEffect(() => {
    const atEnd = searchCharacterCount === currentSearchItem.length
    const atStart = searchCharacterCount === 0
    const delay = atEnd && !isDeletingSearchItem ? 1250 : atStart && isDeletingSearchItem ? 280 : isDeletingSearchItem ? 45 : 90

    const timer = window.setTimeout(() => {
      if (!isDeletingSearchItem && !atEnd) {
        setSearchCharacterCount((count) => count + 1)
        return
      }

      if (!isDeletingSearchItem && atEnd) {
        setIsDeletingSearchItem(true)
        return
      }

      if (isDeletingSearchItem && !atStart) {
        setSearchCharacterCount((count) => Math.max(0, count - 1))
        return
      }

      setIsDeletingSearchItem(false)
      setSearchItemIndex((index) => index + 1)
    }, delay)

    return () => window.clearTimeout(timer)
  }, [currentSearchItem, isDeletingSearchItem, searchCharacterCount])

  return (
    <AppShell active="home" flush searchPlaceholder="Search curated finds...">
      <section className="hero relative isolate flex min-h-[360px] flex-col justify-end overflow-hidden bg-accent px-4 py-10 text-white md:min-h-[430px] md:px-8 lg:px-12 [&::before]:absolute [&::before]:inset-0 [&::before]:-z-10 [&::before]:bg-[url('https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&w=1800&q=80')] [&::before]:bg-cover [&::before]:bg-center [&::before]:opacity-45 [&::before]:content-[''] [&::after]:absolute [&::after]:inset-0 [&::after]:-z-10 [&::after]:bg-accent/70 [&::after]:content-[''] [&_h1]:text-4xl [&_h1]:font-bold [&_h1]:md:text-6xl [&_p]:max-w-2xl [&_p]:text-sm [&_p]:text-white/85 [&_p]:md:text-base max-md:[&_h1]:text-3xl">
        <div className="hero-content mx-auto flex w-full max-w-4xl flex-col items-center gap-5 text-center">
          <h1>Thrift smarter.</h1>
          <p>Ghana's digital hub for curated second-hand street style. Authenticity verified, speed guaranteed.</p>
          <form action={withBasePath('/browse')} className="hero-search mx-auto flex w-full max-w-3xl flex-col gap-2 rounded-2xl bg-white/95 p-2 text-foose-text shadow-xl sm:flex-row sm:items-center [&_input]:h-11 [&_input]:min-w-0 [&_input]:flex-1 [&_input]:border-0 [&_input]:bg-transparent [&_input]:p-0 [&_input]:text-sm [&_input]:outline-none [&_input]:placeholder:text-foose-muted [&_input]:focus:ring-0 [&_button]:h-11 [&_button]:rounded-xl [&_button]:bg-accent [&_button]:px-6 [&_button]:text-sm [&_button]:font-bold [&_button]:text-white [&_button]:hover:bg-accent-hover home-hero-search" method="get">
            <label className="flex min-h-11 min-w-0 flex-1 items-center gap-3 rounded-xl px-3">
              <span className="inline-flex size-8 shrink-0 items-center justify-center text-accent">
                <Icon name="search" size={21} />
              </span>
              <input aria-label="Search Foose" name="q" placeholder={`search for "${typedSearchItem}" on foose`} />
            </label>
            <button type="submit">Search</button>
          </form>
        </div>
        <div className="hero-greeting mt-8 flex w-full max-w-[1280px] flex-col items-start gap-1 self-center text-left [&_span]:text-xs [&_span]:uppercase [&_span]:tracking-widest [&_span]:text-white/75 [&_strong]:font-display [&_strong]:text-2xl [&_strong]:md:text-4xl">
          <span>{user ? 'Welcome back' : 'Welcome to Foose'}</span>
          <strong>{user ? `Hey, ${greetingName}` : 'Find your next curated piece.'}</strong>
        </div>
      </section>

      <section className="home-section mx-auto w-full max-w-[1280px] my-8 rounded-xl bg-foose-surface p-4 md:p-6 [&.no-pad]:p-0 [&>h2]:text-2xl [&>h2]:font-bold [&>h2]:md:text-4xl [&_a]:font-bold [&_a]:text-accent max-lg:rounded-lg max-lg:p-3 max-md:[&>h2]:text-2xl promoted-events-section">
        <SectionHeader title="Featured events" />
        {promotedEvents.loading && <LoadingState label="Loading featured events..." />}
        {promotedEvents.error && <ErrorState message={promotedEvents.error} retry={promotedEvents.refetch} />}
        {!promotedEvents.loading && !promotedEvents.error && !promotedEvents.data?.events.length && (
          <EmptyState body="Promoted events will appear here when campaigns are active." title="No featured events yet" />
        )}
        {!!promotedEvents.data?.events.length && <PromotedEventCarousel events={promotedEvents.data.events} />}
      </section>

      <section className="home-section mx-auto w-full max-w-[1280px] my-8 rounded-xl bg-foose-surface p-4 md:p-6 [&.no-pad]:p-0 [&>h2]:text-2xl [&>h2]:font-bold [&>h2]:md:text-4xl [&_a]:font-bold [&_a]:text-accent max-lg:rounded-lg max-lg:p-3 max-md:[&>h2]:text-2xl top-picks-section">
        <SectionHeader title="Top picks" eyebrow="Paid placements for standout finds." action={<a href={withBasePath('/top-picks')}>View more</a>} />
        {topPicks.loading && <LoadingState label="Loading top picks..." />}
        {topPicks.error && <ErrorState message={topPicks.error} retry={topPicks.refetch} />}
        {!topPicks.loading && !topPicks.error && !topPickItems.length && (
          <EmptyState body="Top Picks will appear when promoted listings are active." title="No top picks yet" />
        )}
        {!!topPickItems.length && (
          <div className={homeListingGrid}>
            {topPickItems.slice(0, 21).map((listing) => (
              <ProductCard key={listing._id} listing={listing} />
            ))}
          </div>
        )}
      </section>

      <section className="home-section mx-auto w-full max-w-[1280px] my-8 rounded-xl bg-foose-surface p-4 md:p-6 [&.no-pad]:p-0 [&>h2]:text-2xl [&>h2]:font-bold [&>h2]:md:text-4xl [&_a]:font-bold [&_a]:text-accent max-lg:rounded-lg max-lg:p-3 max-md:[&>h2]:text-2xl">
        <SectionHeader
          title="Fresh drops"
          eyebrow="Latest active listings from verified sellers."
          action={<a href={withBasePath('/browse')}>View more</a>}
        />
        {freshDrops.loading && <LoadingState label="Loading listings..." />}
        {freshDrops.error && <ErrorState message={freshDrops.error} retry={freshDrops.refetch} />}
        {!freshDrops.loading && !freshDrops.error && !freshDropItems.length && (
          <EmptyState
            action={<ButtonLink to="/open-shop">Open your DigiShop</ButtonLink>}
            body="Listings will appear here as sellers publish them."
            title="No listings yet"
          />
        )}
        {!!freshDropItems.length && (
          <div className={homeListingGrid}>
            {freshDropItems.slice(0, 21).map((listing) => (
              <ProductCard key={listing._id} listing={listing} />
            ))}
          </div>
        )}
      </section>

      <section className="home-section mx-auto w-full max-w-[1280px] my-8 rounded-xl bg-foose-surface p-4 md:p-6 [&.no-pad]:p-0 [&>h2]:text-2xl [&>h2]:font-bold [&>h2]:md:text-4xl [&_a]:font-bold [&_a]:text-accent max-lg:rounded-lg max-lg:p-3 max-md:[&>h2]:text-2xl">
        <SectionHeader
          title="Fresh bales"
          eyebrow="Newest wholesale listings for bulk buyers and shop owners."
          action={<a href={withBasePath('/bales')}>View more</a>}
        />
        {freshBales.loading && <LoadingState label="Loading fresh bales..." />}
        {freshBales.error && <ErrorState message={freshBales.error} retry={freshBales.refetch} />}
        {!freshBales.loading && !freshBales.error && !freshBaleItems.length && (
          <EmptyState body="Fresh bale listings will appear here when wholesale sellers post them." title="No fresh bales yet" />
        )}
        {!!freshBaleItems.length && (
          <div className={homeListingGrid}>
            {freshBaleItems.slice(0, 21).map((listing) => (
              <ProductCard key={listing._id} listing={listing} />
            ))}
          </div>
        )}
      </section>

      {!user?.hasShop && (
        <section className="seller-cta mx-auto w-full max-w-[1280px] rounded-xl bg-accent p-6 text-white my-10 grid gap-6 md:grid-cols-[1fr_auto] [&_h2]:text-3xl [&_h2]:font-bold">
          <div>
            <h2>Turn your closet into a business.</h2>
            <p>Create a verified DigiShop, publish listings, and manage orders from your profile.</p>
          </div>
          <ButtonLink to="/open-shop" variant="secondary">
            Open your DigiShop
          </ButtonLink>
        </section>
      )}

      <section className="home-section mx-auto w-full max-w-[1280px] my-8 rounded-xl bg-foose-surface p-4 md:p-6 [&.no-pad]:p-0 [&>h2]:text-2xl [&>h2]:font-bold [&>h2]:md:text-4xl [&_a]:font-bold [&_a]:text-accent max-lg:rounded-lg max-lg:p-3 max-md:[&>h2]:text-2xl weekly-discovery-section">
        <SectionHeader title="This week's pulse" eyebrow="Daily refreshes from the current marketplace week." />
        <div className="weekly-discovery-grid grid gap-4 lg:grid-cols-2">
          <article className="weekly-card rounded-xl border border-foose-border bg-foose-surface shadow-sm p-4 md:p-5 max-lg:rounded-lg max-lg:p-3 top-sellers-card">
            <div className="weekly-card-heading mb-5 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <h2>Top sellers this week</h2>
                <p>Completed orders reset every Sunday night.</p>
              </div>
              <Icon name="chart" />
            </div>
            {topSellers.loading && <LoadingState label="Loading top sellers..." />}
            {topSellers.error && <ErrorState message={topSellers.error} retry={topSellers.refetch} />}
            {!topSellers.loading && !topSellers.error && !topSellers.data?.sellers.length && (
              <EmptyState body="Seller rankings will appear after delivered orders are recorded this week." title="No weekly sellers yet" />
            )}
            {!!topSellers.data?.sellers.length && (
              <div className="top-seller-list flex flex-col gap-3">
                {topSellers.data.sellers.map((seller, index) => (
                  <a className="top-seller-row flex items-center gap-3 rounded-lg border border-foose-border bg-foose-surface-low p-3 hover:border-accent [&_img]:size-10 [&_img]:rounded-full [&_img]:object-cover" href={withBasePath(`/shops/${seller.slug}`)} key={seller._id}>
                    <span className="flex shrink-0 items-center gap-2">
                      <span className="seller-rank inline-flex size-8 items-center justify-center rounded-full bg-accent text-sm font-bold text-white">{index + 1}</span>
                      {seller.logoUrl ? <img alt="" src={seller.logoUrl} /> : <span className="seller-avatar inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-accent-light text-sm font-bold text-accent">{initials(seller.shopName)}</span>}
                    </span>
                    <span className="min-w-0">
                      <strong className="block truncate text-sm font-black text-foose-text">{seller.shopName}</strong>
                    </span>
                  </a>
                ))}
              </div>
            )}
          </article>

          <article className="weekly-card rounded-xl border border-foose-border bg-foose-surface shadow-sm p-4 md:p-5 max-lg:rounded-lg max-lg:p-3 popular-search-card">
            <div className="weekly-card-heading mb-5 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <h2>Popular searches</h2>
                <p>Most searched terms from this week.</p>
              </div>
              <Icon name="search" />
            </div>
            {popularSearches.loading && <LoadingState label="Loading popular searches..." />}
            {popularSearches.error && <ErrorState message={popularSearches.error} retry={popularSearches.refetch} />}
            {!popularSearches.loading && !popularSearches.error && !popularSearches.data?.searches.length && (
              <EmptyState body="Search trends will appear after shoppers start browsing." title="No searches yet" />
            )}
            {!!popularSearches.data?.searches.length && (
              <div className="popular-searches flex flex-col gap-3 [&_a]:flex [&_a]:items-center [&_a]:justify-between [&_a]:gap-3 [&_a]:rounded-lg [&_a]:border [&_a]:border-foose-border [&_a]:bg-foose-surface-low [&_a]:p-3 [&_a]:hover:border-accent [&_small]:text-foose-faint">
                {popularSearches.data.searches.map((search) => (
                  <a href={withBasePath(`/browse?q=${encodeURIComponent(search.query)}`)} key={search.normalizedQuery}>
                    <span>{search.query}</span>
                    <small>{search.count}</small>
                  </a>
                ))}
              </div>
            )}
          </article>
        </div>
      </section>
    </AppShell>
  )
}
