'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import axios from 'axios'
import toast from 'react-hot-toast'
import { QrScanner } from '@/components/checkin/QrScanner'

interface ParticipantPreview {
  id: string
  name: string
  masked_email: string
  category: string
  already_checked_in: boolean
  checked_at: string | null
}

interface CheckinResult {
  message: string
  checked_at: string
  participant: {
    id: string
    name: string
    email: string
    category: string
  }
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333'

export default function CredenciamentoPage() {
  const params = useParams()
  const router = useRouter()
  const eventId = params.id as string

  const [eventName, setEventName] = useState('')
  const [loadingEvent, setLoadingEvent] = useState(true)
  const [qrToken, setQrToken] = useState('')
  const [email, setEmail] = useState('')
  const [preview, setPreview] = useState<ParticipantPreview | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [lastCheckin, setLastCheckin] = useState<CheckinResult | null>(null)
  const [scannerActive, setScannerActive] = useState(true)
  const [manualMode, setManualMode] = useState(false)

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const token = localStorage.getItem('token')
        const res = await axios.get(`${API_URL}/events/${eventId}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        setEventName(res.data.name)
      } catch {
        toast.error('Erro ao carregar evento')
        router.push(`/dashboard/events/${eventId}`)
      } finally {
        setLoadingEvent(false)
      }
    }
    fetchEvent()
  }, [eventId, router])

  const loadPreview = useCallback(async (token: string) => {
    if (!token.trim()) return

    setPreviewLoading(true)
    setLastCheckin(null)
    try {
      const authToken = localStorage.getItem('token')
      const res = await axios.get(`${API_URL}/events/${eventId}/checkin/preview`, {
        params: { qr_token: token.trim() },
        headers: { Authorization: `Bearer ${authToken}` }
      })
      setPreview(res.data)
      setQrToken(token.trim())
      setScannerActive(false)
      toast.success('QR Code lido com sucesso!')
    } catch (err: unknown) {
      setPreview(null)
      if (axios.isAxiosError(err)) {
        toast.error(err.response?.data?.message || 'QR Code inválido')
      } else {
        toast.error('QR Code inválido')
      }
    } finally {
      setPreviewLoading(false)
    }
  }, [eventId])

  const handleScan = useCallback((decodedText: string) => {
    loadPreview(decodedText)
  }, [loadPreview])

  const handleCheckin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!qrToken.trim() || !email.trim()) return

    setSubmitting(true)
    try {
      const token = localStorage.getItem('token')
      const res = await axios.post(
        `${API_URL}/events/${eventId}/checkin`,
        { qr_token: qrToken.trim(), email: email.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setLastCheckin(res.data)
      setPreview(null)
      setEmail('')
      setQrToken('')
      toast.success('Presença confirmada!')
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const message = err.response?.data?.message || 'Erro ao confirmar presença'
        toast.error(message)
        if (err.response?.status === 409) {
          setPreview((prev) => prev ? { ...prev, already_checked_in: true, checked_at: err.response?.data?.checked_at } : prev)
        }
      } else {
        toast.error('Erro ao confirmar presença')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const resetScanner = () => {
    setPreview(null)
    setEmail('')
    setQrToken('')
    setLastCheckin(null)
    setScannerActive(true)
  }

  if (loadingEvent) {
    return <div className="p-8 text-gray-900">Carregando credenciamento...</div>
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <button
              onClick={() => router.push(`/dashboard/events/${eventId}`)}
              className="text-sm text-[#00C896] hover:underline mb-2"
            >
              ← Voltar ao evento
            </button>
            <h1 className="text-3xl font-bold text-[#0B1F3A]">Credenciamento</h1>
            <p className="text-gray-900 mt-1">{eventName}</p>
          </div>
          <button
            onClick={() => router.push(`/dashboard/events/${eventId}/live`)}
            className="px-4 py-2 bg-[#0B1F3A] text-white rounded-lg hover:bg-[#163456] text-sm"
          >
            Ver ao vivo
          </button>
        </div>

        {lastCheckin && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-6 mb-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-green-500 text-white flex items-center justify-center">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="font-bold text-gray-900">Entrada confirmada!</p>
                <p className="text-sm text-gray-900">
                  E-mail de presença enviado para {lastCheckin.participant.email}
                </p>
              </div>
            </div>
            <div className="bg-white rounded-lg p-4 text-sm text-gray-900 space-y-1">
              <p><strong>Participante:</strong> {lastCheckin.participant.name}</p>
              <p><strong>Categoria:</strong> {lastCheckin.participant.category}</p>
              <p>
                <strong>Horário:</strong>{' '}
                {new Date(lastCheckin.checked_at).toLocaleString('pt-BR')}
              </p>
            </div>
            <button
              onClick={resetScanner}
              className="mt-4 w-full py-3 bg-[#00C896] text-white rounded-lg hover:bg-[#00a876] font-semibold"
            >
              Escanear próximo participante
            </button>
          </div>
        )}

        {!lastCheckin && !preview && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-[#0B1F3A]">
                {manualMode ? 'Entrada manual' : 'Ler QR Code'}
              </h2>
              <button
                onClick={() => setManualMode(!manualMode)}
                className="text-sm text-[#00C896] hover:underline"
              >
                {manualMode ? 'Usar câmera' : 'Entrada manual'}
              </button>
            </div>

            {manualMode ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  loadPreview(qrToken)
                }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">
                    Código do QR (token)
                  </label>
                  <input
                    type="text"
                    value={qrToken}
                    onChange={(e) => setQrToken(e.target.value)}
                    placeholder="Cole o código lido do QR"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00C896] outline-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={previewLoading || !qrToken.trim()}
                  className="w-full py-3 bg-[#0B1F3A] text-white rounded-lg hover:bg-[#163456] disabled:opacity-50"
                >
                  {previewLoading ? 'Buscando...' : 'Buscar participante'}
                </button>
              </form>
            ) : (
              <QrScanner onScan={handleScan} active={scannerActive} />
            )}

            <p className="text-sm text-gray-900 mt-4 text-center">
              Aponte a câmera para o QR Code do ingresso do participante
            </p>
          </div>
        )}

        {previewLoading && (
          <div className="bg-white rounded-xl shadow-lg p-8 text-center text-gray-900">
            Buscando participante...
          </div>
        )}

        {preview && !lastCheckin && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-[#0B1F3A] mb-4">Confirmar presença</h2>

            <div className="bg-gray-50 rounded-xl p-4 mb-6 space-y-2 text-gray-900">
              <p><strong>Participante:</strong> {preview.name}</p>
              <p><strong>Categoria:</strong> {preview.category}</p>
              <p><strong>E-mail cadastrado:</strong> {preview.masked_email}</p>
            </div>

            {preview.already_checked_in ? (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
                <p className="font-semibold text-gray-900">Participante já credenciado</p>
                {preview.checked_at && (
                  <p className="text-sm text-gray-900 mt-1">
                    Check-in em {new Date(preview.checked_at).toLocaleString('pt-BR')}
                  </p>
                )}
              </div>
            ) : (
              <form onSubmit={handleCheckin} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">
                    Confirme o e-mail do participante
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Digite o e-mail completo para validar"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00C896] outline-none"
                    autoFocus
                  />
                  <p className="text-xs text-gray-900 mt-2">
                    O e-mail deve ser idêntico ao da inscrição para dar baixa no sistema.
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={resetScanner}
                    className="flex-1 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-900"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || !email.trim()}
                    className="flex-1 py-3 bg-[#00C896] text-white rounded-lg hover:bg-[#00a876] font-semibold disabled:opacity-50"
                  >
                    {submitting ? 'Confirmando...' : 'Confirmar entrada'}
                  </button>
                </div>
              </form>
            )}

            {preview.already_checked_in && (
              <button
                onClick={resetScanner}
                className="mt-4 w-full py-3 bg-[#0B1F3A] text-white rounded-lg hover:bg-[#163456]"
              >
                Escanear outro participante
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}