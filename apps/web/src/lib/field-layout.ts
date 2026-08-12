import { FormField } from '@/lib/form-field-types'
import {
  STRUCTURAL_FIELD_LABELS,
  type StructuralConfig,
  type StructuralFieldKey
} from '@/lib/structural-config'

export type FormLayoutEntry =
  | { kind: 'structural'; key: StructuralFieldKey }
  | { kind: 'custom'; field_id: string }

export const DEFAULT_STRUCTURAL_ORDER: StructuralFieldKey[] = [
  'name',
  'email',
  'phone',
  'cpf',
  'category'
]

export type UnifiedFormField =
  | {
      kind: 'structural'
      key: StructuralFieldKey
      label: string
      enabled: boolean
      required: boolean
    }
  | {
      kind: 'custom'
      id: string
      label: string
      type: FormField['type']
      required: boolean
      enabled: boolean
      placeholder: string | null
      options: string[] | null
    }

export function getStructuralFieldLabel(
  key: StructuralFieldKey,
  config: StructuralConfig
): string {
  const custom = config[key].label?.trim()
  return custom || STRUCTURAL_FIELD_LABELS[key]
}

export function buildDefaultFieldLayout(
  _structuralConfig: StructuralConfig,
  formFields: Array<{ id: string; order: number }>
): FormLayoutEntry[] {
  const structural = DEFAULT_STRUCTURAL_ORDER.map((key) => ({ kind: 'structural' as const, key }))

  const custom = [...formFields]
    .sort((a, b) => a.order - b.order)
    .map((field) => ({ kind: 'custom' as const, field_id: field.id }))

  return [...structural, ...custom]
}

export function parseFieldLayout(
  raw: unknown,
  structuralConfig: StructuralConfig,
  formFields: Array<{ id: string; order: number }>
): FormLayoutEntry[] {
  if (!raw || !Array.isArray(raw) || raw.length === 0) {
    return buildDefaultFieldLayout(structuralConfig, formFields)
  }

  const fieldIds = new Set(formFields.map((field) => field.id))
  const seenStructural = new Set<StructuralFieldKey>()
  const seenCustom = new Set<string>()
  const parsed: FormLayoutEntry[] = []

  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') continue
    const item = entry as Partial<FormLayoutEntry>

    if (item.kind === 'structural' && item.key && DEFAULT_STRUCTURAL_ORDER.includes(item.key)) {
      if (seenStructural.has(item.key)) continue
      seenStructural.add(item.key)
      parsed.push({ kind: 'structural', key: item.key })
      continue
    }

    if (item.kind === 'custom' && item.field_id && fieldIds.has(item.field_id)) {
      if (seenCustom.has(item.field_id)) continue
      seenCustom.add(item.field_id)
      parsed.push({ kind: 'custom', field_id: item.field_id })
    }
  }

  for (const key of DEFAULT_STRUCTURAL_ORDER) {
    if (!seenStructural.has(key)) {
      parsed.push({ kind: 'structural', key })
    }
  }

  for (const field of [...formFields].sort((a, b) => a.order - b.order)) {
    if (!seenCustom.has(field.id)) {
      parsed.push({ kind: 'custom', field_id: field.id })
    }
  }

  return parsed
}

function isCustomFieldEnabled(field: FormField): boolean {
  return field.enabled !== false
}

export function resolveBuilderFields(
  structuralConfig: StructuralConfig,
  formFields: FormField[],
  fieldLayout: FormLayoutEntry[]
): UnifiedFormField[] {
  const fieldMap = new Map(formFields.map((field) => [field.id, field]))
  const unified: UnifiedFormField[] = []

  for (const entry of fieldLayout) {
    if (entry.kind === 'structural') {
      const config = structuralConfig[entry.key]
      unified.push({
        kind: 'structural',
        key: entry.key,
        label: getStructuralFieldLabel(entry.key, structuralConfig),
        enabled: config.enabled,
        required: config.required
      })
      continue
    }

    const field = fieldMap.get(entry.field_id)
    if (!field) continue
    if (['email', 'phone', 'cpf'].includes(field.type)) continue

    unified.push({
      kind: 'custom',
      id: field.id,
      label: field.label,
      type: field.type,
      required: field.required,
      enabled: isCustomFieldEnabled(field),
      placeholder: field.placeholder ?? null,
      options: field.options ?? null
    })
  }

  return unified
}

export function resolveUnifiedFields(
  structuralConfig: StructuralConfig,
  formFields: FormField[],
  fieldLayout: FormLayoutEntry[]
): UnifiedFormField[] {
  return resolveBuilderFields(structuralConfig, formFields, fieldLayout).filter((field) => field.enabled)
}

export function buildTemplateColumnsFromLayout(
  structuralConfig: StructuralConfig,
  formFields: FormField[],
  fieldLayout: FormLayoutEntry[]
): string[] {
  return resolveUnifiedFields(structuralConfig, formFields, fieldLayout).map((field) => field.label)
}

export function normalizeFieldLayoutForSave(
  layout: FormLayoutEntry[],
  structuralConfig: StructuralConfig,
  formFields: Array<{ id: string; order: number }>
): FormLayoutEntry[] {
  const fieldIds = new Set(formFields.map((field) => field.id))
  const synced = syncLayoutWithStructuralChanges(layout, structuralConfig, formFields)

  return synced.filter((entry) => {
    if (entry.kind === 'structural') return true
    return fieldIds.has(entry.field_id)
  })
}

export function syncLayoutWithStructuralChanges(
  layout: FormLayoutEntry[],
  _structuralConfig: StructuralConfig,
  formFields: Array<{ id: string; order: number }>
): FormLayoutEntry[] {
  const fieldIds = new Set(formFields.map((field) => field.id))

  const filtered = layout.filter((entry) => {
    if (entry.kind === 'structural') {
      return DEFAULT_STRUCTURAL_ORDER.includes(entry.key)
    }
    return fieldIds.has(entry.field_id)
  })

  for (const key of DEFAULT_STRUCTURAL_ORDER) {
    if (!filtered.some((entry) => entry.kind === 'structural' && entry.key === key)) {
      filtered.push({ kind: 'structural', key })
    }
  }

  for (const field of formFields) {
    if (!filtered.some((entry) => entry.kind === 'custom' && entry.field_id === field.id)) {
      filtered.push({ kind: 'custom', field_id: field.id })
    }
  }

  return filtered
}

export function structuralFieldTypeLabel(key: StructuralFieldKey): string {
  if (key === 'email') return 'E-mail'
  if (key === 'phone') return 'Telefone'
  if (key === 'cpf') return 'CPF'
  if (key === 'category') return 'Seleção'
  return 'Resposta curta'
}
