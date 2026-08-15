'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import axios from 'axios'
import toast from 'react-hot-toast'
import { API_URL, authHeaders } from '@/lib/api'
import { type RegistrationFormSummary } from '@/lib/registration-form-types'
import {
  formatCpfDisplay,
  ORIGIN_LABELS,
  STATUS_LABELS,
  STATUS_OPTIONS,
  type ParticipantOrigin,
  type ParticipantStatus
} from '@/lib/participant-labels'
import { canManageEvents, getStoredUser } from '@/store/auth'
import { ParticipantFormModalKeyed, ParticipantFormValues } from '@/components/participants/ParticipantFormModal'
import { ImportModal } from '@/components/participants/ImportModal'
import { ViewParticipantModal } from '@/components/participants/ViewParticipantModal'
import { EventBreadcrumb } from '@/components/dashboard/EventBreadcrumb'

interface Participant {
  id: string
  name: string
  email: string | null
  phone: string | null
  cpf: string | null
  status: ParticipantStatus
  origin: ParticipantOrigin
  has_qr: boolean
  form_data: Record<string, unknown>
  category: { id: string; name: string } | null
  registration_form: { id: string; name: string } | null
}

interface Category {
  id: string
  name: string
}

export default function ParticipantsPage() {
  const params = useParams()
  const router = useRouter()
  const eventId = params.id as string

  const [participants, setParticipants] = useState<Participant[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [registrationForms, setRegistrationForms] = useState<RegistrationFormSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [canEdit, setCanEdit] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<ParticipantStatus | ''>('')
  const [formOpen, setFormOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [viewParticipant, setViewParticipant] = useState<Participant | null>(null)
  const [editParticipant, setEditParticipant] = useState<Participant | null>(null)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    const params = new URLSearchParams()
    if (search.trim()) params.set('search', search.trim())
    if (statusFilter) params.set('status', statusFilter)
    const qs = params.toString() ? `?${params.toString()}` : ''

    const headers = authHeaders()
    const [listRes, catsRes, formsRes] = await Promise.all([
      axios.get(`${API_URL}/events/${eventId}/participants${qs}`, { headers }),
      axios.get(`${API_URL}/events/${eventId}/categories`, { headers }),
      axios.get(`${API_URL}/events/${eventId}/registration-forms`, { headers })
    ])
    setParticipants(listRes.data)
    setCategories(catsRes.data)
    setRegistrationForms(formsRes.data)
  }, [eventId, search, statusFilter])

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
    const edit = canManageEvents(user.role)
    void (async () => {
      try {
        await load()
      } catch {
        toast.error('Erro ao carregar participantes')
      } finally {
        setCanEdit(edit)
        setLoading(false)
      }
    })()
  }, [router, load])

  const handleSave = async (values: ParticipantFormValues) => {
    setSaving(true)
    try {
      const payload = {
        category_id: values.category_id,
        name: values.name,
        email: values.email,
        phone: values.phone || undefined,
        cpf: values.cpf || undefined,
        status: values.status,
        form_data: values.form_data
      }
      if (editParticipant) {
        await axios.patch(
          `${API_URL}/events/${eventId}/participants/${editParticipant.id}`,
          payload,
          { headers: authHeaders() }
        )
        toast.success('Participante atualizado')
      } else {
        await axios.post(`${API_URL}/events/${eventId}/participants`, payload, {
          headers: authHeaders()
        })
        toast.success('Participante criado')
      }
      setFormOpen(false)
      setEditParticipant(null)
      await load()
    } catch (err: unknown) {
      const message = axios.isAxiosError(err)
        ? err.response?.data?.message ?? 'Erro ao salvar'
        : 'Erro ao salvar'
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (participant: Participant) => {
    if (!confirm(`Excluir participante "${participant.name}"?`)) return
    try {
      await axios.delete(
        `${API_URL}/events/${eventId}/participants/${participant.id}`,
        { headers: authHeaders() }
      )
      toast.success('Participante excluído')
      await load()
    } catch {
      toast.error('Erro ao excluir')
    }
  }

  const handleQuickQr = async (participant: Participant, download = false) => {
    try {
      const res = await axios.get(
        `${API_URL}/events/${eventId}/participants/${participant.id}/qr`,
        { headers: authHeaders() }
      )
      if (download) {
        const link = document.createElement('a')
        link.href = res.data.qr_image
        link.download = `qr-${participant.name.replace(/\s+/g, '-').toLowerCase()}.png`
        link.click()
      } else {
        setViewParticipant(participant)
      }
    } catch {
      toast.error('QR Code não disponível')
    }
  }

  const hasFilters = Boolean(search.trim() || statusFilter)
  const showEmptyState = participants.length === 0 && !hasFilters

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl">
        <EventBreadcrumb />
        <p className="text-gray-600">Carregando...</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl">
      <EventBreadcrumb />

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-[#0B1F3A]">Participantes</h1>
            <p className="text-gray-600 text-sm">{participants.length} participantes</p>
          </div>
          {canEdit && (
            <div className="flex gap-2">
              <button
                onClick={() => setImportOpen(true)}
                className="border border-[#00C896] text-[#00C896] px-4 py-2 rounded-lg text-sm"
              >
                Importar planilha
              </button>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow p-4 mb-6 flex flex-col sm:flex-row gap-3">
          <input
            placeholder="Buscar por nome, e-mail, CPF ou telefone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 px-3 py-2 border rounded-lg"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as ParticipantStatus | '')}
            className="px-3 py-2 border rounded-lg"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <button
            onClick={() => void load()}
            className="px-4 py-2 border rounded-lg text-sm"
          >
            Filtrar
          </button>
        </div>

        {showEmptyState ? (
          <div className="bg-white rounded-lg shadow p-10 text-center">
            <p className="text-lg font-semibold text-[#0B1F3A] mb-2">Nenhum participante cadastrado</p>
            <p className="text-gray-600 text-sm max-w-lg mx-auto mb-6">
              Adicione participantes manualmente, importe uma planilha ou utilize o formulário público de inscrição.
            </p>
            {canEdit && (
              <div className="flex flex-col sm:flex-row gap-2 justify-center">
                <Link
                  href={`/dashboard/events/${eventId}/forms`}
                  className="bg-[#00C896] text-white px-4 py-2 rounded-lg text-sm inline-block text-center"
                >
                  Formulários
                </Link>
                <button
                  onClick={() => setImportOpen(true)}
                  className="border border-[#00C896] text-[#00C896] px-4 py-2 rounded-lg text-sm"
                >
                  Importar planilha
                </button>
              </div>
            )}
          </div>
        ) : (
        <div className="bg-white rounded-lg shadow overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left">Nome</th>
                <th className="px-4 py-3 text-left">CPF</th>
                <th className="px-4 py-3 text-left">E-mail</th>
                <th className="px-4 py-3 text-left">Telefone</th>
                <th className="px-4 py-3 text-left">Formulário</th>
                <th className="px-4 py-3 text-left">Categoria</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Origem</th>
                <th className="px-4 py-3 text-left">QR</th>
                <th className="px-4 py-3 text-left">Ações</th>
              </tr>
            </thead>
            <tbody>
              {participants.length === 0 ? (
                <tr><td colSpan={10} className="px-4 py-8 text-center text-gray-500">Nenhum participante encontrado</td></tr>
              ) : (
                participants.map((p) => (
                  <tr key={p.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{p.name}</td>
                    <td className="px-4 py-3">{formatCpfDisplay(p.cpf)}</td>
                    <td className="px-4 py-3">{p.email ?? '—'}</td>
                    <td className="px-4 py-3">{p.phone || '—'}</td>
                    <td className="px-4 py-3">{p.registration_form?.name ?? '—'}</td>
                    <td className="px-4 py-3">{p.category?.name ?? '—'}</td>
                    <td className="px-4 py-3">{STATUS_LABELS[p.status]}</td>
                    <td className="px-4 py-3">{ORIGIN_LABELS[p.origin]}</td>
                    <td className="px-4 py-3">
                      {p.has_qr ? (
                        <div className="flex gap-1">
                          <button
                            onClick={() => setViewParticipant(p)}
                            className="text-[#00C896] text-xs"
                          >
                            Ver
                          </button>
                          <button
                            onClick={() => void handleQuickQr(p, true)}
                            className="text-[#00C896] text-xs"
                          >
                            Baixar
                          </button>
                        </div>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button onClick={() => setViewParticipant(p)} className="text-gray-600 text-xs">Visualizar</button>
                        {canEdit && (
                          <>
                            <button
                              onClick={() => {
                                setEditParticipant(p)
                                setFormOpen(true)
                              }}
                              className="text-[#00C896] text-xs"
                            >
                              Editar
                            </button>
                            <button onClick={() => void handleDelete(p)} className="text-red-500 text-xs">Excluir</button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        )}

      <ParticipantFormModalKeyed
        open={formOpen}
        categories={categories}
        formFields={[]}
        initial={editParticipant ? {
          id: editParticipant.id,
          name: editParticipant.name,
          email: editParticipant.email ?? '',
          phone: editParticipant.phone ?? '',
          cpf: editParticipant.cpf ?? '',
          category_id: editParticipant.category?.id ?? categories[0]?.id ?? '',
          status: editParticipant.status,
          form_data: editParticipant.form_data as Record<string, string | string[] | boolean>
        } : undefined}
        saving={saving}
        onClose={() => { if (!saving) { setFormOpen(false); setEditParticipant(null) } }}
        onSave={handleSave}
      />

      <ImportModal
        open={importOpen}
        eventId={eventId}
        registrationForms={registrationForms}
        onClose={() => setImportOpen(false)}
        onComplete={() => void load()}
      />

      <ViewParticipantModal
        open={!!viewParticipant}
        eventId={eventId}
        participant={viewParticipant}
        onClose={() => setViewParticipant(null)}
      />
    </div>
  )
}
