'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import axios from 'axios'
import toast from 'react-hot-toast'
import { formatEventAddress } from '@/lib/address'

interface FormField {
  id: string
  label: string
  type: 'text' | 'email' | 'phone' | 'cpf' | 'select' | 'multi_select' | 'file' | 'number'
  required: boolean
  options?: string[]
  order: number
}

interface EventData {
  id: string
  name: string
  description: string
  start_at: string
  location?: string | null
  street: string
  number: string
  complement?: string | null
  neighborhood?: string | null
  city?: string | null
  state?: string | null
  cep: string
  banner_color: string
  accent_color: string
  welcome_message?: string | null
  categories: Array<{ id: string, name: string, color?: string | null }>
  form_fields: FormField[]
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333'

export default function PublicRegistrationPage() {
  const params = useParams()
  const eventId = params.eventId as string
  const [event, setEvent] = useState<EventData | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  
  const [formData, setFormData] = useState<Record<string, string | string[]>>({})
  const [selectedCategory, setSelectedCategory] = useState('')
  const [baseInfo, setBaseInfo] = useState({ name: '', email: '', phone: '' })

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const response = await axios.get(`${API_URL}/events/${eventId}/public`)
        setEvent(response.data)
        if (response.data.categories.length > 0) {
          setSelectedCategory(response.data.categories[0].id)
        }
      } catch {
        toast.error('Erro ao carregar evento')
      } finally {
        setLoading(false)
      }
    }
    fetchEvent()
  }, [eventId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await axios.post(`${API_URL}/events/${eventId}/registrations`, {
        category_id: selectedCategory,
        ...baseInfo,
        form_data: formData
      })
      setSuccess(true)
    } catch {
      toast.error('Erro ao realizar inscrição')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center">Carregando...</div>
  if (!event) return <div className="min-h-screen flex items-center justify-center">Evento não encontrado</div>

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-8 text-center">
          <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
          </div>
          <h1 className="text-2xl font-bold text-[#0B1F3A] mb-2">Inscrição Confirmada!</h1>
          <p className="text-gray-900">
            Enviamos um e-mail de confirmação com seu QR Code único para entrada no evento.
            {baseInfo.phone ? ' Também enviamos pelo WhatsApp, se informado.' : ''}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-xl overflow-hidden">
        <div className="p-8 text-white" style={{ backgroundColor: event.banner_color }}>
          <h1 className="text-3xl font-bold mb-2">{event.name}</h1>
          <p className="text-white/80">
            {event.welcome_message || event.description}
          </p>
          <div className="mt-4 flex flex-wrap gap-4 text-sm text-white/90">
            <span className="flex items-center">
              {new Date(event.start_at).toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </span>
            <span className="flex items-center">
              {formatEventAddress(event)}
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-900 mb-1">Categoria de Acesso</label>
              <select 
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00C896] outline-none"
                required
              >
                {event.categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-900 mb-1">Nome Completo</label>
              <input 
                type="text" 
                required
                value={baseInfo.name}
                onChange={(e) => setBaseInfo({...baseInfo, name: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00C896] outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">E-mail</label>
              <input 
                type="email" 
                required
                value={baseInfo.email}
                onChange={(e) => setBaseInfo({...baseInfo, email: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00C896] outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">WhatsApp</label>
              <input 
                type="tel" 
                value={baseInfo.phone}
                onChange={(e) => setBaseInfo({...baseInfo, phone: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00C896] outline-none"
                placeholder="(00) 00000-0000"
              />
            </div>
          </div>

          <div className="border-t pt-6 space-y-6">
            {event.form_fields.sort((a,b) => a.order - b.order).map(field => (
              <div key={field.id}>
                <label className="block text-sm font-medium text-gray-900 mb-1">
                  {field.label} {field.required && <span className="text-red-500">*</span>}
                </label>
                
                {field.type === 'select' ? (
                  <select 
                    required={field.required}
                    onChange={(e) => setFormData({...formData, [field.id]: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00C896] outline-none"
                  >
                    <option value="">Selecione...</option>
                    {field.options?.map((opt: string) => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                ) : field.type === 'multi_select' ? (
                  <div className="space-y-2">
                    {field.options?.map((opt: string) => (
                      <label key={opt} className="flex items-center">
                        <input 
                          type="checkbox" 
                          onChange={(e) => {
                            const fieldValue = formData[field.id]
                            const current = Array.isArray(fieldValue) ? fieldValue : []
                            const next = e.target.checked ? [...current, opt] : current.filter((o: string) => o !== opt)
                            setFormData({...formData, [field.id]: next})
                          }}
                          className="mr-2"
                        />
                        <span className="text-sm text-gray-900">{opt}</span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <input 
                    type={field.type === 'number' ? 'number' : field.type === 'email' ? 'email' : 'text'}
                    required={field.required}
                    onChange={(e) => setFormData({...formData, [field.id]: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00C896] outline-none"
                  />
                )}
              </div>
            ))}
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full text-white font-bold py-3 rounded-lg transition disabled:opacity-50"
            style={{ backgroundColor: event.accent_color }}
          >
            {submitting ? 'Enviando...' : 'Confirmar Inscrição'}
          </button>
        </form>
      </div>
    </div>
  )
}
