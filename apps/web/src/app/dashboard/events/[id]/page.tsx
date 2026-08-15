'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import axios from 'axios'
import toast from 'react-hot-toast'
import { API_URL, authHeaders } from '@/lib/api'
import { EventBreadcrumb } from '@/components/dashboard/EventBreadcrumb'
import { eventNavHref } from '@/lib/event-navigation'

interface Event {
  id: string
  name: string
  status: 'draft' | 'active' | 'finished'
  start_at: string
  location: string
  registrations: Registration[]
}

interface Registration {
  id: string
  name: string
  email: string
  status: string
  category?: {
    name: string
  }
}

export default function EventDetailsPage() {
  const params = useParams()
  const eventId = params.id as string
  const [event, setEvent] = useState<Event | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const eventRes = await axios.get(`${API_URL}/events/${eventId}`, { headers: authHeaders() })
        setEvent(eventRes.data)
      } catch {
        toast.error('Erro ao carregar evento')
      } finally {
        setLoading(false)
      }
    }
    fetchEvent()
  }, [eventId])

  const copyInscriptionLink = () => {
    const link = `${window.location.origin}/inscrever/${eventId}`
    navigator.clipboard.writeText(link)
    toast.success('Link copiado!')
  }

  if (loading) return <div className="p-8">Carregando...</div>
  if (!event) return <div className="p-8">Evento não encontrado</div>

  const filteredRegistrations = event.registrations.filter(r =>
    r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="mx-auto max-w-6xl">
      <EventBreadcrumb />

      <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm mb-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-[#0B1F3A]">{event.name}</h1>
            <div className="flex flex-wrap items-center gap-4 mt-2">
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                event.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
              }`}>
                {event.status === 'active' ? 'Ativo' : 'Rascunho'}
              </span>
              <span className="text-gray-600">{new Date(event.start_at).toLocaleDateString('pt-BR')}</span>
              <span className="text-gray-600">{event.location}</span>
            </div>
          </div>
          <div className="flex gap-2">
            <Link
              href={`/dashboard/events/${eventId}/live`}
              className="px-4 py-2 bg-[#00C896] text-white rounded-lg hover:bg-[#00a876]"
            >
              Ver ao Vivo
            </Link>
            <button
              type="button"
              onClick={copyInscriptionLink}
              className="px-4 py-2 border border-[#00C896] text-[#00C896] rounded-lg hover:bg-green-50"
            >
              Copiar Link
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
              <h2 className="text-2xl font-bold text-[#0B1F3A] mb-4">Inscritos ({event.registrations.length})</h2>
              
              <input
                type="text"
                placeholder="Buscar por nome ou e-mail..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4 focus:ring-2 focus:ring-[#00C896] outline-none"
              />

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-2 text-left font-semibold text-gray-700">Nome</th>
                      <th className="px-4 py-2 text-left font-semibold text-gray-700">E-mail</th>
                      <th className="px-4 py-2 text-left font-semibold text-gray-700">Categoria</th>
                      <th className="px-4 py-2 text-left font-semibold text-gray-700">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRegistrations.length === 0 ? (
                      <tr><td colSpan={4} className="px-4 py-4 text-center text-gray-600">Nenhum inscrito</td></tr>
                    ) : (
                      filteredRegistrations.map(reg => (
                        <tr key={reg.id} className="border-b hover:bg-gray-50">
                          <td className="px-4 py-3">{reg.name}</td>
                          <td className="px-4 py-3">{reg.email}</td>
                          <td className="px-4 py-3">{reg.category?.name}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded text-xs font-semibold ${
                              reg.status === 'confirmed' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                            }`}>
                              {reg.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="rounded-lg bg-white p-8 shadow-lg">
            <h2 className="mb-2 text-2xl font-bold text-[#0B1F3A]">Credenciamento</h2>
            <p className="mb-4 text-sm text-gray-600">
              Configure operadores e, em breve, links para check-in presencial com QR Code.
            </p>
            <Link
              href={eventNavHref(eventId, 'credenciamento')}
              className="inline-block rounded-lg bg-[#00C896] px-4 py-2 text-sm font-semibold text-white hover:bg-[#00a876]"
            >
              Abrir credenciamento
            </Link>
          </div>
        </div>
    </div>
  )
}
