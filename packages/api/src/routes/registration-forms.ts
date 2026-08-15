import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { Prisma, RegistrationFormStatus } from '../../../database'
import { prisma } from '../../../database'
import { requireEventInCompany, requireRoles } from '../lib/auth'
import { generatePublicId } from '../utils/public-id'
import {
  initialNewFormFieldLayout,
  initialNewFormStructuralConfig,
  normalizeFieldLayoutForSave,
  parseFieldLayout,
  type FormLayoutEntry
} from '../utils/field-layout'
import { validateFormForPublish, validateFormSettings, validateRegistrationLimit } from '../utils/form-settings'
import { getFormCapacityStats } from '../utils/registration-form-limit'
import { validateRedirectUrl } from '../utils/redirect-url'
import { validateFormSlug } from '../utils/form-slug'
import { validateFormAppearance } from '../utils/form-appearance'
import { isDesignV3, validateFormDesign } from '../utils/form-design'
import { saveRegistrationFormBuilder } from '../services/form-builder-save'
import {
  parseSuccessBehavior,
  successSettingsForStorage,
  validateSuccessSettings
} from '../utils/success-behavior'
import {
  DEFAULT_STRUCTURAL_CONFIG,
  parseStructuralConfig,
  type StructuralConfig
} from '../utils/structural-config'

const eventIdParam = z.object({ id: z.string().uuid() })
const formParams = z.object({
  id: z.string().uuid(),
  formId: z.string().uuid()
})

const structuralFieldSchema = z.object({
  enabled: z.boolean(),
  required: z.boolean(),
  label: z.string().max(120).optional()
})

const structuralConfigSchema = z.object({
  name: structuralFieldSchema,
  email: structuralFieldSchema,
  phone: structuralFieldSchema,
  cpf: structuralFieldSchema,
  category: structuralFieldSchema
})

const fieldLayoutSchema = z.array(
  z.discriminatedUnion('kind', [
    z.object({ kind: z.literal('structural'), key: z.enum(['name', 'email', 'phone', 'cpf', 'category']) }),
    z.object({ kind: z.literal('custom'), field_id: z.string().uuid() })
  ])
)

const registrationLimitSchema = z.preprocess(
  (value) => {
    if (value === undefined) return undefined
    if (value === null || value === '') return null
    if (typeof value === 'string') {
      const trimmed = value.trim()
      if (!trimmed) return null
      return Number.parseInt(trimmed, 10)
    }
    return value
  },
  z.number().int().min(1).max(1_000_000).nullable().optional()
)

const successBehaviorSchema = z.enum(['message', 'message_redirect', 'redirect'])

const redirectDelaySchema = z.preprocess(
  (value) => {
    if (value === undefined) return undefined
    if (value === null || value === '') return null
    if (typeof value === 'string') return Number.parseInt(value, 10)
    return value
  },
  z.number().int().min(1).max(30).nullable().optional()
)

const redirectUrlSchema = z.preprocess(
  (value) => {
    if (value === undefined) return undefined
    if (value === null) return null
    if (typeof value === 'string' && !value.trim()) return null
    return value
  },
  z.string().max(2048).nullable().optional()
)

async function getFormInEvent(eventId: string, formId: string) {
  return prisma.registrationForm.findFirst({
    where: { id: formId, event_id: eventId },
    include: {
      default_category: { select: { id: true, name: true } },
      form_fields: { orderBy: { order: 'asc' } },
      _count: { select: { form_fields: true, registrations: true } }
    }
  })
}

