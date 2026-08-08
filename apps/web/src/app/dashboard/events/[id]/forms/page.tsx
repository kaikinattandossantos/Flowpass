'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import axios from 'axios'
import toast from 'react-hot-toast'
import { API_URL, authHeaders } from '@/lib/api'
import { canManageEvents, getStoredUser } from '@/store/auth'
import { publicFormUrl, type RegistrationFormSummary } from '@/lib/registration-form-types'

export default function EventFormsPage() {
  const params = useParams()
  const router = useRouter()
  const eventId = params.id as string

  const [forms, setForms] = useState<RegistrationFormSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [canEdit, setCanEdit] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newFormName, setNewFormName] = useState('')
  const [showCreate, setShowCreate] = useState(false)

  const load = useCallback(async () => {
    const res = await axios.get(`${API_URL}/events/${eventId}/registration-forms`, {
      headers: authHeaders()
    })
    setForms(res.data)
  }, [eventId])

  useEffect(() => {
    const user = getStoredUser()
    if (!user || !localStorage.getItem('token')) {
      router.push('/login')
      return
    }
    if (user.role === 'operator' || user.role === 'super_admin') {
      router.push(user.role === 'super_admin' ? '/admin/companies' : '/dashboard')
      return
    }
    void (async () => {
      try {
        await load()
      } catch {
        toast.error('Erro ao carregar formulários')
      } finally {
        setCanEdit(canManageEvents(user.role))
        setLoading(false)
      }
    })()
  }, [eventId, router, load])

  const handleCreate = async () => {
    if (!newFormName.trim()) {
      toast.error('Informe o nome do formulário')
      return
    }
    setCreating(true)
    try {
      const res = await axios.post(
        `${API_URL}/events/${eventId}/registration-forms`,
        { name: newFormName.trim() },
        { headers: authHeaders() }
      )
      toast.success('Formulário criado')
      setShowCreate(false)
      setNewFormName('')
      router.push(`/dashboard/events/${eventId}/forms/${res.data.id}`)
    } catch (err: unknown) {
      const message = axios.isAxiosError(err)
        ? err.response?.data?.message ?? 'Erro ao criar formulário'
        : 'Erro ao criar formulário'
      toast.error(message)
    } finally {
      setCreating(false)
    }
  }

  const handleCopyLink = async (form: RegistrationFormSummary) => {
    try {
      await navigator.clipboard.writeText(publicFormUrl(form.public_id))
      toast.success('Link copiado')
    } catch {
      toast.error('Não foi possível copiar o link')
    }
  }

  const handleToggleStatus = async (form: RegistrationFormSummary) => {
    try {
      await axios.patch(
        `${API_URL}/events/${eventId}/registration-forms/${form.id}`,
        { status: form.status === 'active' ? 'inactive' : 'active' },
        { headers: authHeaders() }
      )
      toast.success(form.status === 'active' ? 'Formulário desativado' : 'Formulário ativado')
      await load()
    } catch {
      toast.error('Erro ao atualizar formulário')
    }
  }

  if (loading) return <div className="p-8">Carregando...</div>

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => router.push(`/dashboard/events/${eventId}/participants`)}
          className="text-[#00C896] mb-4"
        >
          ← Voltar aos participantes
        </button>

        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-[#0B1F3A]">Formulários</h1>
            <p className="text-gray-600 text-sm mt-1">
              Crie formulários diferentes para organizar as inscrições do evento.
            </p>
          </div>
          {canEdit && (
            <button
              onClick={() => setShowCreate(true)}
              className="bg-[#00C896] text-white px-4 py-2 rounded-lg text-sm shrink-0"
            >
              + Novo formulário
            </button>
          )}
        </div>

        {showCreate && (
          <div className="bg-white rounded-lg shadow p-4 mb-6 space-y-3">
            <label className="block text-sm font-medium">Nome do formulário</label>
            <input
              value={newFormName}
              onChange={(e) => setNewFormName(e.target.value)}
              placeholder="Ex: Participantes"
              className="w-full px-3 py-2 border rounded-lg"
            />
            <div className="flex gap-2">
              <button
                onClick={() => void handleCreate()}
                disabled={creating}
                className="bg-[#00C896] text-white px-4 py-2 rounded-lg text-sm disabled:opacity-50"
              >
                {creating ? 'Criando...' : 'Continuar'}
              </button>
              <button
                onClick={() => { setShowCreate(false); setNewFormName('') }}
                className="px-4 py-2 border rounded-lg text-sm"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {forms.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center text-gray-600">
              Nenhum formulário cadastrado.
            </div>
          ) : (
            forms.map((form) => (
              <div key={form.id} className="bg-white rounded-lg shadow p-5">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold text-[#0B1F3A]">{form.name}</h2>
                    <p className="text-sm text-gray-600 mt-1">
                      {form.field_count} campos · {form.response_count} respostas ·{' '}
                      <span className={form.status === 'active' ? 'text-green-700' : 'text-gray-500'}>
                        {form.status === 'active' ? 'Ativo' : 'Inativo'}
                      </span>
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => void handleCopyLink(form)}
                      className="px-3 py-1.5 border border-[#00C896] text-[#00C896] rounded-lg text-sm"
                    >
                      Copiar link
                    </button>
                    {canEdit && (
                      <>
                        <button
                          onClick={() => router.push(`/dashboard/events/${eventId}/forms/${form.id}`)}
                          className="px-3 py-1.5 border rounded-lg text-sm"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => void handleToggleStatus(form)}
                          className="px-3 py-1.5 border rounded-lg text-sm text-gray-600"
                        >
                          {form.status === 'active' ? 'Desativar' : 'Ativar'}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
