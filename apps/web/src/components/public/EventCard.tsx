import Link from 'next/link'
import { formatEventAddress } from '@/lib/address'
import { getContrastTextColor } from '@/lib/color-contrast'
import {
  formatEventDateShort,
  getEventCity,
  getEventSummary,
  type PublicEvent
} from '@/lib/public-events'

interface EventCardProps {
  event: PublicEvent
  variant?: 'carousel' | 'grid'
}

export function EventCard({ event, variant = 'grid' }: EventCardProps) {
  const date = formatEventDateShort(event.start_at)
  const textOnBanner = getContrastTextColor(event.banner_color)
  const widthClass = variant === 'carousel' ? 'w-[280px] sm:w-[300px] shrink-0' : 'w-full'

  return (
    <article
      className={`${widthClass} group bg-white rounded-2xl border border-[var(--border)] overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5`}
    >
      <Link href={`/inscrever/${event.id}`} className="block">
        <div
          className="relative h-36 sm:h-40 p-4 flex flex-col justify-between overflow-hidden"
          style={{
            background: `linear-gradient(135deg, ${event.banner_color} 0%, ${event.accent_color}88 100%)`,
            color: textOnBanner
          }}
        >
          <div className="flex justify-between items-start gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider opacity-80 line-clamp-1">
              {event.company.name}
            </span>
            <div className="bg-white/95 text-[var(--brand)] rounded-lg px-2.5 py-1.5 text-center shadow-sm shrink-0">
              <p className="text-lg font-bold leading-none">{date.day}</p>
              <p className="text-[10px] uppercase font-semibold">{date.month}</p>
            </div>
          </div>
          <h3 className="font-bold text-lg leading-snug line-clamp-2 group-hover:underline decoration-2 underline-offset-2">
            {event.name}
          </h3>
        </div>

        <div className="p-4 space-y-3">
          <p className="text-sm text-slate-600 line-clamp-2 min-h-[2.5rem]">
            {getEventSummary(event)}
          </p>

          <div className="space-y-1.5 text-xs text-slate-700">
            <p className="flex items-center gap-2">
              <svg className="w-3.5 h-3.5 text-[var(--accent)] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {date.weekday}, {date.full}
            </p>
            <p className="flex items-center gap-2">
              <svg className="w-3.5 h-3.5 text-[var(--accent)] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a2 2 0 01-2.828 0l-4.243-4.243a8 8 0 1111.314 0z" />
              </svg>
              <span className="line-clamp-1">{getEventCity(event)} · {formatEventAddress(event)}</span>
            </p>
          </div>

          {event.categories.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {event.categories.slice(0, 2).map((category) => (
                <span
                  key={category.id}
                  className="px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wide bg-slate-100 text-slate-700"
                >
                  {category.name}
                </span>
              ))}
            </div>
          )}

          <div className="pt-1 flex items-center justify-between">
            <span
              className="inline-flex items-center gap-1 text-sm font-semibold"
              style={{ color: event.accent_color }}
            >
              Inscrever-se
              <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
              </svg>
            </span>
            <span className="text-[10px] font-medium text-slate-500 uppercase">Gratuito</span>
          </div>
        </div>
      </Link>
    </article>
  )
}