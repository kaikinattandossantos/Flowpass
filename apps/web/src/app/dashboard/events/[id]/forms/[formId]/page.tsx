'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import axios from 'axios'
import toast from 'react-hot-toast'
import { API_URL, authHeaders } from '@/lib/api'
import { FormField } from '@/lib/form-field-types'
import {
  FormLayoutEntry,
  normalizeFieldLayoutForSave,
  parseFieldLayout,
  syncLayoutWithStructuralChanges
} from '@/lib/field-layout'
import { resolveFormSaveError } from '@/lib/form-save-errors'
import {
  normalizeFormSettingsForSave,
  validateNormalizedFormSettings
} from '@/lib/form-settings-normalize'
import {
  formStatusLabel,
  parseStructuralConfig,
  type StructuralConfig,
  type StructuralFieldKey
} from '@/lib/structural-config'
import { publicFormUrl, type RegistrationFormSummary } from '@/lib/registration-form-types'
import { canManageEvents, getStoredUser } from '@/store/auth'
import { UnifiedFieldList } from '@/components/form-builder/UnifiedFieldList'
import { FormSettingsTab } from '@/components/form-builder/FormSettingsTab'
import { FormBuilderPreview } from '@/components/form-builder/FormBuilderPreview'
import {
  customDraftToFormField,
  FieldEditorModal,
  fieldsEqual,
  fieldToSavePayload,
  type CustomFieldDraft,
  type FieldEditorTarget
} from '@/components/form-builder/FieldEditorModal'

type TabKey = 'fields' | 'settings'

interface FormDraft {
  name: string
  structuralConfig: StructuralConfig
  fieldLayout: FormLayoutEntry[]
  registrationLimit: number | null
  redirectUrl: string | null
}

function draftFromForm(form: RegistrationFormSummary, fields: FormField[]): FormDraft {
  const structuralConfig = parseStructuralConfig(form.structural_config)
  return {
    name: form.name,
    structuralConfig,
    fieldLayout: parseFieldLayout(form.field_layout, structuralConfig, fields),
    registrationLimit: form.registration_limit,
    redirectUrl: form.redirect_url
  }
}

function settingsDraftEqual(a: FormDraft, b: FormDraft): boolean {
  return a.name === b.name
    && a.registrationLimit === b.registrationLimit
    && a.redirectUrl === b.redirectUrl
}

function builderDraftEqual(a: FormDraft, b: FormDraft): boolean {
  return JSON.stringify({
    structuralConfig: a.structuralConfig,
    fieldLayout: a.fieldLayout
  }) === JSON.stringify({
    structuralConfig: b.structuralConfig,
    fieldLayout: b.fieldLayout
  })
}

function draftsEqual(a: FormDraft, b: FormDraft): boolean {
  return settingsDraftEqual(a, b) && builderDraftEqual(a, b)
}

function fieldsSnapshotEqual(a: FormField[], b: FormField[]): boolean {
  if (a.length !== b.length) return false
  const mapB = new Map(b.map((field) => [field.id, field]))
  return a.every((field) => {
    const other = mapB.get(field.id)
    return other && fieldsEqual(field, other)
  })
}

