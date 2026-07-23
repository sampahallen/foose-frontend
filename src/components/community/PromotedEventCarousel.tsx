import { useEffect, useRef, useState, type MouseEvent, type PointerEvent } from 'react'
import type { Event } from '../../types/api'
import { formatDate } from '../../utils/format'
import { withBasePath } from '../../utils/navigation'
import { SafeImage } from '../ui/SafeImage'

const SWIPE_DISTANCE = 50

export function PromotedEventCarousel({ events }: { events: Event[] }) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [rotationRevision, setRotationRevision] = useState(0)
  const pointerStart = useRef<{ x: number; y: number } | null>(null)
  const suppressLinkClick = useRef(false)
  const activeSlide = events.length ? activeIndex % events.length : 0

  useEffect(() => {
    if (events.length < 2) return undefined
    const timer = window.setInterval(() => {
      setActiveIndex((index) => (index + 1) % events.length)
    }, 7000)
    return () => window.clearInterval(timer)
  }, [events.length, rotationRevision])

  if (!events.length) return null

  function previousSlide() {
    setActiveIndex((index) => (index - 1 + events.length) % events.length)
    setRotationRevision((revision) => revision + 1)
  }

  function nextSlide() {
    setActiveIndex((index) => (index + 1) % events.length)
    setRotationRevision((revision) => revision + 1)
  }

  function chooseSlide(index: number) {
    setActiveIndex(index)
    setRotationRevision((revision) => revision + 1)
  }

  function startSwipe(event: PointerEvent<HTMLDivElement>) {
    if (!event.isPrimary || event.button !== 0 || events.length < 2) return
    pointerStart.current = { x: event.clientX, y: event.clientY }
    event.currentTarget.setPointerCapture?.(event.pointerId)
  }

  function finishSwipe(event: PointerEvent<HTMLDivElement>) {
    const start = pointerStart.current
    pointerStart.current = null
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) event.currentTarget.releasePointerCapture?.(event.pointerId)
    if (!start) return
    const distanceX = event.clientX - start.x
    const distanceY = event.clientY - start.y
    if (Math.abs(distanceX) < SWIPE_DISTANCE || Math.abs(distanceX) <= Math.abs(distanceY)) return
    suppressLinkClick.current = true
    if (distanceX < 0) nextSlide()
    else previousSlide()
    window.setTimeout(() => { suppressLinkClick.current = false }, 0)
  }

  function openSlide(event: MouseEvent<HTMLAnchorElement>) {
    if (!suppressLinkClick.current) return
    event.preventDefault()
    event.stopPropagation()
    suppressLinkClick.current = false
  }

  return (
    <div
      aria-roledescription="carousel"
      className="relative w-full touch-pan-y select-none overflow-hidden rounded-2xl bg-foose-text shadow-lg"
      onPointerCancel={() => { pointerStart.current = null }}
      onPointerDown={startSwipe}
      onPointerUp={finishSwipe}
    >
      <div
        aria-live="polite"
        className="flex transition-transform duration-500 ease-out motion-reduce:transition-none"
        style={{ transform: `translate3d(-${activeSlide * 100}%, 0, 0)` }}
      >
        {events.map((event, index) => (
          <a
            aria-hidden={index !== activeSlide}
            className="group relative flex min-h-[260px] min-w-full items-end overflow-hidden px-4 pb-14 pt-24 text-white sm:min-h-[320px] sm:px-6 md:min-h-[360px] md:px-8 md:pb-16 lg:min-h-[400px]"
            href={withBasePath(`/community/events/${event._id}`)}
            key={event._id}
            onClick={openSlide}
            tabIndex={index === activeSlide ? 0 : -1}
          >
            <SafeImage
              alt=""
              className="absolute inset-0 h-full w-full object-cover opacity-75 transition duration-500 group-hover:scale-105"
              fallback={null}
              fallbackClassName="bg-[radial-gradient(circle_at_20%_20%,rgba(48,69,255,0.9),transparent_35%),linear-gradient(135deg,#101323,#3045ff)]"
              src={event.coverImage}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-accent/40 to-black/20" />
            <div className="relative z-10 max-w-3xl">
              <span className="mb-3 inline-flex rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-white backdrop-blur">{formatDate(event.date)}</span>
              <h3 className="text-2xl font-black leading-tight sm:text-3xl md:text-5xl">{event.title}</h3>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-white/85 md:text-base">{event.description || event.location || 'Tap to view event details.'}</p>
            </div>
          </a>
        ))}
      </div>

      {events.length > 1 && (
        <div aria-label="Featured event slides" className="absolute bottom-3 left-1/2 z-20 flex -translate-x-1/2 items-center rounded-full bg-black/30 px-0.5 backdrop-blur sm:bottom-5">
          {events.map((event, index) => (
            <button
              aria-current={index === activeSlide ? 'true' : undefined}
              aria-label={`Show ${event.title}`}
              className="group/dot inline-flex min-h-9 min-w-9 items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-white"
              key={event._id}
              onClick={() => chooseSlide(index)}
              onPointerDown={(pointerEvent) => pointerEvent.stopPropagation()}
              onPointerUp={(pointerEvent) => pointerEvent.stopPropagation()}
              type="button"
            >
              <span aria-hidden="true" className={`h-2.5 rounded-full transition-all ${index === activeSlide ? 'w-8 bg-white' : 'w-2.5 bg-white/45 group-hover/dot:bg-white/80'}`} />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
