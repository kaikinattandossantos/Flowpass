'use client'

import toast from 'react-hot-toast'
import { formatEventAddress } from '@/lib/address'
import { getContrastMutedTextColor, getContrastTextColor } from '@/lib/color-contrast'

interface TicketCardProps {
  participantName: string
  participantEmail: string
  eventName: string
  categoryName: string
  startAt: string
  address: {
    street: string
    number: string
    complement?: string | null
    neighborhood?: string | null
    city?: string | null
    state?: string | null
    cep?: string | null
    location?: string | null
  }
  qrCodeUrl: string
  qrToken?: string
  ticketUrl?: string
  accentColor?: string
}

export function TicketCard({
  participantName,
  participantEmail,
  eventName,
  categoryName,
  startAt,
  address,
  qrCodeUrl,
  qrToken,
  ticketUrl,
  accentColor = '#00C896'
}: TicketCardProps) {
  const headerTextColor = getContrastTextColor(accentColor)
  const headerMutedColor = getContrastMutedTextColor(accentColor)

  const copyText = async (label: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value)
      toast.success(`${label} copiado!`)
    } catch {
      toast.error('Não foi possível copiar')
    }
  }

  return (
    <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden">
      <div
        className="p-6 text-center"
        style={{ backgroundColor: accentColor, color: headerTextColor }}
      >
        <p className="text-sm uppercase tracking-wider" style={{ color: headerMutedColor }}>
          Seu ingresso
        </p>
        <h1 className="text-2xl font-bold mt-1">{eventName}</h1>
      </div>

      <div className="p-8 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 text-gray-900 mb-4">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <h2 className="text-xl font-bold text-[#0B1F3A]">Inscrição confirmada!</h2>
        <p className="text-gray-900 mt-2">
          Olá, <strong>{participantName}</strong>. Apresente este QR Code na entrada.
        </p>

        <div className="my-6 flex justify-center">
          <img
            src={qrCodeUrl}
            alt="QR Code de entrada"
            className="w-52 h-52 rounded-xl border border-gray-200 p-3 bg-white"
          />
        </div>

        <div className="text-left bg-gray-50 rounded-xl p-4 space-y-2 text-sm text-gray-900">
          <p><strong>Participante:</strong> {participantName}</p>
          <p><strong>E-mail:</strong> {participantEmail}</p>
          <p><strong>Categoria:</strong> {categoryName}</p>
          <p>
            <strong>Data:</strong>{' '}
            {new Date(startAt).toLocaleString('pt-BR', {
              day: '2-digit',
              month: 'long',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </p>
          <p><strong>Local:</strong> {formatEventAddress(address)}</p>
        </div>

        <p className="text-sm text-gray-900 mt-4">
          Também enviamos o QR Code para <strong>{participantEmail}</strong>.
          Guarde este código ou acesse o link do ingresso novamente quando precisar.
        </p>

        {(ticketUrl || qrToken) && (
          <div className="mt-4 text-left bg-gray-50 rounded-xl p-4 space-y-3 text-sm text-gray-900">
            <p className="font-medium">Para credenciamento manual, use um destes:</p>
            {ticketUrl && (
              <div>
                <p className="text-xs text-gray-900 break-all">Link: {ticketUrl}</p>
                <button
                  type="button"
                  onClick={() => copyText('Link do ingresso', ticketUrl)}
                  className="mt-2 text-[#00C896] hover:underline text-sm font-medium"
                >
                  Copiar link do ingresso
                </button>
              </div>
            )}
            {qrToken && (
              <div>
                <p className="text-xs text-gray-900 break-all">Código: {qrToken}</p>
                <button
                  type="button"
                  onClick={() => copyText('Código do QR', qrToken)}
                  className="mt-2 text-[#00C896] hover:underline text-sm font-medium"
                >
                  Copiar código do QR
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}