import { useEffect, useState } from 'react'
import type { Event } from '../../types/api'
import { formatDate } from '../../utils/format'
import { withBasePath } from '../../utils/navigation'
import { Badge } from '../ui/Badge'

export function PromotedEventCarousel({ events }: { events: Event[] }) {
  const [activeIndex, setActiveIndex] = useState(0)
  const activeEvent = events.length ? events[activeIndex % events.length] : null

  useEffect(() => {
    if (events.length < 2) return undefined
    const timer = window.setInterval(() => {
      setActiveIndex((index) => (index + 1) % events.length)
    }, 6500)

    return () => window.clearInterval(timer)
  }, [events.length])

  if (!activeEvent) return null

  return (
    <div className="promoted-event-carousel">
      <a className="promoted-event-slide" href={withBasePath(`/community/events/${activeEvent._id}`)}>
        {activeEvent.coverImage && <img alt="" src={activeEvent.coverImage} />}
        <div className="promoted-event-copy">
          <Badge tone="accent">Promoted event</Badge>
          <span>{formatDate(activeEvent.date)}</span>
          <h3>{activeEvent.title}</h3>
          <p>{activeEvent.description || activeEvent.location || 'Tap to view event details.'}</p>
        </div>
      </a>
      {events.length > 1 && (
        <div className="carousel-dots" aria-label="Featured event slides">
          {events.map((event, index) => (
            <button
              aria-label={`Show ${event.title}`}
              className={index === activeIndex % events.length ? 'active' : ''}
              key={event._id}
              onClick={() => setActiveIndex(index)}
              type="button"
            />
          ))}
        </div>
      )}
    </div>
  )
}
