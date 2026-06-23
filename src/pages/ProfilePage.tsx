import { useEffect, useState } from 'react'
import { AppShell, Badge, ButtonLink, EmptyState, ErrorState, LightboxImage, LoadingState, ProductCard, SectionHeader } from '../components'
import { useAuth } from '../hooks/useAuth'
import { useApiResource } from '../hooks/useApiResource'
import { apiPost } from '../lib/api'
import type { Event, GalleryPost, Listing, Order, Shop, User } from '../types/api'
import { authHref } from '../utils/authRedirect'
import { getErrorMessage } from '../utils/errorMessage'
import { formatDate, formatMoney, initials } from '../utils/format'
import { getCurrentAppPathname, navigateTo } from '../utils/navigation'

type ProfilePayload = {
  user: User
  activeOrders: Order[]
  events: Event[]
  followerCount: number
  followingCount: number
  gallery: GalleryPost[]
  isFollowing?: boolean
  listings: Listing[]
  shop?: Shop | null
}

function profileUsername() {
  return decodeURIComponent(getCurrentAppPathname().replace(/^\/profile\/?/, '')).trim()
}

export function ProfilePage() {
  const { status, user } = useAuth()
  const username = profileUsername()
  const path = username ? `/users/${username}/profile` : user ? '/users/me/profile' : null
  const profile = useApiResource<ProfilePayload>(path)
  const followResource = useApiResource<{ followerCount: number; following: boolean }>(
    username && user ? `/users/${username}/follow` : null,
  )
  const [followError, setFollowError] = useState('')
  const [followState, setFollowState] = useState<{ count?: number; following?: boolean }>({})
  const data = profile.data
  const isOwnProfile = Boolean(data && user && data.user.username === user.username)
  const followerCount = followState.count ?? followResource.data?.followerCount ?? data?.followerCount ?? 0
  const isFollowing = followState.following ?? followResource.data?.following ?? Boolean(data?.isFollowing)
  const shouldRedirectToAuth = !username && status === 'guest' && !user

  useEffect(() => {
    if (shouldRedirectToAuth) navigateTo(authHref('/login', '/profile'))
  }, [shouldRedirectToAuth])

  async function toggleFollow() {
    if (!data) return
    if (!user) {
      navigateTo(authHref('/login'))
      return
    }

    setFollowError('')
    try {
      const result = await apiPost<{ followerCount: number; following: boolean }>(`/users/${data.user.username}/follow`)
      setFollowState({ count: result.followerCount, following: result.following })
    } catch (error) {
      setFollowError(getErrorMessage(error, 'Could not update follow status'))
    }
  }

  if (!username && status === 'checking' && !user) return <LoadingState label="Checking your session..." />

  if (shouldRedirectToAuth) return <LoadingState label="Redirecting to sign up..." />

  return (
    <AppShell active="profile" searchPlaceholder="Search Foose...">
      {profile.loading && <LoadingState label="Loading profile..." />}
      {profile.error && <ErrorState message={profile.error} retry={profile.refetch} />}
      {data && (
        <>
          <section className="profile-hero rounded-xl border border-foose-border bg-foose-surface shadow-sm mb-6 flex flex-col items-center gap-3 p-6 text-center [&>img]:size-24 [&>img]:rounded-full [&>img]:object-cover [&>.initials]:size-24 [&>.initials]:rounded-full [&>.initials]:object-cover">
            {data.user.profilePhoto ? <img alt="" src={data.user.profilePhoto} /> : <span className="initials inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-accent-light text-sm font-bold text-accent">{initials(data.user.name)}</span>}
            <div>
              <h1>{data.user.name}</h1>
              <p>@{data.user.username}</p>
              {data.user.bio && <p className="mx-auto mt-2 max-w-xl normal-case tracking-normal text-foose-muted">{data.user.bio}</p>}
              <div className="badge-row flex flex-wrap items-center gap-3">
                {data.user.isKycVerified && <Badge tone="success">Verified</Badge>}
                {data.user.hasShop && <Badge tone="accent">Seller</Badge>}
                <Badge>{followerCount} followers</Badge>
                <Badge>{data.followingCount || 0} following</Badge>
              </div>
            </div>
            {!isOwnProfile && (
              <button className="button inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border px-5 py-2.5 text-center text-sm font-bold transition disabled:pointer-events-none disabled:opacity-50 [&.full]:w-full button-secondary border-foose-border bg-foose-surface text-foose-text hover:border-accent hover:text-accent" onClick={() => void toggleFollow()} type="button">
                {isFollowing ? 'Following' : 'Follow'}
              </button>
            )}
            {isOwnProfile && (
              <ButtonLink to="/profile/settings" variant="secondary">
                Edit profile
              </ButtonLink>
            )}
          </section>
          {followError && <ErrorState message={followError} />}

          <div className="profile-grid grid gap-6 md:grid-cols-2">
            <section>
              <SectionHeader title="Active orders" />
              {!data.activeOrders.length && <EmptyState body="Active orders will appear here." title="No active orders" />}
              {!!data.activeOrders.length && (
                <div className="seller-orders space-y-4 [&_article.highlighted]:border-accent [&_article.highlighted]:bg-accent-light">
                  {data.activeOrders.map((order) => (
                    <article key={order._id}>
                      <div>
                        <h3>{order.items.map((item) => item.title).join(', ')}</h3>
                        <p>{formatMoney(order.totalAmount, order.currency)} / {formatDate(order.createdAt)}</p>
                        <Badge tone={order.status === 'disputed' ? 'danger' : 'accent'}>{order.status}</Badge>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>

            <aside className="manage-card rounded-xl border border-foose-border bg-foose-surface shadow-sm p-4 md:p-5 [&_p]:text-xs [&_p]:uppercase [&_p]:tracking-wide [&_p]:text-foose-faint [&_a]:flex [&_a]:min-h-28 [&_a]:flex-col [&_a]:items-center [&_a]:justify-center [&_a]:gap-3 [&_a]:rounded-xl [&_a]:border [&_a]:border-foose-border [&_a]:bg-foose-surface [&_a]:p-4 [&_a]:text-center [&_a]:font-semibold [&_a]:hover:border-accent [&_a]:hover:text-accent">
              <h2>Shop</h2>
              {data.shop ? (
                <>
                  <strong>{data.shop.shopName}</strong>
                  <p>{data.shop.bio || 'No shop bio yet.'}</p>
                  <div className="button-row flex flex-wrap items-center gap-3">
                    <ButtonLink to={`/shops/${data.shop.slug}`} variant="secondary">
                      View shop
                    </ButtonLink>
                    {isOwnProfile && (
                      <ButtonLink to="/manage-shop">
                        Manage shop
                      </ButtonLink>
                    )}
                  </div>
                </>
              ) : (
                <p>No DigiShop yet.</p>
              )}
            </aside>
          </div>

          <section className="home-section mx-auto w-full max-w-[1280px] my-8 rounded-xl border border-foose-border bg-foose-surface p-4 md:p-6 [&.no-pad]:p-0 [&>h2]:text-2xl [&>h2]:font-bold [&>h2]:md:text-4xl [&_a]:font-bold [&_a]:text-accent max-lg:rounded-lg max-lg:p-3 max-md:[&>h2]:text-2xl no-pad">
            <SectionHeader title="Listings" />
            {!data.listings.length && <EmptyState body="Listings from this profile will appear here." title="No listings" />}
            {!!data.listings.length && (
              <div className="product-grid grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4 [&.four]:grid-cols-2 [&.four]:lg:grid-cols-4 max-md:grid-cols-2 max-md:gap-3 max-md:[&.four]:grid-cols-2 max-md:[&.four]:gap-3 four">
                {data.listings.map((listing) => (
                  <ProductCard key={listing._id} listing={listing} />
                ))}
              </div>
            )}
          </section>

          <section className="profile-grid grid gap-6 md:grid-cols-2">
            <div>
              <SectionHeader title="Events posted" />
              {!data.events.length && <EmptyState body="Hosted events will appear here." title="No events" />}
              {!!data.events.length && (
                <div className="event-row compact">
                  {data.events.slice(0, 3).map((event) => (
                    <article className="mini-event rounded-xl border border-foose-border bg-foose-surface shadow-sm p-4 md:p-5 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:leading-tight [&_h3]:md:text-lg [&_p]:text-xs [&_p]:uppercase [&_p]:tracking-wide [&_p]:text-foose-faint" key={event._id}>
                      <span>{formatDate(event.date)}</span>
                      <h3>{event.title}</h3>
                      <p>{event.location || event.description || 'Community event'}</p>
                    </article>
                  ))}
                </div>
              )}
            </div>
            <div>
              <SectionHeader title="Gallery items" />
              {!data.gallery.length && <EmptyState body="Gallery posts will appear here." title="No gallery posts" />}
              {!!data.gallery.length && (
                <div className="profile-gallery grid grid-cols-2 gap-3 md:grid-cols-3 [&_img]:aspect-square [&_img]:rounded-lg [&_img]:object-cover">
                  {data.gallery.slice(0, 6).map((post) => (
                    <LightboxImage alt={post.caption || 'Gallery post'} key={post._id} src={post.imageUrl} />
                  ))}
                </div>
              )}
            </div>
          </section>
        </>
      )}
    </AppShell>
  )
}
