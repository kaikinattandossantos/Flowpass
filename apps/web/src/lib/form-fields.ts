export type FormFieldType =
  | 'text'
  | 'email'
  | 'phone'
  | 'cpf'
  | 'select'
  | 'multi_select'
  | 'number'

export interface FormFieldDraft {
  label: string
  type: FormFieldType
  required: boolean
  options?: string[]
  order: number
}

export const FORM_FIELD_TYPES: Array<{ value: FormFieldType; label: string }> = [
  { value: 'text', label: 'Texto curto' },
  { value: 'email', label: 'E-mail' },
  { value: 'phone', label: 'Telefone' },
  { value: 'cpf', label: 'CPF' },
  { value: 'number', label: 'Número' },
  { value: 'select', label: 'Seleção única' },
  { value: 'multi_select', label: 'Múltipla escolha' }
]

export function parseOptionsInput(value: string) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}