'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import axios from 'axios'
import toast from 'react-hot-toast'
import { QrScanner } from '@/components/checkin/QrScanner'
import { describeQrInput, parseQrToken } from '@/lib/checkin'

interface ParticipantPreview {
  id: string
  name: string
  masked_email: string
  category: string
  qr_token?: string
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

interface ApiErrorData {
  message?: string
  correct_event_id?: string | null
  correct_event_name?: string | null
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333'

function getApiError(err: unknown, fallback: string): ApiErrorData {
  if (!axios.isAxiosError(err)) return { message: fallback }
  const data = err.response?.data as ApiErrorData | undefined
  return {
    message: data?.message || fallback,
    correct_event_id: data?.correct_event_id,
    correct_event_name: data?.correct_event_name
  }
}

export default function CredenciamentoPage() {
  const params = useParams()
  const router = useRouter()
  const eventId = params.id as string

  const [eventName, setEventName] = useState('')
  const [loadingEvent, setLoadingEvent] = useState(true)
  const [qrInput, setQrInput] = useState('')
  const [qrToken, setQrToken] = useState('')
  const [email, setEmail] = useState('')
  const [preview, setPreview] = useState<ParticipantPreview | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [lastCheckin, setLastCheckin] = useState<CheckinResult | null>(null)
  const [scannerActive, setScannerActive] = useState(true)
  const [manualMode, setManualMode] = useState(false)
  const [wrongEvent, setWrongEvent] = useState<{ id: string; name: string } | null>(null)

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

  const loadPreview = useCallback(async (rawValue: string) => {
    const validationError = describeQrInput(rawValue)
    if (validationError) {
      toast.error(validationError)
      return
    }

    const parsedToken = parseQrToken(rawValue)
    if (!parsedToken) {
      toast.error('Código do QR inválido.')
      return
    }

    setPreviewLoading(true)
    setLastCheckin(null)
    setWrongEvent(null)

    try {
      const authToken = localStorage.getItem('token')
      if (!authToken) {
        toast.error('Sessão expirada. Faça login novamente.')
        router.push('/login')
        return
      }

      const res = await axios.get(`${API_URL}/events/${eventId}/checkin/preview`, {
        params: { qr_token: parsedToken },
        headers: { Authorization: `Bearer ${authToken}` }
      })

      setPreview(res.data)
      setQrToken(res.data.qr_token || parsedToken)
      setScannerActive(false)
      toast.success('QR Code lido com sucesso!')
    } catch (err: unknown) {
      setPreview(null)
      const apiError = getApiError(err, 'QR Code inválido')

      if (apiError.correct_event_id && apiError.correct_event_name) {
        setWrongEvent({ id: apiError.correct_event_id, name: apiError.correct_event_name })
      }

      if (axios.isAxiosError(err) && err.response?.status === 401) {
        toast.error('Sessão expirada. Faça login novamente.')
        router.push('/login')
        return
      }

      toast.error(apiError.message || 'QR Code inválido')
    } finally {
      setPreviewLoading(false)
    }
  }, [eventId, router])

  const handleScan = useCallback((decodedText: string) => {
    loadPreview(decodedText)
  }, [loadPreview])

  const handleCheckin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!qrToken.trim() || !email.trim()) return

    setSubmitting(true)
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        toast.error('Sessão expirada. Faça login novamente.')
        router.push('/login')
        return
      }

      const res = await axios.post(
        `${API_URL}/events/${eventId}/checkin`,
        { qr_token: qrToken.trim(), email: email.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setLastCheckin(res.data)
      setPreview(null)
      setEmail('')
      setQrToken('')
      setQrInput('')
      toast.success('Presença confirmada!')
    } catch (err: unknown) {
      const apiError = getApiError(err, 'Erro ao confirmar presença')
      toast.error(apiError.message || 'Erro ao confirmar presença')

      if (apiError.correct_event_id && apiError.correct_event_name) {
        setWrongEvent({ id: apiError.correct_event_id, name: apiError.correct_event_name })
      }

      if (axios.isAxiosError(err) && err.response?.status === 409) {
        setPreview((prev) => prev ? {
          ...prev,
          already_checked_in: true,
          checked_at: (err.response?.data as { checked_at?: string })?.checked_at ?? prev.checked_at
        } : prev)
      }
    } finally {
      setSubmitting(false)
    }
  }

  const resetScanner = () => {
    setPreview(null)
    setEmail('')
    setQrToken('')
    setQrInput('')
    setWrongEvent(null)
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

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 text-sm text-gray-900">
          <p className="font-semibold mb-1">Como usar o QR Code corretamente</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Escaneie o QR exibido no ingresso do participante</li>
            <li>Ou cole o <strong>link do ingresso</strong> (ex: /ingresso/...)</li>
            <li>Ou cole o <strong>código de 64 caracteres</strong> abaixo do QR</li>
            <li>Abra o credenciamento do <strong>mesmo evento</strong> da inscrição</li>
            <li>Confirme com o <strong>e-mail exato</strong> usado na inscrição</li>
          </ul>
        </div>

        {wrongEvent && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 text-gray-900">
            <p className="font-semibold">QR Code de outro evento</p>
            <p className="text-sm mt-1">
              Este ingresso pertence ao evento <strong>{wrongEvent.name}</strong>.
            </p>
            <button
              onClick={() => router.push(`/dashboard/events/${wrongEvent.id}/credenciamento`)}
              className="mt-3 px-4 py-2 bg-[#0B1F3A] text-white rounded-lg hover:bg-[#163456] text-sm"
            >
              Abrir credenciamento de {wrongEvent.name}
            </button>
          </div>
        )}

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
                  loadPreview(qrInput)
                }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">
                    Link do ingresso ou código do QR
                  </label>
                  <input
                    type="text"
                    value={qrInput}
                    onChange={(e) => setQrInput(e.target.value)}
                    placeholder="http://localhost:3000/ingresso/... ou código de 64 caracteres"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00C896] outline-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={previewLoading || !qrInput.trim()}
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
                    placeholder="Digite o e-mail completo usado na inscrição"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00C896] outline-none"
                    autoFocus
                  />
                  <p className="text-xs text-gray-900 mt-2">
                    Deve ser idêntico ao da inscrição (ex: {preview.masked_email}).
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