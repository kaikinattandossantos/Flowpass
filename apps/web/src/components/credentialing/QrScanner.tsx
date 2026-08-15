'use client'

import { useEffect, useRef, useState } from 'react'

interface QrScannerProps {
  active: boolean
  onScan: (token: string) => void
}

export function QrScanner({ active, onScan }: QrScannerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const scannerRef = useRef<{ stop: () => Promise<void> } | null>(null)
  const lastTokenRef = useRef('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!active || !containerRef.current) return

    let cancelled = false

    void (async () => {
      try {
        const { Html5Qrcode } = await import('html5-qrcode')
        if (cancelled || !containerRef.current) return

        const scanner = new Html5Qrcode('credentialing-qr-reader')
        scannerRef.current = scanner

        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decodedText) => {
            const token = decodedText.trim()
            if (!token || token === lastTokenRef.current) return
            lastTokenRef.current = token
            onScan(token)
            window.setTimeout(() => {
              lastTokenRef.current = ''
            }, 2000)
          },
          () => {}
        )
      } catch {
        if (!cancelled) {
          setError('Não foi possível acessar a câmera. Verifique as permissões do navegador.')
        }
      }
    })()

    return () => {
      cancelled = true
      void scannerRef.current?.stop().catch(() => {})
      scannerRef.current = null
    }
  }, [active, onScan])

  if (!active) return null

  return (
    <div className="space-y-3">
      <div
        id="credentialing-qr-reader"
        ref={containerRef}
        className="overflow-hidden rounded-xl border border-gray-200 bg-black"
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  )
}
