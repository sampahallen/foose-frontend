import { useEffect, useState } from 'react'
import { AppShell, Badge, ButtonLink, EmptyState, ErrorState, LightboxImage, LoadingState, ProductCard, SectionHeader } from '../components'
import { useAuth } from '../hooks/useAuth'
import { useApiResource } from '../hooks/useApiResource'
import { apiPost } from '../lib/api'
import type { Event, GalleryPost, Listing, Order, Shop, User } from '../types/api'
import { authHref } from '../utils/authRedirect'
import { getErrorMessage } from '../utils/errorMessage'
import { formatDate, formatMoney, initials } from '../utils/format'
import { navigateTo } from '../utils/navigation'

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
  return decodeURIComponent(window.location.pathname.replace(/^\/profile\/?/, '')).trim()
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
    if (shouldRedirectToAuth) navigateTo(authHref('/register', '/profile'))
  }, [shouldRedirectToAuth])

  async function toggleFollow() {
    if (!data) return
    if (!user) {
      navigateTo(authHref('/register'))
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
          <section className="profile-hero">
            {data.user.profilePhoto ? <img alt="" src={data.user.profilePhoto} /> : <span className="initials">{initials(data.user.name)}</span>}
            <div>
              <h1>{data.user.name}</h1>
              <p>@{data.user.username}</p>
              <div className="badge-row">
                {data.user.isKycVerified && <Badge tone="success">Verified</Badge>}
                {data.user.hasShop && <Badge tone="accent">Seller</Badge>}
                <Badge>{followerCount} followers</Badge>
                <Badge>{data.followingCount || 0} following</Badge>
              </div>
            </div>
            {!isOwnProfile && (
              <button className="button button-secondary" onClick={() => void toggleFollow()} type="button">
                {isFollowing ? 'Following' : 'Follow'}
              </button>
            )}
          </section>
          {followError && <ErrorState message={followError} />}

          <div className="profile-grid">
            <section>
              <SectionHeader title="Active orders" />
              {!data.activeOrders.length && <EmptyState body="Active orders will appear here." title="No active orders" />}
              {!!data.activeOrders.length && (
                <div className="seller-orders">
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

            <aside className="manage-card">
              <h2>Shop</h2>
              {data.shop ? (
                <>
                  <strong>{data.shop.shopName}</strong>
                  <p>{data.shop.bio || 'No shop bio yet.'}</p>
                  <div className="button-row">
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

          <section className="home-section no-pad">
            <SectionHeader title="Listings" />
            {!data.listings.length && <EmptyState body="Listings from this profile will appear here." title="No listings" />}
            {!!data.listings.length && (
              <div className="product-grid four">
                {data.listings.map((listing) => (
                  <ProductCard key={listing._id} listing={listing} />
                ))}
              </div>
            )}
          </section>

          <section className="profile-grid">
            <div>
              <SectionHeader title="Events posted" />
              {!data.events.length && <EmptyState body="Hosted events will appear here." title="No events" />}
              {!!data.events.length && (
                <div className="event-row compact">
                  {data.events.slice(0, 3).map((event) => (
                    <article className="mini-event" key={event._id}>
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
                <div className="profile-gallery">
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
