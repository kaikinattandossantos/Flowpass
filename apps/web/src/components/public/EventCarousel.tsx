'use client'

import { useRef } from 'react'
import { EventCard } from '@/components/public/EventCard'
import type { PublicEvent } from '@/lib/public-events'

interface EventCarouselProps {
  title: string
  subtitle?: string
  events: PublicEvent[]
  viewAllHref?: string
}

export function EventCarousel({ title, subtitle, events, viewAllHref }: EventCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  if (events.length === 0) return null

  const scroll = (direction: 'left' | 'right') => {
    const el = scrollRef.current
    if (!el) return
    const amount = direction === 'left' ? -320 : 320
    el.scrollBy({ left: amount, behavior: 'smooth' })
  }

  return (
    <section className="mb-12">
      <div className="flex items-end justify-between gap-4 mb-5 px-1">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-[var(--brand)]">{title}</h2>
          {subtitle && <p className="text-sm text-slate-600 mt-1">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-2">
          {viewAllHref && (
            <a
              href={viewAllHref}
              className="hidden sm:inline text-sm font-semibold text-[var(--accent-dark)] hover:underline mr-2"
            >
              Ver todos
            </a>
          )}
          <button
            type="button"
            onClick={() => scroll('left')}
            className="w-9 h-9 rounded-full border border-[var(--border)] bg-white shadow-sm flex items-center justify-center text-slate-600 hover:border-[var(--accent)] hover:text-[var(--accent)] transition"
            aria-label="Anterior"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => scroll('right')}
            className="w-9 h-9 rounded-full border border-[var(--border)] bg-white shadow-sm flex items-center justify-center text-slate-600 hover:border-[var(--accent)] hover:text-[var(--accent)] transition"
            aria-label="Próximo"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide carousel-snap -mx-1 px-1"
      >
        {events.map((event) => (
          <EventCard key={event.id} event={event} variant="carousel" />
        ))}
      </div>
    </section>
  )
}