import { AppShell, EmptyState, ErrorState, FavoriteButton, LoadingState, ProductCard, SectionHeader } from '../components'
import { useApiResource } from '../hooks/useApiResource'
import type { FavoriteCollections, GalleryPost } from '../types/api'
import { formatDate } from '../utils/format'
import { Icon } from '../components/icons/Icon'
import { cacheFinspoPreview, navigateTo, withBasePath } from '../utils/navigation'
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
      <section className="page-hero [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:md:text-4xl [&_p]:text-sm [&_p]:leading-6 [&_p]:text-foose-muted [&_p]:md:text-base mb-8 rounded-xl border border-foose-border bg-foose-surface p-5 md:p-8 [&.small]:py-6 max-md:[&_h1]:text-2xl small">
        <h1>Saved</h1>
        <p>Your favorite listings, liked Finspo posts, and saved events live here.</p>
      </section>

      <div className="tab-line [&_button]:shrink-0 [&_button]:rounded-full [&_button]:border [&_button]:border-foose-border [&_button]:bg-foose-surface-low [&_button]:px-4 [&_button]:py-2 [&_button]:text-sm [&_button]:font-semibold [&_button]:text-foose-muted [&_button]:transition [&_button]:hover:border-accent [&_button]:hover:text-accent [&_a]:shrink-0 [&_a]:rounded-full [&_a]:border [&_a]:border-foose-border [&_a]:bg-foose-surface-low [&_a]:px-4 [&_a]:py-2 [&_a]:text-sm [&_a]:font-semibold [&_a]:text-foose-muted [&_a]:transition [&_a]:hover:border-accent [&_a]:hover:text-accent [&_button.active]:border-accent [&_button.active]:bg-accent [&_button.active]:text-white [&_a.active]:border-accent [&_a.active]:bg-accent [&_a.active]:text-white flex flex-wrap items-center gap-2 saved-tabs" role="tablist" aria-label="Saved collections">
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
            <div className="product-grid grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4 [&.four]:grid-cols-2 [&.four]:lg:grid-cols-4 max-md:grid-cols-2 max-md:gap-3 max-md:[&.four]:grid-cols-2 max-md:[&.four]:gap-3 four">
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
            <div className="event-grid grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {data.events.map((event) => (
                <article className="event-card rounded-xl border border-foose-border bg-foose-surface shadow-sm p-4 md:p-5 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:leading-tight [&_h2]:md:text-lg [&_p]:text-xs [&_p]:uppercase [&_p]:tracking-wide [&_p]:text-foose-faint overflow-hidden p-0 [&>div:last-child]:flex [&>div:last-child]:flex-col [&>div:last-child]:gap-3 [&>div:last-child]:p-4 [&_.button]:w-full [&_.table-actions_.button]:w-full" key={event._id}>
                  <div className="event-image overflow-hidden rounded-lg bg-foose-surface-mid [&_img]:h-full [&_img]:w-full [&_img]:object-cover aspect-[16/9] rounded-none">
                    {event.coverImage ? <img alt="" src={event.coverImage} /> : <span className="image-placeholder flex min-h-32 items-center justify-center bg-foose-surface-mid text-sm font-semibold text-foose-faint">No image</span>}
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
                      className="button inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border px-5 py-2.5 text-center text-sm font-bold transition disabled:pointer-events-none disabled:opacity-50 [&.full]:w-full button-secondary border-foose-border bg-foose-surface text-foose-text hover:border-accent hover:text-accent favorite-button [&.is-active]:bg-foose-danger-bg [&.is-active]:text-foose-danger"
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
            <div className="finspo-masonry columns-2 gap-3 md:columns-3 lg:columns-4 max-md:columns-2 max-md:gap-2">
              {data.finspos.map((post) => (
                <article className="finspo-tile relative mb-3 break-inside-avoid max-md:mb-2" key={post._id}>
                  <a
                    aria-label={post.caption || `Finspo by ${authorName(post)}`}
                    className="finspo-image block overflow-hidden rounded-none border-0 bg-transparent [&_img]:h-auto [&_img]:w-full [&_img]:object-contain finspo-tile-link"
                    href={withBasePath(`/community/finspo/${post._id}`)}
                    onClick={(event) => openFinspo(event, post)}
                  >
                    <img alt="" src={post.imageUrl} />
                  </a>
                  <a className="finspo-author-link mt-2 flex items-center gap-2 text-sm font-semibold text-foose-muted" href={authorHref(post)}>
                    {authorName(post)}
                  </a>
                  <FavoriteButton
                    className="floating-round inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-transparent bg-transparent text-current transition hover:bg-accent-light hover:text-accent absolute right-3 top-3 z-10 bg-white/90 shadow favorite-button [&.is-active]:bg-foose-danger-bg [&.is-active]:text-foose-danger"
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
