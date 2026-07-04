'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import axios, { isAxiosError } from 'axios'
import toast from 'react-hot-toast'
import { formatEventAddress, normalizeCep } from '@/lib/address'
import type { FormFieldDraft } from '@/lib/form-fields'
import { FormFieldBuilder } from '@/components/participant/ParticipantFormFields'

interface Category {
  name: string
  max_capacity?: number
  color?: string
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333'
const TOTAL_STEPS = 5

function getApiErrorMessage(error: unknown, fallback: string) {
  if (!isAxiosError(error)) return fallback
  const message = error.response?.data?.message
  return typeof message === 'string' ? message : fallback
}

export default function NewEventPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const [general, setGeneral] = useState({
    name: '',
    description: '',
    start_at: '',
    end_at: '',
    max_capacity: '',
    waitlist_enabled: false
  })

  const [address, setAddress] = useState({
    cep: '',
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: ''
  })

  const [categories, setCategories] = useState<Category[]>([
    { name: 'Geral', color: '#00C896' }
  ])

  const [formFields, setFormFields] = useState<FormFieldDraft[]>([])

  const [customization, setCustomization] = useState({
    banner_color: '#0B1F3A',
    accent_color: '#00C896',
    welcome_message: ''
  })

  const validateStep = (currentStep: number) => {
    if (currentStep === 1) {
      if (!general.name.trim()) return 'Informe o nome do evento.'
      if (!general.start_at || !general.end_at) return 'Informe as datas de início e fim.'
      if (new Date(general.end_at) <= new Date(general.start_at)) {
        return 'A data de fim deve ser posterior à data de início.'
      }
    }

    if (currentStep === 2) {
      if (normalizeCep(address.cep).length !== 8) return 'CEP inválido. Informe 8 dígitos.'
      if (!address.street.trim()) return 'Informe a rua.'
      if (!address.number.trim()) return 'Informe o número.'
    }

    if (currentStep === 3) {
      const validCategories = categories.filter((cat) => cat.name.trim())
      if (validCategories.length === 0) return 'Adicione pelo menos uma categoria.'
    }

    if (currentStep === 4) {
      const invalidField = formFields.find((field) => !field.label.trim())
      if (invalidField) return 'Todas as perguntas do formulário precisam de um título.'
      const invalidSelect = formFields.find(
        (field) =>
          ['select', 'multi_select'].includes(field.type) &&
          (!field.options || field.options.length === 0)
      )
      if (invalidSelect) return `O campo "${invalidSelect.label || 'sem título'}" precisa de opções.`
    }

    return null
  }

  const goNext = () => {
    const error = validateStep(step)
    if (error) {
      setErrorMessage(error)
      toast.error(error)
      return
    }
    setErrorMessage(null)
    setStep((prev) => Math.min(TOTAL_STEPS, prev + 1))
  }

