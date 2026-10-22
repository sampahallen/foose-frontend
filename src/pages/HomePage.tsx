import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'motion/react'
import kantamantoMarketHero from '../assets/kantamanto-market-hero.jpg'
import { AppShell, ButtonLink, Icon, InlineNotice, ProductCard, PromotedEventCarousel, RefreshIndicator, SectionHeader, StatePanel } from '../components'
import { CompactListSkeleton, EventCarouselSkeleton, ProductGridSkeleton } from '../components/feedback/DiscoverySkeletons'
import { useAuth } from '../hooks/useAuth'
import { useApiResource } from '../hooks/useApiResource'
import type { Event, PaginatedListings, PopularSearch, WeeklyTopSeller } from '../types/api'
import { authHref } from '../utils/authRedirect'
import { getListingImage, initials } from '../utils/format'
import { withoutOwnListings } from '../utils/listingOwnership'
import { withBasePath } from '../utils/navigation'

const homeListingGrid =
  'home-product-grid grid grid-cols-2 gap-x-3 gap-y-7 sm:grid-cols-3 sm:gap-x-5 lg:grid-cols-4'
const homeSectionClass = 'home-curation-section mx-auto w-full max-w-[1280px]'
const popularHeroSearches = ['Denim', 'Sneakers', 'Graphic tees', 'Bales']
const mosaicLabels = ['One of a kind', 'Fresh finds', 'Wear it again', 'Made to be found', 'Pre-loved', 'Your next find', 'From Ghana', 'Thrift better']
const MOSAIC_ROTATION_MS = 8000
const MOSAIC_STAGGER_MS = 120
const MOSAIC_MOVE_MS = 1000
const MOSAIC_TOTAL_MS = MOSAIC_MOVE_MS + 3 * MOSAIC_STAGGER_MS + 40
const MOSAIC_EASE = [0.4, 0, 0.2, 1] as const
const mosaicPositionClasses: Record<string, string> = {
  'home-mosaic-card-entry': 'left-[var(--wheel-entry-left)] top-[var(--wheel-entry-top)] h-[196px] w-[17%]',
  'home-mosaic-card-exit': 'pointer-events-none left-[var(--wheel-exit-left)] top-[var(--wheel-exit-top)] z-[1] h-[142px] w-[15%]',
  'home-mosaic-slot-1': 'left-[2%] top-[30px] h-[clamp(145px,13.6vw,196px)] w-[17%] max-lg:left-[2%] max-lg:top-[25px] max-lg:h-[145px] max-lg:w-[20%] max-sm:left-[-2%] max-sm:top-[18px] max-sm:w-[35%]',
  'home-mosaic-slot-2': 'left-[max(2%,calc((100%_-_672px)/2_-_11%_-_24px))] top-[clamp(180px,17.64vw,254px)] h-[clamp(125px,12.4vw,178px)] w-[11%] max-lg:left-[13%] max-lg:top-[370px] max-lg:h-[125px] max-lg:w-[13%] max-sm:left-[33%] max-sm:top-[8px] max-sm:h-[130px] max-sm:w-[27%]',
  'home-mosaic-slot-3': 'left-[1%] top-[clamp(330px,26vw,390px)] h-[clamp(110px,9.9vw,142px)] w-[13%] max-lg:hidden',
  'home-mosaic-slot-4': 'right-[2%] top-[30px] h-[clamp(145px,13.6vw,196px)] w-[17%] max-lg:right-[2%] max-lg:top-[25px] max-lg:h-[145px] max-lg:w-[20%] max-sm:right-[-2%] max-sm:top-[18px] max-sm:w-[35%]',
  'home-mosaic-slot-5': 'right-[max(2%,calc((100%_-_672px)/2_-_11%_-_24px))] top-[clamp(180px,17.64vw,254px)] h-[clamp(125px,12.4vw,178px)] w-[11%] max-lg:right-[13%] max-lg:top-[370px] max-lg:h-[125px] max-lg:w-[13%] max-sm:hidden',
  'home-mosaic-slot-6': 'right-[1%] top-[clamp(330px,26vw,390px)] h-[clamp(110px,9.9vw,142px)] w-[13%] max-lg:hidden',
  'home-mosaic-slot-7': 'left-[29%] top-[16px] h-[92px] w-[9%] max-lg:hidden',
  'home-mosaic-slot-8': 'right-[29%] top-[16px] h-[92px] w-[9%] max-lg:hidden',
}
const mosaicTileClasses = 'absolute inset-0 block overflow-hidden rounded-[20px] border shadow-[0_16px_35px_rgba(25,26,48,0.12)]'
const mosaicTileLabelClasses = 'flex size-full items-center justify-center p-[15px] font-display text-[20px] font-bold leading-[1.05] text-accent text-center'
const mosaicTileImageClasses = 'absolute inset-0 z-[1] size-full object-cover'
const mosaicFloat = [
  { duration: 6.8, x: 3 }, { duration: 7.6, x: -3 }, { duration: 6.5, x: 2 },
  { duration: 7.3, x: -2 }, { duration: 8.1, x: 2 }, { duration: 7, x: -3 },
]

