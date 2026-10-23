import { useEffect, useMemo } from 'react'
import { FaAngleRight } from 'react-icons/fa'
import { MdVerified } from 'react-icons/md'
import { AppShell, Badge, ButtonLink, DropdownChevron, FavoriteButton, Icon, InlineNotice, ListingImageSlider, MakeOfferPanel, ProductCard, RefreshIndicator, ShopReviewPanel, StatePanel, useToast } from '../components'
import { ListingDetailSkeleton, ProductBandSkeleton } from '../components/feedback/DiscoverySkeletons'
import { NavigationBackButton } from '../components/navigation'
import { useAuth } from '../hooks/useAuth'
import { useApiResource } from '../hooks/useApiResource'
import { useCart } from '../hooks/useCart'
import { useListingRecommendationSignals } from '../hooks/useListingRecommendationSignals'
import { useNavigationStore } from '../stores/navigationMemoryStore'
import type { Listing, PaginatedListings } from '../types/api'
import { formatMoney, getListingImage, getShop, getShopName, initials } from '../utils/format'
import { getCurrentAppPathname, navigateBack, navigateTo, withBasePath } from '../utils/navigation'
import { isActiveTopPick } from '../utils/promotions'
import { LISTING_COLORS, optionLabel } from '../utils/listingTaxonomy'
import { listingColors } from '../utils/listingColors'

function currentListingId() {
  return decodeURIComponent(getCurrentAppPathname().replace(/^\/listing\/?/, '')).trim()
}

function shopOwnerId(owner: unknown) {
  if (!owner) return ''
  if (typeof owner === 'string') return owner
  if (typeof owner === 'object' && '_id' in owner && typeof owner._id === 'string') return owner._id
  return ''
}

function shopIdValue(shopId: Listing['shopId']) {
  if (!shopId) return ''
  if (typeof shopId === 'string') return shopId
  return shopId._id
}

function conversationIdFor(userA?: string, userB?: string) {
  if (!userA || !userB || userA === userB) return ''
  return `${[userA, userB].sort().join('_')}_general`
}

function sellerChatHref({
  includeListing = false,
  listingId,
  sellerId,
  userId,
}: {
  includeListing?: boolean
  listingId: string
  sellerId: string
  userId?: string
}) {
  if (!sellerId) return '/inbox'

  const query = new URLSearchParams()
  const conversationId = conversationIdFor(userId, sellerId)

  if (conversationId) query.set('conversationId', conversationId)
  query.set('receiverId', sellerId)
  if (includeListing && listingId) query.set('listingId', listingId)

  return `/inbox?${query.toString()}`
}

function clampRating(value?: number) {
  return Math.max(0, Math.min(5, Number(value) || 0))
}

function StarRating({ count, label, size = 14, value }: { count?: number; label?: string; size?: number; value?: number }) {
  const rating = clampRating(value)
  const rounded = Math.round(rating)

  return (
    <span className="inline-flex flex-wrap items-center gap-1 text-xs font-semibold text-foose-muted">
      <span aria-label={`${rating.toFixed(1)} out of 5 stars`} className="inline-flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <span className={star <= rounded ? 'inline-flex text-foose-text [&_svg]:fill-current' : 'inline-flex text-foose-border'} key={star}>
            <Icon name="star" size={size} />
          </span>
        ))}
      </span>
      {label ? <span>{label}</span> : count !== undefined ? <span>({count})</span> : null}
    </span>
  )
}

function compactListings(items: Listing[] | undefined, currentId?: string, limit = 5) {
  return (items || []).filter((item) => item._id !== currentId && item.status !== 'sold').slice(0, limit)
}

