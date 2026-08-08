import { FieldType } from '../../../database'
import { isValidCpf, normalizeCpf } from './cpf'
import {
  BUILDER_FIELD_TYPES,
  parseStoredOptions,
  type BuilderFieldType
} from './form-field-options'

export interface FormFieldInput {
  id: string
  type: FieldType
  required: boolean
  options: unknown
}

export function normalizePhone(value: string): string {
  return value.replace(/\D/g, '')
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00.000Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value)
}

function checkboxHasOptions(options: string[] | null): boolean {
  return !!options && options.length > 0
}

export function validateFormData(
  fields: FormFieldInput[],
  formData: Record<string, unknown>
): { ok: true; data: Record<string, unknown> } | { ok: false; message: string } {
  const fieldMap = new Map(fields.map((f) => [f.id, f]))
  const normalized: Record<string, unknown> = {}

  for (const key of Object.keys(formData)) {
    if (!fieldMap.has(key)) {
      return { ok: false, message: `Campo desconhecido: ${key}` }
    }
  }

  for (const field of fields) {
    const raw = formData[field.id]
    const options = parseStoredOptions(field.options)
    const isEmpty =
      raw === undefined ||
      raw === null ||
      raw === '' ||
      (Array.isArray(raw) && raw.length === 0)

    if (field.required && isEmpty) {
      return { ok: false, message: `Campo obrigatório ausente: ${field.id}` }
    }

    if (isEmpty) {
      continue
    }

    switch (field.type) {
      case 'text':
      case 'textarea': {
        if (typeof raw !== 'string') {
          return { ok: false, message: `Valor inválido para campo ${field.id}` }
        }
        normalized[field.id] = raw.trim()
        break
      }
      case 'email': {
        if (typeof raw !== 'string' || !isValidEmail(raw.trim())) {
          return { ok: false, message: `E-mail inválido no campo ${field.id}` }
        }
        normalized[field.id] = raw.trim().toLowerCase()
        break
      }
      case 'phone': {
        if (typeof raw !== 'string') {
          return { ok: false, message: `Telefone inválido no campo ${field.id}` }
        }
        const digits = normalizePhone(raw)
        if (digits.length < 10 || digits.length > 13) {
          return { ok: false, message: `Telefone inválido no campo ${field.id}` }
        }
        normalized[field.id] = digits
        break
      }
      case 'cpf': {
        if (typeof raw !== 'string' || !isValidCpf(raw)) {
          return { ok: false, message: `CPF inválido no campo ${field.id}` }
        }
        normalized[field.id] = normalizeCpf(raw)
        break
      }
      case 'number': {
        const num = typeof raw === 'number' ? raw : Number(raw)
        if (Number.isNaN(num)) {
          return { ok: false, message: `Número inválido no campo ${field.id}` }
        }
        normalized[field.id] = num
        break
      }
      case 'date': {
        if (typeof raw !== 'string' || !isValidDate(raw)) {
          return { ok: false, message: `Data inválida no campo ${field.id}` }
        }
        normalized[field.id] = raw
        break
      }
      case 'select': {
        if (typeof raw !== 'string') {
          return { ok: false, message: `Seleção inválida no campo ${field.id}` }
        }
        const value = raw.trim()
        if (!options?.some((o) => o.toLowerCase() === value.toLowerCase())) {
          return { ok: false, message: `Opção inválida no campo ${field.id}` }
        }
        normalized[field.id] = options.find((o) => o.toLowerCase() === value.toLowerCase())!
        break
      }
      case 'multi_select':
      case 'checkbox': {
        if (field.type === 'checkbox' && !checkboxHasOptions(options)) {
          const truthy = raw === true || raw === 'true' || raw === 'on' || raw === '1'
          const falsy = raw === false || raw === 'false' || raw === 'off' || raw === '0'
          if (!truthy && !falsy) {
            return { ok: false, message: `Valor inválido no campo ${field.id}` }
          }
          if (field.required && !truthy) {
            return { ok: false, message: `Campo obrigatório ausente: ${field.id}` }
          }
          normalized[field.id] = truthy
          break
        }

        if (!Array.isArray(raw)) {
          return { ok: false, message: `Valor inválido no campo ${field.id}` }
        }
        const selected: string[] = []
        for (const item of raw) {
          if (typeof item !== 'string') {
            return { ok: false, message: `Opção inválida no campo ${field.id}` }
          }
          const match = options?.find((o) => o.toLowerCase() === item.trim().toLowerCase())
          if (!match) {
            return { ok: false, message: `Opção inválida no campo ${field.id}` }
          }
          if (!selected.some((s) => s.toLowerCase() === match.toLowerCase())) {
            selected.push(match)
          }
        }
        normalized[field.id] = selected
        break
      }
      default:
        return { ok: false, message: `Tipo de campo não suportado: ${field.type}` }
    }
  }

  return { ok: true, data: normalized }
}

export function assertFieldTypeAllowed(type: FieldType): type is BuilderFieldType {
  return (BUILDER_FIELD_TYPES as readonly string[]).includes(type)
}
