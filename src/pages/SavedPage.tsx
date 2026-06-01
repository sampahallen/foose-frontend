import { AppShell, EmptyState, ErrorState, FavoriteButton, LoadingState, ProductCard, SectionHeader } from '../components'
import { useApiResource } from '../hooks/useApiResource'
import type { FavoriteCollections, GalleryPost } from '../types/api'
import { formatDate } from '../utils/format'
import { Icon } from '../components/icons/Icon'
import { cacheFinspoPreview, navigateTo } from '../utils/navigation'
import type { MouseEvent } from 'react'

type SavedTab = 'events' | 'finspos' | 'items'

function savedTab(): SavedTab {
  const value = new URLSearchParams(window.location.search).get('tab')
  return value === 'events' || value === 'finspos' ? value : 'items'
}

function authorName(post: GalleryPost) {
  if (post.userId && typeof post.userId === 'object') return post.userId.name
  return 'Foose member'
}

function authorHref(post: GalleryPost) {
  if (post.userId && typeof post.userId === 'object') return `/profile/${post.userId.username}`
  return '#'
}

function openFinspo(event: MouseEvent<HTMLAnchorElement>, post: GalleryPost) {
  event.preventDefault()
  cacheFinspoPreview(post)
  navigateTo(`/community/finspo/${post._id}`)
}

export function SavedPage() {
  const activeTab = savedTab()
  const favorites = useApiResource<FavoriteCollections>('/favorites')
  const data = favorites.data

  function setTab(tab: SavedTab) {
    navigateTo(`/saved?tab=${tab}`)
  }

  return (
    <AppShell active="saved" searchPlaceholder="Search saved finds...">
      <section className="page-hero small">
        <h1>Saved</h1>
        <p>Your favorite listings, liked Finspo posts, and saved events live here.</p>
      </section>

      <div className="tab-line saved-tabs" role="tablist" aria-label="Saved collections">
        <button className={activeTab === 'items' ? 'active' : ''} onClick={() => setTab('items')} type="button">
          Items
        </button>
        <button className={activeTab === 'events' ? 'active' : ''} onClick={() => setTab('events')} type="button">
          Events
        </button>
        <button className={activeTab === 'finspos' ? 'active' : ''} onClick={() => setTab('finspos')} type="button">
          Finspo
        </button>
      </div>

      {favorites.loading && <LoadingState label="Loading saved items..." />}
      {favorites.error && <ErrorState message={favorites.error} retry={favorites.refetch} />}

      {!favorites.loading && !favorites.error && data && activeTab === 'items' && (
        <section>
          <SectionHeader title="Favorite items" eyebrow={`${data.listings.length} saved`} />
          {!data.listings.length && <EmptyState body="Tap the heart on a listing to save it here." title="No favorite items yet" />}
          {!!data.listings.length && (
            <div className="product-grid four">
              {data.listings.map((listing) => (
                <ProductCard key={listing._id} listing={listing} />
              ))}
            </div>
          )}
        </section>
      )}

      {!favorites.loading && !favorites.error && data && activeTab === 'events' && (
        <section>
          <SectionHeader title="Saved events" eyebrow={`${data.events.length} saved`} />
          {!data.events.length && <EmptyState body="Save public events from Community to revisit them here." title="No saved events yet" />}
          {!!data.events.length && (
            <div className="event-grid">
              {data.events.map((event) => (
                <article className="event-card" key={event._id}>
                  <div className="event-image">
                    {event.coverImage ? <img alt="" src={event.coverImage} /> : <span className="image-placeholder">No image</span>}
                  </div>
                  <div>
                    <p>
                      <Icon name="calendar" /> {formatDate(event.date)}
                    </p>
                    <h2>{event.title}</h2>
                    <p>
                      <Icon name="location" /> {event.location || 'Location pending'}
                    </p>
                    <FavoriteButton
                      className="button button-secondary favorite-button"
                      onChange={(active) => {
                        if (!active) void favorites.refetch()
                      }}
                      showText
                      targetId={event._id}
                      targetType="event"
                    />
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {!favorites.loading && !favorites.error && data && activeTab === 'finspos' && (
        <section>
          <SectionHeader title="Liked Finspo" eyebrow={`${data.finspos.length} liked`} />
          {!data.finspos.length && <EmptyState body="Like Finspo posts in Community to collect them here." title="No liked Finspo yet" />}
          {!!data.finspos.length && (
            <div className="finspo-masonry">
              {data.finspos.map((post) => (
                <article className="finspo-tile" key={post._id}>
                  <a
                    aria-label={post.caption || `Finspo by ${authorName(post)}`}
                    className="finspo-image finspo-tile-link"
                    href={`/community/finspo/${post._id}`}
                    onClick={(event) => openFinspo(event, post)}
                  >
                    <img alt="" src={post.imageUrl} />
                  </a>
                  <a className="finspo-author-link" href={authorHref(post)}>
                    {authorName(post)}
                  </a>
                  <FavoriteButton
                    className="floating-round favorite-button"
                    onChange={(active) => {
                      if (!active) void favorites.refetch()
                    }}
                    targetId={post._id}
                    targetType="finspo"
                  />
                </article>
              ))}
            </div>
          )}
        </section>
      )}
    </AppShell>
  )
}
