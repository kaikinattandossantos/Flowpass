'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import toast from 'react-hot-toast'
import { API_URL, authHeaders } from '@/lib/api'
import { DashboardEvent } from '@/lib/events'
import { EventCard } from '@/components/dashboard/EventCard'
import { canManageEvents, getStoredUser } from '@/store/auth'

export default function DashboardEventsPage() {
  const router = useRouter()
  const [events, setEvents] = useState<DashboardEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [canCreate, setCanCreate] = useState(false)

  useEffect(() => {
    void (async () => {
      try {
        const user = getStoredUser()
        if (user) setCanCreate(canManageEvents(user.role))

        const response = await axios.get(`${API_URL}/events`, { headers: authHeaders() })
        setEvents(response.data)
      } catch {
        toast.error('Erro ao carregar eventos')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#0B1F3A]">Eventos</h1>
          <p className="mt-2 text-gray-600">Gerencie os eventos da sua empresa.</p>
        </div>
        {canCreate && (
          <button
            type="button"
            onClick={() => router.push('/dashboard/events/new')}
            className="rounded-lg bg-[#00C896] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[#00a876]"
          >
            + Novo Evento
          </button>
        )}
      </div>

      {loading ? (
        <p className="py-12 text-center text-gray-600">Carregando eventos...</p>
      ) : events.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white px-6 py-12 text-center shadow-sm">
          <p className="text-gray-600">Nenhum evento criado ainda.</p>
          {canCreate && (
            <button
              type="button"
              onClick={() => router.push('/dashboard/events/new')}
              className="mt-4 rounded-lg bg-[#00C896] px-6 py-2 text-sm font-semibold text-white transition hover:bg-[#00a876]"
            >
              Criar primeiro evento
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {events.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      )}
    </div>
  )
}
