'use client'

import { useState } from 'react'
import axios from 'axios'
import { API_URL, authHeaders } from '@/lib/api'
import {
  formatCpfDisplay,
  ORIGIN_LABELS,
  STATUS_LABELS,
  type ParticipantOrigin,
  type ParticipantStatus
} from '@/lib/participant-labels'

interface Participant {
  id: string
  name: string
  email: string | null
  phone: string | null
  cpf: string | null
  status: ParticipantStatus
  origin: ParticipantOrigin
  has_qr: boolean
  form_data: Record<string, unknown>
  category: { id: string; name: string } | null
}

interface ViewParticipantModalProps {
  open: boolean
  eventId: string
  participant: Participant | null
  onClose: () => void
}

export function ViewParticipantModal({ open, eventId, participant, onClose }: ViewParticipantModalProps) {
  const [qrImage, setQrImage] = useState<string | null>(null)
  const [loadingQr, setLoadingQr] = useState(false)

  if (!open || !participant) return null

  const loadQr = async () => {
    setLoadingQr(true)
    try {
      const res = await axios.get(
        `${API_URL}/events/${eventId}/participants/${participant.id}/qr`,
        { headers: authHeaders() }
      )
      setQrImage(res.data.qr_image)
    } finally {
      setLoadingQr(false)
    }
  }

  const downloadQr = async () => {
    if (!qrImage) await loadQr()
    const img = qrImage ?? (await axios.get(
      `${API_URL}/events/${eventId}/participants/${participant.id}/qr`,
      { headers: authHeaders() }
    )).data.qr_image

    const link = document.createElement('a')
    link.href = img
    link.download = `qr-${participant.name.replace(/\s+/g, '-').toLowerCase()}.png`
    link.click()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6">
        <h3 className="text-xl font-bold text-[#0B1F3A] mb-4">{participant.name}</h3>
        <dl className="space-y-2 text-sm">
          <div><dt className="text-gray-500 inline">E-mail: </dt><dd className="inline">{participant.email ?? '—'}</dd></div>
          <div><dt className="text-gray-500 inline">CPF: </dt><dd className="inline">{formatCpfDisplay(participant.cpf)}</dd></div>
          <div><dt className="text-gray-500 inline">Telefone: </dt><dd className="inline">{participant.phone || '—'}</dd></div>
          <div><dt className="text-gray-500 inline">Categoria: </dt><dd className="inline">{participant.category?.name ?? '—'}</dd></div>
          <div><dt className="text-gray-500 inline">Status: </dt><dd className="inline">{STATUS_LABELS[participant.status]}</dd></div>
          <div><dt className="text-gray-500 inline">Origem: </dt><dd className="inline">{ORIGIN_LABELS[participant.origin]}</dd></div>
        </dl>

        {participant.has_qr && (
          <div className="mt-4 flex gap-2">
            <button
              onClick={() => void loadQr()}
              disabled={loadingQr}
              className="flex-1 py-2 border border-[#00C896] text-[#00C896] rounded-lg text-sm"
            >
              {loadingQr ? 'Carregando...' : 'Visualizar QR'}
            </button>
            <button
              onClick={() => void downloadQr()}
              className="flex-1 py-2 bg-[#00C896] text-white rounded-lg text-sm"
            >
              Baixar QR
            </button>
          </div>
        )}

        {qrImage && (
          <div className="mt-4 flex justify-center">
            <img src={qrImage} alt="QR Code" className="w-48 h-48" />
          </div>
        )}

        <button onClick={onClose} className="mt-4 w-full py-2 border rounded-lg">Fechar</button>
      </div>
    </div>
  )
}
