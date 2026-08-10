export type FormFieldType =
  | 'text'
  | 'textarea'
  | 'email'
  | 'phone'
  | 'cpf'
  | 'number'
  | 'date'
  | 'select'
  | 'multi_select'
  | 'checkbox'

export interface FormField {
  id: string
  registration_form_id?: string
  event_id?: string
  label: string
  type: FormFieldType
  required: boolean
  enabled?: boolean
  placeholder?: string | null
  options?: string[] | null
  order: number
}

export const FIELD_TYPE_OPTIONS: Array<{ value: FormFieldType; label: string }> = [
  { value: 'text', label: 'Texto curto' },
  { value: 'textarea', label: 'Texto longo' },
  { value: 'email', label: 'E-mail' },
  { value: 'phone', label: 'Telefone' },
  { value: 'cpf', label: 'CPF' },
  { value: 'number', label: 'Número' },
  { value: 'date', label: 'Data' },
  { value: 'select', label: 'Seleção única' },
  { value: 'multi_select', label: 'Múltipla escolha' },
  { value: 'checkbox', label: 'Checkbox' }
]

export function fieldTypeLabel(type: FormFieldType): string {
  return FIELD_TYPE_OPTIONS.find((o) => o.value === type)?.label ?? type
}

export function typeUsesOptions(type: FormFieldType): boolean {
  return type === 'select' || type === 'multi_select' || type === 'checkbox'
}

export function typeRequiresOptions(type: FormFieldType): boolean {
  return type === 'select' || type === 'multi_select'
}

export function sortFormFields(fields: FormField[]): FormField[] {
  return [...fields].sort((a, b) => a.order - b.order)
}

export function parseOptionsText(text: string): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  for (const line of text.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed) continue
    const key = trimmed.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    result.push(trimmed)
  }
  return result
}

export function optionsToText(options?: string[] | null): string {
  return options?.join('\n') ?? ''
}
