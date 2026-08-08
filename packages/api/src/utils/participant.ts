import { FormField, RegistrationOrigin, RegistrationStatus } from '../../../database'
import { normalizeCpf } from './cpf'

export function resolveCpf(
  explicitCpf: string | undefined | null,
  formFields: FormField[],
  formData: Record<string, unknown>
): string | null {
  if (explicitCpf?.trim()) {
    return normalizeCpf(explicitCpf)
  }

  const cpfField = formFields.find((f) => f.type === 'cpf')
  if (!cpfField) return null

  const raw = formData[cpfField.id]
  if (typeof raw !== 'string' || !raw.trim()) return null
  return normalizeCpf(raw)
}

export function formatParticipant(row: {
  id: string
  name: string
  email: string | null
  phone: string | null
  cpf: string | null
  status: RegistrationStatus
  origin: RegistrationOrigin
  qr_token: string | null
  created_at: Date
  form_data: unknown
  category: { id: string; name: string } | null
  registration_form?: { id: string; name: string } | null
}) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    cpf: row.cpf,
    status: row.status,
    origin: row.origin,
    has_qr: !!row.qr_token,
    created_at: row.created_at,
    form_data: row.form_data,
    category: row.category,
    registration_form: row.registration_form ?? null
  }
}
