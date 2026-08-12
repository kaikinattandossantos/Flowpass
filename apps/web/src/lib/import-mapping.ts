import { FormField } from '@/lib/form-field-types'
import {
  getStructuralFieldLabel,
  parseStructuralConfig,
  type StructuralConfig,
  type StructuralFieldKey
} from '@/lib/structural-config'
import { FormLayoutEntry, resolveUnifiedFields } from '@/lib/field-layout'

export type MappingTarget =
  | 'ignore'
  | 'name'
  | 'email'
  | 'phone'
  | 'cpf'
  | 'category'
  | `field:${string}`

export interface MappingOption {
  value: MappingTarget
  label: string
  group: 'Estrutural' | 'Personalizado' | 'Outros'
}

export function buildMappingOptions(
  structuralConfig: StructuralConfig,
  formFields: FormField[],
  fieldLayout?: FormLayoutEntry[]
): MappingOption[] {
  const options: MappingOption[] = [
    { value: 'ignore', label: 'Ignorar esta coluna', group: 'Outros' }
  ]

  if (fieldLayout) {
    for (const field of resolveUnifiedFields(structuralConfig, formFields, fieldLayout)) {
      if (field.kind === 'structural') {
        options.push({
          value: field.key,
          label: field.label,
          group: 'Estrutural'
        })
      } else {
        options.push({
          value: `field:${field.id}`,
          label: field.label,
          group: 'Personalizado'
        })
      }
    }
    return options
  }

  for (const key of Object.keys(structuralConfig) as StructuralFieldKey[]) {
    if (!structuralConfig[key].enabled) continue
    options.push({
      value: key,
      label: getStructuralFieldLabel(key, structuralConfig),
      group: 'Estrutural'
    })
  }

  for (const field of formFields) {
    if (['email', 'phone', 'cpf'].includes(field.type)) continue
    options.push({
      value: `field:${field.id}`,
      label: field.label,
      group: 'Personalizado'
    })
  }

  return options
}

function normalizeHeader(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

export function suggestMappingTarget(
  header: string,
  structuralConfig: StructuralConfig,
  formFields: FormField[]
): MappingTarget {
  const normalized = normalizeHeader(header)

  if (structuralConfig.name.enabled && /^(nome|name|nome completo|participante)$/.test(normalized)) return 'name'
  if (structuralConfig.email.enabled && /^(email|e-mail|e mail|mail)$/.test(normalized)) return 'email'
  if (structuralConfig.phone.enabled && /^(telefone|phone|celular|whatsapp|fone|mobile)$/.test(normalized)) return 'phone'
  if (structuralConfig.cpf.enabled && /^(cpf|documento|doc)$/.test(normalized)) return 'cpf'
  if (structuralConfig.category.enabled && /^(categoria|tipo|perfil)$/.test(normalized)) return 'category'

  for (const field of formFields) {
    const fieldNorm = normalizeHeader(field.label)
    if (fieldNorm === normalized || normalized.includes(fieldNorm) || fieldNorm.includes(normalized)) {
      return `field:${field.id}`
    }
  }

  return 'ignore'
}

export function suggestColumnMappings(
  headers: string[],
  structuralConfig: StructuralConfig,
  formFields: FormField[]
): Record<string, MappingTarget> {
  const mappings: Record<string, MappingTarget> = {}
  const used = new Set<MappingTarget>()

  for (const header of headers) {
    let target = suggestMappingTarget(header, structuralConfig, formFields)
    if (target !== 'ignore' && used.has(target)) {
      target = 'ignore'
    }
    if (target !== 'ignore') used.add(target)
    mappings[header] = target
  }

  return mappings
}

export function mappingTargetsToApiPayload(
  columnMappings: Record<string, MappingTarget>
): {
  name?: string
  email?: string
  phone?: string
  cpf?: string
  category?: string
  form_fields: Record<string, string>
} {
  const payload = {
    name: '',
    email: '',
    phone: '',
    cpf: '',
    category: '',
    form_fields: {} as Record<string, string>
  }

  for (const [column, target] of Object.entries(columnMappings)) {
    if (target === 'ignore') continue
    if (target === 'name') payload.name = column
    else if (target === 'email') payload.email = column
    else if (target === 'phone') payload.phone = column
    else if (target === 'cpf') payload.cpf = column
    else if (target === 'category') payload.category = column
    else if (target.startsWith('field:')) {
      payload.form_fields[target.replace('field:', '')] = column
    }
  }

  return {
    name: payload.name || undefined,
    email: payload.email || undefined,
    phone: payload.phone || undefined,
    cpf: payload.cpf || undefined,
    category: payload.category || undefined,
    form_fields: payload.form_fields
  }
}

export function isMappingValid(
  columnMappings: Record<string, MappingTarget>,
  structuralConfig: StructuralConfig
): boolean {
  const values = Object.values(columnMappings)

  for (const key of Object.keys(structuralConfig) as StructuralFieldKey[]) {
    const field = structuralConfig[key]
    if (field.enabled && field.required && !values.includes(key)) {
      return false
    }
  }

  return true
}

export function parseFormStructuralConfig(raw: unknown): StructuralConfig {
  return parseStructuralConfig(raw)
}
