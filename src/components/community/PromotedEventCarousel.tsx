import { useEffect, useState } from 'react'
import type { Event } from '../../types/api'
import { formatDate } from '../../utils/format'
import { withBasePath } from '../../utils/navigation'
import { Icon } from '../icons/Icon'
import { SafeImage } from '../ui/SafeImage'

export function PromotedEventCarousel({ events }: { events: Event[] }) {
  const [activeIndex, setActiveIndex] = useState(0)
  const activeEvent = events.length ? events[activeIndex % events.length] : null

  useEffect(() => {
    if (events.length < 2) return undefined
    const timer = window.setInterval(() => {
      setActiveIndex((index) => (index + 1) % events.length)
    }, 7000)

    return () => window.clearInterval(timer)
  }, [events.length])

  if (!activeEvent) return null

  function previousSlide() {
    setActiveIndex((index) => (index - 1 + events.length) % events.length)
  }

  function nextSlide() {
    setActiveIndex((index) => (index + 1) % events.length)
  }

  return (
    <div className="relative w-full overflow-hidden rounded-2xl bg-foose-text shadow-lg">
      <a className="group relative flex min-h-[260px] items-end overflow-hidden px-4 pb-14 pt-24 text-white sm:min-h-[320px] sm:px-6 md:min-h-[360px] md:px-8 md:pb-16 lg:min-h-[400px]" href={withBasePath(`/community/events/${activeEvent._id}`)}>
        <SafeImage
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-75 transition duration-500 group-hover:scale-105"
          fallback={null}
          fallbackClassName="bg-[radial-gradient(circle_at_20%_20%,rgba(48,69,255,0.9),transparent_35%),linear-gradient(135deg,#101323,#3045ff)]"
          src={activeEvent.coverImage}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-accent/40 to-black/20" />
        <div className="relative z-10 max-w-3xl">
          <span className="mb-3 inline-flex rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-white backdrop-blur">{formatDate(activeEvent.date)}</span>
          <h3 className="text-2xl font-black leading-tight sm:text-3xl md:text-5xl">{activeEvent.title}</h3>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-white/85 md:text-base">{activeEvent.description || activeEvent.location || 'Tap to view event details.'}</p>
        </div>
      </a>
      {events.length > 1 && (
        <>
          <button
            aria-label="Previous featured event"
            className="absolute left-3 top-1/2 z-20 inline-flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur transition hover:bg-white hover:text-accent max-sm:size-9"
            onClick={previousSlide}
            type="button"
          >
            <span className="rotate-180">
              <Icon name="arrow" size={18} />
            </span>
          </button>
          <button
            aria-label="Next featured event"
            className="absolute right-3 top-1/2 z-20 inline-flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur transition hover:bg-white hover:text-accent max-sm:size-9"
            onClick={nextSlide}
            type="button"
          >
            <Icon name="arrow" size={18} />
          </button>
          <div className="absolute bottom-5 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 rounded-full bg-black/25 px-3 py-2 backdrop-blur" aria-label="Featured event slides">
            {events.map((event, index) => (
              <button
                aria-label={`Show ${event.title}`}
                className={`h-2.5 rounded-full transition-all ${index === activeIndex % events.length ? 'w-8 bg-white' : 'w-2.5 bg-white/45 hover:bg-white/80'}`}
                key={event._id}
                onClick={() => setActiveIndex(index)}
                type="button"
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