function mosaicTileTone(position: string) {
  if (position.endsWith('slot-2') || position.endsWith('slot-5')) return 'border-foose-border [background:color-mix(in_srgb,#ffd5c2_52%,var(--color-foose-surface))]'
  if (position.endsWith('slot-3') || position.endsWith('slot-6')) return 'border-foose-border [background:color-mix(in_srgb,#cfddff_55%,var(--color-foose-surface))]'
  return 'border-foose-border [background:color-mix(in_srgb,var(--color-accent-light)_70%,var(--color-foose-surface))]'
}

type MosaicSide = 0 | 1
type MosaicCard = { id: number; listingIndex: number; labelIndex: number }
type MosaicTransition = { side: MosaicSide; phase: number; oldCards: MosaicCard[]; incoming: MosaicCard }
type MosaicWheelState = {
  sides: [MosaicCard[], MosaicCard[]]
  nextListingIndex: number
  nextCardId: number
  tick: number
  transition: MosaicTransition | null
}

function initialMosaicWheelState(): MosaicWheelState {
  const cards = Array.from({ length: 6 }, (_, id) => ({ id, listingIndex: id, labelIndex: id }))
  return { sides: [cards.slice(0, 3), cards.slice(3)], nextListingIndex: 6, nextCardId: 6, tick: 0, transition: null }
}

function nextMosaicListingIndex(sides: MosaicWheelState['sides'], startIndex: number, listingCount: number) {
  const visible = new Set(sides.flat().map((card) => card.listingIndex))
  for (let offset = 0; offset < listingCount; offset += 1) {
    const index = (startIndex + offset) % listingCount
    if (!visible.has(index)) return index
  }
  return null
}

function advanceMosaicWheel(state: MosaicWheelState, listingCount: number): MosaicWheelState {
  const listingIndex = nextMosaicListingIndex(state.sides, state.nextListingIndex, listingCount)
  if (state.transition || listingIndex === null) return state

  const side = (state.tick % 2) as MosaicSide
  const oldCards = state.sides[side]
  const incoming = { id: state.nextCardId, listingIndex, labelIndex: oldCards[2].labelIndex }
  const nextCards = [incoming, oldCards[0], oldCards[1]]
  const sides: [MosaicCard[], MosaicCard[]] = side === 0 ? [nextCards, state.sides[1]] : [state.sides[0], nextCards]
  return {
    sides,
    nextListingIndex: (listingIndex + 1) % listingCount,
    nextCardId: state.nextCardId + 1,
    tick: state.tick + 1,
    transition: { side, phase: 0, oldCards, incoming },
  }
}

function mosaicCardRotation(position: string) {
  if (position === 'home-mosaic-card-entry' || position.endsWith('slot-1') || position.endsWith('slot-4')) return -5
  if (position.endsWith('slot-2') || position.endsWith('slot-5')) return 5
  return -3
}

