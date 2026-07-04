'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import axios, { isAxiosError } from 'axios'
import toast from 'react-hot-toast'
import { formatEventAddress } from '@/lib/address'
import { getContrastMutedTextColor, getContrastTextColor } from '@/lib/color-contrast'
import { ParticipantFormFields, type PublicFormField } from '@/components/participant/ParticipantFormFields'
import { TicketCard } from '@/components/participant/TicketCard'

interface EventData {
  id: string
  name: string
  description: string
  start_at: string
  location?: string | null
  street: string
  number: string
  complement?: string | null
  neighborhood?: string | null
  city?: string | null
  state?: string | null
  cep: string
  banner_color: string
  accent_color: string
  welcome_message?: string | null
  categories: Array<{ id: string; name: string; color?: string | null }>
  form_fields: PublicFormField[]
}

interface TicketData {
  id: string
  name: string
  email: string
  qr_token: string
  qr_code_url: string
  category_name: string
  event: {
    id: string
    name: string
    start_at: string
    location: string
    accent_color: string
  }
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333'

function getApiErrorMessage(error: unknown, fallback: string) {
  if (!isAxiosError(error)) return fallback
  const message = error.response?.data?.message
  return typeof message === 'string' ? message : fallback
}

export default function PublicRegistrationPage() {
  const params = useParams()
  const eventId = params.eventId as string
  const [event, setEvent] = useState<EventData | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [ticket, setTicket] = useState<TicketData | null>(null)

  const [formData, setFormData] = useState<Record<string, string | string[]>>({})
  const [selectedCategory, setSelectedCategory] = useState('')
  const [baseInfo, setBaseInfo] = useState({ name: '', email: '', phone: '' })

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const response = await axios.get(`${API_URL}/events/${eventId}/public`)
        setEvent(response.data)
        if (response.data.categories.length > 0) {
          setSelectedCategory(response.data.categories[0].id)
        }
      } catch {
        toast.error('Evento não encontrado ou inscrições encerradas')
      } finally {
        setLoading(false)
      }
    }
    fetchEvent()
  }, [eventId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      const response = await axios.post<TicketData>(`${API_URL}/events/${eventId}/registrations`, {
        category_id: selectedCategory,
        name: baseInfo.name.trim(),
        email: baseInfo.email.trim().toLowerCase(),
        phone: baseInfo.phone.trim() || undefined,
        form_data: formData
      })

      setTicket(response.data)
      toast.success('Inscrição confirmada!')
    } catch (error: unknown) {
      if (isAxiosError(error) && error.response?.status === 409 && error.response.data?.ticket) {
        setTicket(error.response.data.ticket as TicketData)
        toast.error(getApiErrorMessage(error, 'Este e-mail já está inscrito.'))
      } else {
        toast.error(getApiErrorMessage(error, 'Erro ao realizar inscrição'))
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-gray-900">Carregando evento...</div>
  }

  if (!event) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 text-center">
        <div>
          <h1 className="text-2xl font-bold text-[#0B1F3A]">Evento indisponível</h1>
          <p className="text-gray-900 mt-2">Este link não está ativo ou o evento não existe.</p>
        </div>
      </div>
    )
  }

  if (ticket && event) {
    const ticketUrl =
      typeof window !== 'undefined'
        ? `${window.location.origin}/ingresso/${ticket.qr_token}`
        : undefined

    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <TicketCard
          participantName={ticket.name}
          participantEmail={ticket.email}
          eventName={ticket.event.name}
          categoryName={ticket.category_name}
          startAt={ticket.event.start_at}
          address={event}
          qrCodeUrl={ticket.qr_code_url}
          ticketUrl={ticketUrl}
          accentColor={ticket.event.accent_color}
        />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-xl overflow-hidden">
        <div
          className="p-8"
          style={{
            backgroundColor: event.banner_color,
            color: getContrastTextColor(event.banner_color)
          }}
        >
          <p
            className="text-sm uppercase tracking-wider"
            style={{ color: getContrastMutedTextColor(event.banner_color) }}
          >
            Inscrição do participante
          </p>
          <h1 className="text-3xl font-bold mt-2 mb-2">{event.name}</h1>
          <p style={{ color: getContrastMutedTextColor(event.banner_color) }}>
            {event.welcome_message || event.description || 'Preencha o formulário para garantir sua entrada.'}
          </p>
          <div
            className="mt-4 flex flex-wrap gap-4 text-sm"
            style={{ color: getContrastMutedTextColor(event.banner_color) }}
          >
            <span>
              {new Date(event.start_at).toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </span>
            <span>{formatEventAddress(event)}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-900 mb-1">Categoria de Acesso *</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-[#00C896]"
                required
              >
                {event.categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-900 mb-1">Nome Completo *</label>
              <input
                type="text"
                required
                value={baseInfo.name}
                onChange={(e) => setBaseInfo({ ...baseInfo, name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-[#00C896]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">E-mail *</label>
              <input
                type="email"
                required
                value={baseInfo.email}
                onChange={(e) => setBaseInfo({ ...baseInfo, email: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-[#00C896]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">WhatsApp</label>
              <input
                type="tel"
                value={baseInfo.phone}
                onChange={(e) => setBaseInfo({ ...baseInfo, phone: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-[#00C896]"
                placeholder="(00) 00000-0000"
              />
            </div>
          </div>

          <ParticipantFormFields
            fields={event.form_fields}
            formData={formData}
            onChange={(fieldId, value) => setFormData({ ...formData, [fieldId]: value })}
            accentColor={event.accent_color}
          />

          <button
            type="submit"
            disabled={submitting}
            className="w-full font-bold py-3 rounded-lg transition disabled:opacity-50"
            style={{
              backgroundColor: event.accent_color,
              color: getContrastTextColor(event.accent_color)
            }}
          >
            {submitting ? 'Confirmando inscrição...' : 'Confirmar Inscrição e Gerar QR Code'}
          </button>
        </form>
      </div>
    </div>
  )
}