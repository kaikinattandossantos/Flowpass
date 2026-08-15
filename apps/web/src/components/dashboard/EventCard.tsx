'use client'

import Link from 'next/link'
import {
  DashboardEvent,
  eventStatusClass,
  eventStatusLabel,
  formatEventDateRange
} from '@/lib/events'

interface EventCardProps {
  event: DashboardEvent
  compact?: boolean
}

export function EventCard({ event, compact }: EventCardProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition hover:border-[#00C896]/40 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className={`font-semibold text-[#0B1F3A] ${compact ? 'text-base' : 'text-lg'}`}>
            {event.name}
          </h3>
          <p className="mt-2 text-sm text-gray-600">
            {formatEventDateRange(event.start_at, event.end_at)}
          </p>
          {event.location ? (
            <p className="mt-1 text-sm text-gray-500 truncate">{event.location}</p>
          ) : (
            <p className="mt-1 text-sm text-gray-400">Local não informado</p>
          )}
        </div>
        <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${eventStatusClass(event.status)}`}>
          {eventStatusLabel(event.status)}
        </span>
      </div>

      <div className="mt-4">
        <Link
          href={`/dashboard/events/${event.id}`}
          className="inline-flex items-center rounded-lg bg-[#00C896] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#00a876]"
        >
          Acessar evento
        </Link>
      </div>
    </div>
  )
}
