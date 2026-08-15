'use client'

import { useRef, useState } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'
import { API_URL, authHeaders } from '@/lib/api'

interface FormImageUploadProps {
  label: string
  kind: 'logo' | 'background' | 'banner'
  value: string | null
  eventId: string
  formId: string
  disabled?: boolean
  onChange: (url: string | null) => void
}

const ACCEPT = 'image/png,image/jpeg,image/webp'

export function FormImageUpload({
  label,
  kind,
  value,
  eventId,
  formId,
  disabled,
  onChange
}: FormImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  const handleFile = async (file: File | null) => {
    if (!file || disabled) return

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('kind', kind)

      const res = await axios.post(
        `${API_URL}/events/${eventId}/registration-forms/${formId}/assets`,
        formData,
        { headers: { ...authHeaders(), 'Content-Type': 'multipart/form-data' } }
      )
      onChange(res.data.url as string)
      toast.success('Imagem enviada')
    } catch (err: unknown) {
      const message = axios.isAxiosError(err)
        ? err.response?.data?.message ?? 'Erro ao enviar imagem'
        : 'Erro ao enviar imagem'
      toast.error(message)
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        disabled={disabled || uploading}
        className="hidden"
        onChange={(e) => void handleFile(e.target.files?.[0] ?? null)}
      />

      {!value ? (
        <button
          type="button"
          disabled={disabled || uploading}
          onClick={() => inputRef.current?.click()}
          className="rounded-lg border border-dashed border-gray-300 px-4 py-3 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50"
        >
          {uploading ? 'Enviando...' : 'Upload'}
        </button>
      ) : (
        <div className="space-y-3">
          <div className="overflow-hidden rounded-lg border bg-gray-50 p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={value}
              alt={label}
              className={`mx-auto max-h-32 object-contain ${
                kind === 'logo' ? 'max-w-[220px]' : 'w-full max-h-40 object-cover'
              }`}
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={disabled || uploading}
              onClick={() => inputRef.current?.click()}
              className="rounded-lg border px-3 py-1.5 text-sm"
            >
              Alterar
            </button>
            <button
              type="button"
              disabled={disabled || uploading}
              onClick={() => onChange(null)}
              className="rounded-lg border px-3 py-1.5 text-sm text-red-600"
            >
              Remover
            </button>
          </div>
        </div>
      )}
      <p className="text-xs text-gray-500">
        PNG, JPG/JPEG ou WEBP. Máx. {kind === 'logo' ? '2 MB' : '5 MB'}.
      </p>
    </div>
  )
}
