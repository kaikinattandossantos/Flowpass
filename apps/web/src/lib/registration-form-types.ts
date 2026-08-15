import type { SuccessBehavior } from '@/lib/success-behavior'
import { StructuralConfig } from '@/lib/structural-config'
import { FormField } from '@/lib/form-field-types'
import { buildTemplateColumnsFromLayout, FormLayoutEntry } from '@/lib/field-layout'

export interface RegistrationFormSummary {
  id: string
  event_id: string
  name: string
  public_id: string
  slug?: string | null
  status: 'draft' | 'active' | 'inactive'
  structural_config: StructuralConfig
  field_layout: FormLayoutEntry[]
  registration_limit: number | null
  redirect_url: string | null
  success_behavior?: SuccessBehavior
  success_title?: string | null
  success_message?: string | null
  redirect_delay?: number | null
  default_category_id?: string | null
  default_category?: { id: string; name: string } | null
  appearance?: unknown | null
  published_appearance?: unknown | null
  public_title?: string | null
  public_description?: string | null
  submit_button_text?: string | null
  field_count: number
  response_count: number
  active_registration_count?: number
  available_slots?: number | null
  is_full?: boolean
}

export function publicFormPath(form: Pick<RegistrationFormSummary, 'slug' | 'public_id'>): string {
  return `/f/${form.slug || form.public_id}`
}

export function publicFormUrl(form: Pick<RegistrationFormSummary, 'slug' | 'public_id'>): string {
  if (typeof window !== 'undefined') {
    return `${window.location.origin}${publicFormPath(form)}`
  }
  return publicFormPath(form)
}

export function buildFormFieldColumns(
  structuralConfig: StructuralConfig,
  formFields: FormField[],
  fieldLayout: FormLayoutEntry[]
): string[] {
  return buildTemplateColumnsFromLayout(structuralConfig, formFields, fieldLayout)
}
