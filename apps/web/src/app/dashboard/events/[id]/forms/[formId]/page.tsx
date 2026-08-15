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
import { logFormSaveDev } from '@/lib/form-save-log'
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
import {
  publicFormUrl,
  type RegistrationFormSummary
} from '@/lib/registration-form-types'
import {
  validateFormSlugInput,
  normalizeFormSlug
} from '@/lib/form-appearance'
import {
  DEFAULT_FORM_DESIGN,
  isDesignV3,
  normalizeAppearance,
  validateFormDesign,
  type FormDesign
} from '@/lib/form-design'
import {
  DEFAULT_REDIRECT_DELAY,
  inferSuccessBehaviorFromLegacy,
  parseSuccessBehavior,
  validateSuccessSettings,
  type SuccessBehavior
} from '@/lib/success-behavior'
import { canManageEvents, getStoredUser } from '@/store/auth'
import { UnifiedFieldList } from '@/components/form-builder/UnifiedFieldList'
import { FormSettingsTab } from '@/components/form-builder/FormSettingsTab'
import { FormDesignTab } from '@/components/form-builder/FormDesignTab'
import { FormBuilderPreview } from '@/components/form-builder/FormBuilderPreview'
import { EventBreadcrumb } from '@/components/dashboard/EventBreadcrumb'
import {
  customDraftToFormField,
  FieldEditorModal,
  fieldsEqual,
  fieldToSavePayload,
  type CustomFieldDraft,
  type FieldEditorTarget
} from '@/components/form-builder/FieldEditorModal'

type TabKey = 'fields' | 'settings' | 'design'

interface FormDraft {
  name: string
  slug: string
  structuralConfig: StructuralConfig
  fieldLayout: FormLayoutEntry[]
  registrationLimit: number | null
  successBehavior: SuccessBehavior
  successTitle: string
  successMessage: string
  redirectUrl: string | null
  redirectDelay: number | null
  defaultCategoryId: string | null
  design: FormDesign
  publishedDesign: FormDesign | null
  publicTitle: string
  publicDescription: string
  submitButtonText: string
}

function draftFromForm(form: RegistrationFormSummary, fields: FormField[]): FormDraft {
  const structuralConfig = parseStructuralConfig(form.structural_config)
  return {
    name: form.name,
    slug: form.slug ?? '',
    structuralConfig,
    fieldLayout: parseFieldLayout(form.field_layout, structuralConfig, fields),
    registrationLimit: form.registration_limit,
    successBehavior: parseSuccessBehavior(form.success_behavior ?? inferSuccessBehaviorFromLegacy(form.redirect_url)),
    successTitle: form.success_title ?? '',
    successMessage: form.success_message ?? '',
    redirectUrl: form.redirect_url,
    redirectDelay: form.redirect_delay ?? DEFAULT_REDIRECT_DELAY,
    defaultCategoryId: form.default_category_id ?? null,
    design: normalizeAppearance(form.appearance) ?? DEFAULT_FORM_DESIGN,
    publishedDesign: normalizeAppearance(form.published_appearance ?? null),
    publicTitle: form.public_title ?? '',
    publicDescription: form.public_description ?? '',
    submitButtonText: form.submit_button_text ?? ''
  }
}

function settingsDraftEqual(a: FormDraft, b: FormDraft): boolean {
  return a.name === b.name
    && a.slug === b.slug
    && a.registrationLimit === b.registrationLimit
    && a.successBehavior === b.successBehavior
    && a.successTitle === b.successTitle
    && a.successMessage === b.successMessage
    && a.redirectUrl === b.redirectUrl
    && a.redirectDelay === b.redirectDelay
    && a.defaultCategoryId === b.defaultCategoryId
}