  const handleCreateEvent = async (status: 'draft' | 'active') => {
    const error = validateStep(1) || validateStep(2) || validateStep(3) || validateStep(4)
    if (error) {
      setErrorMessage(error)
      toast.error(error)
      return
    }

    setLoading(true)
    setErrorMessage(null)

    try {
      const token = localStorage.getItem('token')
      const payload = {
        name: general.name.trim(),
        description: general.description.trim() || undefined,
        start_at: new Date(general.start_at).toISOString(),
        end_at: new Date(general.end_at).toISOString(),
        cep: normalizeCep(address.cep),
        street: address.street.trim(),
        number: address.number.trim(),
        complement: address.complement.trim() || undefined,
        neighborhood: address.neighborhood.trim() || undefined,
        city: address.city.trim() || undefined,
        state: address.state.trim() || undefined,
        banner_color: customization.banner_color,
        accent_color: customization.accent_color,
        welcome_message: customization.welcome_message.trim() || undefined,
        waitlist_enabled: general.waitlist_enabled,
        status,
        categories: categories
          .filter((cat) => cat.name.trim())
          .map((cat) => ({
            name: cat.name.trim(),
            color: cat.color || '#00C896',
            ...(cat.max_capacity ? { max_capacity: cat.max_capacity } : {})
          })),
        form_fields: formFields
          .filter((field) => field.label.trim())
          .map((field, index) => ({
            label: field.label.trim(),
            type: field.type,
            required: field.required,
            order: index,
            ...(field.options?.length ? { options: field.options } : {})
          }))
      }

      if (general.max_capacity) {
        Object.assign(payload, { max_capacity: parseInt(general.max_capacity, 10) })
      }

      const response = await axios.post(`${API_URL}/events`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      })

      toast.success(status === 'draft' ? 'Rascunho salvo!' : 'Evento publicado com sucesso!')
      router.push(`/dashboard/events/${response.data.id}`)
    } catch (error: unknown) {
      const message = getApiErrorMessage(error, 'Erro ao criar evento')
      setErrorMessage(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  const formattedAddress = formatEventAddress({
    street: address.street,
    number: address.number,
    complement: address.complement,
    neighborhood: address.neighborhood,
    city: address.city,
    state: address.state,
    cep: address.cep
  })

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-[#0B1F3A]">Novo Evento</h1>
            <p className="text-gray-900 mt-1">Configure informações, local, categorias, formulário e personalização.</p>
          </div>
          <div className="text-sm text-gray-900">Etapa {step} de {TOTAL_STEPS}</div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8">
          {step === 1 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-[#0B1F3A]">Informações Gerais</h2>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">Nome do Evento *</label>
                <input
                  type="text"
                  value={general.name}
                  onChange={(e) => setGeneral({ ...general, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00C896] outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">Descrição</label>
                <textarea
                  value={general.description}
                  onChange={(e) => setGeneral({ ...general, description: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00C896] outline-none h-24"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">Início *</label>
                  <input
                    type="datetime-local"
                    value={general.start_at}
                    onChange={(e) => setGeneral({ ...general, start_at: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00C896] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">Fim *</label>
                  <input
                    type="datetime-local"
                    value={general.end_at}
                    onChange={(e) => setGeneral({ ...general, end_at: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00C896] outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">Capacidade Máxima</label>
                <input
                  type="number"
                  min={1}
                  value={general.max_capacity}
                  onChange={(e) => setGeneral({ ...general, max_capacity: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00C896] outline-none"
                />
              </div>

              <label className="flex items-center text-sm text-gray-900">
                <input
                  type="checkbox"
                  checked={general.waitlist_enabled}
                  onChange={(e) => setGeneral({ ...general, waitlist_enabled: e.target.checked })}
                  className="mr-2"
                />
                Habilitar fila de espera
              </label>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-[#0B1F3A]">Localização</h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">CEP *</label>
                  <input
                    type="text"
                    value={address.cep}
                    onChange={(e) => setAddress({ ...address, cep: e.target.value })}
                    placeholder="00000-000"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00C896] outline-none"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-900 mb-1">Rua *</label>
                  <input
                    type="text"
                    value={address.street}
                    onChange={(e) => setAddress({ ...address, street: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00C896] outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">Número *</label>
                  <input
                    type="text"
                    value={address.number}
                    onChange={(e) => setAddress({ ...address, number: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00C896] outline-none"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-900 mb-1">Complemento</label>
                  <input
                    type="text"
                    value={address.complement}
                    onChange={(e) => setAddress({ ...address, complement: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00C896] outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">Bairro</label>
                  <input
                    type="text"
                    value={address.neighborhood}
                    onChange={(e) => setAddress({ ...address, neighborhood: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00C896] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">Cidade</label>
                  <input
                    type="text"
                    value={address.city}
                    onChange={(e) => setAddress({ ...address, city: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00C896] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">Estado</label>
                  <input
                    type="text"
                    value={address.state}
                    onChange={(e) => setAddress({ ...address, state: e.target.value })}
                    placeholder="SP"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00C896] outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-[#0B1F3A]">Categorias de Acesso</h2>
                <p className="text-sm text-gray-900 mt-1">
                  Crie quantas categorias precisar: VIP, Palestrante, Staff, Público Geral, etc.
                </p>
              </div>

              <div className="space-y-4">
                {categories.map((cat, idx) => (
                  <div key={idx} className="grid grid-cols-1 md:grid-cols-[1fr_120px_80px_auto] gap-4 items-end">
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1">Nome *</label>
                      <input
                        type="text"
                        value={cat.name}
                        onChange={(e) => {
                          const next = [...categories]
                          next[idx] = { ...next[idx], name: e.target.value }
                          setCategories(next)
                        }}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00C896] outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1">Capacidade</label>
                      <input
                        type="number"
                        min={1}
                        value={cat.max_capacity || ''}
                        onChange={(e) => {
                          const next = [...categories]
                          next[idx] = {
                            ...next[idx],
                            max_capacity: e.target.value ? parseInt(e.target.value, 10) : undefined
                          }
                          setCategories(next)
                        }}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00C896] outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1">Cor</label>
                      <input
                        type="color"
                        value={cat.color || '#00C896'}
                        onChange={(e) => {
                          const next = [...categories]
                          next[idx] = { ...next[idx], color: e.target.value }
                          setCategories(next)
                        }}
                        className="w-full h-10 border border-gray-300 rounded-lg cursor-pointer"
                      />
                    </div>
                    {categories.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setCategories(categories.filter((_, i) => i !== idx))}
                        className="px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                      >
                        Remover
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setCategories([...categories, { name: '', color: '#00C896' }])}
                className="w-full py-2 border-2 border-[#00C896] text-[#00C896] rounded-lg hover:bg-green-50 font-semibold"
              >
                + Adicionar Categoria
              </button>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-[#0B1F3A]">Formulário do Participante</h2>
                <p className="text-sm text-gray-900 mt-1">
                  Defina as perguntas que os clientes responderão ao se inscrever.
                </p>
              </div>
              <FormFieldBuilder fields={formFields} onChange={setFormFields} />
            </div>
          )}

          {step === 5 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-[#0B1F3A]">Personalização e Revisão</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">Cor do banner</label>
                  <input
                    type="color"
                    value={customization.banner_color}
                    onChange={(e) => setCustomization({ ...customization, banner_color: e.target.value })}
                    className="w-full h-10 border border-gray-300 rounded-lg cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">Cor de destaque</label>
                  <input
                    type="color"
                    value={customization.accent_color}
                    onChange={(e) => setCustomization({ ...customization, accent_color: e.target.value })}
                    className="w-full h-10 border border-gray-300 rounded-lg cursor-pointer"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">Mensagem de boas-vindas</label>
                <textarea
                  value={customization.welcome_message}
                  onChange={(e) => setCustomization({ ...customization, welcome_message: e.target.value })}
                  placeholder="Ex: Seja bem-vindo ao nosso evento! Preencha os dados abaixo para garantir sua entrada."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00C896] outline-none h-24"
                />
              </div>

              <div
                className="rounded-xl p-6 text-white"
                style={{ backgroundColor: customization.banner_color }}
              >
                <p className="text-sm opacity-80">Prévia da página de inscrição</p>
                <h3 className="text-2xl font-bold mt-2">{general.name || 'Nome do evento'}</h3>
                <p className="mt-2 opacity-90">
                  {customization.welcome_message || general.description || 'Mensagem de boas-vindas do evento'}
                </p>
                <button
                  type="button"
                  className="mt-4 px-4 py-2 rounded-lg font-semibold text-white"
                  style={{ backgroundColor: customization.accent_color }}
                >
                  Confirmar Inscrição
                </button>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg space-y-2 text-sm text-gray-900">
                <p><strong>Período:</strong> {general.start_at ? new Date(general.start_at).toLocaleString('pt-BR') : '-'} até {general.end_at ? new Date(general.end_at).toLocaleString('pt-BR') : '-'}</p>
                <p><strong>Endereço:</strong> {formattedAddress || '-'}</p>
                <p><strong>Categorias:</strong> {categories.filter((c) => c.name.trim()).map((c) => c.name).join(', ') || '-'}</p>
                <p><strong>Perguntas do formulário:</strong> {formFields.filter((f) => f.label.trim()).length || 'Nenhuma'}</p>
              </div>
            </div>
          )}

          {errorMessage && (
            <div className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {errorMessage}
            </div>
          )}

          <div className="flex justify-between mt-8 gap-3">
            <button
              type="button"
              onClick={() => setStep(Math.max(1, step - 1))}
              disabled={step === 1}
              className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              Anterior
            </button>

            {step < TOTAL_STEPS ? (
              <button
                type="button"
                onClick={goNext}
                className="px-6 py-2 bg-[#00C896] text-white rounded-lg hover:bg-[#00a876]"
              >
                Próximo
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleCreateEvent('draft')}
                  disabled={loading}
                  className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                >
                  Salvar Rascunho
                </button>
                <button
                  type="button"
                  onClick={() => handleCreateEvent('active')}
                  disabled={loading}
                  className="px-6 py-2 bg-[#00C896] text-white rounded-lg hover:bg-[#00a876] disabled:opacity-50"
                >
                  {loading ? 'Publicando...' : 'Publicar Evento'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}