'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import axios from 'axios'
import { API_URL } from '@/lib/api'
import {
  type CredentialingPublicInfo,
  type CredentialingScanResponse
} from '@/lib/credentialing'
import { QrScanner } from '@/components/credentialing/QrScanner'

function formatTime(value: string): string {
  return new Date(value).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

export default function CredentialingScannerPage() {
  const params = useParams()
  const publicId = params.publicId as string

  const [info, setInfo] = useState<CredentialingPublicInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [scanning, setScanning] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [result, setResult] = useState<CredentialingScanResponse | null>(null)

  useEffect(() => {
    void (async () => {
      try {
        const res = await axios.get(`${API_URL}/public/credentialing/${publicId}`)
        setInfo(res.data)
      } catch {
        setInfo(null)
      } finally {
        setLoading(false)
      }
    })()
  }, [publicId])

  const handleScan = useCallback(async (qrToken: string) => {
    if (processing) return
    setProcessing(true)
    try {
      const res = await axios.post(`${API_URL}/public/credentialing/${publicId}/scan`, {
        qr_token: qrToken
      })
      setResult(res.data)
    } catch {
      setResult({ result: 'invalid_qr' })
    } finally {
      setProcessing(false)
    }
  }, [processing, publicId])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0B1F3A] text-white">
        <p>Carregando...</p>
      </div>
    )
  }

  if (!info) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0B1F3A] p-6 text-white">
        <p>Link de credenciamento não encontrado.</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0B1F3A] text-white">
      <div className="mx-auto max-w-lg px-4 py-6">
        <div className="mb-6 rounded-xl bg-white/10 p-5">
          <p className="text-sm text-white/70">Evento</p>
          <h1 className="text-2xl font-bold">{info.event.name}</h1>
          <p className="mt-4 text-sm text-white/70">Ponto</p>
          <p className="text-lg font-semibold">{info.point.name}</p>
          <p className="mt-3 text-sm text-white/80">
            Categorias aceitas: {info.point.categories_label}
          </p>
          {!info.point.active && (
            <p className="mt-3 rounded-lg bg-red-500/20 px-3 py-2 text-sm text-red-100">
              Este link está inativo.
            </p>
          )}
        </div>

        {!scanning ? (
          <button
            type="button"
            disabled={!info.point.active}
            onClick={() => {
              setResult(null)
              setScanning(true)
            }}
            className="w-full rounded-xl bg-[#00C896] px-4 py-4 text-lg font-semibold text-white disabled:opacity-50"
          >
            Iniciar leitura
          </button>
        ) : (
          <div className="space-y-4">
            <QrScanner active={scanning && info.point.active} onScan={handleScan} />
            <button
              type="button"
              onClick={() => setScanning(false)}
              className="w-full rounded-xl border border-white/20 px-4 py-3 text-sm"
            >
              Parar leitura
            </button>
          </div>
        )}

        {processing && (
          <p className="mt-4 text-center text-sm text-white/70">Validando credencial...</p>
        )}

        {result && (
          <div className="mt-6 rounded-xl bg-white p-5 text-[#0B1F3A] shadow-lg">
            {result.result === 'success' && (
              <>
                <p className="text-lg font-bold text-green-700">✓ Check-in realizado</p>
                <p className="mt-2 font-semibold">{result.name}</p>
                <p className="text-sm text-gray-600">{result.category ?? 'Sem categoria'}</p>
                <p className="mt-2 text-sm text-gray-500">{formatTime(result.checked_at)}</p>
              </>
            )}
            {result.result === 'unauthorized_category' && (
              <>
                <p className="text-lg font-bold text-red-700">✕ Categoria não autorizada</p>
                <p className="mt-2 font-semibold">{result.name}</p>
                <p className="text-sm text-gray-600">{result.category ?? 'Sem categoria'}</p>
                <p className="mt-3 text-sm text-gray-700">{result.message}</p>
              </>
            )}
            {result.result === 'already_checked_in' && (
              <>
                <p className="text-lg font-bold text-amber-700">⚠ Check-in já realizado</p>
                <p className="mt-2 font-semibold">{result.name}</p>
                <p className="mt-2 text-sm text-gray-600">
                  Horário anterior: {formatTime(result.checked_at)}
                </p>
              </>
            )}
            {(result.result === 'invalid_qr' || result.result === 'inactive_link') && (
              <>
                <p className="text-lg font-bold text-red-700">✕ Credencial inválida</p>
              </>
            )}
            <button
              type="button"
              onClick={() => setResult(null)}
              className="mt-4 w-full rounded-lg bg-[#0B1F3A] px-4 py-2 text-sm text-white"
            >
              Próxima leitura
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