function positionMosaicCornerTracks(hero: HTMLElement) {
  const heroBounds = hero.getBoundingClientRect()
  const stageBounds = hero.querySelector('.home-mosaic-stage')?.getBoundingClientRect()
  if (!stageBounds) return

  hero.querySelectorAll<HTMLElement>('.home-mosaic-track').forEach((track, side) => {
    const entryWidth = stageBounds.width * 0.17
    const exitWidth = stageBounds.width * 0.15
    const cornerX = side === 0 ? heroBounds.left - stageBounds.left : heroBounds.right - stageBounds.left
    const entryLeft = side === 0 ? cornerX - entryWidth - 12 : cornerX + 12
    const exitLeft = side === 0 ? cornerX - exitWidth - 12 : cornerX + 12

    track.style.setProperty('--wheel-entry-left', `${entryLeft}px`)
    track.style.setProperty('--wheel-entry-top', `${heroBounds.top - stageBounds.top - 196 - 12}px`)
    track.style.setProperty('--wheel-exit-left', `${exitLeft}px`)
    track.style.setProperty('--wheel-exit-top', `${heroBounds.bottom - stageBounds.top + 12}px`)
  })
}

function homeGridVisibility(index: number) {
  if (index < 6) return ''
  if (index < 9) return 'hidden sm:flex'
  return 'hidden lg:flex'
}

