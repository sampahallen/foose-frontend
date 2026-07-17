import { useEffect, useMemo, useState } from 'react'
import kantamantoMarketHero from '../assets/kantamanto-market-hero.jpg'
import { AppShell, ButtonLink, Icon, InlineNotice, ProductCard, PromotedEventCarousel, RefreshIndicator, SectionHeader, StatePanel } from '../components'
import { CompactListSkeleton, EventCarouselSkeleton, ProductGridSkeleton } from '../components/feedback/DiscoverySkeletons'
import { useAuth } from '../hooks/useAuth'
import { useApiResource } from '../hooks/useApiResource'
import type { Event, PaginatedListings, PopularSearch, WeeklyTopSeller } from '../types/api'
import { authHref } from '../utils/authRedirect'
import { initials } from '../utils/format'
import { withoutOwnListings } from '../utils/listingOwnership'
import { withBasePath } from '../utils/navigation'

const homeListingGrid =
  "grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 [&_.product-card]:min-w-0 [&_.product-card]:rounded-lg [&_.product-card]:p-1.5 [&_.product-body]:gap-1 [&_.product-body]:p-2 [&_.product-body_h3]:text-xs [&_.product-foot_strong]:text-base"
const searchItems = ['jackets', 'Adidas', 'denim', 'graphic tees', 'sneakers', 'bales']

function threeRowVisibility(index: number) {
  if (index < 6) return ''
  if (index < 9) return 'hidden sm:flex'
  if (index < 12) return 'hidden md:flex'
  if (index < 15) return 'hidden lg:flex'
  return 'hidden xl:flex'
}

