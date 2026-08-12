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
  status: RegistrationFormStatus
  structural_config: unknown
  field_layout: unknown
  registration_limit: number | null
  redirect_url: string | null
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
    status: form.status,
    structural_config: structuralConfig,
    field_layout: fieldLayout,
    registration_limit: form.registration_limit,
    redirect_url: form.redirect_url,
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
        redirect_url: redirectUrlSchema
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
        })
      },
      include: {
        form_fields: { select: { id: true, order: true }, orderBy: { order: 'asc' } },
        _count: { select: { form_fields: true, registrations: true } }
      }
    })

    return serializeFormWithCapacity(updated)
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
