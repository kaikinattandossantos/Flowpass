'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import axios from 'axios'
import toast from 'react-hot-toast'
import { API_URL, authHeaders } from '@/lib/api'
import { canManageEvents, getStoredUser } from '@/store/auth'
import { type RegistrationFormSummary } from '@/lib/registration-form-types'
import { ActionMenu } from '@/components/dashboard/event-page/ActionMenu'
import { EmptyState } from '@/components/dashboard/event-page/EmptyState'
import { EventPageLayout } from '@/components/dashboard/event-page/EventPageLayout'
import { Modal } from '@/components/dashboard/event-page/Modal'
import { PrimaryButton } from '@/components/dashboard/event-page/PrimaryButton'
import { ResourceCard } from '@/components/dashboard/event-page/ResourceCard'

interface Category {
  id: string
  name: string
  description?: string
  color?: string
}

interface ParticipantRow {
  category: { id: string; name: string } | null
}

interface CategoryFormState {
  name: string
  description: string
}

const emptyForm: CategoryFormState = { name: '', description: '' }

export default function EventCategoriesPage() {
  const params = useParams()
  const router = useRouter()
  const eventId = params.id as string

  const [categories, setCategories] = useState<Category[]>([])
  const [forms, setForms] = useState<RegistrationFormSummary[]>([])
  const [participants, setParticipants] = useState<ParticipantRow[]>([])
  const [loading, setLoading] = useState(true)
  const [canEdit, setCanEdit] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [form, setForm] = useState<CategoryFormState>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<Category | null>(null)

  const load = useCallback(async () => {
    const headers = authHeaders()
    const [categoriesRes, formsRes, participantsRes] = await Promise.all([
      axios.get(`${API_URL}/events/${eventId}/categories`, { headers }),
      axios.get(`${API_URL}/events/${eventId}/registration-forms`, { headers }),
      axios.get(`${API_URL}/events/${eventId}/participants`, { headers })
    ])
    setCategories(categoriesRes.data)
    setForms(formsRes.data)
    setParticipants(participantsRes.data)
  }, [eventId])

  useEffect(() => {
    const user = getStoredUser()
    if (!user || !localStorage.getItem('token')) {
      router.push('/login')
      return
    }
    void (async () => {
      try {
        await load()
      } catch {
        toast.error('Erro ao carregar categorias')
      } finally {
        setCanEdit(canManageEvents(user.role))
        setLoading(false)
      }
    })()
  }, [eventId, router, load])

  const statsByCategory = useMemo(() => {
    const participantCounts = new Map<string, number>()
    const formCounts = new Map<string, number>()

    for (const participant of participants) {
      if (!participant.category?.id) continue
      participantCounts.set(
        participant.category.id,
        (participantCounts.get(participant.category.id) ?? 0) + 1
      )
    }

    for (const form of forms) {
      if (!form.default_category_id) continue
      formCounts.set(
        form.default_category_id,
        (formCounts.get(form.default_category_id) ?? 0) + 1
      )
    }

    return categories.map((category) => ({
      category,
      participantCount: participantCounts.get(category.id) ?? 0,
      formCount: formCounts.get(category.id) ?? 0
    }))
  }, [categories, forms, participants])

  const openCreateModal = () => {
    setEditingCategory(null)
    setForm(emptyForm)
    setModalOpen(true)
  }

  const openEditModal = (category: Category) => {
    setEditingCategory(category)
    setForm({
      name: category.name,
      description: category.description ?? ''
    })
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setEditingCategory(null)
    setForm(emptyForm)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) {
      toast.error('Informe o nome da categoria')
      return
    }

    setSaving(true)
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || undefined
      }

      if (editingCategory) {
        await axios.patch(
          `${API_URL}/events/${eventId}/categories/${editingCategory.id}`,
          payload,
          { headers: authHeaders() }
        )
        toast.success('Categoria atualizada')
      } else {
        await axios.post(`${API_URL}/events/${eventId}/categories`, payload, {
          headers: authHeaders()
        })
        toast.success('Categoria criada')
      }

      closeModal()
      await load()
    } catch {
      toast.error(editingCategory ? 'Erro ao atualizar categoria' : 'Erro ao criar categoria')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirmDelete) return
    try {
      await axios.delete(`${API_URL}/events/${eventId}/categories/${confirmDelete.id}`, {
        headers: authHeaders()
      })
      toast.success('Categoria excluída')
      setConfirmDelete(null)
      await load()
    } catch {
      toast.error('Erro ao excluir categoria')
    }
  }

  return (
    <>
      <EventPageLayout
        title="Categorias"
        description="Organize os participantes em grupos para controlar inscrições e credenciamento."
        loading={loading}
        action={
          canEdit ? (
            <PrimaryButton onClick={openCreateModal}>+ Nova categoria</PrimaryButton>
          ) : undefined
        }
      >
        {statsByCategory.length === 0 ? (
          <EmptyState
            title="Nenhuma categoria cadastrada"
            description="Crie categorias como Público Geral, VIP ou Staff para organizar participantes e credenciamento."
            action={
              canEdit ? (
                <PrimaryButton onClick={openCreateModal}>+ Nova categoria</PrimaryButton>
              ) : undefined
            }
          />
        ) : (
          <div className="space-y-3">
            {statsByCategory.map(({ category, participantCount, formCount }) => (
              <ResourceCard key={category.id}>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <h2 className="text-lg font-semibold text-[#0B1F3A]">{category.name}</h2>
                    {category.description && (
                      <p className="mt-1 text-sm text-gray-600">{category.description}</p>
                    )}
                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600">
                      <span>Participantes: {participantCount}</span>
                      <span>Formulários vinculados: {formCount}</span>
                    </div>
                  </div>
                  {canEdit && (
                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openEditModal(category)}
                        className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm hover:bg-gray-50"
                      >
                        Editar
                      </button>
                      <ActionMenu
                        items={[
                          {
                            label: 'Excluir',
                            tone: 'danger',
                            onClick: () => setConfirmDelete(category)
                          }
                        ]}
                      />
                    </div>
                  )}
                </div>
              </ResourceCard>
            ))}
          </div>
        )}
      </EventPageLayout>

      <Modal
        open={modalOpen}
        title={editingCategory ? 'Editar categoria' : 'Nova categoria'}
        onClose={closeModal}
        footer={
          <>
            <button
              type="button"
              onClick={closeModal}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm"
            >
              Cancelar
            </button>
            <PrimaryButton form="category-form" type="submit" disabled={saving}>
              {saving ? 'Salvando...' : editingCategory ? 'Salvar' : 'Criar categoria'}
            </PrimaryButton>
          </>
        }
      >
        <form id="category-form" onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Nome da categoria *
            </label>
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Ex: Público Geral"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#00C896] focus:ring-2 focus:ring-[#00C896]/20"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Descrição
            </label>
            <input
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Opcional"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#00C896] focus:ring-2 focus:ring-[#00C896]/20"
            />
          </div>
        </form>
      </Modal>

      <Modal
        open={!!confirmDelete}
        title="Excluir categoria"
        onClose={() => setConfirmDelete(null)}
        footer={
          <>
            <button
              type="button"
              onClick={() => setConfirmDelete(null)}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => void handleDelete()}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
            >
              Excluir
            </button>
          </>
        }
      >
        <p className="text-sm text-gray-600">
          Tem certeza que deseja excluir a categoria{' '}
          <strong>{confirmDelete?.name}</strong>? Esta ação não pode ser desfeita.
        </p>
      </Modal>
    </>
  )
}