function ListingBand({
  action,
  actionLabel,
  error,
  kind,
  listings,
  loading,
  retry,
  subtitle,
  title,
}: {
  action?: string
  actionLabel: string
  error?: string
  kind: 'seller' | 'similar'
  listings: Listing[]
  loading?: boolean
  retry?: () => void
  subtitle: string
  title: string
}) {
  if (!listings.length && !loading && !error) return null

  return (
    <section aria-labelledby={`${kind}-listing-band-title`} className={`mt-10 ${kind === 'seller' ? 'rounded-[24px] border border-foose-border/70 bg-foose-surface-low p-4 sm:p-6 lg:p-7' : 'border-t border-foose-border/80 pt-8'}`}>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-x-5 gap-y-3">
        <div>
          <p className="mb-1 text-[11px] font-black uppercase tracking-[0.16em] text-accent">{kind === 'seller' ? 'From this DigiShop' : 'Keep exploring'}</p>
          <h2 className="font-display text-2xl font-bold tracking-tight text-foose-text sm:text-[1.75rem]" id={`${kind}-listing-band-title`}>{title}</h2>
          <p className="mt-1 text-sm text-foose-muted">{subtitle}</p>
        </div>
        {action && <a className="inline-flex min-h-10 items-center gap-2 rounded-full border border-foose-border bg-foose-surface px-4 text-sm font-bold text-foose-text transition hover:border-accent hover:text-accent" href={withBasePath(action)}>{actionLabel}<Icon name="arrow" size={15} /></a>}
      </div>
      {loading && <ProductBandSkeleton count={4} label={`Loading ${title.toLowerCase()}`} variant="catalog" />}
      {error && <InlineNotice action={retry ? <button className="font-black text-accent" onClick={retry} type="button">Retry</button> : undefined} title={`${title} unavailable`} tone="error">{error}</InlineNotice>}
      {!!listings.length && (
        <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain px-4 pb-2 [scrollbar-width:none] sm:mx-0 sm:px-0 lg:grid lg:grid-cols-4 lg:gap-4 lg:overflow-visible lg:pb-0 [&::-webkit-scrollbar]:hidden">
          {listings.map((listing) => (
            <ProductCard className="w-[min(62vw,14rem)] shrink-0 snap-start sm:w-56 lg:w-auto" key={listing._id} listing={listing} variant="catalog" />
          ))}
        </div>
      )}
    </section>
  )
}

