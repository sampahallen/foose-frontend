import { AppShell, ButtonLink, EmptyState, ErrorState, Footer, Icon, LoadingState, ProductCard, PromotedEventCarousel, SectionHeader } from '../components'
import { useAuth } from '../hooks/useAuth'
import { useApiResource } from '../hooks/useApiResource'
import type { Event, PaginatedListings, PopularSearch, WeeklyTopSeller } from '../types/api'
import { formatMoney, initials } from '../utils/format'
import { withBasePath } from '../utils/navigation'

export function HomePage() {
  const { user } = useAuth()
  const freshDrops = useApiResource<PaginatedListings>('/search?page=1&limit=8&sort=newest')
  const promotedEvents = useApiResource<{ events: Event[] }>('/community/events/featured')
  const topPicks = useApiResource<PaginatedListings>('/search/top-picks?page=1&limit=4&sort=newest')
  const popularSearches = useApiResource<{ searches: PopularSearch[] }>('/search/popular-searches?limit=8')
  const topSellers = useApiResource<{ sellers: WeeklyTopSeller[] }>('/search/top-sellers?limit=6')
  const greetingName = user?.name || user?.username || 'friend'

  return (
    <AppShell active="home" flush searchPlaceholder="Search curated finds...">
      <section className="hero relative isolate flex min-h-[360px] flex-col justify-end overflow-hidden bg-accent px-4 py-10 text-white md:min-h-[430px] md:px-8 lg:px-12 [&::before]:absolute [&::before]:inset-0 [&::before]:-z-10 [&::before]:bg-[url('https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&w=1800&q=80')] [&::before]:bg-cover [&::before]:bg-center [&::before]:opacity-45 [&::before]:content-[''] [&::after]:absolute [&::after]:inset-0 [&::after]:-z-10 [&::after]:bg-accent/70 [&::after]:content-[''] [&_h1]:text-4xl [&_h1]:font-bold [&_h1]:md:text-6xl [&_p]:max-w-2xl [&_p]:text-sm [&_p]:text-white/85 [&_p]:md:text-base max-md:[&_h1]:text-3xl">
        <div className="hero-content mx-auto flex w-full max-w-4xl flex-col items-center gap-5 text-center">
          <h1>Thrift smarter.</h1>
          <p>Ghana's digital hub for curated second-hand street style. Authenticity verified, speed guaranteed.</p>
          <form action={withBasePath('/browse')} className="hero-search mx-auto flex w-full max-w-3xl flex-col gap-2 rounded-xl bg-white p-2 text-foose-text shadow-xl sm:flex-row [&_input]:h-11 [&_input]:flex-1 [&_input]:border-0 [&_input]:bg-transparent [&_input]:px-3 [&_input]:focus:ring-0 [&_select]:h-11 [&_select]:flex-1 [&_select]:border-0 [&_select]:bg-transparent [&_select]:px-3 [&_select]:focus:ring-0 [&_button]:h-11 [&_button]:rounded-lg [&_button]:bg-accent [&_button]:px-6 [&_button]:text-sm [&_button]:font-bold [&_button]:text-white [&_button]:hover:bg-accent-hover home-hero-search" method="get">
            <Icon name="search" />
            <input aria-label="Search Foose" name="q" placeholder="Search jackets, Adidas, denim, bales..." />
            <button type="submit">Search</button>
          </form>
        </div>
        <div className="hero-greeting mt-8 flex w-full max-w-[1280px] flex-col items-start gap-1 self-center text-left [&_span]:text-xs [&_span]:uppercase [&_span]:tracking-widest [&_span]:text-white/75 [&_strong]:font-display [&_strong]:text-2xl [&_strong]:md:text-4xl">
          <span>{user ? 'Welcome back' : 'Welcome to Foose'}</span>
          <strong>{user ? `Hey, ${greetingName}` : 'Find your next curated piece.'}</strong>
        </div>
      </section>

      <section className="home-section mx-auto w-full max-w-[1280px] my-8 rounded-xl border border-foose-border bg-foose-surface p-4 md:p-6 [&.no-pad]:p-0 [&>h2]:text-2xl [&>h2]:font-bold [&>h2]:md:text-4xl [&_a]:font-bold [&_a]:text-accent max-lg:rounded-lg max-lg:p-3 max-md:[&>h2]:text-2xl promoted-events-section">
        <SectionHeader title="Featured events" eyebrow="Promoted event banners from the community." action={<a href="/community">View events</a>} />
        {promotedEvents.loading && <LoadingState label="Loading featured events..." />}
        {promotedEvents.error && <ErrorState message={promotedEvents.error} retry={promotedEvents.refetch} />}
        {!promotedEvents.loading && !promotedEvents.error && !promotedEvents.data?.events.length && (
          <EmptyState body="Promoted events will appear here when campaigns are active." title="No featured events yet" />
        )}
        {!!promotedEvents.data?.events.length && <PromotedEventCarousel events={promotedEvents.data.events} />}
      </section>

      <section className="home-section mx-auto w-full max-w-[1280px] my-8 rounded-xl border border-foose-border bg-foose-surface p-4 md:p-6 [&.no-pad]:p-0 [&>h2]:text-2xl [&>h2]:font-bold [&>h2]:md:text-4xl [&_a]:font-bold [&_a]:text-accent max-lg:rounded-lg max-lg:p-3 max-md:[&>h2]:text-2xl top-picks-section">
        <SectionHeader title="Top picks" eyebrow="Paid placements for standout finds." action={<a href="/top-picks">Explore Top Picks</a>} />
        {topPicks.loading && <LoadingState label="Loading top picks..." />}
        {topPicks.error && <ErrorState message={topPicks.error} retry={topPicks.refetch} />}
        {!topPicks.loading && !topPicks.error && !topPicks.data?.results.length && (
          <EmptyState body="Top Picks will appear when promoted listings are active." title="No top picks yet" />
        )}
        {!!topPicks.data?.results.length && (
          <div className="product-grid grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4 [&.four]:grid-cols-2 [&.four]:lg:grid-cols-4 max-md:grid-cols-2 max-md:gap-3 max-md:[&.four]:grid-cols-2 max-md:[&.four]:gap-3 four home-product-grid">
            {topPicks.data.results.map((listing) => (
              <ProductCard key={listing._id} listing={listing} />
            ))}
          </div>
        )}
      </section>

      <section className="home-section mx-auto w-full max-w-[1280px] my-8 rounded-xl border border-foose-border bg-foose-surface p-4 md:p-6 [&.no-pad]:p-0 [&>h2]:text-2xl [&>h2]:font-bold [&>h2]:md:text-4xl [&_a]:font-bold [&_a]:text-accent max-lg:rounded-lg max-lg:p-3 max-md:[&>h2]:text-2xl">
        <SectionHeader
          title="Fresh drops"
          eyebrow="Latest active listings from verified sellers."
          action={<a href="/browse">View all &gt;</a>}
        />
        {freshDrops.loading && <LoadingState label="Loading listings..." />}
        {freshDrops.error && <ErrorState message={freshDrops.error} retry={freshDrops.refetch} />}
        {!freshDrops.loading && !freshDrops.error && !freshDrops.data?.results.length && (
          <EmptyState
            action={<ButtonLink to="/open-shop">Open your DigiShop</ButtonLink>}
            body="Listings will appear here as sellers publish them."
            title="No listings yet"
          />
        )}
        {!!freshDrops.data?.results.length && (
          <div className="product-grid grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4 [&.four]:grid-cols-2 [&.four]:lg:grid-cols-4 max-md:grid-cols-2 max-md:gap-3 max-md:[&.four]:grid-cols-2 max-md:[&.four]:gap-3 four home-product-grid">
            {freshDrops.data.results.map((listing) => (
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

      <section className="home-section mx-auto w-full max-w-[1280px] my-8 rounded-xl border border-foose-border bg-foose-surface p-4 md:p-6 [&.no-pad]:p-0 [&>h2]:text-2xl [&>h2]:font-bold [&>h2]:md:text-4xl [&_a]:font-bold [&_a]:text-accent max-lg:rounded-lg max-lg:p-3 max-md:[&>h2]:text-2xl weekly-discovery-section">
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
                  <a className="top-seller-row flex items-center justify-between gap-3 rounded-lg border border-foose-border bg-foose-surface-low p-3 hover:border-accent [&_img]:size-10 [&_img]:rounded-full [&_img]:object-cover" href={withBasePath(`/shops/${seller.slug}`)} key={seller._id}>
                    <span className="seller-rank inline-flex size-8 items-center justify-center rounded-full bg-accent text-sm font-bold text-white">{index + 1}</span>
                    {seller.logoUrl ? <img alt="" src={seller.logoUrl} /> : <span className="seller-avatar inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-accent-light text-sm font-bold text-accent">{initials(seller.shopName)}</span>}
                    <span>
                      <strong>{seller.shopName}</strong>
                      <small>
                        {seller.completedOrders} completed {seller.completedOrders === 1 ? 'order' : 'orders'}
                      </small>
                    </span>
                    <b>{formatMoney(seller.revenue || 0)}</b>
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

      <Footer />
    </AppShell>
  )
}
