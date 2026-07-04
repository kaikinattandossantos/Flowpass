'use client'

import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'

interface QrScannerProps {
  onScan: (decodedText: string) => void
  active?: boolean
}

export function QrScanner({ onScan, active = true }: QrScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const [error, setError] = useState<string | null>(null)
  const lastScanRef = useRef<string | null>(null)

  useEffect(() => {
    if (!active) return

    const scannerId = 'qr-reader'
    const scanner = new Html5Qrcode(scannerId)
    scannerRef.current = scanner

    const handleScan = (decodedText: string) => {
      if (lastScanRef.current === decodedText) return
      lastScanRef.current = decodedText
      onScan(decodedText)
      setTimeout(() => {
        lastScanRef.current = null
      }, 3000)
    }

    scanner.start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: { width: 250, height: 250 } },
      handleScan,
      () => {}
    ).catch(() => {
      setError('Não foi possível acessar a câmera. Use a entrada manual abaixo.')
    })

    return () => {
      if (scannerRef.current?.isScanning) {
        scannerRef.current.stop().catch(() => {})
      }
      scannerRef.current = null
    }
  }, [active, onScan])

  return (
    <div>
      {error ? (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-gray-900 text-sm">
          {error}
        </div>
      ) : (
        <div
          id="qr-reader"
          className="w-full overflow-hidden rounded-xl border border-gray-200 bg-black [&_video]:rounded-xl"
        />
      )}
    </div>
  )
}