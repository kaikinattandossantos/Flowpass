'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import axios from 'axios'
import { formatEventAddress } from '@/lib/address'
import { getContrastMutedTextColor, getContrastTextColor } from '@/lib/color-contrast'

interface PublicEvent {
  id: string
  name: string
  description?: string | null
  start_at: string
  end_at: string
  banner_color: string
  accent_color: string
  welcome_message?: string | null
  street: string
  number: string
  complement?: string | null
  neighborhood?: string | null
  city?: string | null
  state?: string | null
  cep: string
  location?: string | null
  categories: Array<{ id: string; name: string; color?: string | null }>
  company: { name: string }
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333'

function formatEventDate(startAt: string, endAt: string) {
  const start = new Date(startAt)
  const end = new Date(endAt)
  const sameDay = start.toDateString() === end.toDateString()

  const dateOptions: Intl.DateTimeFormatOptions = {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  }

  const timeOptions: Intl.DateTimeFormatOptions = {
    hour: '2-digit',
    minute: '2-digit'
  }

  if (sameDay) {
    return `${start.toLocaleDateString('pt-BR', dateOptions)} · ${start.toLocaleTimeString('pt-BR', timeOptions)} – ${end.toLocaleTimeString('pt-BR', timeOptions)}`
  }

  return `${start.toLocaleString('pt-BR', { ...dateOptions, ...timeOptions })} até ${end.toLocaleString('pt-BR', { ...dateOptions, ...timeOptions })}`
}

export default function InscreverListPage() {
  const [events, setEvents] = useState<PublicEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await axios.get(`${API_URL}/public/events`)
        setEvents(response.data)
      } catch {
        setEvents([])
      } finally {
        setLoading(false)
      }
    }

    fetchEvents()
  }, [])

  const filteredEvents = events.filter((event) => {
    const term = search.trim().toLowerCase()
    if (!term) return true

    return (
      event.name.toLowerCase().includes(term) ||
      event.company.name.toLowerCase().includes(term) ||
      formatEventAddress(event).toLowerCase().includes(term)
    )
  })

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-[#0B1F3A] text-white px-4 py-10">
        <div className="max-w-4xl mx-auto">
          <p className="text-sm uppercase tracking-wider text-white/80">FlowPass</p>
          <h1 className="text-3xl md:text-4xl font-bold mt-2">Eventos com inscrição aberta</h1>
          <p className="text-white/90 mt-3 max-w-2xl">
            Escolha um evento abaixo para se inscrever como participante e receber seu QR Code de entrada.
          </p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome, organizador ou local..."
            className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-white focus:ring-2 focus:ring-[#00C896] outline-none text-gray-900"
          />
        </div>

        {loading ? (
          <div className="bg-white rounded-xl shadow p-8 text-center text-gray-900">
            Carregando eventos...
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="bg-white rounded-xl shadow p-8 text-center text-gray-900">
            <h2 className="text-xl font-semibold text-[#0B1F3A]">Nenhum evento disponível</h2>
            <p className="mt-2">
              {search
                ? 'Nenhum evento encontrado para sua busca.'
                : 'No momento não há eventos ativos com inscrições abertas.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredEvents.map((event) => (
              <article
                key={event.id}
                className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition"
              >
                <div
                  className="px-6 py-4"
                  style={{
                    backgroundColor: event.banner_color,
                    color: getContrastTextColor(event.banner_color)
                  }}
                >
                  <p
                    className="text-xs uppercase tracking-wider"
                    style={{ color: getContrastMutedTextColor(event.banner_color) }}
                  >
                    {event.company.name}
                  </p>
                  <h2 className="text-xl font-bold mt-1">{event.name}</h2>
                </div>

                <div className="p-6 space-y-4">
                  <p className="text-gray-900 text-sm">
                    {event.welcome_message || event.description || 'Inscrições abertas para participantes.'}
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-900">
                    <p>
                      <strong>Data:</strong> {formatEventDate(event.start_at, event.end_at)}
                    </p>
                    <p>
                      <strong>Local:</strong> {formatEventAddress(event)}
                    </p>
                  </div>

                  {event.categories.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {event.categories.map((category) => (
                        <span
                          key={category.id}
                          className="px-3 py-1 rounded-full text-xs font-medium text-gray-900"
                          style={{ backgroundColor: `${category.color || '#00C896'}22` }}
                        >
                          {category.name}
                        </span>
                      ))}
                    </div>
                  )}

                  <Link
                    href={`/inscrever/${event.id}`}
                    className="inline-flex w-full md:w-auto items-center justify-center px-6 py-3 rounded-lg font-semibold transition hover:opacity-90"
                    style={{
                      backgroundColor: event.accent_color,
                      color: getContrastTextColor(event.accent_color)
                    }}
                  >
                    Inscrever-se neste evento
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}