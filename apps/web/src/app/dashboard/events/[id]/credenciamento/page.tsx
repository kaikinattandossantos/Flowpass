'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import axios from 'axios'
import toast from 'react-hot-toast'
import { API_URL, authHeaders } from '@/lib/api'
import { canManageEvents, getStoredUser } from '@/store/auth'
import {
  credentialingUrl,
  type CredentialingLink
} from '@/lib/credentialing'
import { ActionMenu } from '@/components/dashboard/event-page/ActionMenu'
import { EmptyState } from '@/components/dashboard/event-page/EmptyState'
import { EventPageLayout } from '@/components/dashboard/event-page/EventPageLayout'
import { Modal } from '@/components/dashboard/event-page/Modal'
import { PrimaryButton } from '@/components/dashboard/event-page/PrimaryButton'
import { ResourceCard } from '@/components/dashboard/event-page/ResourceCard'
import { StatusBadge } from '@/components/dashboard/event-page/StatusBadge'

interface Category {
  id: string
  name: string
}

interface Operator {
  id: string
  name: string
  email: string
  active: boolean
}

interface CreatedOperator extends Operator {
  temp_password: string
}

interface LinkFormState {
  name: string
  allows_all_categories: boolean
  category_ids: string[]
  active: boolean
}

const emptyLinkForm: LinkFormState = {
  name: '',
  allows_all_categories: true,
  category_ids: [],
  active: true
}

function CategoryChips({ link }: { link: CredentialingLink }) {
  if (link.allows_all_categories) {
    return (
      <span className="inline-flex rounded-full bg-[#0B1F3A]/5 px-2.5 py-1 text-xs font-medium text-[#0B1F3A]">
        Todas as categorias
      </span>
    )
  }

  if (link.categories.length === 0) {
    return (
      <span className="inline-flex rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
        Nenhuma categoria
      </span>
    )
  }

  return (
    <div className="flex flex-wrap gap-2">
      {link.categories.map((category) => (
        <span
          key={category.id}
          className="inline-flex rounded-full bg-[#00C896]/10 px-2.5 py-1 text-xs font-medium text-[#007a5c]"
        >
          {category.name}
        </span>
      ))}
    </div>
  )
}

