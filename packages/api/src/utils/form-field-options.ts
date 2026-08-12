import { FieldType } from '../../../database'

export const BUILDER_FIELD_TYPES = [
  'text',
  'textarea',
  'email',
  'phone',
  'cpf',
  'number',
  'date',
  'select',
  'multi_select',
  'checkbox'
] as const satisfies readonly FieldType[]

export type BuilderFieldType = (typeof BUILDER_FIELD_TYPES)[number]

export function typeRequiresOptions(type: FieldType): boolean {
  return type === 'select' || type === 'multi_select' || type === 'checkbox'
}

export function normalizeOptionsInput(options: unknown): string[] | null {
  if (options == null) return null
  if (!Array.isArray(options)) return null

  const seen = new Set<string>()
  const result: string[] = []

  for (const raw of options) {
    if (typeof raw !== 'string') continue
    const trimmed = raw.trim()
    if (!trimmed) continue
    const key = trimmed.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    result.push(trimmed)
  }

  return result.length > 0 ? result : null
}

export function parseStoredOptions(options: unknown): string[] | null {
  if (options == null) return null
  if (Array.isArray(options)) {
    return normalizeOptionsInput(options)
  }
  return null
}

export function validateFieldOptions(type: FieldType, options: unknown): string | null {
  const normalized = normalizeOptionsInput(options)

  if (type === 'checkbox') {
    if (normalized && normalized.length > 0) return null
    return null
  }

  if (typeRequiresOptions(type)) {
    if (!normalized || normalized.length === 0) {
      return 'Campos de seleção exigem ao menos uma opção'
    }
  }

  return null
}

export function optionsForStorage(type: FieldType, options: unknown): string[] | null {
  const normalized = normalizeOptionsInput(options)
  if (type === 'checkbox') {
    return normalized
  }
  if (typeRequiresOptions(type)) {
    return normalized
  }
  return null
}
