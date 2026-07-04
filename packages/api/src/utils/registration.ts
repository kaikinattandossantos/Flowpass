import type { FormField } from '../../../database'

type FormData = Record<string, unknown>

export function validateParticipantFormData(
  fields: FormField[],
  formData: FormData
): string | null {
  for (const field of fields.sort((a, b) => a.order - b.order)) {
    const value = formData[field.id]
    const isEmpty =
      value === undefined ||
      value === null ||
      value === '' ||
      (Array.isArray(value) && value.length === 0)

    if (field.required && isEmpty) {
      return `O campo "${field.label}" é obrigatório.`
    }

    if (field.type === 'cpf' && typeof value === 'string' && value) {
      const digits = value.replace(/\D/g, '')
      if (digits.length !== 11) {
        return `O campo "${field.label}" deve conter um CPF válido.`
      }
    }

    if (field.type === 'phone' && typeof value === 'string' && value) {
      const digits = value.replace(/\D/g, '')
      if (digits.length < 10) {
        return `O campo "${field.label}" deve conter um telefone válido.`
      }
    }
  }

  return null
}