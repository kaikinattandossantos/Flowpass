import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { Prisma, RegistrationFormStatus } from '../../../database'
import { prisma } from '../../../database'
import { requireEventInCompany, requireRoles } from '../lib/auth'
import { generatePublicId } from '../utils/public-id'
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
  required: z.boolean()
})

const structuralConfigSchema = z.object({
  name: structuralFieldSchema,
  email: structuralFieldSchema,
  phone: structuralFieldSchema,
  cpf: structuralFieldSchema,
  category: structuralFieldSchema
})

async function getFormInEvent(eventId: string, formId: string) {
  return prisma.registrationForm.findFirst({
    where: { id: formId, event_id: eventId },
    include: {
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
  created_at: Date
  updated_at: Date
  _count?: { form_fields: number; registrations: number }
}) {
  return {
    id: form.id,
    event_id: form.event_id,
    name: form.name,
    public_id: form.public_id,
    status: form.status,
    structural_config: parseStructuralConfig(form.structural_config),
    field_count: form._count?.form_fields ?? 0,
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
      include: { _count: { select: { form_fields: true, registrations: true } } },
      orderBy: { created_at: 'asc' }
    })

    return forms.map(serializeForm)
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

    const structuralConfig = request.body.structural_config ?? DEFAULT_STRUCTURAL_CONFIG
    structuralConfig.name = { enabled: true, required: true }

    const form = await prisma.registrationForm.create({
      data: {
        event_id,
        name: request.body.name.trim(),
        public_id: generatePublicId(),
        structural_config: structuralConfig as unknown as Prisma.InputJsonValue,
        status: 'active'
      },
      include: { _count: { select: { form_fields: true, registrations: true } } }
    })

    return serializeForm(form)
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

    return serializeForm(form)
  })

  app.withTypeProvider<ZodTypeProvider>().patch('/events/:id/registration-forms/:formId', {
    preHandler: [requireRoles('admin')],
    schema: {
      params: formParams,
      body: z.object({
        name: z.string().min(1).max(120).optional(),
        status: z.enum(['active', 'inactive']).optional(),
        structural_config: structuralConfigSchema.optional()
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

    let structuralConfig: StructuralConfig | undefined
    if (request.body.structural_config) {
      structuralConfig = parseStructuralConfig(request.body.structural_config)
      structuralConfig.name = { enabled: true, required: true }
    }

    const updated = await prisma.registrationForm.update({
      where: { id: formId },
      data: {
        ...(request.body.name !== undefined && { name: request.body.name.trim() }),
        ...(request.body.status !== undefined && { status: request.body.status }),
        ...(structuralConfig !== undefined && {
          structural_config: structuralConfig as unknown as Prisma.InputJsonValue
        })
      },
      include: { _count: { select: { form_fields: true, registrations: true } } }
    })

    return serializeForm(updated)
  })
}

export { getFormInEvent, serializeForm }
