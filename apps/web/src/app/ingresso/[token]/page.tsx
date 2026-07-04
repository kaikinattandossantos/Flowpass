'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import axios from 'axios'
import { TicketCard } from '@/components/participant/TicketCard'

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

export default function TicketPage() {
  const params = useParams()
  const token = params.token as string
  const [ticket, setTicket] = useState<TicketData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchTicket = async () => {
      try {
        const response = await axios.get(`${API_URL}/public/tickets/${token}`)
        setTicket(response.data)
      } catch {
        setTicket(null)
      } finally {
        setLoading(false)
      }
    }

    fetchTicket()
  }, [token])

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-gray-900">Carregando ingresso...</div>
  }

  if (!ticket) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 text-center">
        <div>
          <h1 className="text-2xl font-bold text-[#0B1F3A]">Ingresso não encontrado</h1>
          <p className="text-gray-900 mt-2">Verifique se o link está correto ou faça uma nova inscrição.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <TicketCard
        participantName={ticket.name}
        participantEmail={ticket.email}
        eventName={ticket.event.name}
        categoryName={ticket.category_name}
        startAt={ticket.event.start_at}
        address={{ location: ticket.event.location }}
        qrCodeUrl={ticket.qr_code_url}
        accentColor={ticket.event.accent_color}
      />
    </div>
  )
}