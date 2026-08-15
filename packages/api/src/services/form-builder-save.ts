import { FieldType, Prisma } from '../../../database'
import { prisma } from '../../../database'
import {
  normalizeFieldLayoutForSave,
  type FormLayoutEntry
} from '../utils/field-layout'
import { appearanceForStorage, validateFormAppearance } from '../utils/form-appearance'
import { isDesignV3, validateFormDesign } from '../utils/form-design'
import { validateFormSlug } from '../utils/form-slug'
import { validateFormSettings, validateRegistrationLimit } from '../utils/form-settings'
import {
  optionsForStorage,
  validateFieldOptions,
  type BuilderFieldType
} from '../utils/form-field-options'
import { validateRedirectUrl } from '../utils/redirect-url'
import { parseStructuralConfig, type StructuralConfig } from '../utils/structural-config'
import { assertFieldTypeAllowed } from '../utils/validate-form-data'
import {
  parseSuccessBehavior,
  successSettingsForStorage,
  validateSuccessSettings,
  type SuccessBehavior
} from '../utils/success-behavior'

export interface BuilderFieldInput {
  id: string
  label: string
  type: BuilderFieldType
  required: boolean
  enabled: boolean
  placeholder?: string | null
  options?: string[]
}

export interface BuilderSaveInput {
  name: string
  structural_config: StructuralConfig
  field_layout: FormLayoutEntry[]
  registration_limit?: number | null
  redirect_url?: string | null
  default_category_id?: string | null
  slug?: string | null
  public_title?: string | null
  public_description?: string | null
  success_message?: string | null
  success_behavior?: SuccessBehavior
  success_title?: string | null
  redirect_delay?: number | null
  submit_button_text?: string | null
  appearance?: unknown
  fields: BuilderFieldInput[]
  deleted_field_ids: string[]
}

function trimOptional(value: string | null | undefined, maxLength: number): string | null {
  if (value === null || value === undefined) return null
  const trimmed = value.trim()
  if (!trimmed) return null
  return trimmed.slice(0, maxLength)
}