function serializeForm(form: {
  id: string
  event_id: string
  name: string
  public_id: string
  slug: string | null
  status: RegistrationFormStatus
  structural_config: unknown
  field_layout: unknown
  registration_limit: number | null
  redirect_url: string | null
  success_behavior: 'message' | 'message_redirect' | 'redirect'
  success_title: string | null
  success_message: string | null
  redirect_delay: number | null
  default_category_id: string | null
  default_category?: { id: string; name: string } | null
  appearance: unknown
  published_appearance?: unknown | null
  public_title: string | null
  public_description: string | null
  submit_button_text: string | null
  created_at: Date
  updated_at: Date
  form_fields?: Array<{ id: string; order: number }>
  _count?: { form_fields: number; registrations: number }
}) {
  const structuralConfig = parseStructuralConfig(form.structural_config)
  const formFields = form.form_fields ?? []
  const fieldLayout = parseFieldLayout(form.field_layout, structuralConfig, formFields)

  return {
    id: form.id,
    event_id: form.event_id,
    name: form.name,
    public_id: form.public_id,
    slug: form.slug,
    status: form.status,
    structural_config: structuralConfig,
    field_layout: fieldLayout,
    registration_limit: form.registration_limit,
    redirect_url: form.redirect_url,
    success_behavior: form.success_behavior,
    success_title: form.success_title,
    success_message: form.success_message,
    redirect_delay: form.redirect_delay,
    default_category_id: form.default_category_id,
    default_category: form.default_category ?? null,
    appearance: form.appearance,
    published_appearance: form.published_appearance ?? null,
    public_title: form.public_title,
    public_description: form.public_description,
    submit_button_text: form.submit_button_text,
    field_count: form._count?.form_fields ?? formFields.length,
    response_count: form._count?.registrations ?? 0,
    created_at: form.created_at,
    updated_at: form.updated_at
  }
}

