import { AppShell, ButtonLink, EmptyState, ErrorState, Footer, LoadingState, ProductCard, SectionHeader } from '../components'
import { useApiResource } from '../hooks/useApiResource'
import type { Event, Listing } from '../types/api'
import { formatDate } from '../utils/format'

export function HomePage() {
  const featured = useApiResource<{ listings: Listing[] }>('/search/featured')
  const events = useApiResource<{ events: Event[] }>('/community/events')

  return (
    <AppShell active="browse" flush searchPlaceholder="Search curated finds...">
      <section className="hero">
        <div className="hero-content">
          <h1>Thrift smarter.</h1>
          <p>Ghana's digital hub for curated second-hand street style. Authenticity verified, speed guaranteed.</p>
          <form action="/browse" className="hero-search" method="get">
            <input aria-label="Marketplace search" name="q" placeholder="Search vintage jerseys, boots, or bales..." />
            <select aria-label="Category" name="category">
              <option value="">All Categories</option>
              <option>Tops</option>
              <option>Footwear</option>
              <option>Bales</option>
            </select>
            <button type="submit">Search</button>
          </form>
        </div>
      </section>

      <section className="category-strip">
        {['All', 'Tops', 'Bottoms', 'Footwear', 'Accessories', 'Bales'].map((category, index) => (
          <a className={index === 0 ? 'active' : ''} href={index === 0 ? '/browse' : `/browse?category=${category}`} key={category}>
            {category}
          </a>
        ))}
      </section>

      <section className="home-section">
        <SectionHeader
          title="Fresh drops"
          eyebrow="Latest active listings from verified sellers."
          action={<a href="/browse">View all &gt;</a>}
        />
        {featured.loading && <LoadingState label="Loading listings..." />}
        {featured.error && <ErrorState message={featured.error} retry={featured.refetch} />}
        {!featured.loading && !featured.error && !featured.data?.listings.length && (
          <EmptyState
            action={<ButtonLink to="/open-shop">Open your DigiShop</ButtonLink>}
            body="The marketplace is ready. Listings will appear here as sellers publish them."
            title="No listings yet"
          />
        )}
        {!!featured.data?.listings.length && (
          <div className="product-grid four">
            {featured.data.listings.map((listing) => (
              <ProductCard key={listing._id} listing={listing} />
            ))}
          </div>
        )}
      </section>

      <section className="home-section">
        <SectionHeader title="What's happening" action={<a href="/community">Community</a>} />
        {events.loading && <LoadingState label="Loading events..." />}
        {events.error && <ErrorState message={events.error} retry={events.refetch} />}
        {!events.loading && !events.error && !events.data?.events.length && (
          <EmptyState body="Events created through the API will appear here." title="No upcoming events" />
        )}
        {!!events.data?.events.length && (
          <div className="event-row compact">
            {events.data.events.slice(0, 3).map((event) => (
              <article className="mini-event" key={event._id}>
                <span>{formatDate(event.date)}</span>
                <h3>{event.title}</h3>
                <p>{event.description || event.location || 'Community event'}</p>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="seller-cta">
        <div>
          <h2>Turn your closet into a business.</h2>
          <p>Create a verified DigiShop, publish listings, and manage orders from your seller dashboard.</p>
        </div>
        <ButtonLink to="/open-shop" variant="secondary">
          Open your DigiShop
        </ButtonLink>
      </section>

      <Footer />
    </AppShell>
  )
}
