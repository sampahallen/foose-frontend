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
      <section className="hero">
        <div className="hero-content">
          <h1>Thrift smarter.</h1>
          <p>Ghana's digital hub for curated second-hand street style. Authenticity verified, speed guaranteed.</p>
          <form action={withBasePath('/browse')} className="hero-search home-hero-search" method="get">
            <Icon name="search" />
            <input aria-label="Search Foose" name="q" placeholder="Search jackets, Adidas, denim, bales..." />
            <button type="submit">Search</button>
          </form>
        </div>
        <div className="hero-greeting">
          <span>{user ? 'Welcome back' : 'Welcome to Foose'}</span>
          <strong>{user ? `Hey, ${greetingName}` : 'Find your next curated piece.'}</strong>
        </div>
      </section>

      <section className="home-section promoted-events-section">
        <SectionHeader title="Featured events" eyebrow="Promoted event banners from the community." action={<a href="/community">View events</a>} />
        {promotedEvents.loading && <LoadingState label="Loading featured events..." />}
        {promotedEvents.error && <ErrorState message={promotedEvents.error} retry={promotedEvents.refetch} />}
        {!promotedEvents.loading && !promotedEvents.error && !promotedEvents.data?.events.length && (
          <EmptyState body="Promoted events will appear here when campaigns are active." title="No featured events yet" />
        )}
        {!!promotedEvents.data?.events.length && <PromotedEventCarousel events={promotedEvents.data.events} />}
      </section>

      <section className="home-section top-picks-section">
        <SectionHeader title="Top picks" eyebrow="Paid placements for standout finds." action={<a href="/top-picks">Explore Top Picks</a>} />
        {topPicks.loading && <LoadingState label="Loading top picks..." />}
        {topPicks.error && <ErrorState message={topPicks.error} retry={topPicks.refetch} />}
        {!topPicks.loading && !topPicks.error && !topPicks.data?.results.length && (
          <EmptyState body="Top Picks will appear when promoted listings are active." title="No top picks yet" />
        )}
        {!!topPicks.data?.results.length && (
          <div className="product-grid four home-product-grid">
            {topPicks.data.results.map((listing) => (
              <ProductCard key={listing._id} listing={listing} />
            ))}
          </div>
        )}
      </section>

      <section className="home-section">
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
          <div className="product-grid four home-product-grid">
            {freshDrops.data.results.map((listing) => (
              <ProductCard key={listing._id} listing={listing} />
            ))}
          </div>
        )}
      </section>

      {!user?.hasShop && (
        <section className="seller-cta">
          <div>
            <h2>Turn your closet into a business.</h2>
            <p>Create a verified DigiShop, publish listings, and manage orders from your profile.</p>
          </div>
          <ButtonLink to="/open-shop" variant="secondary">
            Open your DigiShop
          </ButtonLink>
        </section>
      )}

      <section className="home-section weekly-discovery-section">
        <SectionHeader title="This week's pulse" eyebrow="Daily refreshes from the current marketplace week." />
        <div className="weekly-discovery-grid">
          <article className="weekly-card top-sellers-card">
            <div className="weekly-card-heading">
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
              <div className="top-seller-list">
                {topSellers.data.sellers.map((seller, index) => (
                  <a className="top-seller-row" href={withBasePath(`/shops/${seller.slug}`)} key={seller._id}>
                    <span className="seller-rank">{index + 1}</span>
                    {seller.logoUrl ? <img alt="" src={seller.logoUrl} /> : <span className="seller-avatar">{initials(seller.shopName)}</span>}
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

          <article className="weekly-card popular-search-card">
            <div className="weekly-card-heading">
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
              <div className="popular-searches">
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