export async function registrationFormRoutes(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().get('/events/:id/registration-forms', {
    preHandler: [requireRoles('admin', 'viewer')],
    schema: { params: eventIdParam }
  }, async (request, reply) => {
    const { id: event_id } = request.params
    const ctx = await requireEventInCompany(request, reply, event_id)
    if (!ctx) return

    const forms = await prisma.registrationForm.findMany({
      where: { event_id },
      include: {
        form_fields: { select: { id: true, order: true }, orderBy: { order: 'asc' } },
        _count: { select: { form_fields: true, registrations: true } }
      },
      orderBy: { created_at: 'asc' }
    })

    return Promise.all(forms.map((form) => serializeFormWithCapacity(form)))
  })

  app.withTypeProvider<ZodTypeProvider>().post('/events/:id/registration-forms', {
    preHandler: [requireRoles('admin')],
    schema: {
      params: eventIdParam,
      body: z.object({
        name: z.string().min(1).max(120),
        structural_config: structuralConfigSchema.optional()
      })
    }
  }, async (request, reply) => {
    const { id: event_id } = request.params
    const ctx = await requireEventInCompany(request, reply, event_id)
    if (!ctx) return

    const structuralConfig = request.body.structural_config
      ? parseStructuralConfig(request.body.structural_config)
      : initialNewFormStructuralConfig()
    structuralConfig.name = { enabled: true, required: true, label: structuralConfig.name.label }

    const fieldLayout = initialNewFormFieldLayout()

    const form = await prisma.registrationForm.create({
      data: {
        event_id,
        name: request.body.name.trim(),
        public_id: generatePublicId(),
        structural_config: structuralConfig as unknown as Prisma.InputJsonValue,
        field_layout: fieldLayout as unknown as Prisma.InputJsonValue,
        registration_limit: null,
        redirect_url: null,
        status: 'draft'
      },
      include: {
        form_fields: { select: { id: true, order: true }, orderBy: { order: 'asc' } },
        _count: { select: { form_fields: true, registrations: true } }
      }
    })

    return serializeFormWithCapacity(form)
  })

  app.withTypeProvider<ZodTypeProvider>().get('/events/:id/registration-forms/:formId', {
    preHandler: [requireRoles('admin', 'viewer')],
    schema: { params: formParams }
  }, async (request, reply) => {
    const { id: event_id, formId } = request.params
    const ctx = await requireEventInCompany(request, reply, event_id)
    if (!ctx) return

    const form = await getFormInEvent(event_id, formId)
    if (!form) {
      return reply.status(404).send({ message: 'Formulário não encontrado' })
    }

    return serializeFormWithCapacity(form)
  })

  app.withTypeProvider<ZodTypeProvider>().patch('/events/:id/registration-forms/:formId', {
    preHandler: [requireRoles('admin')],
    schema: {
      params: formParams,
      body: z.object({
        name: z.string().min(1).max(120).optional(),
        status: z.enum(['draft', 'active', 'inactive']).optional(),
        structural_config: structuralConfigSchema.optional(),
        field_layout: fieldLayoutSchema.optional(),
        registration_limit: registrationLimitSchema,
        redirect_url: redirectUrlSchema,
        default_category_id: z.preprocess(
          (value) => {
            if (value === undefined) return undefined
            if (value === null || value === '') return null
            return value
          },
          z.string().uuid().nullable().optional()
        ),
        slug: z.preprocess(
          (value) => {
            if (value === undefined) return undefined
            if (value === null || value === '') return null
            return value
          },
          z.string().max(80).nullable().optional()
        ),
        public_title: z.string().max(160).nullable().optional(),
        public_description: z.string().max(500).nullable().optional(),
        success_behavior: successBehaviorSchema.optional(),
        success_title: z.string().max(120).nullable().optional(),
        success_message: z.string().max(500).nullable().optional(),
        redirect_delay: redirectDelaySchema,
        submit_button_text: z.string().max(80).nullable().optional(),
        appearance: z.record(z.string(), z.unknown()).nullable().optional()
      })
    }
  }, async (request, reply) => {
    const { id: event_id, formId } = request.params
    const ctx = await requireEventInCompany(request, reply, event_id)
    if (!ctx) return

    const existing = await getFormInEvent(event_id, formId)
    if (!existing) {
      return reply.status(404).send({ message: 'Formulário não encontrado' })
    }

    const nextStructuralConfig = request.body.structural_config
      ? parseStructuralConfig(request.body.structural_config)
      : parseStructuralConfig(existing.structural_config)
    nextStructuralConfig.name = {
      enabled: true,
      required: true,
      label: nextStructuralConfig.name.label
    }

    const nextRegistrationLimit = request.body.registration_limit !== undefined
      ? request.body.registration_limit
      : existing.registration_limit
    const nextRedirectUrl = request.body.redirect_url !== undefined
      ? request.body.redirect_url
      : existing.redirect_url
    const nextDefaultCategoryId = request.body.default_category_id !== undefined
      ? request.body.default_category_id
      : existing.default_category_id

    if (nextDefaultCategoryId) {
      const category = await prisma.category.findFirst({
        where: { id: nextDefaultCategoryId, event_id }
      })
      if (!category) {
        return reply.status(400).send({ message: 'Categoria padrão inválida para este evento' })
      }
    }

    const currentFormFields = await prisma.formField.findMany({
      where: { registration_form_id: formId },
      orderBy: { order: 'asc' }
    })

    const nextFieldLayout = normalizeFieldLayoutForSave(
      request.body.field_layout
        ?? parseFieldLayout(existing.field_layout, nextStructuralConfig, currentFormFields),
      nextStructuralConfig,
      currentFormFields
    )

    const settingsValidation = validateFormSettings({
      name: request.body.name ?? existing.name,
      structural_config: nextStructuralConfig,
      field_layout: nextFieldLayout,
      registration_limit: nextRegistrationLimit,
      redirect_url: nextRedirectUrl,
      formFields: currentFormFields
    })
    if (!settingsValidation.ok) {
      return reply.status(400).send({ message: settingsValidation.message })
    }

    const limitValidation = validateRegistrationLimit(nextRegistrationLimit)
    if (!limitValidation.ok) {
      return reply.status(400).send({ message: limitValidation.message })
    }

    const redirectValidation = validateRedirectUrl(nextRedirectUrl)
    if (!redirectValidation.ok) {
      return reply.status(400).send({ message: redirectValidation.message })
    }

    const slugValidation = request.body.slug !== undefined
      ? validateFormSlug(request.body.slug)
      : { ok: true as const, value: existing.slug }
    if (!slugValidation.ok) {
      return reply.status(400).send({ message: slugValidation.message })
    }
    if (slugValidation.value) {
      const slugConflict = await prisma.registrationForm.findFirst({
        where: { slug: slugValidation.value, NOT: { id: formId } },
        select: { id: true }
      })
      if (slugConflict) {
        return reply.status(409).send({ message: 'Este link personalizado já está em uso' })
      }
    }

    const appearanceValidation = request.body.appearance !== undefined
      ? (isDesignV3(request.body.appearance) || (request.body.appearance && typeof request.body.appearance === 'object' && (request.body.appearance as Record<string, unknown>).version === 3)
          ? validateFormDesign(request.body.appearance)
          : validateFormAppearance(request.body.appearance))
      : { ok: true as const, value: existing.appearance }
    if (!appearanceValidation.ok) {
      return reply.status(400).send({ message: appearanceValidation.message })
    }

    if (request.body.status === 'active') {
      const publishValidation = validateFormForPublish({
        name: request.body.name ?? existing.name,
        structural_config: nextStructuralConfig,
        field_layout: nextFieldLayout,
        registration_limit: request.body.registration_limit !== undefined
          ? request.body.registration_limit
          : existing.registration_limit,
        redirect_url: request.body.redirect_url !== undefined
          ? request.body.redirect_url
          : existing.redirect_url,
        form_fields: currentFormFields
      })
      if (!publishValidation.ok) {
        return reply.status(400).send({ message: publishValidation.message })
      }
    }

    const updated = await prisma.registrationForm.update({
      where: { id: formId },
      data: {
        ...(request.body.name !== undefined && { name: request.body.name.trim() }),
        ...(request.body.status !== undefined && { status: request.body.status }),
        ...(request.body.structural_config !== undefined && {
          structural_config: nextStructuralConfig as unknown as Prisma.InputJsonValue
        }),
        ...(request.body.field_layout !== undefined && {
          field_layout: nextFieldLayout as unknown as Prisma.InputJsonValue
        }),
        ...(request.body.registration_limit !== undefined && {
          registration_limit: limitValidation.value
        }),
        ...(request.body.redirect_url !== undefined && {
          redirect_url: redirectValidation.value
        }),
        ...(request.body.default_category_id !== undefined && {
          default_category_id: nextDefaultCategoryId
        }),
        ...(request.body.slug !== undefined && {
          slug: slugValidation.value
        }),
        ...(request.body.appearance !== undefined && {
          appearance: appearanceValidation.value as unknown as Prisma.InputJsonValue
        }),
        ...(request.body.public_title !== undefined && {
          public_title: request.body.public_title?.trim() || null
        }),
        ...(request.body.public_description !== undefined && {
          public_description: request.body.public_description?.trim() || null
        }),
        ...(request.body.success_message !== undefined && {
          success_message: request.body.success_message?.trim() || null
        }),
        ...(request.body.submit_button_text !== undefined && {
          submit_button_text: request.body.submit_button_text?.trim() || null
        })
      },
      include: {
        default_category: { select: { id: true, name: true } },
        form_fields: { select: { id: true, order: true }, orderBy: { order: 'asc' } },
        _count: { select: { form_fields: true, registrations: true } }
      }
    })

    return serializeFormWithCapacity(updated)
  })

  app.withTypeProvider<ZodTypeProvider>().put('/events/:id/registration-forms/:formId/builder', {
    preHandler: [requireRoles('admin')],
    schema: {
      params: formParams,
      body: z.object({
        name: z.string().min(1).max(120),
        structural_config: structuralConfigSchema,
        field_layout: fieldLayoutSchema,
        registration_limit: registrationLimitSchema,
        redirect_url: redirectUrlSchema,
        default_category_id: z.preprocess(
          (value) => {
            if (value === undefined) return undefined
            if (value === null || value === '') return null
            return value
          },
          z.string().uuid().nullable().optional()
        ),
        slug: z.preprocess(
          (value) => {
            if (value === undefined) return undefined
            if (value === null || value === '') return null
            return value
          },
          z.string().max(80).nullable().optional()
        ),
        public_title: z.string().max(160).nullable().optional(),
        public_description: z.string().max(500).nullable().optional(),
        success_behavior: successBehaviorSchema.optional(),
        success_title: z.string().max(120).nullable().optional(),
        success_message: z.string().max(500).nullable().optional(),
        redirect_delay: redirectDelaySchema,
        submit_button_text: z.string().max(80).nullable().optional(),
        appearance: z.record(z.string(), z.unknown()).nullable().optional(),
        fields: z.array(z.object({
          id: z.string().uuid(),
          label: z.string().min(1).max(200),
          type: z.string(),
          required: z.boolean(),
          enabled: z.boolean(),
          placeholder: z.string().max(200).nullable().optional(),
          options: z.array(z.string()).optional()
        })),
        deleted_field_ids: z.array(z.string().uuid()).default([])
      })
    }
  }, async (request, reply) => {
    const { id: event_id, formId } = request.params
    const ctx = await requireEventInCompany(request, reply, event_id)
    if (!ctx) return

    const result = await saveRegistrationFormBuilder(event_id, formId, {
      name: request.body.name,
      structural_config: parseStructuralConfig(request.body.structural_config),
      field_layout: request.body.field_layout,
      registration_limit: request.body.registration_limit,
      redirect_url: request.body.redirect_url,
      default_category_id: request.body.default_category_id,
      slug: request.body.slug,
      public_title: request.body.public_title,
      public_description: request.body.public_description,
      success_behavior: request.body.success_behavior,
      success_title: request.body.success_title,
      success_message: request.body.success_message,
      redirect_delay: request.body.redirect_delay,
      submit_button_text: request.body.submit_button_text,
      appearance: request.body.appearance,
      fields: request.body.fields.map((field) => ({
        id: field.id,
        label: field.label,
        type: field.type as never,
        required: field.required,
        enabled: field.enabled,
        placeholder: field.placeholder,
        options: field.options
      })),
      deleted_field_ids: request.body.deleted_field_ids
    })

    if (!result.ok) {
      return reply.status(result.status).send({ message: result.message })
    }

    return serializeFormWithCapacity(result.form)
  })

  app.withTypeProvider<ZodTypeProvider>().post('/events/:id/registration-forms/:formId/publish', {
    preHandler: [requireRoles('admin')],
    schema: { params: formParams }
  }, async (request, reply) => {
    const { id: event_id, formId } = request.params
    const ctx = await requireEventInCompany(request, reply, event_id)
    if (!ctx) return

    const existing = await getFormInEvent(event_id, formId)
    if (!existing) {
      return reply.status(404).send({ message: 'Formulário não encontrado' })
    }

    const publishValidation = validateFormForPublish(existing)
    if (!publishValidation.ok) {
      return reply.status(400).send({ message: publishValidation.message })
    }

    const updated = await prisma.registrationForm.update({
      where: { id: formId },
      data: { status: 'active' },
      include: {
        form_fields: { select: { id: true, order: true }, orderBy: { order: 'asc' } },
        _count: { select: { form_fields: true, registrations: true } }
      }
    })

    return serializeFormWithCapacity(updated)
  })

  app.withTypeProvider<ZodTypeProvider>().post('/events/:id/registration-forms/:formId/publish-design', {
    preHandler: [requireRoles('admin')],
    schema: { params: formParams }
  }, async (request, reply) => {
    const { id: event_id, formId } = request.params
    const ctx = await requireEventInCompany(request, reply, event_id)
    if (!ctx) return

    const existing = await getFormInEvent(event_id, formId)
    if (!existing) {
      return reply.status(404).send({ message: 'Formulário não encontrado' })
    }

    if (!existing.appearance) {
      return reply.status(400).send({ message: 'Salve o design antes de publicar' })
    }

    const updated = await prisma.registrationForm.update({
      where: { id: formId },
      data: {
        published_appearance: existing.appearance as Prisma.InputJsonValue
      },
      include: {
        default_category: { select: { id: true, name: true } },
        form_fields: { select: { id: true, order: true }, orderBy: { order: 'asc' } },
        _count: { select: { form_fields: true, registrations: true } }
      }
    })

    return serializeFormWithCapacity(updated)
  })
}

async function serializeFormWithCapacity(form: Parameters<typeof serializeForm>[0]) {
  const serialized = serializeForm(form)
  const capacity = await getFormCapacityStats(prisma, form.id, form.registration_limit)
  return {
    ...serialized,
    active_registration_count: capacity.active_registration_count,
    available_slots: capacity.available_slots,
    is_full: capacity.is_full
  }
}

export { getFormInEvent, serializeForm, serializeFormWithCapacity }
