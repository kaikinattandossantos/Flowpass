'use client'

import { useState } from 'react'
import {
  FormField,
  FormFieldType,
  FIELD_TYPE_OPTIONS,
  typeRequiresOptions,
  typeUsesOptions
} from '@/lib/form-field-types'
import { structuralFieldTypeLabel } from '@/lib/field-layout'
import {
  STRUCTURAL_FIELD_LABELS,
  type StructuralConfig,
  type StructuralFieldKey
} from '@/lib/structural-config'

export type FieldEditorTarget =
  | { kind: 'structural'; key: StructuralFieldKey }
  | { kind: 'custom'; field: FormField | null }

export interface CustomFieldDraft {
  label: string
  type: FormFieldType
  required: boolean
  enabled: boolean
  placeholder: string
  options: string[]
}

export interface StructuralFieldDraft {
  label: string
  enabled: boolean
  required: boolean
}

interface FieldEditorModalProps {
  open: boolean
  target: FieldEditorTarget | null
  structuralConfig: StructuralConfig
  onClose: () => void
  onApplyStructural: (key: StructuralFieldKey, value: StructuralConfig[StructuralFieldKey]) => void
  onApplyCustom: (fieldId: string | null, draft: CustomFieldDraft) => void
  onDeleteCustom?: (field: FormField) => void
}