export function HomePage() {
  const { user } = useAuth()
  const freshDrops = useApiResource<PaginatedListings>('/search/items?page=1&limit=21&sort=newest')
  const promotedEvents = useApiResource<{ events: Event[] }>('/community/events/featured')
  const topPicks = useApiResource<PaginatedListings>('/search/top-picks?page=1&limit=21&sort=newest')
  const suggested = useApiResource<PaginatedListings>(user ? '/recommendations/suggested?page=1&limit=50&type=retail' : null, Boolean(user))
  const freshBales = useApiResource<PaginatedListings>('/search/items?page=1&limit=21&sort=newest&type=wholesale')
  const popularSearches = useApiResource<{ searches: PopularSearch[] }>('/search/popular-searches?limit=5')
  const topSellers = useApiResource<{ sellers: WeeklyTopSeller[] }>('/search/top-sellers?limit=5')
  const greetingName = user?.name || user?.username || 'friend'
  const [searchItemIndex, setSearchItemIndex] = useState(0)
  const [searchCharacterCount, setSearchCharacterCount] = useState(0)
  const [isDeletingSearchItem, setIsDeletingSearchItem] = useState(false)
  const currentSearchItem = searchItems[searchItemIndex % searchItems.length]
  const typedSearchItem = currentSearchItem.slice(0, searchCharacterCount) || currentSearchItem.slice(0, 1)
  const topPickItems = useMemo(() => withoutOwnListings(topPicks.data?.results || [], user), [topPicks.data?.results, user])
  const freshDropItems = useMemo(() => withoutOwnListings(freshDrops.data?.results || [], user), [freshDrops.data?.results, user])
  const suggestedItems = useMemo(() => withoutOwnListings(suggested.data?.results || [], user), [suggested.data?.results, user])
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
      <section className="hero relative isolate flex min-h-[360px] flex-col justify-end overflow-hidden bg-accent px-4 py-10 text-white md:min-h-[430px] md:px-8 lg:px-12 [&_h1]:text-4xl [&_h1]:font-bold [&_h1]:md:text-6xl [&_p]:max-w-2xl [&_p]:text-sm [&_p]:text-white/85 [&_p]:md:text-base max-md:[&_h1]:text-3xl">
        <img alt="" aria-hidden="true" className="absolute inset-0 z-0 h-full w-full object-cover object-center" src={kantamantoMarketHero} />
        <div aria-hidden="true" className="absolute inset-0 z-0 bg-accent/70" />
        <div className="hero-content relative z-10 mx-auto flex w-full max-w-4xl flex-col items-center gap-5 text-center">
          <h1>Thrift smarter.</h1>
          <p>Ghana's digital hub for curated second-hand street style. Authenticity verified, speed guaranteed.</p>
          <form action={withBasePath('/browse')} className="hero-search mx-auto flex w-full max-w-3xl flex-col gap-2 rounded-2xl border border-white/50 bg-white/95 p-2 text-foose-text shadow-2xl shadow-black/15 backdrop-blur sm:flex-row sm:items-center [&_input]:h-12 [&_input]:min-w-0 [&_input]:flex-1 [&_input]:border-0 [&_input]:bg-transparent [&_input]:p-0 [&_input]:text-sm [&_input]:outline-none [&_input]:placeholder:text-foose-muted [&_input]:focus:ring-0 [&_button]:h-12 [&_button]:rounded-xl [&_button]:bg-accent [&_button]:px-6 [&_button]:text-sm [&_button]:font-bold [&_button]:text-white [&_button]:shadow-sm [&_button]:hover:bg-accent-hover [&_button]:focus-visible:outline-2 [&_button]:focus-visible:outline-offset-2 [&_button]:focus-visible:outline-white home-hero-search" method="get" role="search">
            <label className="flex min-h-12 min-w-0 flex-1 items-center gap-3 rounded-xl px-3 focus-within:ring-2 focus-within:ring-accent/20">
              <span className="inline-flex size-8 shrink-0 items-center justify-center text-accent">
                <Icon name="search" size={21} />
              </span>
              <input aria-label="Search marketplace items" autoComplete="off" enterKeyHint="search" name="q" placeholder={`Search marketplace for "${typedSearchItem}"`} type="search" />
            </label>
            <button type="submit">Search</button>
          </form>
        </div>
        <div className="hero-greeting relative z-10 mt-8 flex w-full max-w-[1280px] flex-col items-start gap-1 self-center text-left [&_span]:text-xs [&_span]:uppercase [&_span]:tracking-widest [&_span]:text-white/75 [&_strong]:font-display [&_strong]:text-2xl [&_strong]:md:text-4xl">
          <span>{user ? 'Welcome back' : 'Welcome to Foose'}</span>
          <strong>{user ? `Hey, ${greetingName}` : 'Find your next curated piece.'}</strong>
        </div>
      </section>

      <section className="home-section mx-auto w-full max-w-[1280px] my-8 rounded-xl bg-foose-surface p-4 md:p-6 [&.no-pad]:p-0 [&>h2]:text-2xl [&>h2]:font-bold [&>h2]:md:text-4xl [&_a]:font-bold [&_a]:text-accent max-lg:rounded-lg max-lg:p-3 max-md:[&>h2]:text-2xl promoted-events-section">
        <SectionHeader title="Featured events" />
        <RefreshIndicator active={promotedEvents.refreshing} className="mb-4" label="Refreshing featured events" />
        {promotedEvents.initialLoading && <EventCarouselSkeleton />}
        {promotedEvents.error && <InlineNotice action={<button className="font-black text-accent" onClick={promotedEvents.refetch} type="button">Retry</button>} title="Featured events did not load" tone="error">The rest of Home is still available.</InlineNotice>}
        {!promotedEvents.loading && !promotedEvents.error && !promotedEvents.data?.events.length && (
          <StatePanel body="Promoted events will appear here when campaigns are active." layout="compact" title="No featured events right now" tone="empty" />
        )}
        {!!promotedEvents.data?.events.length && <PromotedEventCarousel events={promotedEvents.data.events} />}
      </section>

      {(topPicks.loading || topPicks.error || topPickItems.length > 0) && (
        <section className="home-section mx-auto w-full max-w-[1280px] my-8 rounded-xl bg-foose-surface p-4 md:p-6 [&.no-pad]:p-0 [&>h2]:text-2xl [&>h2]:font-bold [&>h2]:md:text-4xl [&_a]:font-bold [&_a]:text-accent max-lg:rounded-lg max-lg:p-3 max-md:[&>h2]:text-2xl top-picks-section">
          <SectionHeader title="Top picks" eyebrow="Paid placements for standout finds." action={<a href={withBasePath('/top-picks')}>View more</a>} />
          <RefreshIndicator active={topPicks.refreshing} className="mb-4" label="Refreshing Top Picks" />
          {topPicks.initialLoading && <ProductGridSkeleton count={6} label="Loading Top Picks" />}
          {topPicks.error && <InlineNotice action={<button className="font-black text-accent" onClick={topPicks.refetch} type="button">Retry</button>} title="Top Picks did not refresh" tone="error">Continue browsing the other Home sections.</InlineNotice>}
          {!!topPickItems.length && (
            <div className={homeListingGrid}>
              {topPickItems.slice(0, 21).map((listing) => (
                <ProductCard key={listing._id} listing={listing} />
              ))}
            </div>
          )}
        </section>
      )}

      <section className="home-section mx-auto w-full max-w-[1280px] my-8 rounded-xl bg-foose-surface p-4 md:p-6 [&.no-pad]:p-0 [&>h2]:text-2xl [&>h2]:font-bold [&>h2]:md:text-4xl [&_a]:font-bold [&_a]:text-accent max-lg:rounded-lg max-lg:p-3 max-md:[&>h2]:text-2xl">
        <SectionHeader
          title="Fresh drops"
          eyebrow="Latest active listings from verified sellers."
          action={<a href={withBasePath('/browse')}>View more</a>}
        />
        <RefreshIndicator active={freshDrops.refreshing} className="mb-4" label="Refreshing fresh drops" />
        {freshDrops.initialLoading && <ProductGridSkeleton count={6} label="Loading fresh marketplace drops" />}
        {freshDrops.error && <InlineNotice action={<button className="font-black text-accent" onClick={freshDrops.refetch} type="button">Retry</button>} title="Fresh drops did not load" tone="error">The other Home collections are still available.</InlineNotice>}
        {!freshDrops.loading && !freshDrops.error && !freshDropItems.length && (
          <StatePanel
            action={<ButtonLink to="/open-shop">Open your DigiShop</ButtonLink>}
            body="Listings will appear here as sellers publish them."
            layout="compact"
            title="No listings yet"
            tone="empty"
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

      <section className="home-section mx-auto w-full max-w-[1280px] my-8 rounded-xl bg-foose-surface p-4 md:p-6 [&.no-pad]:p-0 [&>h2]:text-2xl [&>h2]:font-bold [&>h2]:md:text-4xl [&_a]:font-bold [&_a]:text-accent max-lg:rounded-lg max-lg:p-3 max-md:[&>h2]:text-2xl suggested-section">
        <SectionHeader
          title="Suggested for you"
          eyebrow="Personalized from the styles, shops, and details you enjoy."
          action={user ? <a href={withBasePath('/suggested-for-you')}>See more</a> : undefined}
        />
        <RefreshIndicator active={suggested.refreshing} className="mb-4" label="Refreshing personalized suggestions" />
        {!user && (
          <StatePanel
            action={<ButtonLink to={authHref('/login', '/suggested-for-you')}>Sign in</ButtonLink>}
            body="Sign in to build recommendations from the pieces and creators you interact with."
            layout="compact"
            title="Make this feed yours"
            tone="info"
          />
        )}
        {user && suggested.initialLoading && <ProductGridSkeleton count={6} label="Loading your personalized Home picks" />}
        {user && suggested.error && <InlineNotice action={<button className="font-black text-accent" onClick={suggested.refetch} type="button">Retry</button>} title="Suggestions did not load" tone="error">Your other Home collections are unaffected.</InlineNotice>}
        {user && !suggested.loading && !suggested.error && !suggestedItems.length && (
          <StatePanel
            action={<ButtonLink to="/browse">Explore the marketplace</ButtonLink>}
            body="Browse, save, and shop a few pieces so Foose can learn what fits your style."
            layout="compact"
            title="Your suggestions are warming up"
            tone="info"
          />
        )}
        {!!suggestedItems.length && (
          <div className={homeListingGrid}>
            {suggestedItems.slice(0, 18).map((listing, index) => (
              <ProductCard className={threeRowVisibility(index)} key={listing._id} listing={listing} />
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
        <RefreshIndicator active={freshBales.refreshing} className="mb-4" label="Refreshing fresh bales" />
        {freshBales.initialLoading && <ProductGridSkeleton count={6} label="Loading fresh wholesale bales" />}
        {freshBales.error && <InlineNotice action={<button className="font-black text-accent" onClick={freshBales.refetch} type="button">Retry</button>} title="Fresh bales did not load" tone="error">Retail and community sections remain available.</InlineNotice>}
        {!freshBales.loading && !freshBales.error && !freshBaleItems.length && (
          <StatePanel action={<ButtonLink to="/bales">Browse all bales</ButtonLink>} body="Fresh bale listings will appear here when wholesale sellers post them." layout="compact" title="No fresh bales yet" tone="empty" />
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
        <section className="seller-cta digishop-cta relative isolate mx-auto my-10 grid min-h-[260px] w-full max-w-[1280px] overflow-hidden rounded-xl bg-accent p-6 text-white shadow-lg shadow-accent/15 md:min-h-[340px] md:grid-cols-[minmax(0,1fr)_auto] md:items-end md:p-10 [&::before]:absolute [&::before]:inset-0 [&::before]:-z-20 [&::before]:bg-[url('https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?auto=format&fit=crop&w=1800&q=80')] [&::before]:bg-cover [&::before]:bg-center [&::before]:content-[''] [&::after]:absolute [&::after]:inset-0 [&::after]:-z-10 [&::after]:bg-accent/78 [&::after]:content-[''] [&_h2]:max-w-3xl [&_h2]:text-3xl [&_h2]:font-bold md:[&_h2]:text-5xl [&_p]:max-w-2xl [&_p]:text-sm [&_p]:text-white/85 md:[&_p]:text-base">
          <div className="self-end">
            <h2>Turn your closet into a business.</h2>
            <p>Create a verified DigiShop, publish listings, and manage orders from your profile.</p>
          </div>
          <ButtonLink to="/open-shop" variant="secondary">
            Open your DigiShop
          </ButtonLink>
        </section>
      )}

      <section className="home-section mx-auto w-full max-w-[1280px] my-8 rounded-xl bg-foose-surface p-4 md:p-6 [&.no-pad]:p-0 [&>h2]:text-2xl [&>h2]:font-bold [&>h2]:md:text-4xl [&_a]:font-bold [&_a]:text-accent max-lg:rounded-lg max-lg:p-3 max-md:[&>h2]:text-2xl weekly-discovery-section">
        <SectionHeader title="This week's pulse" />
        <div className="weekly-discovery-grid grid gap-4 lg:grid-cols-2">
          <article className="weekly-card rounded-xl border border-foose-border bg-foose-surface shadow-sm p-4 md:p-5 max-lg:rounded-lg max-lg:p-3 top-sellers-card">
            <div className="weekly-card-heading mb-5 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <h2>Top sellers this week</h2>
              </div>
              <Icon name="chart" />
            </div>
            <RefreshIndicator active={topSellers.refreshing} className="mb-4" label="Refreshing weekly sellers" />
            {topSellers.initialLoading && <CompactListSkeleton label="Loading this week's top sellers" />}
            {topSellers.error && <InlineNotice action={<button className="font-black text-accent" onClick={topSellers.refetch} type="button">Retry</button>} title="Seller pulse unavailable" tone="error">Rankings could not be refreshed.</InlineNotice>}
            {!topSellers.loading && !topSellers.error && !topSellers.data?.sellers.length && (
              <StatePanel body="Weekly seller activity will appear after completed marketplace orders are recorded." layout="compact" title="No weekly sellers yet" tone="empty" />
            )}
            {!!topSellers.data?.sellers.length && (
              <div className="top-seller-list flex flex-col gap-3">
                {topSellers.data.sellers.slice(0, 5).map((seller, index) => (
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
              </div>
              <Icon name="search" />
            </div>
            <RefreshIndicator active={popularSearches.refreshing} className="mb-4" label="Refreshing popular searches" />
            {popularSearches.initialLoading && <CompactListSkeleton label="Loading popular marketplace searches" rows={5} />}
            {popularSearches.error && <InlineNotice action={<button className="font-black text-accent" onClick={popularSearches.refetch} type="button">Retry</button>} title="Search pulse unavailable" tone="error">Popular marketplace searches could not be refreshed.</InlineNotice>}
            {!popularSearches.loading && !popularSearches.error && !popularSearches.data?.searches.length && (
              <StatePanel body="Popular marketplace searches will appear as shoppers discover items." layout="compact" title="No search activity yet" tone="empty" />
            )}
            {!!popularSearches.data?.searches.length && (
              <div className="popular-searches flex flex-col gap-3 [&_a]:flex [&_a]:items-center [&_a]:gap-3 [&_a]:rounded-lg [&_a]:border [&_a]:border-foose-border [&_a]:bg-foose-surface-low [&_a]:p-3 [&_a]:hover:border-accent">
                {popularSearches.data.searches.slice(0, 5).map((search) => (
                  <a href={withBasePath(`/browse?q=${encodeURIComponent(search.query)}`)} key={search.normalizedQuery}>
                    <span>{search.query}</span>
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