export default function RegistrationFormBuilderPage() {
  const params = useParams()
  const router = useRouter()
  const eventId = params.id as string
  const formId = params.formId as string

  const [form, setForm] = useState<RegistrationFormSummary | null>(null)
  const [fields, setFields] = useState<FormField[]>([])
  const [savedFields, setSavedFields] = useState<FormField[]>([])
  const [savedDraft, setSavedDraft] = useState<FormDraft | null>(null)
  const [draft, setDraft] = useState<FormDraft | null>(null)
  const [tab, setTab] = useState<TabKey>('fields')
  const [loading, setLoading] = useState(true)
  const [canEdit, setCanEdit] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveFeedback, setSaveFeedback] = useState<'saved' | 'error'>('saved')
  const [previewOpen, setPreviewOpen] = useState(false)
  const [editorTarget, setEditorTarget] = useState<FieldEditorTarget | null>(null)
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null)

  const isDirty = useMemo(
    () => !!(
      draft
      && savedDraft
      && (!draftsEqual(draft, savedDraft) || !fieldsSnapshotEqual(fields, savedFields))
    ),
    [draft, savedDraft, fields, savedFields]
  )

  const load = useCallback(async () => {
    const [formRes, fieldsRes] = await Promise.all([
      axios.get(`${API_URL}/events/${eventId}/registration-forms/${formId}`, { headers: authHeaders() }),
      axios.get(`${API_URL}/events/${eventId}/registration-forms/${formId}/form-fields`, { headers: authHeaders() })
    ])
    const nextForm = formRes.data as RegistrationFormSummary
    const nextFields = (fieldsRes.data as FormField[]).map((field) => ({
      ...field,
      enabled: field.enabled !== false
    }))
    const nextDraft = draftFromForm(nextForm, nextFields)
    setForm(nextForm)
    setFields(nextFields)
    setSavedFields(nextFields)
    setSavedDraft(nextDraft)
    setDraft(nextDraft)
    setSaveFeedback('saved')
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

  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (!isDirty) return
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [isDirty])

  const navigateAway = (path: string) => {
    if (isDirty) {
      setPendingNavigation(path)
      return
    }
    router.push(path)
  }

  const handleSave = async () => {
    if (!draft || !savedDraft || !canEdit) return
    setSaving(true)

    const settingsOnly = settingsDraftEqual(draft, savedDraft)
      && builderDraftEqual(draft, savedDraft)
      && fieldsSnapshotEqual(fields, savedFields)
    const builderChanged = !builderDraftEqual(draft, savedDraft) || !fieldsSnapshotEqual(fields, savedFields)

    const normalizedSettings = normalizeFormSettingsForSave({
      name: draft.name,
      registrationLimit: draft.registrationLimit,
      redirectUrl: draft.redirectUrl,
      limitEnabled: draft.registrationLimit !== null
    })
    const settingsValidationError = validateNormalizedFormSettings(normalizedSettings)
    if (settingsValidationError) {
      setSaving(false)
      toast.error(settingsValidationError)
      return
    }

    try {
      if (settingsOnly || !builderChanged) {
        await axios.patch(
          `${API_URL}/events/${eventId}/registration-forms/${formId}`,
          {
            name: normalizedSettings.name,
            registration_limit: normalizedSettings.registrationLimit,
            redirect_url: normalizedSettings.redirectUrl
          },
          { headers: authHeaders() }
        )
      } else {
        const savedIds = new Set(savedFields.map((field) => field.id))
        const currentIds = new Set(fields.map((field) => field.id))
        const deletedFieldIds = savedFields
          .filter((field) => !currentIds.has(field.id))
          .map((field) => field.id)
        let nextFields = [...fields]
        let nextLayout = normalizeFieldLayoutForSave(
          draft.fieldLayout.filter((entry) =>
            entry.kind !== 'custom' || !deletedFieldIds.includes(entry.field_id)
          ),
          draft.structuralConfig,
          nextFields
        )

        for (const fieldId of deletedFieldIds) {
          await axios.delete(
            `${API_URL}/events/${eventId}/registration-forms/${formId}/form-fields/${fieldId}`,
            { headers: authHeaders() }
          )
        }

        for (const field of nextFields) {
          const payload = fieldToSavePayload(field)

          if (!savedIds.has(field.id)) {
            const res = await axios.post(
              `${API_URL}/events/${eventId}/registration-forms/${formId}/form-fields`,
              payload,
              { headers: authHeaders() }
            )
            const created = res.data as FormField
            nextFields = nextFields.map((item) => item.id === field.id ? { ...created, enabled: created.enabled !== false } : item)
            nextLayout = nextLayout.map((entry) =>
              entry.kind === 'custom' && entry.field_id === field.id
                ? { kind: 'custom', field_id: created.id }
                : entry
            )
          } else {
            const saved = savedFields.find((item) => item.id === field.id)
            if (saved && !fieldsEqual(field, saved)) {
              await axios.patch(
                `${API_URL}/events/${eventId}/registration-forms/${formId}/form-fields/${field.id}`,
                payload,
                { headers: authHeaders() }
              )
            }
          }
        }

        nextLayout = normalizeFieldLayoutForSave(nextLayout, draft.structuralConfig, nextFields)

        const patchBody: Record<string, unknown> = {
          name: normalizedSettings.name,
          structural_config: draft.structuralConfig,
          field_layout: nextLayout
        }

        if (!settingsDraftEqual(draft, savedDraft)) {
          patchBody.registration_limit = normalizedSettings.registrationLimit
          patchBody.redirect_url = normalizedSettings.redirectUrl
        }

        await axios.patch(
          `${API_URL}/events/${eventId}/registration-forms/${formId}`,
          patchBody,
          { headers: authHeaders() }
        )
      }

      try {
        await load()
      } catch (reloadErr) {
        toast.error(resolveFormSaveError(reloadErr, 'reload'))
        setSaveFeedback('error')
        return
      }

      toast.success('Alterações salvas')
      setSaveFeedback('saved')
    } catch (err: unknown) {
      setSaveFeedback('error')
      const phase = axios.isAxiosError(err)
        ? err.config?.url?.includes('/form-fields')
          ? err.config.method === 'post'
            ? 'field-create'
            : err.config.method === 'patch'
              ? 'field-update'
              : 'field-delete'
          : 'form-settings'
        : 'form-settings'
      toast.error(resolveFormSaveError(err, phase))
    } finally {
      setSaving(false)
    }
  }

  const handlePublish = async () => {
    if (!canEdit) return
    if (isDirty) {
      toast.error('Salve as alterações antes de publicar')
      return
    }
    try {
      await axios.post(
        `${API_URL}/events/${eventId}/registration-forms/${formId}/publish`,
        {},
        { headers: authHeaders() }
      )
      await load()
      toast.success('Formulário publicado')
    } catch (err: unknown) {
      const message = axios.isAxiosError(err)
        ? err.response?.data?.message ?? 'Erro ao publicar formulário'
        : 'Erro ao publicar formulário'
      toast.error(message)
    }
  }

  const handleCopyLink = async () => {
    if (!form) return
    try {
      await navigator.clipboard.writeText(publicFormUrl(form.public_id))
      toast.success(form.status === 'active' ? 'Link copiado' : 'Link copiado (formulário ainda não publicado)')
    } catch {
      toast.error('Não foi possível copiar o link')
    }
  }

  const updateStructuralField = (key: StructuralFieldKey, value: StructuralConfig[StructuralFieldKey]) => {
    setDraft((current) => {
      if (!current) return current
      const structuralConfig = {
        ...current.structuralConfig,
        [key]: value
      }
      return {
        ...current,
        structuralConfig,
        fieldLayout: syncLayoutWithStructuralChanges(current.fieldLayout, structuralConfig, fields)
      }
    })
  }

  const applyCustomField = (fieldId: string | null, draft: CustomFieldDraft) => {
    if (fieldId) {
      setFields((current) => current.map((field) =>
        field.id === fieldId
          ? customDraftToFormField(draft, field)
          : field
      ))
      return
    }

    const created = customDraftToFormField(draft)
    setFields((current) => [...current, { ...created, order: current.length }])
    setDraft((current) => current ? {
      ...current,
      fieldLayout: [...current.fieldLayout, { kind: 'custom', field_id: created.id }]
    } : current)
  }

  const removeCustomField = (field: FormField) => {
    setFields((current) => current.filter((item) => item.id !== field.id))
    setDraft((current) => current ? {
      ...current,
      fieldLayout: current.fieldLayout.filter((entry) => entry.kind !== 'custom' || entry.field_id !== field.id)
    } : current)
  }

  if (loading || !form || !draft || !savedDraft) {
    return <div className="p-8">Carregando...</div>
  }

  const editStatusLabel = saving
    ? 'Salvando...'
    : saveFeedback === 'error'
      ? 'Erro ao salvar'
      : isDirty
        ? 'Alterações não salvas'
        : 'Salvo ✓'

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="border-b bg-white">
        <div className="max-w-6xl mx-auto px-8 py-6">
          <button
            type="button"
            onClick={() => navigateAway(`/dashboard/events/${eventId}/forms`)}
            className="text-[#00C896] mb-3 text-sm"
          >
            ← Formulários
          </button>

          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm text-gray-500">Formulário: {draft.name}</p>
              <h1 className="text-2xl font-bold text-[#0B1F3A]">{draft.name}</h1>
              <div className="mt-2 flex flex-wrap gap-3 text-sm">
                <span className="rounded-full bg-gray-100 px-3 py-1">{formStatusLabel(form.status)}</span>
                <span className={`rounded-full px-3 py-1 ${
                  isDirty ? 'bg-amber-100 text-amber-800' : saveFeedback === 'error' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-800'
                }`}>
                  {editStatusLabel}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => setPreviewOpen(true)} className="rounded-lg border px-4 py-2 text-sm">
                Visualizar
              </button>
              <button type="button" onClick={() => void handleCopyLink()} className="rounded-lg border px-4 py-2 text-sm">
                Copiar link
              </button>
              {canEdit && form.status === 'draft' && (
                <button type="button" onClick={() => void handlePublish()} className="rounded-lg border border-[#0B1F3A] px-4 py-2 text-sm">
                  Publicar formulário
                </button>
              )}
              {canEdit && (
                <button
                  type="button"
                  onClick={() => void handleSave()}
                  disabled={!isDirty || saving}
                  className="rounded-lg bg-[#00C896] px-4 py-2 text-sm text-white disabled:opacity-50"
                >
                  {saving ? 'Salvando...' : 'Salvar alterações'}
                </button>
              )}
            </div>
          </div>

          <div className="mt-6 flex gap-2">
            <button
              type="button"
              onClick={() => {
                if (isDirty) {
                  setPendingNavigation('tab:fields')
                  return
                }
                setTab('fields')
              }}
              className={`rounded-lg px-4 py-2 text-sm ${tab === 'fields' ? 'bg-[#0B1F3A] text-white' : 'bg-gray-100'}`}
            >
              Campos
            </button>
            <button
              type="button"
              onClick={() => {
                if (isDirty) {
                  setPendingNavigation('tab:settings')
                  return
                }
                setTab('settings')
              }}
              className={`rounded-lg px-4 py-2 text-sm ${tab === 'settings' ? 'bg-[#0B1F3A] text-white' : 'bg-gray-100'}`}
            >
              Configurações
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-8 py-8">
        {tab === 'fields' ? (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-[#0B1F3A]">Campos do formulário</h2>
                <p className="text-sm text-gray-600">
                  Arraste para reordenar. Campos não exibidos permanecem na lista para reativação.
                </p>
              </div>
              {canEdit && (
                <button
                  type="button"
                  onClick={() => setEditorTarget({ kind: 'custom', field: null })}
                  className="rounded-lg bg-[#00C896] px-4 py-2 text-sm text-white"
                >
                  + Adicionar campo
                </button>
              )}
            </div>

            <UnifiedFieldList
              structuralConfig={draft.structuralConfig}
              formFields={fields}
              fieldLayout={draft.fieldLayout}
              canEdit={canEdit}
              onLayoutChange={(fieldLayout) => setDraft((current) => current ? { ...current, fieldLayout } : current)}
              onEditStructural={(key) => setEditorTarget({ kind: 'structural', key })}
              onEditCustom={(field) => setEditorTarget({ kind: 'custom', field })}
            />
          </div>
        ) : (
          <FormSettingsTab
            formName={draft.name}
            registrationLimit={draft.registrationLimit}
            redirectUrl={draft.redirectUrl}
            activeRegistrationCount={form.active_registration_count}
            availableSlots={form.available_slots}
            isFull={form.is_full}
            disabled={!canEdit}
            onChange={(values) => setDraft((current) => current ? {
              ...current,
              name: values.formName,
              registrationLimit: values.registrationLimit,
              redirectUrl: values.redirectUrl
            } : current)}
          />
        )}
      </div>

      <FieldEditorModal
        open={!!editorTarget}
        target={editorTarget}
        structuralConfig={draft.structuralConfig}
        onClose={() => setEditorTarget(null)}
        onApplyStructural={updateStructuralField}
        onApplyCustom={applyCustomField}
        onDeleteCustom={canEdit ? removeCustomField : undefined}
      />

      <FormBuilderPreview
        open={previewOpen}
        formName={draft.name}
        structuralConfig={draft.structuralConfig}
        formFields={fields}
        fieldLayout={draft.fieldLayout}
        onClose={() => setPreviewOpen(false)}
      />

      {pendingNavigation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h2 className="text-lg font-bold text-[#0B1F3A] mb-2">Alterações não salvas</h2>
            <p className="text-sm text-gray-600 mb-6">Você possui alterações não salvas.</p>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setPendingNavigation(null)} className="rounded-lg border px-4 py-2 text-sm">
                Continuar editando
              </button>
              <button
                type="button"
                onClick={() => {
                  const target = pendingNavigation
                  setPendingNavigation(null)
                  if (target?.startsWith('tab:')) {
                    setTab(target.replace('tab:', '') as TabKey)
                    return
                  }
                  if (target) router.push(target)
                }}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm text-white"
              >
                Sair sem salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
