'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import axios from 'axios'
import toast from 'react-hot-toast'
import { API_URL, authHeaders } from '@/lib/api'
import { canManageEvents, getStoredUser } from '@/store/auth'
import { publicFormUrl, type RegistrationFormSummary } from '@/lib/registration-form-types'
import { formStatusLabel } from '@/lib/structural-config'
import { ActionMenu } from '@/components/dashboard/event-page/ActionMenu'
import { EmptyState } from '@/components/dashboard/event-page/EmptyState'
import { EventPageLayout } from '@/components/dashboard/event-page/EventPageLayout'
import { Modal } from '@/components/dashboard/event-page/Modal'
import { PrimaryButton } from '@/components/dashboard/event-page/PrimaryButton'
import { ResourceCard } from '@/components/dashboard/event-page/ResourceCard'
import { StatusBadge } from '@/components/dashboard/event-page/StatusBadge'

function statusVariant(status: RegistrationFormSummary['status']) {
  if (status === 'active') return 'success' as const
  if (status === 'draft') return 'warning' as const
  return 'neutral' as const
}

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

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
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
      await navigator.clipboard.writeText(publicFormUrl(form))
      toast.success('Link copiado')
    } catch {
      toast.error('Não foi possível copiar o link')
    }
  }

  const handleToggleStatus = async (form: RegistrationFormSummary) => {
    try {
      if (form.status === 'draft') {
        await axios.post(
          `${API_URL}/events/${eventId}/registration-forms/${form.id}/publish`,
          {},
          { headers: authHeaders() }
        )
        toast.success('Formulário publicado')
      } else {
        await axios.patch(
          `${API_URL}/events/${eventId}/registration-forms/${form.id}`,
          { status: form.status === 'active' ? 'inactive' : 'active' },
          { headers: authHeaders() }
        )
        toast.success(form.status === 'active' ? 'Formulário desativado' : 'Formulário ativado')
      }
      await load()
    } catch (err: unknown) {
      const message = axios.isAxiosError(err)
        ? err.response?.data?.message ?? 'Erro ao atualizar formulário'
        : 'Erro ao atualizar formulário'
      toast.error(message)
    }
  }

  return (
    <>
      <EventPageLayout
        title="Formulários"
        description="Crie e gerencie os formulários utilizados para inscrição no evento."
        loading={loading}
        action={
          canEdit ? (
            <PrimaryButton onClick={() => setShowCreate(true)}>+ Novo formulário</PrimaryButton>
          ) : undefined
        }
      >
        {forms.length === 0 ? (
          <EmptyState
            title="Nenhum formulário cadastrado"
            description="Crie formulários para receber inscrições públicas com links próprios."
            action={
              canEdit ? (
                <PrimaryButton onClick={() => setShowCreate(true)}>+ Novo formulário</PrimaryButton>
              ) : undefined
            }
          />
        ) : (
          <div className="space-y-3">
            {forms.map((form) => (
              <ResourceCard key={form.id}>
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-semibold text-[#0B1F3A]">{form.name}</h2>
                      <StatusBadge
                        label={formStatusLabel(form.status)}
                        variant={statusVariant(form.status)}
                      />
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600">
                      <span>
                        Categoria: {form.default_category?.name ?? 'Nenhuma'}
                      </span>
                      <span>
                        Inscrições: {form.active_registration_count ?? form.response_count}
                      </span>
                      {form.registration_limit !== null && (
                        <span>Limite: {form.registration_limit}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => router.push(`/dashboard/events/${eventId}/forms/${form.id}`)}
                        className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm hover:bg-gray-50"
                      >
                        Editar
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => void handleCopyLink(form)}
                      className="rounded-lg border border-[#00C896] px-3 py-1.5 text-sm text-[#00C896] hover:bg-green-50"
                    >
                      Copiar link
                    </button>
                    <ActionMenu
                      items={[
                        {
                          label: 'Visualizar',
                          onClick: () => window.open(publicFormUrl(form), '_blank')
                        },
                        {
                          label:
                            form.status === 'active'
                              ? 'Desativar'
                              : form.status === 'draft'
                                ? 'Publicar'
                                : 'Ativar',
                          onClick: () => void handleToggleStatus(form),
                          hidden: !canEdit
                        }
                      ]}
                    />
                  </div>
                </div>
              </ResourceCard>
            ))}
          </div>
        )}
      </EventPageLayout>

      <Modal
        open={showCreate}
        title="Novo formulário"
        onClose={() => {
          setShowCreate(false)
          setNewFormName('')
        }}
        footer={
          <>
            <button
              type="button"
              onClick={() => {
                setShowCreate(false)
                setNewFormName('')
              }}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm"
            >
              Cancelar
            </button>
            <PrimaryButton form="create-form" type="submit" disabled={creating}>
              {creating ? 'Criando...' : 'Continuar'}
            </PrimaryButton>
          </>
        }
      >
        <form id="create-form" onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Nome do formulário *
            </label>
            <input
              required
              value={newFormName}
              onChange={(e) => setNewFormName(e.target.value)}
              placeholder="Ex: Inscrição Público Geral"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#00C896] focus:ring-2 focus:ring-[#00C896]/20"
            />
          </div>
        </form>
      </Modal>
    </>
  )
}
