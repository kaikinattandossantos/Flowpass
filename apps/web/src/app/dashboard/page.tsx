'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import axios from 'axios'
import toast from 'react-hot-toast'
import { API_URL, authHeaders } from '@/lib/api'
import {
  DashboardEvent,
  formatEventDateRange,
  isUpcomingEvent,
  sortEventsByStartAsc
} from '@/lib/events'
import { getStoredUser } from '@/store/auth'

interface ParticipantRow {
  status: string
}

export default function DashboardOverviewPage() {
  const [events, setEvents] = useState<DashboardEvent[]>([])
  const [participantTotal, setParticipantTotal] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void (async () => {
      try {
        const response = await axios.get(`${API_URL}/events`, { headers: authHeaders() })
        const nextEvents = response.data as DashboardEvent[]
        setEvents(nextEvents)

        if (nextEvents.length === 0) {
          setParticipantTotal(0)
          return
        }

        const user = getStoredUser()
        const canReadParticipants = user?.role === 'admin' || user?.role === 'viewer'

        if (!canReadParticipants) {
          setParticipantTotal(null)
          return
        }

        const participantResponses = await Promise.all(
          nextEvents.map((event) =>
            axios
              .get(`${API_URL}/events/${event.id}/participants`, { headers: authHeaders() })
              .then((res) => res.data as ParticipantRow[])
              .catch(() => [])
          )
        )

        const total = participantResponses.reduce(
          (sum, participants) => sum + participants.filter((item) => item.status !== 'cancelled').length,
          0
        )
        setParticipantTotal(total)
      } catch {
        toast.error('Erro ao carregar visão geral')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const stats = useMemo(() => {
    const now = new Date()
    const activeEvents = events.filter((event) => event.status === 'active').length
    const upcomingEvents = events.filter((event) => isUpcomingEvent(event, now))

    return {
      totalEvents: events.length,
      activeEvents,
      upcomingCount: upcomingEvents.length,
      upcomingList: sortEventsByStartAsc(upcomingEvents).slice(0, 5)
    }
  }, [events])

  if (loading) {
    return <p className="text-gray-600">Carregando visão geral...</p>
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-[#0B1F3A]">Visão geral</h1>
        <p className="mt-2 text-gray-600">Resumo da operação da sua empresa no FlowPass.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total de eventos" value={stats.totalEvents} />
        <StatCard label="Eventos ativos" value={stats.activeEvents} />
        <StatCard
          label="Total de participantes"
          value={participantTotal ?? '—'}
        />
        <StatCard label="Próximos eventos" value={stats.upcomingCount} />
      </div>

      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-[#0B1F3A]">Próximos eventos</h2>
            <p className="mt-1 text-sm text-gray-600">Acesso rápido aos eventos com agenda futura ou em andamento.</p>
          </div>
          <Link
            href="/dashboard/events"
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-[#0B1F3A] transition hover:border-[#00C896] hover:text-[#00C896]"
          >
            Ver todos
          </Link>
        </div>

        {stats.upcomingList.length === 0 ? (
          <div className="rounded-lg bg-gray-50 px-4 py-8 text-center text-sm text-gray-600">
            Nenhum evento próximo encontrado.
          </div>
        ) : (
          <div className="space-y-3">
            {stats.upcomingList.map((event) => (
              <Link
                key={event.id}
                href={`/dashboard/events/${event.id}`}
                className="flex flex-col gap-3 rounded-lg border border-gray-100 px-4 py-4 transition hover:border-[#00C896]/30 hover:bg-green-50/40 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-semibold text-[#0B1F3A]">{event.name}</p>
                  <p className="mt-1 text-sm text-gray-600">
                    {formatEventDateRange(event.start_at, event.end_at)}
                    {event.location ? ` · ${event.location}` : ''}
                  </p>
                </div>
                <span className="text-sm font-medium text-[#00C896]">Acessar →</span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-gray-600">{label}</p>
      <p className="mt-3 text-3xl font-bold text-[#0B1F3A]">{value}</p>
    </div>
  )
}
