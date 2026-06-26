import { useEffect, useState } from 'react'
import { MdVerified } from 'react-icons/md'
import { AppShell, Badge, ButtonLink, EmptyState, ErrorState, Icon, LightboxImage, LoadingState, ProductCard, SectionHeader } from '../components'
import { useAuth } from '../hooks/useAuth'
import { useApiResource } from '../hooks/useApiResource'
import { apiPost } from '../lib/api'
import type { Event, GalleryPost, Listing, Order, Shop, User } from '../types/api'
import { authHref } from '../utils/authRedirect'
import { getErrorMessage } from '../utils/errorMessage'
import { formatDate, formatMoney, initials } from '../utils/format'
import { getCurrentAppPathname, navigateTo, withBasePath } from '../utils/navigation'

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
          <section className="mb-7 rounded-2xl border border-foose-border bg-foose-surface p-5 shadow-sm md:p-8">
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:gap-10">
              <div className="relative mx-auto shrink-0 md:mx-0">
                {data.user.profilePhoto ? (
                  <img alt="" className="size-28 rounded-full object-cover ring-4 ring-white shadow-lg md:size-36" src={data.user.profilePhoto} />
                ) : (
                  <span className="inline-flex size-28 items-center justify-center rounded-full bg-accent-light text-3xl font-black text-accent ring-4 ring-white shadow-lg md:size-36">
                    {initials(data.user.name)}
                  </span>
                )}
                {data.user.isKycVerified && (
                  <span className="absolute bottom-2 right-0 inline-flex size-9 items-center justify-center rounded-full bg-accent text-white ring-4 ring-white md:size-10">
                    <MdVerified aria-label="Verified profile" />
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1 text-center md:text-left">
                <h1 className="text-3xl font-black text-foose-text md:text-5xl">{data.user.name}</h1>
                <p className="mt-1 text-sm font-bold text-accent">@{data.user.username}</p>
                <p className="mt-4 max-w-2xl text-base leading-7 text-foose-text">{data.user.bio || "I'm just a Foose member finding curated second-hand gems."}</p>
                <div className="mt-6 flex flex-wrap items-center justify-center gap-3 md:justify-start">
                  <span className="rounded-xl bg-accent-light px-4 py-2 text-sm font-bold text-foose-text"><strong>{followerCount}</strong> Followers</span>
                  <span className="rounded-xl bg-accent-light px-4 py-2 text-sm font-bold text-foose-text"><strong>{data.followingCount || 0}</strong> Following</span>
                  {data.user.hasShop && <span className="rounded-full bg-accent-light px-4 py-2 text-xs font-black uppercase tracking-wide text-accent">Seller</span>}
                </div>
                <div className="mt-6 flex flex-wrap items-center justify-center gap-3 md:justify-start">
                  {!isOwnProfile && (
                    <button className="inline-flex min-h-11 items-center justify-center rounded-xl border border-accent bg-accent px-6 text-sm font-black text-white shadow-md shadow-accent/15 transition hover:bg-accent-hover" onClick={() => void toggleFollow()} type="button">
                      {isFollowing ? 'Following' : 'Follow'}
                    </button>
                  )}
                  {isOwnProfile && (
                    <ButtonLink to="/profile/settings">
                      Edit Profile
                    </ButtonLink>
                  )}
                </div>
              </div>
            </div>
          </section>
          {followError && <ErrorState message={followError} />}

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
            <section className="rounded-2xl border border-foose-border bg-foose-surface p-5 shadow-sm md:p-6">
              <SectionHeader title="Active orders" action={isOwnProfile ? <a href={withBasePath('/orders/history')}>View History</a> : undefined} />
              {!data.activeOrders.length && (
                <div className="flex min-h-56 flex-col items-center justify-center rounded-2xl border border-dashed border-foose-border bg-white p-8 text-center">
                  <span className="mb-4 inline-flex size-16 items-center justify-center rounded-full bg-accent-light text-foose-muted">
                    <Icon name="bag" size={28} />
                  </span>
                  <h2 className="text-xl font-black text-foose-text">No active orders</h2>
                  <p className="mt-2 text-sm text-foose-muted">Active orders will appear here once customers start buying.</p>
                </div>
              )}
              {!!data.activeOrders.length && (
                <div className="seller-orders space-y-4 [&_article.highlighted]:border-accent [&_article.highlighted]:bg-accent-light">
                  {data.activeOrders.map((order) => (
                    <article className="rounded-xl border border-foose-border bg-white p-4" key={order._id}>
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

            <aside className="relative overflow-hidden rounded-2xl border border-accent/20 bg-accent-light p-5 shadow-sm">
              <Icon name="store" size={96} />
              <p className="relative z-10 text-xs font-black uppercase tracking-wide text-accent">Shop Profile</p>
              {data.shop ? (
                <div className="relative z-10 mt-3">
                  <strong className="block text-2xl font-black text-foose-text">{data.shop.shopName}</strong>
                  <p className="mt-4 line-clamp-5 text-sm leading-6 text-foose-text">{data.shop.bio || 'No shop bio yet.'}</p>
                  <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-accent/20 pt-5">
                    <ButtonLink to={`/shops/${data.shop.slug}`} variant="secondary">
                      View shop
                    </ButtonLink>
                    {isOwnProfile && (
                      <ButtonLink to="/manage-shop">
                        Manage shop
                      </ButtonLink>
                    )}
                  </div>
                </div>
              ) : (
                <p className="relative z-10 mt-3 text-sm text-foose-muted">No DigiShop yet.</p>
              )}
            </aside>
          </div>

          <section className="my-8">
            <SectionHeader
              action={
                <div className="flex items-center gap-2">
                  <button className="inline-flex size-11 items-center justify-center rounded-xl border border-foose-border bg-white text-foose-text transition hover:border-accent hover:text-accent" type="button">
                    <Icon name="filter" />
                  </button>
                  {isOwnProfile && (
                    <ButtonLink to="/listings/new">
                      <Icon name="plus" /> New Listing
                    </ButtonLink>
                  )}
                </div>
              }
              title="Active Listings"
            />
            {!data.listings.length && <EmptyState body="Listings from this profile will appear here." title="No listings" />}
            {!!data.listings.length && (
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
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
