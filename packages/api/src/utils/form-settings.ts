import type { FormField } from '../../../database'
import { validateFieldOptions } from './form-field-options'
import {
  parseFieldLayout,
  validateFieldLayout,
  type FormLayoutEntry
} from './field-layout'
import { validateRedirectUrl } from './redirect-url'
import {
  parseStructuralConfig,
  type StructuralConfig
} from './structural-config'

export function normalizeRegistrationLimitInput(
  value: unknown
): { ok: true; value: number | null } | { ok: false; message: string } {
  if (value === null || value === undefined || value === '') {
    return { ok: true, value: null }
  }

  const parsed = typeof value === 'number' ? value : Number.parseInt(String(value), 10)
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 1_000_000) {
    return { ok: false, message: 'Limite de inscrições deve ser um número inteiro positivo' }
  }

  return { ok: true, value: parsed }
}

export function validateRegistrationLimit(
  value: number | null | undefined
): { ok: true; value: number | null } | { ok: false; message: string } {
  return normalizeRegistrationLimitInput(value)
}

export function validateFormSettings(input: {
  name?: string
  structural_config?: StructuralConfig
  field_layout?: FormLayoutEntry[]
  registration_limit?: number | null
  redirect_url?: string | null
  formFields?: FormField[]
}): { ok: true } | { ok: false; message: string } {
  if (input.name !== undefined && !input.name.trim()) {
    return { ok: false, message: 'Nome do formulário é obrigatório' }
  }

  if (input.structural_config) {
    if (!input.structural_config.name.enabled || !input.structural_config.name.required) {
      return { ok: false, message: 'Nome deve permanecer habilitado e obrigatório' }
    }
  }

  if (input.field_layout && input.structural_config && input.formFields) {
    const layoutValidation = validateFieldLayout(
      input.field_layout,
      input.structural_config,
      input.formFields
    )
    if (!layoutValidation.ok) return layoutValidation
  }

  if (input.registration_limit !== undefined) {
    const limitValidation = validateRegistrationLimit(input.registration_limit)
    if (!limitValidation.ok) return limitValidation
  }

  if (input.redirect_url !== undefined) {
    const redirectValidation = validateRedirectUrl(input.redirect_url)
    if (!redirectValidation.ok) return redirectValidation
  }

  return { ok: true }
}

export function validateFormForPublish(form: {
  name: string
  structural_config: unknown
  field_layout: unknown
  registration_limit: number | null
  redirect_url: string | null
  form_fields: FormField[]
}): { ok: true } | { ok: false; message: string } {
  const structuralConfig = parseStructuralConfig(form.structural_config)
  const fieldLayout = parseFieldLayout(form.field_layout, structuralConfig, form.form_fields)

  const settingsValidation = validateFormSettings({
    name: form.name,
    structural_config: structuralConfig,
    field_layout: fieldLayout,
    registration_limit: form.registration_limit,
    redirect_url: form.redirect_url,
    formFields: form.form_fields
  })
  if (!settingsValidation.ok) return settingsValidation

  for (const field of form.form_fields) {
    const optionsError = validateFieldOptions(field.type, field.options)
    if (optionsError) {
      return { ok: false, message: `Campo "${field.label}": ${optionsError}` }
    }
  }

  return { ok: true }
}
