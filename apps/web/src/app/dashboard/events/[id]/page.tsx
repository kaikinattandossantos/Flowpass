'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import axios from 'axios'
import toast from 'react-hot-toast'
import { formatEventAddress } from '@/lib/address'

interface Category {
  id: string
  name: string
  color?: string | null
  max_capacity?: number | null
}

interface FormField {
  id: string
  label: string
  type: string
  required: boolean
  options?: string[] | null
  order: number
}

interface Event {
  id: string
  name: string
  description?: string | null
  status: 'draft' | 'active' | 'finished'
  start_at: string
  end_at: string
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
  categories: Category[]
  form_fields: FormField[]
  registrations: Registration[]
  operators: Operator[]
}

interface Operator {
  id: string
  name: string
  email: string
  active: boolean
}

interface Registration {
  id: string
  name: string
  email: string
  status: string
  category?: {
    name: string
  }
  checkins?: Array<{ checked_at: string }>
}

interface CreatedOperator extends Operator {
  temp_password: string
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333'

export default function EventDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const eventId = params.id as string
  const [event, setEvent] = useState<Event | null>(null)
  const [loading, setLoading] = useState(true)
  const [operators, setOperators] = useState<Operator[]>([])
  const [showOperatorModal, setShowOperatorModal] = useState(false)
  const [newOperator, setNewOperator] = useState({ name: '', email: '' })
  const [createdOperator, setCreatedOperator] = useState<CreatedOperator | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [newCategory, setNewCategory] = useState({ name: '', color: '#00C896' })
  const [addingCategory, setAddingCategory] = useState(false)
  const [newFormField, setNewFormField] = useState({
    label: '',
    type: 'text',
    required: false,
    options: ''
  })
  const [addingFormField, setAddingFormField] = useState(false)

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const token = localStorage.getItem('token')
        const [eventRes, opsRes] = await Promise.all([
          axios.get(`${API_URL}/events/${eventId}`, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(`${API_URL}/events/${eventId}/operators`, { headers: { Authorization: `Bearer ${token}` } })
        ])
        setEvent(eventRes.data)
        setOperators(opsRes.data)
      } catch {
        toast.error('Erro ao carregar evento')
      } finally {
        setLoading(false)
      }
    }
    fetchEvent()
  }, [eventId])

  const handleCreateOperator = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const token = localStorage.getItem('token')
      const res = await axios.post(`${API_URL}/events/${eventId}/operators`, newOperator, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setCreatedOperator(res.data)
      setOperators([...operators, res.data])
      setNewOperator({ name: '', email: '' })
      toast.success('Operador criado com sucesso!')
    } catch {
      toast.error('Erro ao criar operador')
    }
  }

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCategory.name.trim()) return

    setAddingCategory(true)
    try {
      const token = localStorage.getItem('token')
      const res = await axios.post(
        `${API_URL}/events/${eventId}/categories`,
        { name: newCategory.name.trim(), color: newCategory.color },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setEvent((prev) => prev ? { ...prev, categories: [...prev.categories, res.data] } : prev)
      setNewCategory({ name: '', color: '#00C896' })
      toast.success('Categoria adicionada!')
    } catch {
      toast.error('Erro ao adicionar categoria')
    } finally {
      setAddingCategory(false)
    }
  }

  const handleAddFormField = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newFormField.label.trim()) return

    setAddingFormField(true)
    try {
      const token = localStorage.getItem('token')
      const options = newFormField.options
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)

      const res = await axios.post(
        `${API_URL}/events/${eventId}/form-fields`,
        {
          label: newFormField.label.trim(),
          type: newFormField.type,
          required: newFormField.required,
          ...(options.length ? { options } : {})
        },
        { headers: { Authorization: `Bearer ${token}` } }
      )

      setEvent((prev) => prev ? { ...prev, form_fields: [...prev.form_fields, res.data] } : prev)
      setNewFormField({ label: '', type: 'text', required: false, options: '' })
      toast.success('Pergunta adicionada ao formulário!')
    } catch {
      toast.error('Erro ao adicionar pergunta')
    } finally {
      setAddingFormField(false)
    }
  }

  const copyInscriptionLink = () => {
    const link = `${window.location.origin}/inscrever/${eventId}`
    navigator.clipboard.writeText(link)
    toast.success('Link de inscrição copiado!')
  }

  if (loading) return <div className="p-8">Carregando...</div>
  if (!event) return <div className="p-8">Evento não encontrado</div>

  const filteredRegistrations = event.registrations.filter(r =>
    r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-3xl font-bold text-[#0B1F3A]">{event.name}</h1>
              <div className="flex items-center gap-4 mt-2">
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  event.status === 'active' ? 'bg-green-100 text-gray-900' : 'bg-gray-100 text-gray-900'
                }`}>
                  {event.status === 'active' ? 'Ativo' : 'Rascunho'}
                </span>
                <span className="text-gray-900">{new Date(event.start_at).toLocaleDateString('pt-BR')}</span>
                <span className="text-gray-900">
                  {formatEventAddress(event)}
                </span>
              </div>
              {event.welcome_message && (
                <p className="text-gray-900 mt-3 text-sm">{event.welcome_message}</p>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => router.push(`/dashboard/events/${eventId}/credenciamento`)}
                className="px-4 py-2 bg-[#0B1F3A] text-white rounded-lg hover:bg-[#163456]"
              >
                Credenciamento
              </button>
              <button
                onClick={() => router.push(`/dashboard/events/${eventId}/live`)}
                className="px-4 py-2 bg-[#00C896] text-white rounded-lg hover:bg-[#00a876]"
              >
                Ver ao Vivo
              </button>
              <button
                onClick={copyInscriptionLink}
                className="px-4 py-2 border border-[#00C896] text-[#00C896] rounded-lg hover:bg-green-50"
              >
                Copiar Link
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-[#0B1F3A]">Formulário do Participante</h2>
                <span className="text-sm text-gray-900">{event.form_fields.length} pergunta(s)</span>
              </div>

              <div className="space-y-2 mb-4">
                {event.form_fields.length === 0 ? (
                  <p className="text-gray-900 text-sm">Nenhuma pergunta extra configurada.</p>
                ) : (
                  event.form_fields
                    .sort((a, b) => a.order - b.order)
                    .map((field) => (
                      <div key={field.id} className="p-3 bg-gray-50 rounded-lg">
                        <p className="font-medium text-gray-900">{field.label}</p>
                        <p className="text-xs text-gray-900">
                          {field.type} {field.required ? '· obrigatório' : '· opcional'}
                        </p>
                      </div>
                    ))
                )}
              </div>

              <form onSubmit={handleAddFormField} className="space-y-3 border-t pt-4">
                <input
                  type="text"
                  placeholder="Nova pergunta (ex: Empresa, Tamanho da camiseta)"
                  value={newFormField.label}
                  onChange={(e) => setNewFormField({ ...newFormField, label: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00C896] outline-none"
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <select
                    value={newFormField.type}
                    onChange={(e) => setNewFormField({ ...newFormField, type: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00C896] outline-none"
                  >
                    <option value="text">Texto</option>
                    <option value="email">E-mail</option>
                    <option value="phone">Telefone</option>
                    <option value="cpf">CPF</option>
                    <option value="number">Número</option>
                    <option value="select">Seleção única</option>
                    <option value="multi_select">Múltipla escolha</option>
                  </select>
                  <input
                    type="text"
                    placeholder="Opções separadas por vírgula (se aplicável)"
                    value={newFormField.options}
                    onChange={(e) => setNewFormField({ ...newFormField, options: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00C896] outline-none"
                  />
                </div>
                <label className="flex items-center gap-2 text-sm text-gray-900">
                  <input
                    type="checkbox"
                    checked={newFormField.required}
                    onChange={(e) => setNewFormField({ ...newFormField, required: e.target.checked })}
                  />
                  Campo obrigatório
                </label>
                <button
                  type="submit"
                  disabled={addingFormField}
                  className="w-full py-2 bg-[#0B1F3A] text-white rounded-lg hover:bg-[#163456] disabled:opacity-50"
                >
                  {addingFormField ? 'Adicionando...' : '+ Adicionar pergunta'}
                </button>
              </form>
            </div>

            <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
              <h2 className="text-2xl font-bold text-[#0B1F3A] mb-4">Inscritos ({event.registrations.length})</h2>
              
              <input
                type="text"
                placeholder="Buscar por nome ou e-mail..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4 focus:ring-2 focus:ring-[#00C896] outline-none"
              />

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-2 text-left font-semibold text-gray-900">Nome</th>
                      <th className="px-4 py-2 text-left font-semibold text-gray-900">E-mail</th>
                      <th className="px-4 py-2 text-left font-semibold text-gray-900">Categoria</th>
                      <th className="px-4 py-2 text-left font-semibold text-gray-900">Inscrição</th>
                      <th className="px-4 py-2 text-left font-semibold text-gray-900">Presença</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRegistrations.length === 0 ? (
                      <tr><td colSpan={5} className="px-4 py-4 text-center text-gray-900">Nenhum inscrito</td></tr>
                    ) : (
                      filteredRegistrations.map(reg => (
                        <tr key={reg.id} className="border-b hover:bg-gray-50 text-gray-900">
                          <td className="px-4 py-3">{reg.name}</td>
                          <td className="px-4 py-3">{reg.email}</td>
                          <td className="px-4 py-3">{reg.category?.name}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded text-xs font-semibold ${
                              reg.status === 'confirmed' ? 'bg-green-100 text-gray-900' : 'bg-gray-100 text-gray-900'
                            }`}>
                              {reg.status === 'confirmed' ? 'Confirmada' : reg.status}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {reg.checkins && reg.checkins.length > 0 ? (
                              <div>
                                <span className="px-2 py-1 rounded text-xs font-semibold bg-[#00C896]/15 text-gray-900">
                                  Presente
                                </span>
                                <p className="text-xs text-gray-900 mt-1">
                                  {new Date(reg.checkins[0].checked_at).toLocaleString('pt-BR')}
                                </p>
                              </div>
                            ) : (
                              <span className="px-2 py-1 rounded text-xs font-semibold bg-gray-100 text-gray-900">
                                Ausente
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="space-y-8">
            <div className="bg-white rounded-lg shadow-lg p-8">
              <h2 className="text-2xl font-bold text-[#0B1F3A] mb-4">Categorias ({event.categories.length})</h2>

              <div className="space-y-2 mb-4">
                {event.categories.map((category) => (
                  <div key={category.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <span
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: category.color || '#00C896' }}
                      />
                      <span className="font-medium text-gray-900">{category.name}</span>
                    </div>
                    {category.max_capacity && (
                      <span className="text-xs text-gray-900">Cap. {category.max_capacity}</span>
                    )}
                  </div>
                ))}
              </div>

              <form onSubmit={handleAddCategory} className="space-y-3">
                <input
                  type="text"
                  placeholder="Nova categoria (ex: VIP, Staff)"
                  value={newCategory.name}
                  onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00C896] outline-none"
                />
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={newCategory.color}
                    onChange={(e) => setNewCategory({ ...newCategory, color: e.target.value })}
                    className="w-16 h-10 border border-gray-300 rounded-lg cursor-pointer"
                  />
                  <button
                    type="submit"
                    disabled={addingCategory}
                    className="flex-1 py-2 bg-[#0B1F3A] text-white rounded-lg hover:bg-[#163456] disabled:opacity-50"
                  >
                    {addingCategory ? 'Adicionando...' : '+ Adicionar Categoria'}
                  </button>
                </div>
              </form>
            </div>

            <div className="bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-bold text-[#0B1F3A] mb-4">Operadores ({operators.length})</h2>
            
            <div className="space-y-2 mb-4">
              {operators.map(op => (
                <div key={op.id} className="p-3 bg-gray-50 rounded-lg">
                  <p className="font-semibold text-gray-900">{op.name}</p>
                  <p className="text-xs text-gray-900">{op.email}</p>
                  <span className={`inline-block mt-1 px-2 py-1 text-xs rounded ${
                    op.active ? 'bg-green-100 text-gray-900' : 'bg-red-100 text-gray-900'
                  }`}>
                    {op.active ? 'Ativo' : 'Revogado'}
                  </span>
                </div>
              ))}
            </div>

            <button
              onClick={() => setShowOperatorModal(true)}
              className="w-full py-2 bg-[#00C896] text-white rounded-lg hover:bg-[#00a876] font-semibold"
            >
              + Criar Operador
            </button>

            {showOperatorModal && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                <div className="bg-white rounded-lg p-8 max-w-md w-full">
                  <h3 className="text-xl font-bold text-[#0B1F3A] mb-4">Criar Novo Operador</h3>
                  
                  {createdOperator ? (
                    <div className="space-y-4">
                      <p className="text-gray-900 font-semibold">Operador criado com sucesso!</p>
                      <div className="bg-gray-50 p-4 rounded-lg space-y-2 text-gray-900">
                        <p><strong>Nome:</strong> {createdOperator.name}</p>
                        <p><strong>E-mail:</strong> {createdOperator.email}</p>
                        <p><strong>Senha Temporária:</strong> <code className="bg-gray-200 px-2 py-1 rounded">{createdOperator.temp_password}</code></p>
                      </div>
                      <button
                        onClick={() => {
                          setShowOperatorModal(false)
                          setCreatedOperator(null)
                          setNewOperator({ name: '', email: '' })
                        }}
                        className="w-full py-2 bg-[#00C896] text-white rounded-lg"
                      >
                        Fechar
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleCreateOperator} className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-900 mb-1">Nome</label>
                        <input
                          type="text"
                          required
                          value={newOperator.name}
                          onChange={(e) => setNewOperator({...newOperator, name: e.target.value})}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00C896] outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-900 mb-1">E-mail</label>
                        <input
                          type="email"
                          required
                          value={newOperator.email}
                          onChange={(e) => setNewOperator({...newOperator, email: e.target.value})}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00C896] outline-none"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setShowOperatorModal(false)}
                          className="flex-1 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-900"
                        >
                          Cancelar
                        </button>
                        <button
                          type="submit"
                          className="flex-1 py-2 bg-[#00C896] text-white rounded-lg hover:bg-[#00a876]"
                        >
                          Criar
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </div>
            )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
