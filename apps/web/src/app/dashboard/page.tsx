'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import toast from 'react-hot-toast'
import { getHomeForRole, getStoredUser } from '@/lib/auth'

interface Event {
  id: string
  name: string
  status: 'draft' | 'active' | 'finished'
  start_at: string
  end_at: string
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333'

export default function DashboardPage() {
  const router = useRouter()
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const token = localStorage.getItem('token')
        const user = getStoredUser()

        if (!token || !user) {
          router.push('/login')
          return
        }

        if (user.role === 'superadmin') {
          router.push(getHomeForRole(user.role))
          return
        }

        const response = await axios.get(`${API_URL}/events`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        setEvents(response.data)
      } catch (error) {
        toast.error('Erro ao carregar eventos')
        console.error(error)
      } finally {
        setLoading(false)
      }
    }

    fetchEvents()
  }, [router])

  const getStatusBadge = (status: string) => {
    const colors = {
      draft: 'bg-gray-100 text-gray-800',
      active: 'bg-green-100 text-green-800',
      finished: 'bg-red-100 text-red-800'
    }
    return colors[status as keyof typeof colors] || colors.draft
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-[#0B1F3A] text-white p-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold">FlowPass</h1>
          <button
            onClick={() => {
              localStorage.removeItem('token')
              router.push('/login')
            }}
            className="bg-[#00C896] hover:bg-[#00a876] px-4 py-2 rounded"
          >
            Sair
          </button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-8">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-3xl font-bold text-[#0B1F3A]">Meus Eventos</h2>
          <button
            onClick={() => router.push('/dashboard/events/new')}
            className="bg-[#00C896] hover:bg-[#00a876] text-white px-6 py-2 rounded-lg font-semibold"
          >
            + Novo Evento
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-600">Carregando eventos...</p>
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg">
            <p className="text-gray-600 mb-4">Nenhum evento criado ainda</p>
            <button
              onClick={() => router.push('/dashboard/events/new')}
              className="bg-[#00C896] hover:bg-[#00a876] text-white px-6 py-2 rounded-lg"
            >
              Criar Primeiro Evento
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((event) => (
              <div
                key={event.id}
                className="bg-white rounded-lg shadow hover:shadow-lg transition cursor-pointer p-6"
                onClick={() => router.push(`/dashboard/events/${event.id}`)}
              >
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-lg font-semibold text-[#0B1F3A]">{event.name}</h3>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadge(event.status)}`}>
                    {event.status === 'draft' ? 'Rascunho' : event.status === 'active' ? 'Ativo' : 'Finalizado'}
                  </span>
                </div>
                <p className="text-sm text-gray-600">
                  {new Date(event.start_at).toLocaleDateString('pt-BR')}
                </p>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