export function HomePage() {
  const { user } = useAuth()
  const heroRef = useRef<HTMLElement | null>(null)
  const preloadedImages = useRef<HTMLImageElement[]>([])
  const [mosaicWheel, setMosaicWheel] = useState(initialMosaicWheelState)
  const [desktopMosaic, setDesktopMosaic] = useState(() => typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(min-width: 1024px)').matches)
  const [heroVisible, setHeroVisible] = useState(true)
  const [pageVisible, setPageVisible] = useState(() => typeof document === 'undefined' || !document.hidden)
  const [tileInteracting, setTileInteracting] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(() => typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  const freshDrops = useApiResource<PaginatedListings>('/search/items?page=1&limit=21&sort=newest')
  const promotedEvents = useApiResource<{ events: Event[] }>('/community/events/featured')
  const topPicks = useApiResource<PaginatedListings>('/search/top-picks?page=1&limit=21&sort=newest')
  const suggested = useApiResource<PaginatedListings>(user ? '/recommendations/suggested?page=1&limit=50&type=retail' : null, Boolean(user))
  const freshBales = useApiResource<PaginatedListings>('/search/items?page=1&limit=21&sort=newest&type=wholesale')
  const popularSearches = useApiResource<{ searches: PopularSearch[] }>('/search/popular-searches?limit=5')
  const topSellers = useApiResource<{ sellers: WeeklyTopSeller[] }>('/search/top-sellers?limit=5')
  const greetingName = user?.name || user?.username || 'friend'
  const topPickItems = useMemo(() => withoutOwnListings(topPicks.data?.results || [], user), [topPicks.data?.results, user])
  const freshDropItems = useMemo(() => withoutOwnListings(freshDrops.data?.results || [], user), [freshDrops.data?.results, user])
  const mosaicListings = useMemo(() => freshDropItems.filter((listing) => Boolean(getListingImage(listing))), [freshDropItems])
  const mosaicListingIds = mosaicListings.map((listing) => listing._id).join('|')
  const mosaicListingIdsRef = useRef(mosaicListingIds)
  const suggestedItems = useMemo(() => withoutOwnListings(suggested.data?.results || [], user), [suggested.data?.results, user])
  const freshBaleItems = useMemo(() => withoutOwnListings(freshBales.data?.results || [], user), [freshBales.data?.results, user])

  useEffect(() => {
    if (mosaicListingIdsRef.current === mosaicListingIds) return
    mosaicListingIdsRef.current = mosaicListingIds
    setMosaicWheel(initialMosaicWheelState())
  }, [mosaicListingIds])

  useEffect(() => {
    if (!heroRef.current || typeof IntersectionObserver === 'undefined') return undefined
    const observer = new IntersectionObserver(([entry]) => setHeroVisible(Boolean(entry?.isIntersecting)), { threshold: 0.05 })
    observer.observe(heroRef.current)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return undefined
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onChange = (event: MediaQueryListEvent) => {
      setReducedMotion(event.matches)
      if (event.matches) setMosaicWheel((state) => state.transition ? { ...state, transition: null } : state)
    }
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return undefined
    const query = window.matchMedia('(min-width: 1024px)')
    const onChange = (event: MediaQueryListEvent) => {
      setDesktopMosaic(event.matches)
      if (!event.matches) setMosaicWheel((state) => state.transition ? { ...state, transition: null } : state)
    }
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])

  useEffect(() => {
    const onVisibilityChange = () => setPageVisible(!document.hidden)
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => document.removeEventListener('visibilitychange', onVisibilityChange)
  }, [])

  useEffect(() => {
    if (mosaicListings.length <= 6 || reducedMotion || !desktopMosaic || !heroVisible || !pageVisible || tileInteracting) return undefined
    const timer = window.setTimeout(() => {
      if (heroRef.current) positionMosaicCornerTracks(heroRef.current)
      setMosaicWheel((state) => advanceMosaicWheel(state, mosaicListings.length))
    }, MOSAIC_ROTATION_MS)
    return () => window.clearTimeout(timer)
  }, [desktopMosaic, heroVisible, mosaicWheel.tick, mosaicListings.length, pageVisible, reducedMotion, tileInteracting])

  useEffect(() => {
    const transitionId = mosaicWheel.transition?.incoming.id
    if (transitionId === undefined) return undefined
    const timers = [1, 2, 3].map((phase) => window.setTimeout(() => {
      setMosaicWheel((state) => state.transition?.incoming.id === transitionId
        ? { ...state, transition: { ...state.transition, phase } }
        : state)
    }, phase * MOSAIC_STAGGER_MS))
    const finish = window.setTimeout(() => {
      setMosaicWheel((state) => state.transition?.incoming.id === transitionId ? { ...state, transition: null } : state)
    }, MOSAIC_TOTAL_MS)
    return () => {
      timers.forEach((timer) => window.clearTimeout(timer))
      window.clearTimeout(finish)
    }
  }, [mosaicWheel.transition?.incoming.id])

  useEffect(() => {
    if (mosaicListings.length <= 6 || reducedMotion || !desktopMosaic) return
    const nextIndex = nextMosaicListingIndex(mosaicWheel.sides, mosaicWheel.nextListingIndex, mosaicListings.length)
    const imageUrl = nextIndex === null ? undefined : getListingImage(mosaicListings[nextIndex])
    if (!imageUrl) return
    const preview = new Image()
    preview.src = imageUrl
    preloadedImages.current = [preview]
  }, [desktopMosaic, mosaicWheel.nextListingIndex, mosaicWheel.sides, mosaicListings, reducedMotion])

  const renderMosaicTile = (card: MosaicCard, position: string, exiting = false, entering = false) => {
    const listing = mosaicListings[card.listingIndex]
    const label = mosaicLabels[card.labelIndex]
    const image = listing ? getListingImage(listing) : undefined
    const float = mosaicFloat[card.labelIndex] || mosaicFloat[0]
    const floatActive = !reducedMotion && !tileInteracting
    const renderImage = (src: string) => <motion.img
      alt=""
      animate={reducedMotion ? { x: 0, y: 0, scale: 1 } : { x: ['-1.5%', '1.5%'], y: ['1%', '-1%'], scale: [1.06, 1.1] }}
      className={mosaicTileImageClasses}
      initial={false}
      loading={card.labelIndex < 4 ? 'eager' : 'lazy'}
      onError={(event) => { event.currentTarget.style.display = 'none' }}
      src={src}
      transition={reducedMotion ? { duration: 0 } : { duration: 16, ease: 'easeInOut', repeat: Infinity, repeatType: 'reverse' }}
    />
    const contents = image
      ? <><span className={mosaicTileLabelClasses}>{label}</span>{renderImage(image)}</>
      : card.labelIndex === 0 || card.labelIndex === 4
        ? renderImage(kantamantoMarketHero)
        : <span className={mosaicTileLabelClasses}>{label}</span>

    return <motion.div
      animate={{ rotate: mosaicCardRotation(position) }}
      className={`home-mosaic-card ${position} absolute pointer-events-auto ${mosaicPositionClasses[position]}`}
      initial={false}
      key={card.id}
      layout={desktopMosaic && !reducedMotion}
      layoutDependency={position}
      transition={desktopMosaic && !reducedMotion
        ? { layout: { duration: MOSAIC_MOVE_MS / 1000, ease: MOSAIC_EASE }, rotate: { duration: MOSAIC_MOVE_MS / 1000, ease: MOSAIC_EASE } }
        : { duration: 0 }}
    >
      {listing && image
        ? <motion.a
          animate={floatActive ? { x: [0, float.x, 0], y: [0, -7, 0] } : { x: 0, y: 0 }}
          aria-hidden={exiting || entering || undefined}
          aria-label={`View ${listing.title}`}
          className={`${mosaicTileClasses} ${mosaicTileTone(position)} hover:shadow-[0_20px_42px_rgba(25,26,48,0.18)] focus-visible:outline-[3px] focus-visible:outline-offset-4 focus-visible:outline-accent`}
          href={withBasePath(`/listing/${listing._id}`)}
          initial={false}
          onBlur={exiting ? undefined : (event) => { if (!event.currentTarget.matches(':hover')) setTileInteracting(false) }}
          onFocus={exiting ? undefined : () => setTileInteracting(true)}
          onMouseEnter={exiting ? undefined : () => setTileInteracting(true)}
          onMouseLeave={exiting ? undefined : (event) => { if (!event.currentTarget.matches(':focus')) setTileInteracting(false) }}
          tabIndex={exiting || entering ? -1 : undefined}
          transition={floatActive ? { duration: float.duration, ease: 'easeInOut', repeat: Infinity } : { duration: reducedMotion ? 0 : 0.18 }}
        >{contents}</motion.a>
        : <motion.div
          animate={floatActive ? { x: [0, float.x, 0], y: [0, -7, 0] } : { x: 0, y: 0 }}
          aria-hidden="true"
          className={`${mosaicTileClasses} ${mosaicTileTone(position)}`}
          initial={false}
          transition={floatActive ? { duration: float.duration, ease: 'easeInOut', repeat: Infinity } : { duration: reducedMotion ? 0 : 0.18 }}
        >{contents}</motion.div>}
    </motion.div>
  }

  const renderMosaicSide = (side: MosaicSide) => {
    const start = side * 3
    const transition = desktopMosaic && !reducedMotion && mosaicWheel.transition?.side === side ? mosaicWheel.transition : null
    if (!transition) return mosaicWheel.sides[side].map((card, position) => renderMosaicTile(card, `home-mosaic-slot-${start + position + 1}`))

    const [top, middle, bottom] = transition.oldCards
    return [
      renderMosaicTile(top, `home-mosaic-slot-${start + (transition.phase >= 2 ? 2 : 1)}`),
      renderMosaicTile(middle, `home-mosaic-slot-${start + (transition.phase >= 1 ? 3 : 2)}`),
      renderMosaicTile(bottom, 'home-mosaic-card-exit', true),
      renderMosaicTile(transition.incoming, transition.phase >= 3 ? `home-mosaic-slot-${start + 1}` : 'home-mosaic-card-entry', false, true),
    ]
  }

  return (
    <AppShell active="home" flush searchPlaceholder="Search curated finds...">
      <section aria-labelledby="home-hero-title" className="home-mosaic-hero relative isolate overflow-hidden border-b border-foose-border bg-foose-surface-low text-foose-text [background-image:radial-gradient(circle_at_12%_23%,color-mix(in_srgb,var(--color-accent)_12%,transparent),transparent_35%),radial-gradient(circle_at_88%_75%,rgba(255,164,109,0.17),transparent_36%)]" ref={heroRef}>
        <img alt="" aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 size-full object-cover object-[center_47%] opacity-[0.11] [filter:saturate(0.72)_contrast(0.9)] max-sm:opacity-[0.06] [[data-theme=dark]_&]:opacity-[0.15] [[data-theme=dark]_&]:[filter:brightness(1.3)_saturate(0.7)] max-sm:[[data-theme=dark]_&]:opacity-[0.09]" src={kantamantoMarketHero} />
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-[1] [background-image:radial-gradient(circle_at_50%_48%,var(--color-foose-surface)_2%,color-mix(in_srgb,var(--color-foose-surface)_90%,transparent)_31%,color-mix(in_srgb,var(--color-foose-surface)_55%,transparent)_56%,transparent_78%)]" />
        <div className="home-mosaic-stage relative z-[2] mx-auto min-h-[540px] w-full max-w-[1440px] max-lg:min-h-0">
          {desktopMosaic && <div className="home-mosaic-tiles absolute inset-0 z-[1] hidden lg:block">
            <div className="home-mosaic-track absolute inset-0 pointer-events-none">{renderMosaicSide(0)}</div>
            <div className="home-mosaic-track absolute inset-0 pointer-events-none">{renderMosaicSide(1)}</div>
            {mosaicLabels.slice(6).map((label, index) => {
              const position = `home-mosaic-slot-${index + 7}`
              return <div className={`absolute ${position.endsWith('slot-8') ? 'z-[2]' : ''} ${mosaicPositionClasses[position]}`} key={label}>
                <div aria-hidden="true" className={`${mosaicTileClasses} ${mosaicTileTone(position)} rotate-[5deg]`}><span className={mosaicTileLabelClasses}>{label}</span></div>
              </div>
            })}
          </div>}

          <div className="relative z-10 mx-auto flex w-full max-w-2xl flex-col items-center px-5 pt-[142px] pb-[54px] text-center max-lg:py-20 max-sm:px-[18px] max-sm:py-16">
            <span className="mb-[18px] text-[11px] font-extrabold tracking-[0.2em] text-accent uppercase">{user ? `Welcome back, ${greetingName}` : 'Welcome to Foose'}</span>
            <h1 className="max-w-[620px] font-display text-[clamp(42px,5.2vw,76px)] font-bold leading-[1.02] tracking-[-0.045em] max-sm:text-[clamp(38px,10vw,52px)]" id="home-hero-title">Find your next piece.</h1>
            <p className="mt-[22px] text-[clamp(14px,1.3vw,17px)] leading-[1.55] text-foose-muted max-sm:mt-4">One of a kind style from Ghana's thrift community.</p>
            <form action={withBasePath('/browse')} className="mt-7 flex w-full max-w-[580px] items-center rounded-2xl border border-foose-border bg-foose-surface p-1.5 text-foose-text shadow-xl shadow-black/10 max-sm:mt-[22px]" method="get" role="search">
              <label className="flex min-w-0 flex-1 items-center gap-2.5 rounded-xl px-3 focus-within:ring-2 focus-within:ring-accent/20">
                <Icon name="search" size={21} />
                <input aria-label="Search marketplace items" className="h-12 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-foose-muted" enterKeyHint="search" name="q" placeholder="Search clothes, brands, and bales" type="search" />
              </label>
              <button className="h-11 rounded-xl bg-accent px-5 text-sm font-bold text-white transition hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent" type="submit">Search</button>
            </form>
            <div className="mt-[18px] flex flex-wrap items-center justify-center gap-2 text-xs max-sm:mt-[15px] max-sm:gap-[6px]">
              <span className="font-semibold text-foose-muted">Try:</span>
              {popularHeroSearches.map((term) => <a className="rounded-full border border-foose-border bg-foose-surface/95 px-3 py-1.5 font-semibold text-foose-text transition hover:border-accent hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent" href={withBasePath(`/browse?q=${encodeURIComponent(term)}`)} key={term}>{term}</a>)}
            </div>
          </div>
        </div>
      </section>

      {(promotedEvents.loading || Boolean(promotedEvents.data?.events.length)) && <section className={`${homeSectionClass} promoted-events-section`}>
        <SectionHeader title="Featured events" eyebrow="Where the thrift community comes together." />
        <RefreshIndicator active={promotedEvents.refreshing} className="mb-4" label="Refreshing featured events" />
        {promotedEvents.initialLoading && <EventCarouselSkeleton />}
        {!!promotedEvents.data?.events.length && <PromotedEventCarousel events={promotedEvents.data.events} />}
      </section>}

      {(topPicks.loading || topPicks.error || topPickItems.length > 0) && (
        <section className={`${homeSectionClass} top-picks-section`}>
          <SectionHeader title="Top picks" eyebrow="Paid placements for standout finds." action={<a href={withBasePath('/top-picks')}>View more</a>} />
          <RefreshIndicator active={topPicks.refreshing} className="mb-4" label="Refreshing Top Picks" />
          {topPicks.initialLoading && <ProductGridSkeleton count={6} label="Loading Top Picks" />}
          {topPicks.error && <InlineNotice action={<button className="font-black text-accent" onClick={topPicks.refetch} type="button">Retry</button>} title="Top Picks did not refresh" tone="error">Continue browsing the other Home sections.</InlineNotice>}
          {!!topPickItems.length && (
            <div className={homeListingGrid}>
              {topPickItems.slice(0, 12).map((listing, index) => (
                <ProductCard className={homeGridVisibility(index)} key={listing._id} listing={listing} />
              ))}
            </div>
          )}
        </section>
      )}

      <section className={homeSectionClass}>
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
            action={(
              <ButtonLink to={user?.hasShop ? '/listings/new' : '/open-shop'}>
                {user?.hasShop ? 'Add listings' : 'Open your DigiShop'}
              </ButtonLink>
            )}
            body="Listings will appear here as sellers publish them."
            layout="compact"
            title="No listings yet"
            tone="empty"
          />
        )}
        {!!freshDropItems.length && (
          <div className={homeListingGrid}>
            {freshDropItems.slice(0, 12).map((listing, index) => (
              <ProductCard className={homeGridVisibility(index)} key={listing._id} listing={listing} />
            ))}
          </div>
        )}
      </section>

      <section className={`${homeSectionClass} suggested-section`}>
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
            {suggestedItems.slice(0, 12).map((listing, index) => (
              <ProductCard className={homeGridVisibility(index)} key={listing._id} listing={listing} />
            ))}
          </div>
        )}
      </section>

      {(freshBales.loading || freshBales.error || freshBaleItems.length > 0) && (
        <section className={homeSectionClass}>
          <SectionHeader
            title="Fresh bales"
            eyebrow="Newest wholesale listings for bulk buyers and shop owners."
            action={<a href={withBasePath('/bales')}>View more</a>}
          />
          <RefreshIndicator active={freshBales.refreshing} className="mb-4" label="Refreshing fresh bales" />
          {freshBales.initialLoading && <ProductGridSkeleton count={6} label="Loading fresh wholesale bales" />}
          {freshBales.error && <InlineNotice action={<button className="font-black text-accent" onClick={freshBales.refetch} type="button">Retry</button>} title="Fresh bales did not load" tone="error">Retail and community sections remain available.</InlineNotice>}
          {!!freshBaleItems.length && (
            <div className={homeListingGrid}>
              {freshBaleItems.slice(0, 12).map((listing, index) => (
                <ProductCard className={homeGridVisibility(index)} key={listing._id} listing={listing} />
              ))}
            </div>
          )}
        </section>
      )}

      {!user?.hasShop && (
        <section className="home-seller-banner relative isolate mx-auto w-full max-w-[1280px] overflow-hidden rounded-[28px] text-white">
          <div className="home-seller-copy relative z-10">
            <span className="home-seller-eyebrow">For the next generation of sellers</span>
            <h2>Turn your closet into a business.</h2>
            <p>Create a verified DigiShop, publish listings, and manage orders in one place.</p>
          </div>
          <ButtonLink className="home-seller-action relative z-10" to="/open-shop" variant="secondary">
            Open your DigiShop
          </ButtonLink>
        </section>
      )}

      <section className={`${homeSectionClass} weekly-discovery-section`}>
        <SectionHeader title="This week's pulse" eyebrow="The people and pieces shaping Foose right now." />
        <div className="weekly-discovery-grid grid gap-4 lg:grid-cols-2">
          <article className="weekly-card top-sellers-card">
            <div className="weekly-card-heading">
              <h3>Top sellers this week</h3>
              <span className="weekly-heading-icon"><Icon name="chart" /></span>
            </div>
            <RefreshIndicator active={topSellers.refreshing} className="mb-4" label="Refreshing weekly sellers" />
            {topSellers.initialLoading && <CompactListSkeleton label="Loading this week's top sellers" />}
            {topSellers.error && <InlineNotice action={<button className="font-black text-accent" onClick={topSellers.refetch} type="button">Retry</button>} title="Seller pulse unavailable" tone="error">Rankings could not be refreshed.</InlineNotice>}
            {!topSellers.loading && !topSellers.error && !topSellers.data?.sellers.length && (
              <StatePanel body="Weekly seller activity will appear after completed marketplace orders are recorded." layout="compact" title="No weekly sellers yet" tone="empty" />
            )}
            {!!topSellers.data?.sellers.length && (
              <div className="top-seller-list flex flex-col">
                {topSellers.data.sellers.slice(0, 5).map((seller, index) => (
                  <a className="top-seller-row flex items-center gap-4" href={withBasePath(`/shops/${seller.slug}`)} key={seller._id}>
                    <span className="seller-rank">{String(index + 1).padStart(2, '0')}</span>
                    <span className="seller-avatar">
                      {seller.logoUrl ? <img alt="" src={seller.logoUrl} /> : initials(seller.shopName)}
                    </span>
                    <strong className="min-w-0 flex-1 truncate">{seller.shopName}</strong>
                    <span aria-hidden="true" className="weekly-row-arrow">↗</span>
                  </a>
                ))}
              </div>
            )}
          </article>

          <article className="weekly-card popular-search-card">
            <div className="weekly-card-heading">
              <h3>Popular searches</h3>
              <span className="weekly-heading-icon"><Icon name="search" /></span>
            </div>
            <RefreshIndicator active={popularSearches.refreshing} className="mb-4" label="Refreshing popular searches" />
            {popularSearches.initialLoading && <CompactListSkeleton label="Loading popular marketplace searches" rows={5} />}
            {popularSearches.error && <InlineNotice action={<button className="font-black text-accent" onClick={popularSearches.refetch} type="button">Retry</button>} title="Search pulse unavailable" tone="error">Popular marketplace searches could not be refreshed.</InlineNotice>}
            {!popularSearches.loading && !popularSearches.error && !popularSearches.data?.searches.length && (
              <StatePanel body="Popular marketplace searches will appear as shoppers discover items." layout="compact" title="No search activity yet" tone="empty" />
            )}
            {!!popularSearches.data?.searches.length && (
              <div className="popular-searches grid gap-x-5 sm:grid-cols-2">
                {popularSearches.data.searches.slice(0, 5).map((search) => (
                  <a href={withBasePath(`/browse?q=${encodeURIComponent(search.query)}`)} key={search.normalizedQuery}>
                    <span>{search.query}</span>
                    <span aria-hidden="true">↗</span>
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
