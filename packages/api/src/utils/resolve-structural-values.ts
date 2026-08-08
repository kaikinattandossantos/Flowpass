import { isValidCpf, normalizeCpf } from './cpf'
import type { StructuralConfig } from './structural-config'

export interface ResolvedStructuralValues {
  name: string
  email: string | null
  phone: string | null
  cpf: string | null
  category_id: string | null
}

export function resolveStructuralValues(
  config: StructuralConfig,
  data: {
    name?: string
    email?: string
    phone?: string
    cpf?: string
    category_id?: string | null
  }
): ResolvedStructuralValues {
  const name = data.name?.trim() ?? ''
  const email = config.email.enabled
    ? (data.email?.trim().toLowerCase() || null)
    : null
  const phone = config.phone.enabled
    ? (data.phone?.trim() || null)
    : null

  let cpf: string | null = null
  if (config.cpf.enabled && data.cpf?.trim()) {
    const normalized = normalizeCpf(data.cpf)
    cpf = normalized.length === 11 ? normalized : null
  }

  const category_id = config.category.enabled
    ? (data.category_id ?? null)
    : null

  return { name, email, phone, cpf, category_id }
}

export function validateResolvedStructuralValues(
  config: StructuralConfig,
  values: ResolvedStructuralValues
): { ok: true } | { ok: false; message: string } {
  if (config.name.required && !values.name) {
    return { ok: false, message: 'Nome é obrigatório' }
  }
  if (config.email.enabled && config.email.required && !values.email) {
    return { ok: false, message: 'E-mail é obrigatório' }
  }
  if (config.email.enabled && values.email) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
      return { ok: false, message: 'E-mail inválido' }
    }
  }
  if (config.phone.enabled && config.phone.required && !values.phone) {
    return { ok: false, message: 'Telefone é obrigatório' }
  }
  if (config.cpf.enabled && config.cpf.required && !values.cpf) {
    return { ok: false, message: 'CPF é obrigatório' }
  }
  if (config.cpf.enabled && values.cpf === null && config.cpf.required === false) {
    // cpf provided but invalid is caught elsewhere when raw value exists
  }
  if (config.category.enabled && config.category.required && !values.category_id) {
    return { ok: false, message: 'Categoria é obrigatória' }
  }
  return { ok: true }
}

export function validateCpfWhenEnabled(
  config: StructuralConfig,
  cpfRaw: string | undefined,
  resolvedCpf: string | null
): { ok: true } | { ok: false; message: string } {
  if (!config.cpf.enabled || !cpfRaw?.trim()) return { ok: true }
  if (!resolvedCpf || !isValidCpf(resolvedCpf)) {
    return { ok: false, message: 'CPF inválido' }
  }
  return { ok: true }
}
