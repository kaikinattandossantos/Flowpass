'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import axios from 'axios'
import toast from 'react-hot-toast'
import { API_URL, authHeaders } from '@/lib/api'
import { FormField, sortFormFields } from '@/lib/form-field-types'
import { parseStructuralConfig, type StructuralConfig } from '@/lib/structural-config'
import { publicFormUrl, type RegistrationFormSummary } from '@/lib/registration-form-types'
import { canManageEvents, getStoredUser } from '@/store/auth'
import { FormFieldList } from '@/components/form-builder/FormFieldList'
import { FormFieldPreview } from '@/components/form-builder/FormFieldPreview'
import { FormFieldEditor, draftToPayload, FormFieldDraft } from '@/components/form-builder/FormFieldEditor'
import { StructuralFieldsEditor } from '@/components/form-builder/StructuralFieldsEditor'

export default function RegistrationFormBuilderPage() {
  const params = useParams()
  const router = useRouter()
  const eventId = params.id as string
  const formId = params.formId as string

  const [form, setForm] = useState<RegistrationFormSummary | null>(null)
  const [fields, setFields] = useState<FormField[]>([])
  const [structuralConfig, setStructuralConfig] = useState<StructuralConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [canEdit, setCanEdit] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingField, setEditingField] = useState<FormField | null>(null)
  const [saving, setSaving] = useState(false)
  const [savingStructural, setSavingStructural] = useState(false)

  const load = useCallback(async () => {
    const [formRes, fieldsRes] = await Promise.all([
      axios.get(`${API_URL}/events/${eventId}/registration-forms/${formId}`, { headers: authHeaders() }),
      axios.get(`${API_URL}/events/${eventId}/registration-forms/${formId}/form-fields`, { headers: authHeaders() })
    ])
    setForm(formRes.data)
    setStructuralConfig(parseStructuralConfig(formRes.data.structural_config))
    setFields(fieldsRes.data)
  }, [eventId, formId])

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
        toast.error('Erro ao carregar formulário')
      } finally {
        setCanEdit(canManageEvents(user.role))
        setLoading(false)
      }
    })()
  }, [eventId, formId, router, load])

  const handleSaveField = async (draft: FormFieldDraft) => {
    setSaving(true)
    try {
      const payload = draftToPayload(draft)
      if (editingField) {
        await axios.patch(
          `${API_URL}/events/${eventId}/registration-forms/${formId}/form-fields/${editingField.id}`,
          payload,
          { headers: authHeaders() }
        )
        toast.success('Campo atualizado')
      } else {
        await axios.post(
          `${API_URL}/events/${eventId}/registration-forms/${formId}/form-fields`,
          payload,
          { headers: authHeaders() }
        )
        toast.success('Campo criado')
      }
      setEditorOpen(false)
      setEditingField(null)
      await load()
    } catch (err: unknown) {
      const message = axios.isAxiosError(err)
        ? err.response?.data?.message ?? 'Erro ao salvar campo'
        : 'Erro ao salvar campo'
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  const handleSaveStructural = async () => {
    if (!structuralConfig) return
    setSavingStructural(true)
    try {
      await axios.patch(
        `${API_URL}/events/${eventId}/registration-forms/${formId}`,
        { structural_config: structuralConfig },
        { headers: authHeaders() }
      )
      toast.success('Formulário atualizado')
      await load()
    } catch {
      toast.error('Erro ao salvar configuração')
    } finally {
      setSavingStructural(false)
    }
  }

  const handleDelete = async (field: FormField) => {
    if (!confirm(`Excluir o campo "${field.label}"?`)) return
    setBusyId(field.id)
    try {
      await axios.delete(
        `${API_URL}/events/${eventId}/registration-forms/${formId}/form-fields/${field.id}`,
        { headers: authHeaders() }
      )
      toast.success('Campo excluído')
      await load()
    } catch {
      toast.error('Erro ao excluir campo')
    } finally {
      setBusyId(null)
    }
  }

  const handleMove = async (field: FormField, direction: 'up' | 'down') => {
    const sorted = sortFormFields(fields)
    const index = sorted.findIndex((f) => f.id === field.id)
    const swapIndex = direction === 'up' ? index - 1 : index + 1
    if (swapIndex < 0 || swapIndex >= sorted.length) return

    const reordered = [...sorted]
    ;[reordered[index], reordered[swapIndex]] = [reordered[swapIndex], reordered[index]]

    setBusyId(field.id)
    try {
      await axios.patch(
        `${API_URL}/events/${eventId}/registration-forms/${formId}/form-fields/reorder`,
        { fields: reordered.map((f, i) => ({ id: f.id, order: i })) },
        { headers: authHeaders() }
      )
      await load()
    } catch {
      toast.error('Erro ao reordenar')
    } finally {
      setBusyId(null)
    }
  }

  const handleCopyLink = async () => {
    if (!form) return
    try {
      await navigator.clipboard.writeText(publicFormUrl(form.public_id))
      toast.success('Link copiado')
    } catch {
      toast.error('Não foi possível copiar o link')
    }
  }

  if (loading || !form || !structuralConfig) return <div className="p-8">Carregando...</div>

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <button
          onClick={() => router.push(`/dashboard/events/${eventId}/forms`)}
          className="text-[#00C896] mb-4"
        >
          ← Voltar aos formulários
        </button>

        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-[#0B1F3A]">{form.name}</h1>
            <p className="text-gray-600 text-sm mt-1">Configure os campos deste formulário.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => void handleCopyLink()} className="border border-[#00C896] text-[#00C896] px-4 py-2 rounded-lg text-sm">
              Copiar link
            </button>
            {canEdit && (
              <button
                onClick={() => { setEditingField(null); setEditorOpen(true) }}
                className="bg-[#00C896] text-white px-4 py-2 rounded-lg text-sm"
              >
                + Adicionar campo
              </button>
            )}
          </div>
        </div>

        <div className="space-y-8">
          <section className="bg-white rounded-lg shadow p-5 space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="font-semibold text-[#0B1F3A]">Campos estruturais</h2>
                <p className="text-sm text-gray-600">Escolha quais informações básicas serão solicitadas.</p>
              </div>
              {canEdit && (
                <button
                  onClick={() => void handleSaveStructural()}
                  disabled={savingStructural}
                  className="px-4 py-2 border rounded-lg text-sm disabled:opacity-50"
                >
                  {savingStructural ? 'Salvando...' : 'Salvar campos estruturais'}
                </button>
              )}
            </div>
            <StructuralFieldsEditor
              value={structuralConfig}
              onChange={setStructuralConfig}
              disabled={!canEdit}
            />
          </section>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <FormFieldList
              fields={fields}
              canEdit={canEdit}
              busyId={busyId}
              onEdit={(field) => { setEditingField(field); setEditorOpen(true) }}
              onDelete={handleDelete}
              onMove={handleMove}
            />
            <FormFieldPreview fields={fields} structuralConfig={structuralConfig} />
          </div>
        </div>
      </div>

      <FormFieldEditor
        open={editorOpen}
        initial={editingField}
        saving={saving}
        onClose={() => { if (!saving) { setEditorOpen(false); setEditingField(null) } }}
        onSave={handleSaveField}
      />
    </div>
  )
}