function designDraftEqual(a: FormDraft, b: FormDraft): boolean {
  return a.publicTitle === b.publicTitle
    && a.publicDescription === b.publicDescription
    && a.submitButtonText === b.submitButtonText
    && JSON.stringify(a.design) === JSON.stringify(b.design)
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
  return settingsDraftEqual(a, b)
    && designDraftEqual(a, b)
    && builderDraftEqual(a, b)
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
  const [eventName, setEventName] = useState('')
  const [fields, setFields] = useState<FormField[]>([])
  const [savedFields, setSavedFields] = useState<FormField[]>([])
  const [savedDraft, setSavedDraft] = useState<FormDraft | null>(null)
  const [draft, setDraft] = useState<FormDraft | null>(null)
  const [tab, setTab] = useState<TabKey>('fields')
  const [loading, setLoading] = useState(true)
  const [canEdit, setCanEdit] = useState(false)
  const [saving, setSaving] = useState(false)
  const [publishingDesign, setPublishingDesign] = useState(false)
  const [saveFeedback, setSaveFeedback] = useState<'saved' | 'error'>('saved')
  const [previewOpen, setPreviewOpen] = useState(false)
  const [editorTarget, setEditorTarget] = useState<FieldEditorTarget | null>(null)
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null)
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([])

  const isDesignPublished = useMemo(() => {
    if (!draft || !savedDraft || !form) return true
    if (!isDesignV3(form.appearance)) return true
    return JSON.stringify(draft.design) === JSON.stringify(savedDraft.publishedDesign)
  }, [draft, savedDraft, form])

  const isDirty = useMemo(
    () => !!(
      draft
      && savedDraft
      && (!draftsEqual(draft, savedDraft) || !fieldsSnapshotEqual(fields, savedFields))
    ),
    [draft, savedDraft, fields, savedFields]
  )

  const load = useCallback(async () => {
    const [formRes, fieldsRes, categoriesRes, eventRes] = await Promise.all([
      axios.get(`${API_URL}/events/${eventId}/registration-forms/${formId}`, { headers: authHeaders() }),
      axios.get(`${API_URL}/events/${eventId}/registration-forms/${formId}/form-fields`, { headers: authHeaders() }),
      axios.get(`${API_URL}/events/${eventId}/categories`, { headers: authHeaders() }),
      axios.get(`${API_URL}/events/${eventId}`, { headers: authHeaders() })
    ])
    const nextForm = formRes.data as RegistrationFormSummary
    const nextFields = (fieldsRes.data as FormField[]).map((field) => ({
      ...field,
      enabled: field.enabled !== false
    }))
    const nextDraft = draftFromForm(nextForm, nextFields)
    setForm(nextForm)
    setEventName(eventRes.data.name ?? '')
    setFields(nextFields)
    setSavedFields(nextFields)
    setSavedDraft(nextDraft)
    setDraft(nextDraft)
    setCategories(categoriesRes.data)
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

  const handleSave = async () => {
    if (!draft || !savedDraft || !canEdit) return
    setSaving(true)

    const normalizedSettings = normalizeFormSettingsForSave({
      name: draft.name,
      registrationLimit: draft.registrationLimit,
      redirectUrl: null,
      limitEnabled: draft.registrationLimit !== null
    })
    const settingsValidationError = validateNormalizedFormSettings(normalizedSettings)
    if (settingsValidationError) {
      setSaving(false)
      toast.error(settingsValidationError)
      return
    }

    const successValidationError = validateSuccessSettings({
      successBehavior: draft.successBehavior,
      successTitle: draft.successTitle,
      successMessage: draft.successMessage,
      redirectUrl: draft.redirectUrl,
      redirectDelay: draft.redirectDelay
    })
    if (successValidationError) {
      setSaving(false)
      toast.error(successValidationError)
      return
    }

    if (draft.slug.trim()) {
      const slugError = validateFormSlugInput(draft.slug)
      if (slugError) {
        setSaving(false)
        toast.error(slugError)
        return
      }
    }

    const designValidation = validateFormDesign(draft.design)
    if (!designValidation.ok) {
      setSaving(false)
      toast.error(designValidation.message)
      return
    }

    const currentIds = new Set(fields.map((field) => field.id))
    const deletedFieldIds = savedFields
      .filter((field) => !currentIds.has(field.id))
      .map((field) => field.id)

    const nextLayout = normalizeFieldLayoutForSave(
      draft.fieldLayout.filter((entry) =>
        entry.kind !== 'custom' || !deletedFieldIds.includes(entry.field_id)
      ),
      draft.structuralConfig,
      fields.filter((field) => !deletedFieldIds.includes(field.id))
    )

    const requestBody = {
      name: normalizedSettings.name,
      structural_config: draft.structuralConfig,
      field_layout: nextLayout,
      registration_limit: normalizedSettings.registrationLimit,
      success_behavior: draft.successBehavior,
      success_title: draft.successTitle.trim() || null,
      success_message: draft.successMessage.trim() || null,
      redirect_url: draft.successBehavior === 'message' ? null : draft.redirectUrl,
      redirect_delay: draft.successBehavior === 'message_redirect' ? draft.redirectDelay : null,
      default_category_id: draft.defaultCategoryId,
      slug: draft.slug.trim() ? normalizeFormSlug(draft.slug) : null,
      public_title: draft.publicTitle.trim() || null,
      public_description: draft.publicDescription.trim() || null,
      submit_button_text: draft.submitButtonText.trim() || null,
      appearance: draft.design,
      fields: fields.map((field) => ({
        id: field.id,
        ...fieldToSavePayload(field)
      })),
      deleted_field_ids: deletedFieldIds
    }

    const url = `${API_URL}/events/${eventId}/registration-forms/${formId}/builder`

    try {
      const res = await axios.put(url, requestBody, { headers: authHeaders() })
      logFormSaveDev({
        phase: 'builder-save',
        method: 'PUT',
        url,
        requestBody,
        status: res.status,
        responseBody: res.data
      })

      try {
        await load()
      } catch (reloadErr) {
        logFormSaveDev({
          phase: 'reload',
          method: 'GET',
          url,
          message: reloadErr instanceof Error ? reloadErr.message : 'reload failed'
        })
        toast.error(resolveFormSaveError(reloadErr, 'reload'))
        setSaveFeedback('error')
        return
      }

      toast.success('Alterações salvas')
      setSaveFeedback('saved')
    } catch (err: unknown) {
      logFormSaveDev({
        phase: 'builder-save',
        method: 'PUT',
        url,
        requestBody,
        status: axios.isAxiosError(err) ? err.response?.status : undefined,
        responseBody: axios.isAxiosError(err) ? err.response?.data : undefined,
        message: axios.isAxiosError(err) ? err.message : undefined
      })
      setSaveFeedback('error')
      toast.error(resolveFormSaveError(err, 'builder-save'))
    } finally {
      setSaving(false)
    }
  }

  const handlePublishDesign = async () => {
    if (!canEdit || !form || !draft) return
    if (isDirty) {
      toast.error('Salve as alterações antes de publicar o design')
      return
    }
    setPublishingDesign(true)
    try {
      await axios.post(
        `${API_URL}/events/${eventId}/registration-forms/${formId}/publish-design`,
        {},
        { headers: authHeaders() }
      )
      await load()
      toast.success('Design publicado')
    } catch (err: unknown) {
      const message = axios.isAxiosError(err)
        ? err.response?.data?.message ?? 'Erro ao publicar design'
        : 'Erro ao publicar design'
      toast.error(message)
    } finally {
      setPublishingDesign(false)
    }
  }

  const handlePublish = async () => {
    if (!canEdit || !form) return
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
      await navigator.clipboard.writeText(publicFormUrl(form))
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

  const applyCustomField = (fieldId: string | null, fieldDraft: CustomFieldDraft) => {
    if (fieldId) {
      setFields((current) => current.map((field) =>
        field.id === fieldId
          ? customDraftToFormField(fieldDraft, field)
          : field
      ))
      return
    }

    const created = customDraftToFormField(fieldDraft)
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

  const switchTab = (nextTab: TabKey) => {
    if (isDirty) {
      setPendingNavigation(`tab:${nextTab}`)
      return
    }
    setTab(nextTab)
  }

  if (loading || !form || !draft || !savedDraft) {
    return <div className="p-8">Carregando...</div>
  }

  const statusLabel = form.status === 'active'
    ? 'Publicado'
    : formStatusLabel(form.status)

  const editStatusLabel = saving
    ? 'Salvando...'
    : saveFeedback === 'error'
      ? 'Erro ao salvar'
      : isDirty
        ? '● Alterações não salvas'
        : 'Salvo ✓'

  const designStatusLabel = !isDesignPublished
    ? '● Alterações não publicadas'
    : '✓ Design publicado'

  return (
    <div>
      <div className="sticky top-0 z-20 border-b bg-white -mx-4 px-4 md:-mx-8 md:px-8">
        <div className="mx-auto max-w-6xl py-6">
          <EventBreadcrumb extra={[{ label: 'Formulários', href: `/dashboard/events/${eventId}/forms` }, { label: draft.name }]} />

          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-[#0B1F3A]">{draft.name}</h1>
              <div className="mt-2 flex flex-wrap gap-3 text-sm">
                <span className="rounded-full bg-gray-100 px-3 py-1">{statusLabel}</span>
                <span className={`rounded-full px-3 py-1 ${
                  isDirty ? 'bg-amber-100 text-amber-800' : saveFeedback === 'error' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-800'
                }`}>
                  {editStatusLabel}
                </span>
                <span className={`rounded-full px-3 py-1 ${
                  !isDesignPublished ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800'
                }`}>
                  {designStatusLabel}
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
              {canEdit && !isDesignPublished && (
                <button
                  type="button"
                  onClick={() => void handlePublishDesign()}
                  disabled={isDirty || publishingDesign}
                  className="rounded-lg border border-[#0B1F3A] px-4 py-2 text-sm disabled:opacity-50"
                >
                  {publishingDesign ? 'Publicando...' : 'Publicar design'}
                </button>
              )}
              {canEdit && (
                <button
                  type="button"
                  onClick={() => void handleSave()}
                  disabled={!isDirty || saving}
                  className="rounded-lg bg-[#00C896] px-4 py-2 text-sm text-white disabled:opacity-50"
                >
                  {saving ? 'Salvando...' : 'Salvar'}
                </button>
              )}
            </div>
          </div>

          <div className="mt-6 flex gap-2">
            {(['fields', 'settings', 'design'] as const).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => switchTab(key)}
                className={`rounded-lg px-4 py-2 text-sm capitalize ${tab === key ? 'bg-[#0B1F3A] text-white' : 'bg-gray-100'}`}
              >
                {key === 'fields' ? 'Campos' : key === 'settings' ? 'Configurações' : 'Design'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-0 py-8">
        {tab === 'fields' && (
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
        )}

        {tab === 'settings' && (
          <FormSettingsTab
            formName={draft.name}
            slug={draft.slug}
            publicId={form.public_id}
            registrationLimit={draft.registrationLimit}
            successBehavior={draft.successBehavior}
            successTitle={draft.successTitle}
            successMessage={draft.successMessage}
            redirectUrl={draft.redirectUrl}
            redirectDelay={draft.redirectDelay}
            defaultCategoryId={draft.defaultCategoryId}
            categories={categories}
            activeRegistrationCount={form.active_registration_count}
            availableSlots={form.available_slots}
            isFull={form.is_full}
            disabled={!canEdit}
            onChange={(values) => setDraft((current) => current ? {
              ...current,
              name: values.formName,
              slug: values.slug,
              registrationLimit: values.registrationLimit,
              successBehavior: values.successBehavior,
              successTitle: values.successTitle,
              successMessage: values.successMessage,
              redirectUrl: values.redirectUrl,
              redirectDelay: values.redirectDelay,
              defaultCategoryId: values.defaultCategoryId
            } : current)}
          />
        )}

        {tab === 'design' && (
          <FormDesignTab
            design={draft.design}
            publicTitle={draft.publicTitle}
            publicDescription={draft.publicDescription}
            submitButtonText={draft.submitButtonText}
            formName={draft.name}
            eventName={eventName || 'Evento'}
            eventId={eventId}
            formId={formId}
            structuralConfig={draft.structuralConfig}
            formFields={fields}
            fieldLayout={draft.fieldLayout}
            categories={categories}
            disabled={!canEdit}
            onChange={(values) => setDraft((current) => current ? {
              ...current,
              design: values.design,
              publicTitle: values.publicTitle,
              publicDescription: values.publicDescription,
              submitButtonText: values.submitButtonText
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
        formName={draft.publicTitle.trim() || draft.name}
        structuralConfig={draft.structuralConfig}
        formFields={fields}
        fieldLayout={draft.fieldLayout}
        onClose={() => setPreviewOpen(false)}
      />

      {pendingNavigation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h2 className="mb-2 text-lg font-bold text-[#0B1F3A]">Alterações não salvas</h2>
            <p className="mb-6 text-sm text-gray-600">Você possui alterações não salvas.</p>
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