export async function saveRegistrationFormBuilder(
  eventId: string,
  formId: string,
  input: BuilderSaveInput
) {
  const existing = await prisma.registrationForm.findFirst({
    where: { id: formId, event_id: eventId },
    include: { form_fields: { orderBy: { order: 'asc' } } }
  })

  if (!existing) {
    return { ok: false as const, status: 404, message: 'Formulário não encontrado' }
  }

  const nextStructuralConfig = parseStructuralConfig(input.structural_config)
  nextStructuralConfig.name = {
    enabled: true,
    required: true,
    label: nextStructuralConfig.name.label
  }

  const nextRegistrationLimit = input.registration_limit !== undefined
    ? input.registration_limit
    : existing.registration_limit
  const nextRedirectUrl = input.redirect_url !== undefined
    ? input.redirect_url
    : existing.redirect_url
  const nextSuccessBehavior = input.success_behavior !== undefined
    ? parseSuccessBehavior(input.success_behavior)
    : existing.success_behavior
  const nextSuccessTitle = input.success_title !== undefined
    ? input.success_title
    : existing.success_title
  const nextSuccessMessage = input.success_message !== undefined
    ? input.success_message
    : existing.success_message
  const nextRedirectDelay = input.redirect_delay !== undefined
    ? input.redirect_delay
    : existing.redirect_delay
  const nextDefaultCategoryId = input.default_category_id !== undefined
    ? input.default_category_id
    : existing.default_category_id

  if (nextDefaultCategoryId) {
    const category = await prisma.category.findFirst({
      where: { id: nextDefaultCategoryId, event_id: eventId }
    })
    if (!category) {
      return { ok: false as const, status: 400, message: 'Categoria padrão inválida para este evento' }
    }
  }

  const slugValidation = validateFormSlug(
    input.slug !== undefined ? input.slug : existing.slug
  )
  if (!slugValidation.ok) {
    return { ok: false as const, status: 400, message: slugValidation.message }
  }

  if (slugValidation.value) {
    const slugConflict = await prisma.registrationForm.findFirst({
      where: {
        slug: slugValidation.value,
        NOT: { id: formId }
      },
      select: { id: true }
    })
    if (slugConflict) {
      return { ok: false as const, status: 409, message: 'Este link personalizado já está em uso' }
    }
  }

  const limitValidation = validateRegistrationLimit(nextRegistrationLimit)
  if (!limitValidation.ok) {
    return { ok: false as const, status: 400, message: limitValidation.message }
  }

  const redirectValidation = validateRedirectUrl(nextRedirectUrl)
  if (!redirectValidation.ok) {
    return { ok: false as const, status: 400, message: redirectValidation.message }
  }

  const successValidation = validateSuccessSettings({
    success_behavior: nextSuccessBehavior,
    success_title: nextSuccessTitle,
    success_message: nextSuccessMessage,
    redirect_url: redirectValidation.value,
    redirect_delay: nextRedirectDelay
  })
  if (!successValidation.ok) {
    return { ok: false as const, status: 400, message: successValidation.message }
  }

  const storedSuccess = successSettingsForStorage({
    success_behavior: nextSuccessBehavior,
    success_title: nextSuccessTitle,
    success_message: nextSuccessMessage,
    redirect_url: redirectValidation.value,
    redirect_delay: nextRedirectDelay
  })

  const resolvedRedirectUrl = nextSuccessBehavior === 'message'
    ? null
    : redirectValidation.value

  const appearanceInput = input.appearance !== undefined ? input.appearance : existing.appearance
  let storedAppearance: Prisma.InputJsonValue

  if (isDesignV3(appearanceInput) || (appearanceInput && typeof appearanceInput === 'object' && (appearanceInput as Record<string, unknown>).version === 3)) {
    const appearanceValidation = validateFormDesign(appearanceInput)
    if (!appearanceValidation.ok) {
      return { ok: false as const, status: 400, message: appearanceValidation.message }
    }
    storedAppearance = appearanceValidation.value as unknown as Prisma.InputJsonValue
  } else {
    const appearanceValidation = validateFormAppearance(appearanceInput)
    if (!appearanceValidation.ok) {
      return { ok: false as const, status: 400, message: appearanceValidation.message }
    }
    storedAppearance = appearanceForStorage(appearanceValidation.value) as unknown as Prisma.InputJsonValue
  }

  const savedFieldIds = new Set(existing.form_fields.map((field) => field.id))
  const deletedIds = input.deleted_field_ids.filter((id) => savedFieldIds.has(id))
  const incomingIds = new Set(input.fields.map((field) => field.id))

  for (const fieldId of deletedIds) {
    if (incomingIds.has(fieldId)) {
      return { ok: false as const, status: 400, message: 'Campo marcado para exclusão ainda está na lista' }
    }
  }

  for (const field of input.fields) {
    if (!field.label.trim()) {
      return { ok: false as const, status: 400, message: 'Todos os campos personalizados precisam de um rótulo' }
    }
    if (!assertFieldTypeAllowed(field.type as FieldType)) {
      return { ok: false as const, status: 400, message: 'Tipo de campo não permitido' }
    }
    const optionsError = validateFieldOptions(field.type as FieldType, field.options)
    if (optionsError) {
      return { ok: false as const, status: 400, message: `Campo "${field.label.trim()}": ${optionsError}` }
    }
  }

  const idMap = new Map<string, string>()
  for (const field of input.fields) {
    if (savedFieldIds.has(field.id)) {
      idMap.set(field.id, field.id)
    }
  }

  const updated = await prisma.$transaction(async (tx) => {
    if (deletedIds.length > 0) {
      await tx.formField.deleteMany({
        where: {
          registration_form_id: formId,
          id: { in: deletedIds }
        }
      })
    }

    let orderCounter = 0
    for (const field of input.fields) {
      const payload = {
        label: field.label.trim(),
        type: field.type as FieldType,
        required: field.required,
        enabled: field.enabled,
        placeholder: field.placeholder?.trim() || null,
        options: optionsForStorage(field.type as FieldType, field.options) ?? Prisma.JsonNull,
        order: orderCounter++
      }

      if (savedFieldIds.has(field.id) && !deletedIds.includes(field.id)) {
        await tx.formField.update({
          where: { id: field.id },
          data: payload
        })
        idMap.set(field.id, field.id)
        continue
      }

      const created = await tx.formField.create({
        data: {
          registration_form_id: formId,
          ...payload
        }
      })
      idMap.set(field.id, created.id)
    }

    const remappedLayout = input.field_layout.map((entry) => {
      if (entry.kind === 'structural') return entry
      const mappedId = idMap.get(entry.field_id)
      if (!mappedId || deletedIds.includes(mappedId)) {
        throw new Error('INVALID_LAYOUT_FIELD')
      }
      return { kind: 'custom' as const, field_id: mappedId }
    })

    const currentFields = await tx.formField.findMany({
      where: { registration_form_id: formId },
      orderBy: { order: 'asc' }
    })

    const nextFieldLayout = normalizeFieldLayoutForSave(
      remappedLayout,
      nextStructuralConfig,
      currentFields
    )

    const settingsValidation = validateFormSettings({
      name: input.name,
      structural_config: nextStructuralConfig,
      field_layout: nextFieldLayout,
      registration_limit: nextRegistrationLimit,
      redirect_url: nextRedirectUrl,
      formFields: currentFields
    })
    if (!settingsValidation.ok) {
      throw new Error(`VALIDATION:${settingsValidation.message}`)
    }

    return tx.registrationForm.update({
      where: { id: formId },
      data: {
        name: input.name.trim(),
        structural_config: nextStructuralConfig as unknown as Prisma.InputJsonValue,
        field_layout: nextFieldLayout as unknown as Prisma.InputJsonValue,
        registration_limit: limitValidation.value,
        redirect_url: resolvedRedirectUrl,
        success_behavior: storedSuccess.success_behavior,
        success_title: storedSuccess.success_title,
        success_message: storedSuccess.success_message,
        redirect_delay: storedSuccess.redirect_delay,
        default_category_id: nextDefaultCategoryId,
        slug: slugValidation.value,
        appearance: storedAppearance,
        public_title: trimOptional(input.public_title, 160),
        public_description: trimOptional(input.public_description, 500),
        submit_button_text: trimOptional(input.submit_button_text, 80)
      },
      include: {
        default_category: { select: { id: true, name: true } },
        form_fields: { select: { id: true, order: true }, orderBy: { order: 'asc' } },
        _count: { select: { form_fields: true, registrations: true } }
      }
    })
  }).catch((error: unknown) => {
    if (error instanceof Error) {
      if (error.message === 'INVALID_LAYOUT_FIELD') {
        return { error: { status: 400, message: 'Layout contém campo personalizado inválido' } }
      }
      if (error.message.startsWith('VALIDATION:')) {
        return { error: { status: 400, message: error.message.replace(/^VALIDATION:/, '') } }
      }
    }
    throw error
  })

  if (updated && 'error' in updated) {
    return { ok: false as const, status: updated.error.status, message: updated.error.message }
  }

  return { ok: true as const, form: updated }
}
