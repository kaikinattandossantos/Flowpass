import { StructuralConfig } from '@/lib/structural-config'
import { FormField } from '@/lib/form-field-types'
import { buildTemplateColumnsFromLayout, FormLayoutEntry } from '@/lib/field-layout'

export interface RegistrationFormSummary {
  id: string
  event_id: string
  name: string
  public_id: string
  status: 'draft' | 'active' | 'inactive'
  structural_config: StructuralConfig
  field_layout: FormLayoutEntry[]
  registration_limit: number | null
  redirect_url: string | null
  field_count: number
  response_count: number
  active_registration_count?: number
  available_slots?: number | null
  is_full?: boolean
}

export function publicFormUrl(publicId: string): string {
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/f/${publicId}`
  }
  return `/f/${publicId}`
}

export function buildFormFieldColumns(
  structuralConfig: StructuralConfig,
  formFields: FormField[],
  fieldLayout: FormLayoutEntry[]
): string[] {
  return buildTemplateColumnsFromLayout(structuralConfig, formFields, fieldLayout)
}
