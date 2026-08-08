'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import axios from 'axios'
import toast from 'react-hot-toast'
import { API_URL } from '@/lib/api'
import { FormField, sortFormFields } from '@/lib/form-field-types'
import {
  parseStructuralConfig,
  STRUCTURAL_FIELD_LABELS,
  type StructuralConfig,
  type StructuralFieldKey
} from '@/lib/structural-config'
import { DynamicFormFields } from '@/components/form-builder/DynamicFormFields'

interface PublicFormData {
  event: {
    id: string
    name: string
    description: string | null
    start_at: string
    location: string | null
  }
  form: {
    id: string
    name: string
    status: string
    structural_config: StructuralConfig
  }
  categories: Array<{ id: string; name: string }>
  form_fields: FormField[]
  can_submit: boolean
}

export default function PublicFormPage() {
  const params = useParams()
  const publicId = params.publicId as string

  const [data, setData] = useState<PublicFormData | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)

  const [formData, setFormData] = useState<Record<string, string | string[] | boolean>>({})
  const [selectedCategory, setSelectedCategory] = useState('')
  const [baseInfo, setBaseInfo] = useState({ name: '', email: '', phone: '', cpf: '' })

  useEffect(() => {
    const load = async () => {
      try {
        const res = await axios.get(`${API_URL}/public/forms/${publicId}`)
        setData(res.data)
        if (res.data.categories.length > 0) {
          setSelectedCategory(res.data.categories[0].id)
        }
      } catch {
        toast.error('Formulário não encontrado')
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [publicId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!data?.can_submit) return

    setSubmitting(true)
    setApiError(null)
    try {
      const config = parseStructuralConfig(data.form.structural_config)
      await axios.post(`${API_URL}/public/forms/${publicId}/registrations`, {
        category_id: config.category.enabled ? selectedCategory : undefined,
        name: baseInfo.name,
        email: config.email.enabled ? baseInfo.email : undefined,
        phone: config.phone.enabled ? baseInfo.phone || undefined : undefined,
        cpf: config.cpf.enabled ? baseInfo.cpf || undefined : undefined,
        form_data: formData
      })
      setSuccess(true)
    } catch (err: unknown) {
      const message = axios.isAxiosError(err)
        ? err.response?.data?.message ?? 'Erro ao enviar inscrição'
        : 'Erro ao enviar inscrição'
      setApiError(message)
      toast.error(message)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center">Carregando...</div>
  if (!data) return <div className="min-h-screen flex items-center justify-center">Formulário não encontrado</div>

  const structuralConfig = parseStructuralConfig(data.form.structural_config)
  const dynamicFields = sortFormFields(data.form_fields)

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-8 text-center">
          <h1 className="text-2xl font-bold text-[#0B1F3A] mb-2">Inscrição enviada</h1>
          <p className="text-gray-600">Sua inscrição foi registrada com sucesso.</p>
        </div>
      </div>
    )
  }

  const renderStructuralField = (key: StructuralFieldKey) => {
    const field = structuralConfig[key]
    if (!field.enabled) return null
    const label = STRUCTURAL_FIELD_LABELS[key]
    const required = field.required

    if (key === 'category') {
      return (
        <div key={key} className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00C896] outline-none"
            required={required}
          >
            {data.categories.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        </div>
      )
    }

    const inputType = key === 'email' ? 'email' : key === 'phone' ? 'tel' : 'text'
    const valueKey = key as 'name' | 'email' | 'phone' | 'cpf'

    return (
      <div key={key} className={key === 'name' ? 'md:col-span-2' : ''}>
        <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
        <input
          type={inputType}
          required={required}
          value={baseInfo[valueKey]}
          onChange={(e) => setBaseInfo({ ...baseInfo, [valueKey]: e.target.value })}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00C896] outline-none"
        />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-xl overflow-hidden">
        <div className="bg-[#0B1F3A] p-8 text-white">
          <p className="text-sm text-[#00C896] mb-1">{data.event.name}</p>
          <h1 className="text-3xl font-bold mb-2">{data.form.name}</h1>
          {data.event.description && <p className="text-gray-300">{data.event.description}</p>}
          <div className="mt-4 flex flex-wrap gap-4 text-sm">
            <span>{new Date(data.event.start_at).toLocaleDateString('pt-BR')}</span>
            {data.event.location && <span>{data.event.location}</span>}
          </div>
        </div>

        {!data.can_submit && (
          <div className="p-8">
            <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-lg text-sm">
              Este formulário não está aceitando inscrições no momento.
            </div>
          </div>
        )}

        {data.can_submit && (
          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            {apiError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {apiError}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {(Object.keys(structuralConfig) as StructuralFieldKey[]).map(renderStructuralField)}
            </div>

            {dynamicFields.length > 0 && (
              <div className="border-t pt-6 space-y-6">
                <DynamicFormFields
                  fields={dynamicFields}
                  values={formData}
                  onChange={(fieldId, value) => setFormData((prev) => ({ ...prev, [fieldId]: value }))}
                />
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-[#00C896] hover:bg-[#00a876] text-white font-bold py-3 rounded-lg transition disabled:opacity-50"
            >
              {submitting ? 'Enviando...' : 'Enviar inscrição'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
