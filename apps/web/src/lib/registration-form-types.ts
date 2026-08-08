import { StructuralConfig } from '@/lib/structural-config'
import { FormField, sortFormFields } from '@/lib/form-field-types'

export interface RegistrationFormSummary {
  id: string
  event_id: string
  name: string
  public_id: string
  status: 'active' | 'inactive'
  structural_config: StructuralConfig
  field_count: number
  response_count: number
}

export function publicFormUrl(publicId: string): string {
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/f/${publicId}`
  }
  return `/f/${publicId}`
}

export function buildFormFieldColumns(
  structuralConfig: StructuralConfig,
  formFields: FormField[]
): string[] {
  const structural = buildStructuralColumns(structuralConfig)
  const dynamic = sortFormFields(formFields)
    .filter((field) => !['email', 'phone', 'cpf'].includes(field.type))
    .map((field) => field.label)

  return [...structural, ...dynamic]
}

function buildStructuralColumns(config: StructuralConfig): string[] {
  const labels: Record<string, string> = {
    name: 'Nome',
    email: 'E-mail',
    phone: 'Telefone',
    cpf: 'CPF',
    category: 'Categoria'
  }

  return (Object.keys(config) as Array<keyof StructuralConfig>)
    .filter((key) => config[key].enabled)
    .map((key) => labels[key])
}