function Toggle({
  checked,
  disabled,
  onChange,
  id
}: {
  checked: boolean
  disabled?: boolean
  onChange: (value: boolean) => void
  id: string
}) {
  return (
    <button
      type="button"
      id={id}
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition ${
        disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
      } ${checked ? 'bg-[#00C896]' : 'bg-gray-300'}`}
    >
      <span
        className={`inline-block h-5 w-5 translate-y-0.5 rounded-full bg-white shadow transition ${
          checked ? 'translate-x-5' : 'translate-x-0.5'
        }`}
      />
    </button>
  )
}

function emptyCustomDraft(): CustomFieldDraft {
  return {
    label: '',
    type: 'text',
    required: false,
    enabled: true,
    placeholder: '',
    options: []
  }
}

function customDraftFromField(field: FormField): CustomFieldDraft {
  return {
    label: field.label,
    type: field.type,
    required: field.required,
    enabled: field.enabled !== false,
    placeholder: field.placeholder ?? '',
    options: field.options ?? []
  }
}

function structuralDraftFromConfig(
  key: StructuralFieldKey,
  config: StructuralConfig
): StructuralFieldDraft {
  return {
    label: config[key].label?.trim() || STRUCTURAL_FIELD_LABELS[key],
    enabled: config[key].enabled,
    required: config[key].required
  }
}

export function FieldEditorModal({
  open,
  target,
  structuralConfig,
  onClose,
  onApplyStructural,
  onApplyCustom,
  onDeleteCustom
}: FieldEditorModalProps) {
  if (!open || !target) return null

  const editorKey = target.kind === 'structural'
    ? `structural-${target.key}`
    : `custom-${target.field?.id ?? 'new'}`

  return (
    <FieldEditorModalForm
      key={editorKey}
      target={target}
      structuralConfig={structuralConfig}
      onClose={onClose}
      onApplyStructural={onApplyStructural}
      onApplyCustom={onApplyCustom}
      onDeleteCustom={onDeleteCustom}
    />
  )
}

function FieldEditorModalForm({
  target,
  structuralConfig,
  onClose,
  onApplyStructural,
  onApplyCustom,
  onDeleteCustom
}: Omit<FieldEditorModalProps, 'open'> & { target: FieldEditorTarget }) {
  const [structuralDraft, setStructuralDraft] = useState<StructuralFieldDraft | null>(() =>
    target.kind === 'structural'
      ? structuralDraftFromConfig(target.key, structuralConfig)
      : null
  )
  const [customDraft, setCustomDraft] = useState<CustomFieldDraft>(() =>
    target.kind === 'custom' && target.field
      ? customDraftFromField(target.field)
      : emptyCustomDraft()
  )
  const [newOption, setNewOption] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)

  const isStructural = target.kind === 'structural'
  const isNewCustom = target.kind === 'custom' && !target.field
  const structuralKey = isStructural ? target.key : null
  const isName = structuralKey === 'name'

  const title = isNewCustom ? 'Novo campo' : 'Editar campo'
  const subtitle = isStructural
    ? STRUCTURAL_FIELD_LABELS[structuralKey!]
    : (target.kind === 'custom' && target.field ? target.field.label : 'Campo personalizado')

  const handleApply = () => {
    if (isStructural && structuralKey && structuralDraft) {
      onApplyStructural(structuralKey, {
        enabled: isName ? true : structuralDraft.enabled,
        required: isName ? true : (structuralDraft.enabled ? structuralDraft.required : false),
        label: structuralDraft.label.trim() || undefined
      })
      onClose()
      return
    }

    if (target.kind === 'custom') {
      if (!customDraft.label.trim()) return
      if (typeRequiresOptions(customDraft.type) && customDraft.options.length === 0) return
      onApplyCustom(target.field?.id ?? null, {
        ...customDraft,
        label: customDraft.label.trim(),
        placeholder: customDraft.placeholder.trim(),
        required: customDraft.enabled ? customDraft.required : false
      })
      onClose()
    }
  }

  const showOptions = !isStructural && typeUsesOptions(customDraft.type)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white shadow-xl">
        <div className="border-b px-6 py-5">
          <h2 className="text-xl font-bold text-[#0B1F3A]">{title}</h2>
          <p className="mt-1 text-lg font-medium text-[#0B1F3A]">{subtitle}</p>
          <p className="mt-1 text-sm text-gray-500">
            Configure como este campo será apresentado no formulário.
          </p>
        </div>

        <div className="space-y-6 px-6 py-5">
          {isStructural && structuralDraft ? (
            <>
              <div>
                <label htmlFor="field-label" className="mb-1 block text-sm font-medium text-gray-700">
                  Rótulo do campo
                </label>
                <input
                  id="field-label"
                  type="text"
                  value={structuralDraft.label}
                  onChange={(e) => setStructuralDraft({ ...structuralDraft, label: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Tipo</label>
                <input
                  type="text"
                  readOnly
                  value={structuralFieldTypeLabel(structuralKey!)}
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-gray-600"
                />
              </div>

              {!isName && (
                <div className="rounded-lg border border-gray-200 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-800">Exibição</p>
                      <p className="mt-1 text-sm text-gray-500">
                        Quando ativado, este campo aparece para quem preencher o formulário.
                      </p>
                    </div>
                    <Toggle
                      id="structural-enabled"
                      checked={structuralDraft.enabled}
                      onChange={(enabled) => setStructuralDraft({
                        ...structuralDraft,
                        enabled,
                        required: enabled ? structuralDraft.required : false
                      })}
                    />
                  </div>
                  <label htmlFor="structural-enabled" className="mt-2 block text-sm text-gray-700">
                    Exibir este campo
                  </label>
                </div>
              )}

              {!isName && structuralDraft.enabled && (
                <div className="rounded-lg border border-gray-200 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-800">Obrigatoriedade</p>
                      <p className="mt-1 text-sm text-gray-500">
                        Define se o participante precisa preencher este campo.
                      </p>
                    </div>
                    <Toggle
                      id="structural-required"
                      checked={structuralDraft.required}
                      onChange={(required) => setStructuralDraft({ ...structuralDraft, required })}
                    />
                  </div>
                  <label htmlFor="structural-required" className="mt-2 block text-sm text-gray-700">
                    Campo obrigatório
                  </label>
                </div>
              )}
            </>
          ) : (
            <>
              <div>
                <label htmlFor="custom-label" className="mb-1 block text-sm font-medium text-gray-700">
                  Rótulo do campo
                </label>
                <input
                  id="custom-label"
                  type="text"
                  required
                  value={customDraft.label}
                  onChange={(e) => setCustomDraft({ ...customDraft, label: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2"
                  placeholder="Ex: Empresa"
                />
              </div>

              <div>
                <label htmlFor="custom-type" className="mb-1 block text-sm font-medium text-gray-700">
                  Tipo
                </label>
                <select
                  id="custom-type"
                  value={customDraft.type}
                  onChange={(e) => setCustomDraft({
                    ...customDraft,
                    type: e.target.value as FormFieldType,
                    options: typeUsesOptions(e.target.value as FormFieldType) ? customDraft.options : []
                  })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2"
                >
                  {FIELD_TYPE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              <div className="rounded-lg border border-gray-200 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-800">Exibição</p>
                    <p className="mt-1 text-sm text-gray-500">
                      Quando ativado, este campo aparece para quem preencher o formulário.
                    </p>
                  </div>
                  <Toggle
                    id="custom-enabled"
                    checked={customDraft.enabled}
                    onChange={(enabled) => setCustomDraft({
                      ...customDraft,
                      enabled,
                      required: enabled ? customDraft.required : false
                    })}
                  />
                </div>
                <label htmlFor="custom-enabled" className="mt-2 block text-sm text-gray-700">
                  Exibir este campo
                </label>
              </div>

              {customDraft.enabled && (
                <div className="rounded-lg border border-gray-200 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-800">Obrigatoriedade</p>
                      <p className="mt-1 text-sm text-gray-500">
                        Define se o participante precisa preencher este campo.
                      </p>
                    </div>
                    <Toggle
                      id="custom-required"
                      checked={customDraft.required}
                      onChange={(required) => setCustomDraft({ ...customDraft, required })}
                    />
                  </div>
                  <label htmlFor="custom-required" className="mt-2 block text-sm text-gray-700">
                    Campo obrigatório
                  </label>
                </div>
              )}

              <div>
                <label htmlFor="custom-placeholder" className="mb-1 block text-sm font-medium text-gray-700">
                  Placeholder
                </label>
                <input
                  id="custom-placeholder"
                  type="text"
                  value={customDraft.placeholder}
                  onChange={(e) => setCustomDraft({ ...customDraft, placeholder: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2"
                  placeholder="Opcional"
                />
              </div>

              {showOptions && (
                <div className="rounded-lg border border-gray-200 p-4">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Opções</p>
                  <div className="space-y-2">
                    {customDraft.options.map((option, index) => (
                      <div key={`${option}-${index}`} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={option}
                          onChange={(e) => {
                            const next = [...customDraft.options]
                            next[index] = e.target.value
                            setCustomDraft({ ...customDraft, options: next })
                          }}
                          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
                        />
                        <button
                          type="button"
                          onClick={() => setCustomDraft({
                            ...customDraft,
                            options: customDraft.options.filter((_, i) => i !== index)
                          })}
                          className="text-sm text-red-600 hover:text-red-700"
                        >
                          remover
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 flex gap-2">
                    <input
                      type="text"
                      value={newOption}
                      onChange={(e) => setNewOption(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key !== 'Enter') return
                        e.preventDefault()
                        const trimmed = newOption.trim()
                        if (!trimmed) return
                        setCustomDraft({ ...customDraft, options: [...customDraft.options, trimmed] })
                        setNewOption('')
                      }}
                      className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
                      placeholder="Nova opção"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const trimmed = newOption.trim()
                        if (!trimmed) return
                        setCustomDraft({ ...customDraft, options: [...customDraft.options, trimmed] })
                        setNewOption('')
                      }}
                      className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50"
                    >
                      + Adicionar opção
                    </button>
                  </div>
                  {typeRequiresOptions(customDraft.type) && customDraft.options.length === 0 && (
                    <p className="mt-2 text-xs text-amber-700">Adicione ao menos uma opção.</p>
                  )}
                </div>
              )}

              {!isNewCustom && target.kind === 'custom' && target.field && onDeleteCustom && (
                <div className="rounded-lg border border-red-200 bg-red-50/50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-red-700">Zona de perigo</p>
                  {!confirmDelete ? (
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(true)}
                      className="mt-3 rounded-lg border border-red-300 px-4 py-2 text-sm text-red-700 hover:bg-red-100"
                    >
                      Excluir campo
                    </button>
                  ) : (
                    <div className="mt-3 space-y-3">
                      <p className="text-sm text-gray-700">
                        <strong>Excluir este campo?</strong>
                        {' '}Essa ação remove o campo da configuração do formulário. Respostas históricas
                        já armazenadas não serão apagadas.
                      </p>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setConfirmDelete(false)}
                          className="rounded-lg border px-4 py-2 text-sm"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            onDeleteCustom(target.field!)
                            onClose()
                          }}
                          className="rounded-lg bg-red-600 px-4 py-2 text-sm text-white"
                        >
                          Excluir campo
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t px-6 py-4">
          <button type="button" onClick={onClose} className="rounded-lg border px-4 py-2 text-sm">
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="rounded-lg bg-[#00C896] px-4 py-2 text-sm font-medium text-white hover:bg-[#00a876]"
          >
            {isNewCustom ? 'Adicionar campo' : 'Aplicar alterações'}
          </button>
        </div>
      </div>
    </div>
  )
}

export function customDraftToFormField(
  draft: CustomFieldDraft,
  existing?: FormField | null
): Omit<FormField, 'registration_form_id' | 'event_id'> {
  return {
    id: existing?.id ?? crypto.randomUUID(),
    label: draft.label,
    type: draft.type,
    required: draft.required,
    enabled: draft.enabled,
    placeholder: draft.placeholder || null,
    options: typeUsesOptions(draft.type) ? draft.options : null,
    order: existing?.order ?? 0
  }
}

export function customDraftToPayload(draft: CustomFieldDraft) {
  const payload: {
    label: string
    type: FormFieldType
    required: boolean
    enabled: boolean
    placeholder?: string
    options?: string[]
  } = {
    label: draft.label,
    type: draft.type,
    required: draft.required,
    enabled: draft.enabled,
    placeholder: draft.placeholder || undefined
  }

  if (typeUsesOptions(draft.type) && draft.options.length > 0) {
    payload.options = draft.options
  }

  return payload
}

export function fieldToSavePayload(field: FormField) {
  return customDraftToPayload({
    label: field.label,
    type: field.type,
    required: field.required,
    enabled: field.enabled !== false,
    placeholder: field.placeholder ?? '',
    options: typeUsesOptions(field.type) ? (field.options ?? []) : []
  })
}

function normalizedOptions(field: FormField): string[] | null {
  if (!typeUsesOptions(field.type)) return null
  if (!field.options || field.options.length === 0) return null
  return field.options
}

export function fieldsEqual(a: FormField, b: FormField): boolean {
  return (
    a.label === b.label
    && a.type === b.type
    && a.required === b.required
    && (a.enabled !== false) === (b.enabled !== false)
    && (a.placeholder ?? '') === (b.placeholder ?? '')
    && JSON.stringify(normalizedOptions(a)) === JSON.stringify(normalizedOptions(b))
  )
}