export default function EventCredenciamentoPage() {
  const params = useParams()
  const router = useRouter()
  const eventId = params.id as string

  const [links, setLinks] = useState<CredentialingLink[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [operators, setOperators] = useState<Operator[]>([])
  const [loading, setLoading] = useState(true)
  const [canEdit, setCanEdit] = useState(false)
  const [linkModalOpen, setLinkModalOpen] = useState(false)
  const [editingLinkId, setEditingLinkId] = useState<string | null>(null)
  const [linkForm, setLinkForm] = useState<LinkFormState>(emptyLinkForm)
  const [savingLink, setSavingLink] = useState(false)
  const [showOperatorModal, setShowOperatorModal] = useState(false)
  const [newOperator, setNewOperator] = useState({ name: '', email: '' })
  const [createdOperator, setCreatedOperator] = useState<CreatedOperator | null>(null)

  const load = useCallback(async () => {
    const headers = authHeaders()
    const [linksRes, catsRes, opsRes] = await Promise.all([
      axios.get(`${API_URL}/events/${eventId}/access-points`, { headers }),
      axios.get(`${API_URL}/events/${eventId}/categories`, { headers }),
      axios.get(`${API_URL}/events/${eventId}/operators`, { headers })
    ])
    setLinks(linksRes.data)
    setCategories(catsRes.data)
    setOperators(opsRes.data)
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
        toast.error('Erro ao carregar credenciamento')
      } finally {
        setCanEdit(canManageEvents(user.role))
        setLoading(false)
      }
    })()
  }, [eventId, router, load])

  const openCreateLink = () => {
    setEditingLinkId(null)
    setLinkForm(emptyLinkForm)
    setLinkModalOpen(true)
  }

  const openEditLink = (link: CredentialingLink) => {
    setEditingLinkId(link.id)
    setLinkForm({
      name: link.name,
      allows_all_categories: link.allows_all_categories,
      category_ids: link.categories.map((category) => category.id),
      active: link.active
    })
    setLinkModalOpen(true)
  }

  const closeLinkModal = () => {
    setLinkModalOpen(false)
    setEditingLinkId(null)
    setLinkForm(emptyLinkForm)
  }

  const toggleCategory = (categoryId: string) => {
    setLinkForm((current) => ({
      ...current,
      category_ids: current.category_ids.includes(categoryId)
        ? current.category_ids.filter((id) => id !== categoryId)
        : [...current.category_ids, categoryId]
    }))
  }

  const handleSaveLink = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!linkForm.name.trim()) {
      toast.error('Informe o nome do ponto')
      return
    }
    if (!linkForm.allows_all_categories && linkForm.category_ids.length === 0) {
      toast.error('Selecione ao menos uma categoria')
      return
    }

    setSavingLink(true)
    try {
      const payload = {
        name: linkForm.name.trim(),
        active: linkForm.active,
        allows_all_categories: linkForm.allows_all_categories,
        category_ids: linkForm.allows_all_categories ? [] : linkForm.category_ids
      }

      if (editingLinkId) {
        await axios.patch(
          `${API_URL}/events/${eventId}/access-points/${editingLinkId}`,
          payload,
          { headers: authHeaders() }
        )
        toast.success('Ponto atualizado')
      } else {
        await axios.post(`${API_URL}/events/${eventId}/access-points`, payload, {
          headers: authHeaders()
        })
        toast.success('Ponto criado')
      }

      closeLinkModal()
      await load()
    } catch (err: unknown) {
      const message = axios.isAxiosError(err)
        ? err.response?.data?.message ?? 'Erro ao salvar ponto'
        : 'Erro ao salvar ponto'
      toast.error(message)
    } finally {
      setSavingLink(false)
    }
  }

  const handleToggleActive = async (link: CredentialingLink) => {
    try {
      await axios.patch(
        `${API_URL}/events/${eventId}/access-points/${link.id}`,
        { active: !link.active },
        { headers: authHeaders() }
      )
      await load()
      toast.success(link.active ? 'Ponto desativado' : 'Ponto ativado')
    } catch {
      toast.error('Erro ao atualizar status')
    }
  }

  const handleCopyLink = async (link: CredentialingLink) => {
    await navigator.clipboard.writeText(credentialingUrl(link.public_id))
    toast.success('Link copiado')
  }

  const handleCreateOperator = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const res = await axios.post(`${API_URL}/events/${eventId}/operators`, newOperator, {
        headers: authHeaders()
      })
      setCreatedOperator(res.data)
      setOperators([...operators, res.data])
      setNewOperator({ name: '', email: '' })
      toast.success('Operador criado com sucesso!')
    } catch {
      toast.error('Erro ao criar operador')
    }
  }

  return (
    <>
      <EventPageLayout
        title="Credenciamento"
        description="Crie links de credenciamento para leitura de QR Code e controle de check-in."
        loading={loading}
        action={
          canEdit ? (
            <PrimaryButton onClick={openCreateLink}>+ Novo ponto</PrimaryButton>
          ) : undefined
        }
      >
        {links.length === 0 ? (
          <EmptyState
            title="Nenhum ponto de credenciamento"
            description="Crie pontos como Recepção Geral ou Mesa Rio Formoso para operação presencial com QR Code."
            action={
              canEdit ? (
                <PrimaryButton onClick={openCreateLink}>+ Novo ponto</PrimaryButton>
              ) : undefined
            }
          />
        ) : (
          <div className="space-y-3">
            {links.map((link) => (
              <ResourceCard key={link.id}>
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-semibold text-[#0B1F3A]">{link.name}</h2>
                      <StatusBadge
                        label={link.active ? 'Ativo' : 'Inativo'}
                        variant={link.active ? 'success' : 'neutral'}
                        dot
                      />
                    </div>
                    <CategoryChips link={link} />
                    <p className="text-sm text-gray-600">
                      {link.checkin_count} check-in{link.checkin_count === 1 ? '' : 's'}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <Link
                      href={`/c/${link.public_id}`}
                      target="_blank"
                      className="rounded-lg bg-[#0B1F3A] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#0B1F3A]/90"
                    >
                      Abrir credenciamento
                    </Link>
                    <button
                      type="button"
                      onClick={() => void handleCopyLink(link)}
                      className="rounded-lg border border-[#00C896] px-3 py-1.5 text-sm text-[#00C896] hover:bg-green-50"
                    >
                      Copiar link
                    </button>
                    <ActionMenu
                      items={[
                        {
                          label: 'Editar',
                          onClick: () => openEditLink(link),
                          hidden: !canEdit
                        },
                        {
                          label: link.active ? 'Desativar' : 'Ativar',
                          onClick: () => void handleToggleActive(link),
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

        <section className="mt-10 rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[#0B1F3A]">Operadores</h2>
              <p className="mt-1 text-sm text-gray-600">
                Usuários do app mobile vinculados ao check-in presencial.
              </p>
            </div>
            {canEdit && (
              <button
                type="button"
                onClick={() => setShowOperatorModal(true)}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-[#0B1F3A] hover:bg-gray-50"
              >
                + Criar operador
              </button>
            )}
          </div>
          {operators.length === 0 ? (
            <p className="text-sm text-gray-500">Nenhum operador cadastrado.</p>
          ) : (
            <div className="divide-y rounded-lg border border-gray-100">
              {operators.map((operator) => (
                <div key={operator.id} className="flex items-start justify-between gap-4 p-4">
                  <div>
                    <p className="font-semibold text-[#0B1F3A]">{operator.name}</p>
                    <p className="text-sm text-gray-600">{operator.email}</p>
                  </div>
                  <StatusBadge
                    label={operator.active ? 'Ativo' : 'Revogado'}
                    variant={operator.active ? 'success' : 'danger'}
                  />
                </div>
              ))}
            </div>
          )}
        </section>
      </EventPageLayout>

      <Modal
        open={linkModalOpen}
        title={editingLinkId ? 'Editar ponto' : 'Novo ponto de credenciamento'}
        onClose={closeLinkModal}
        footer={
          <>
            <button
              type="button"
              onClick={closeLinkModal}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm"
            >
              Cancelar
            </button>
            <PrimaryButton form="link-form" type="submit" disabled={savingLink}>
              {savingLink ? 'Salvando...' : editingLinkId ? 'Salvar' : 'Criar ponto'}
            </PrimaryButton>
          </>
        }
      >
        <form id="link-form" onSubmit={handleSaveLink} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Nome do ponto *</label>
            <input
              required
              value={linkForm.name}
              onChange={(e) => setLinkForm({ ...linkForm, name: e.target.value })}
              placeholder="Ex: Recepção Geral"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#00C896] focus:ring-2 focus:ring-[#00C896]/20"
            />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700">Categorias permitidas *</p>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                checked={linkForm.allows_all_categories}
                onChange={() => setLinkForm({ ...linkForm, allows_all_categories: true, category_ids: [] })}
              />
              Todas as categorias
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                checked={!linkForm.allows_all_categories}
                onChange={() => setLinkForm({ ...linkForm, allows_all_categories: false })}
              />
              Categorias específicas
            </label>
            {!linkForm.allows_all_categories && (
              <div className="rounded-lg border border-gray-200 p-3 space-y-2">
                {categories.length === 0 ? (
                  <p className="text-sm text-gray-500">Cadastre categorias primeiro.</p>
                ) : (
                  categories.map((category) => (
                    <label key={category.id} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={linkForm.category_ids.includes(category.id)}
                        onChange={() => toggleCategory(category.id)}
                      />
                      {category.name}
                    </label>
                  ))
                )}
              </div>
            )}
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={linkForm.active}
              onChange={(e) => setLinkForm({ ...linkForm, active: e.target.checked })}
            />
            Ativo
          </label>
        </form>
      </Modal>

      <Modal
        open={showOperatorModal}
        title="Criar operador"
        onClose={() => {
          setShowOperatorModal(false)
          setCreatedOperator(null)
        }}
        footer={
          createdOperator ? (
            <PrimaryButton
              onClick={() => {
                setShowOperatorModal(false)
                setCreatedOperator(null)
              }}
            >
              Fechar
            </PrimaryButton>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setShowOperatorModal(false)}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm"
              >
                Cancelar
              </button>
              <PrimaryButton form="operator-form" type="submit">
                Criar
              </PrimaryButton>
            </>
          )
        }
      >
        {createdOperator ? (
          <div className="space-y-3 text-sm text-gray-700">
            <p className="font-medium text-green-700">Operador criado com sucesso!</p>
            <p><strong>Nome:</strong> {createdOperator.name}</p>
            <p><strong>E-mail:</strong> {createdOperator.email}</p>
            <p>
              <strong>Senha temporária:</strong>{' '}
              <code className="rounded bg-gray-100 px-2 py-1">{createdOperator.temp_password}</code>
            </p>
          </div>
        ) : (
          <form id="operator-form" onSubmit={handleCreateOperator} className="space-y-4">
            <input
              required
              value={newOperator.name}
              onChange={(e) => setNewOperator({ ...newOperator, name: e.target.value })}
              placeholder="Nome"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
            <input
              required
              type="email"
              value={newOperator.email}
              onChange={(e) => setNewOperator({ ...newOperator, email: e.target.value })}
              placeholder="E-mail"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </form>
        )}
      </Modal>
    </>
  )
}