export function RetailDetailPage() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const listingId = currentListingId()
  const listingResource = useApiResource<{ listing: Listing }>(listingId ? `/listings/${listingId}` : null)
  const { addListing, items: cartItems } = useCart()
  const isModal = useNavigationStore((state) => (
    state.entries.find((entry) => entry.id === state.currentEntryId)?.presentation === 'modal'
  ))
  const listing = listingResource.data?.listing
  const shop = listing ? getShop(listing) : undefined
  const shopId = shopIdValue(listing?.shopId)
  const sellerId = shopOwnerId(shop?.ownerId)
  const isOwner = Boolean(user?._id && sellerId === user._id)
  const inCart = Boolean(listing && cartItems.some((item) => item.listingId === listing._id))
  const sellerListingsResource = useApiResource<{ listings: Listing[] }>(shopId ? `/listings/shop/${shopId}` : null, Boolean(shopId && !isOwner))
  const relatedListingsResource = useApiResource<PaginatedListings>(
    listing?.category ? `/search/items?category=${encodeURIComponent(listing.category)}${listing.subcategory ? `&subcategory=${encodeURIComponent(listing.subcategory)}` : ''}&limit=12&sort=newest` : null,
    Boolean(listing?.category),
  )
  const mainImage = listing ? getListingImage(listing) : undefined
  const listingImages = listing?.images?.length ? listing.images : mainImage ? [mainImage] : []
  const visibleColors = listing ? listingColors(listing) : []
  const specs = (listing ? [
    { label: 'Material', value: listing.attributes?.material },
    { label: 'Fit', value: listing.attributes?.fit },
    { label: 'Pattern', value: listing.attributes?.pattern },
    { label: 'Gender', value: listing.gender },
    { label: 'Bale grade', value: listing.attributes?.baleGrade },
    { label: 'Brand', value: listing.brand },
  ] : []).filter((spec): spec is { label: string; value: string } => Boolean(spec.value))
  const askQuestionHref = sellerChatHref({ includeListing: true, listingId, sellerId, userId: user?._id })
  const messageSellerHref = sellerChatHref({ listingId, sellerId, userId: user?._id })
  const sellerListings = useMemo(
    () => (sellerListingsResource.data?.listings || []).map((item) => (shop && typeof item.shopId !== 'object' ? { ...item, shopId: shop } : item)),
    [sellerListingsResource.data?.listings, shop],
  )
  const moreFromSeller = useMemo(
    () => compactListings(sellerListings, listing?._id, 4),
    [listing?._id, sellerListings],
  )
  const youMightLike = useMemo(
    () => compactListings(relatedListingsResource.data?.results?.filter((item) => (
      shopIdValue(item.shopId) !== shopId && shopOwnerId(getShop(item)?.ownerId) !== user?._id
    )), listing?._id, 4),
    [listing?._id, relatedListingsResource.data?.results, shopId, user?._id],
  )
  useListingRecommendationSignals(listing?._id, Boolean(user))

  useEffect(() => {
    if (!isModal) return undefined

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') closeListing()
    }

    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [isModal])

  function handleAddToCart() {
    if (!listing || isOwner || !addListing(listing)) return
    showToast({
      id: `cart:add:${listing._id}`,
      message: `${listing.title} was added to your cart.`,
      title: 'Added to cart',
      tone: 'success',
    })
  }

  function handleBuyNow() {
    if (!listing || isOwner || !addListing(listing)) return
    navigateTo('/checkout')
  }

  function closeListing() {
    navigateBack({ fallback: '/browse' })
  }

  const detailContent = (
    <>
      <NavigationBackButton className="mb-5" fallback={{ href: '/browse', label: 'Browse' }} />
      {!listingId && <StatePanel action={<ButtonLink to="/browse">Browse marketplace items</ButtonLink>} body="This link does not identify a marketplace listing." layout="page" title="Listing link is incomplete" tone="unavailable" />}
      {listingResource.initialLoading && <ListingDetailSkeleton />}
      <RefreshIndicator active={listingResource.refreshing} className="mb-4" label="Refreshing listing details" />
      {listingResource.error && <StatePanel action={<button className="button inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border px-5 py-2.5 text-center text-sm font-bold transition disabled:pointer-events-none disabled:opacity-50 [&.full]:w-full button-secondary border-foose-border bg-foose-surface text-foose-text hover:border-accent hover:text-accent" onClick={listingResource.refetch} type="button">Try again</button>} body={listingResource.error} layout="page" title={listingResource.errorMeta?.status === 404 ? 'This listing is no longer available' : 'Listing could not load'} tone={listingResource.errorMeta?.status === 403 ? 'permission' : listingResource.errorMeta?.status === 404 ? 'unavailable' : 'error'} />}
      {listing && (
        <>
          {listing.status === 'sold' && <InlineNotice className="mb-4" title="This item has sold" tone="info">You can still review its details and discover similar active listings below.</InlineNotice>}
          <div className="grid gap-7 lg:grid-cols-[minmax(0,1.18fr)_minmax(340px,0.82fr)] lg:items-start lg:gap-9 xl:gap-12">
            <section className={`min-w-0 space-y-3 lg:sticky ${isModal ? 'lg:top-5' : 'lg:top-24'}`}>
              <div className="relative">
                <ListingImageSlider images={listingImages} key={listing._id} title={listing.title} />
                {!isOwner && <FavoriteButton className="absolute right-3 top-3 z-10 inline-flex size-10 items-center justify-center rounded-full border border-foose-border bg-white/95 text-foose-ink shadow transition hover:bg-accent hover:text-white [&.is-active]:bg-accent [&.is-active]:text-white" targetId={listing._id} targetType="listing" />}
              </div>
            </section>

            <aside className="flex min-w-0 flex-col gap-6 lg:pt-1">
              <section className="min-w-0">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  {isActiveTopPick(listing.promotionTags, listing.promotionExpiresAt) && <Badge tone="accent">Promoted</Badge>}
                  {(listing.category || listing.subcategory) && (
                    <p className="flex flex-wrap items-center gap-1 text-xs font-bold uppercase tracking-[0.12em] text-foose-muted">
                      {listing.category}
                      {listing.category && listing.subcategory && <FaAngleRight aria-hidden className="shrink-0 text-foose-faint" size={10} />}
                      {listing.subcategory}
                    </p>
                  )}
                </div>
                <h1 className="font-display text-[clamp(1.75rem,3vw,2.6rem)] font-bold leading-[1.2] tracking-[0.01em] text-foose-text">{listing.title}</h1>
                <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-foose-muted">
                  {shop?.slug ? (
                    <a className="inline-flex items-center gap-1 font-bold text-foose-text hover:text-accent" href={withBasePath(`/shops/${shop.slug}`)}>
                      {getShopName(listing)}
                      <MdVerified className="text-accent" aria-label="Verified shop" />
                    </a>
                  ) : (
                    <span>{getShopName(listing)}</span>
                  )}
                  <StarRating count={shop?.totalReviews || 0} value={shop?.rating} />
                </div>
                <p className="mt-5 font-display text-3xl font-bold tracking-tight text-foose-text">{formatMoney(listing.price, listing.currency)}</p>
                {(listing.size || listing.condition || specs.length > 0) && (
                  <div className="mt-6 border-t border-foose-border/80 pt-5">
                    <h2 className="mb-4 text-[11px] font-black uppercase tracking-[0.16em] text-foose-muted">Item details</h2>
                    <dl className="grid grid-cols-2 gap-x-5 gap-y-4 text-sm">
                      {listing.size && <div><dt className="text-xs text-foose-faint">Size</dt><dd className="mt-0.5 font-bold text-foose-text">{optionLabel(listing.size)}</dd></div>}
                      {listing.condition && <div><dt className="text-xs text-foose-faint">Condition</dt><dd className="mt-0.5 font-bold text-foose-text">{optionLabel(listing.condition)}</dd></div>}
                      {specs.map((spec) => (
                        <div key={spec.label}>
                          <dt className="text-xs text-foose-faint">{spec.label}</dt>
                          <dd className="mt-0.5 font-bold text-foose-text">{optionLabel(spec.value)}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                )}
                {visibleColors.length > 0 && (
                  <div aria-label="Listing colors" className="mt-5 flex flex-wrap items-center gap-1.5 text-sm">
                    <span className="mr-1 text-xs font-semibold text-foose-faint">Colors</span>
                    {visibleColors.map((value) => {
                      const color = LISTING_COLORS.find((item) => item.value === value)
                      return (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-foose-border px-2.5 py-1 font-bold text-foose-text" key={value}>
                          {color && <span aria-hidden className="size-3.5 shrink-0 rounded-full border border-black/10" style={{ background: color.hex }} />}
                          {color?.label || optionLabel(value)}
                        </span>
                      )
                    })}
                  </div>
                )}
                {listing.type === 'wholesale' && (
                  <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold text-foose-muted">
                    {listing.bulkMinQty !== undefined && <span className="rounded-full bg-foose-surface-mid px-3 py-1">Min. {listing.bulkMinQty}</span>}
                    {listing.bulkWeight && <span className="rounded-full bg-foose-surface-mid px-3 py-1">{listing.bulkWeight.replace(/\s*kg\s*$/i, '')} Kg</span>}
                  </div>
                )}
                {!!listing.volumeDiscounts?.length && (
                  <table className="mt-4 w-full overflow-hidden rounded-lg border border-foose-border text-left text-xs">
                    <thead className="bg-foose-surface-mid text-foose-muted">
                      <tr>
                        <th className="px-3 py-2">Quantity</th>
                        <th className="px-3 py-2">Unit price</th>
                      </tr>
                    </thead>
                    <tbody>
                      {listing.volumeDiscounts.map((discount) => (
                        <tr className="border-t border-foose-border" key={`${discount.minQty}-${discount.pricePerUnit}`}>
                          <td className="px-3 py-2">{discount.minQty || 0}+</td>
                          <td className="px-3 py-2 font-bold text-accent">{formatMoney(discount.pricePerUnit || 0, listing.currency)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
                {isOwner ? (
                  <div className="mt-7 grid gap-2 border-t border-foose-border/80 pt-6">
                    <InlineNotice tone="info">This is your listing. Buyer actions are hidden while you preview it.</InlineNotice>
                    <ButtonLink className="h-11 rounded-md" to={`/listings/${listing._id}/edit`}>Manage listing</ButtonLink>
                  </div>
                ) : <div className="mt-7 border-t border-foose-border/80 pt-6">
                  <button className="inline-flex min-h-12 w-full items-center justify-center rounded-full border border-accent bg-accent px-5 text-sm font-black text-white shadow-sm transition hover:bg-accent-hover disabled:pointer-events-none disabled:opacity-50" disabled={listing.status !== 'active'} onClick={handleBuyNow} type="button">
                    Buy now
                  </button>
                  <div className="mt-2.5 grid grid-cols-2 gap-2.5">
                    {inCart ? (
                      <button className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-foose-success bg-foose-success-bg px-3 text-sm font-bold text-foose-success transition hover:brightness-95" onClick={() => navigateTo('/cart')} type="button">
                        <Icon name="check" size={16} />
                        Added to cart
                      </button>
                    ) : (
                      <button className="inline-flex min-h-11 items-center justify-center rounded-full border border-foose-border bg-foose-surface px-3 text-sm font-bold text-foose-text transition hover:border-accent hover:text-accent disabled:pointer-events-none disabled:opacity-50" disabled={listing.status !== 'active'} onClick={handleAddToCart} type="button">
                        Add to cart
                      </button>
                    )}
                    <ButtonLink to={askQuestionHref} className="min-h-11 rounded-full px-2" variant="secondary">
                      Ask a question
                    </ButtonLink>
                  </div>
                  <MakeOfferPanel inboxHref={withBasePath(askQuestionHref)} listing={listing} />
                </div>}
                {!isOwner && (
                  <div className="mt-6 grid gap-3 rounded-2xl bg-foose-surface-low p-4">
                    <p className="flex items-start gap-3 text-xs font-semibold leading-5 text-foose-text"><span className="mt-0.5 text-foose-success"><Icon name="shield" size={17} /></span><span><strong className="block text-sm">Escrow protected</strong>Funds release once you confirm delivery or pickup.</span></p>
                    <p className="flex items-start gap-3 text-xs font-semibold leading-5 text-foose-text"><span className="mt-0.5 text-accent"><Icon name="truck" size={17} /></span><span><strong className="block text-sm">Delivery or pickup</strong>Options are confirmed at checkout.</span></p>
                  </div>
                )}
                <details className="group mt-7 border-t border-foose-border/80 pt-5 text-sm" open>
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-bold text-foose-text [&::-webkit-details-marker]:hidden">
                    <span>Description</span>
                    <DropdownChevron className="text-xs text-accent group-open:hidden" />
                    <DropdownChevron className="hidden text-xs text-accent group-open:block" open />
                  </summary>
                  <p className="mt-3 leading-6 text-foose-muted">{listing.description || 'No description has been added for this listing yet.'}</p>
                </details>
                {!!listing.hashtags?.length && (
                  <div className="mt-4 flex flex-wrap gap-2" aria-label="Item vibe hashtags">
                    {listing.hashtags.map((tag) => (
                      <a
                        className="rounded-full bg-accent-light px-3 py-1 text-xs font-black text-accent transition hover:bg-accent hover:text-white"
                        href={withBasePath(`/search?tag=${encodeURIComponent(tag.replace(/^#+/, ''))}&tab=all`)}
                        key={tag}
                      >
                        #{tag}
                      </a>
                    ))}
                  </div>
                )}
              </section>

              <section className="border-t border-foose-border/80 pt-6">
                <p className="mb-4 text-[11px] font-black uppercase tracking-[0.16em] text-foose-muted">About the seller</p>
                <div className="flex items-center gap-3">
                  {shop?.logoUrl ? (
                    <img alt="" className="size-12 rounded-full object-cover" src={shop.logoUrl} />
                  ) : (
                    <span className="inline-flex size-12 items-center justify-center rounded-full bg-accent-light text-sm font-black text-accent">{initials(getShopName(listing))}</span>
                  )}
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate text-base font-black text-foose-text">{getShopName(listing)}</h2>
                    <StarRating label={`${shop?.totalReviews || 0} reviews`} value={shop?.rating} />
                  </div>
                </div>
                <div className="mt-5 grid grid-cols-2 gap-2.5">
                  {shop?.slug && (
                    <a className="inline-flex min-h-11 items-center justify-center rounded-full border border-foose-border text-sm font-bold text-foose-text hover:border-accent hover:text-accent" href={withBasePath(`/shops/${shop.slug}`)}>
                      Visit shop
                    </a>
                  )}
                  <a className="inline-flex min-h-11 items-center justify-center rounded-full border border-foose-border text-sm font-bold text-foose-text hover:border-accent hover:text-accent" href={withBasePath(messageSellerHref)}>
                    Message seller
                  </a>
                </div>
                {shopId && <ShopReviewPanel className="mt-5 border-t border-foose-border pt-4" limit={3} shopId={shopId} shopName={getShopName(listing)} showForm={false} title="Seller reviews" />}
              </section>
            </aside>
          </div>

          {!isOwner && <ListingBand action={shop?.slug ? `/shops/${shop.slug}` : undefined} actionLabel="View shop" error={sellerListingsResource.error} kind="seller" listings={moreFromSeller} loading={sellerListingsResource.initialLoading} retry={sellerListingsResource.refetch} subtitle="More pieces from the shop behind this find." title="More from this seller" />}
          <ListingBand action={listing.category ? `/browse?category=${encodeURIComponent(listing.category)}${listing.subcategory ? `&subcategory=${encodeURIComponent(listing.subcategory)}` : ''}` : '/browse'} actionLabel={listing.category ? 'Browse category' : 'Browse all'} error={relatedListingsResource.error} kind="similar" listings={youMightLike} loading={relatedListingsResource.initialLoading} retry={relatedListingsResource.refetch} subtitle={listing.category ? 'Discover more finds in this category.' : 'Discover more finds across the marketplace.'} title="You might also like" />
        </>
      )}
    </>
  )

  if (isModal) {
    return (
      <div className="fixed inset-0 z-[90] flex items-start justify-center overflow-y-auto bg-black/55 px-3 py-4 backdrop-blur-sm sm:px-5 sm:py-8" role="presentation">
        <button aria-label="Close listing details" className="fixed inset-0 cursor-default border-0 bg-transparent" onClick={closeListing} type="button" />
        <section
          aria-modal="true"
          className="relative z-10 flex max-h-[calc(100dvh-2rem)] min-h-[70dvh] w-full max-w-7xl flex-col overflow-hidden rounded-2xl border border-foose-border bg-foose-bg shadow-2xl shadow-black/30 sm:max-h-[calc(100dvh-4rem)]"
          role="dialog"
        >
          <button
            aria-label="Close listing details"
            className="absolute right-3 top-3 z-20 inline-flex size-10 items-center justify-center rounded-full border border-foose-border bg-white text-foose-ink shadow transition hover:border-accent hover:text-accent"
            onClick={closeListing}
            type="button"
          >
            <Icon name="close" size={18} />
          </button>
          <div className="min-h-0 overflow-y-auto overscroll-contain p-4 pr-4 sm:p-5 sm:pr-12 md:p-7 md:pr-14">{detailContent}</div>
        </section>
      </div>
    )
  }

  return (
    <AppShell active="browse">
      {detailContent}
    </AppShell>
  )
}
