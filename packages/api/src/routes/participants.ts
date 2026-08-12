import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { prisma, Prisma } from '../../../database'
import { requireEventInCompany, requireRoles } from '../lib/auth'
import { validateFormData } from '../utils/validate-form-data'
import { formatParticipant } from '../utils/participant'
import { executeImportRows, loadImportFormContext, previewImportRows } from '../services/import-participants'
import {
  createRegistrationRecord,
  DuplicateParticipantError,
  findDuplicateRegistration,
  getRegistrationQrImage,
  RegistrationLimitError
} from '../services/registration-create'
import { getPrimaryRegistrationForm } from '../services/registration-form'
import { parseStructuralConfig } from '../utils/structural-config'
import {
  resolveStructuralValues,
  validateCpfWhenEnabled,
  validateResolvedStructuralValues
} from '../utils/resolve-structural-values'

const eventIdParam = z.object({ id: z.string().uuid() })
const participantIdParam = z.object({
  id: z.string().uuid(),
  participantId: z.string().uuid()
})

const participantBodySchema = z.object({
  category_id: z.string().uuid().optional(),
  name: z.string().min(1),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional(),
  cpf: z.string().optional(),
  status: z.enum(['pending', 'confirmed', 'cancelled']).optional(),
  registration_form_id: z.string().uuid().optional(),
  form_data: z.record(z.string(), z.any()).default({})
})

const importMappingSchema = z.object({
  name: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  cpf: z.string().optional(),
  category: z.string().optional(),
  form_fields: z.record(z.string(), z.string()).default({})
})

async function getParticipantOr404(eventId: string, participantId: string) {
  return prisma.registration.findFirst({
    where: { id: participantId, event_id: eventId },
    include: {
      category: { select: { id: true, name: true } },
      registration_form: { select: { id: true, name: true } }
    }
  })
}

async function loadParticipantFormContext(eventId: string, registrationFormId?: string | null) {
  const form = registrationFormId
    ? await prisma.registrationForm.findFirst({ where: { id: registrationFormId, event_id: eventId } })
    : await getPrimaryRegistrationForm(eventId)

  if (!form) return null

  const formFields = await prisma.formField.findMany({
    where: { registration_form_id: form.id },
    orderBy: { order: 'asc' }
  })

  return {
    form,
    structuralConfig: parseStructuralConfig(form.structural_config),
    formFields
  }
}

export async function participantRoutes(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().get('/events/:id/participants', {
    preHandler: [requireRoles('admin', 'viewer')],
    schema: {
      params: eventIdParam,
      querystring: z.object({
        search: z.string().optional(),
        status: z.enum(['pending', 'confirmed', 'cancelled']).optional()
      })
    }
  }, async (request, reply) => {
    const { id: event_id } = request.params
    const ctx = await requireEventInCompany(request, reply, event_id)
    if (!ctx) return

    const { search, status } = request.query

    const where: Prisma.RegistrationWhereInput = { event_id }
    if (status) where.status = status
    if (search?.trim()) {
      const term = search.trim()
      where.OR = [
        { name: { contains: term, mode: 'insensitive' } },
        { email: { contains: term, mode: 'insensitive' } },
        { phone: { contains: term } },
        { cpf: { contains: term.replace(/\D/g, '') } }
      ]
    }

    const participants = await prisma.registration.findMany({
      where,
      include: {
        category: { select: { id: true, name: true } },
        registration_form: { select: { id: true, name: true } }
      },
      orderBy: { created_at: 'desc' }
    })

    return participants.map(formatParticipant)
  })

  app.withTypeProvider<ZodTypeProvider>().get('/events/:id/participants/:participantId', {
    preHandler: [requireRoles('admin', 'viewer')],
    schema: { params: participantIdParam }
  }, async (request, reply) => {
    const { id: event_id, participantId } = request.params
    const ctx = await requireEventInCompany(request, reply, event_id)
    if (!ctx) return

    const participant = await getParticipantOr404(event_id, participantId)
    if (!participant) {
      return reply.status(404).send({ message: 'Participante não encontrado' })
    }

    return formatParticipant(participant)
  })

  app.withTypeProvider<ZodTypeProvider>().post('/events/:id/participants', {
    preHandler: [requireRoles('admin')],
    schema: {
      params: eventIdParam,
      body: participantBodySchema
    }
  }, async (request, reply) => {
    const { id: event_id } = request.params
    const ctx = await requireEventInCompany(request, reply, event_id)
    if (!ctx) return

    const data = request.body

    const formContext = await loadParticipantFormContext(event_id, data.registration_form_id)
    if (!formContext) {
      return reply.status(400).send({ message: 'Formulário inválido para este evento' })
    }

    const { structuralConfig, formFields } = formContext

    const validation = validateFormData(formFields, data.form_data ?? {})
    if (!validation.ok) {
      return reply.status(400).send({ message: validation.message })
    }

    let categoryId: string | null = null
    if (structuralConfig.category.enabled && data.category_id) {
      const category = await prisma.category.findFirst({
        where: { id: data.category_id, event_id }
      })
      if (!category) {
        return reply.status(400).send({ message: 'Categoria inválida' })
      }
      categoryId = category.id
    }

    const resolved = resolveStructuralValues(structuralConfig, {
      name: data.name,
      email: data.email ?? undefined,
      phone: data.phone,
      cpf: data.cpf,
      category_id: categoryId
    })

    const cpfValidation = validateCpfWhenEnabled(
      structuralConfig,
      structuralConfig.cpf.enabled ? data.cpf : undefined,
      resolved.cpf
    )
    if (!cpfValidation.ok) {
      return reply.status(400).send({ message: cpfValidation.message })
    }

    const structuralValidation = validateResolvedStructuralValues(structuralConfig, resolved)
    if (!structuralValidation.ok) {
      return reply.status(400).send({ message: structuralValidation.message })
    }

    try {
      const created = await createRegistrationRecord({
        event_id,
        registration_form_id: formContext.form.id,
        category_id: resolved.category_id,
        name: resolved.name,
        email: resolved.email,
        phone: resolved.phone,
        cpf: resolved.cpf,
        form_data: validation.data,
        origin: 'MANUAL',
        status: data.status ?? 'confirmed',
        sendNotifications: false,
        formFields
      })
      return formatParticipant(created)
    } catch (err) {
      if (err instanceof DuplicateParticipantError) {
        return reply.status(409).send({ message: err.message })
      }
      if (err instanceof RegistrationLimitError) {
        return reply.status(403).send({ message: err.message })
      }
      throw err
    }
  })

  app.withTypeProvider<ZodTypeProvider>().patch('/events/:id/participants/:participantId', {
    preHandler: [requireRoles('admin')],
    schema: {
      params: participantIdParam,
      body: participantBodySchema.partial()
    }
  }, async (request, reply) => {
    const { id: event_id, participantId } = request.params
    const ctx = await requireEventInCompany(request, reply, event_id)
    if (!ctx) return

    const existing = await getParticipantOr404(event_id, participantId)
    if (!existing) {
      return reply.status(404).send({ message: 'Participante não encontrado' })
    }

    const data = request.body
    const formContext = await loadParticipantFormContext(event_id, existing.registration_form_id)
    const formFields = formContext?.formFields ?? []

    let formData = existing.form_data as Record<string, unknown>
    if (data.form_data !== undefined) {
      const validation = validateFormData(formFields, data.form_data)
      if (!validation.ok) {
        return reply.status(400).send({ message: validation.message })
      }
      formData = validation.data
    }

    const structuralConfig = formContext?.structuralConfig ?? parseStructuralConfig(null)

    let categoryId = existing.category_id
    if (data.category_id !== undefined) {
      if (structuralConfig.category.enabled) {
        const category = await prisma.category.findFirst({
          where: { id: data.category_id, event_id }
        })
        if (!category) {
          return reply.status(400).send({ message: 'Categoria inválida' })
        }
        categoryId = category.id
      } else {
        categoryId = null
      }
    }

    const resolved = resolveStructuralValues(structuralConfig, {
      name: data.name ?? existing.name,
      email: data.email !== undefined ? (data.email ?? undefined) : (existing.email ?? undefined),
      phone: data.phone !== undefined ? data.phone : (existing.phone ?? undefined),
      cpf: data.cpf !== undefined ? data.cpf : (existing.cpf ?? undefined),
      category_id: categoryId
    })

    const cpfValidation = validateCpfWhenEnabled(
      structuralConfig,
      data.cpf !== undefined ? data.cpf : undefined,
      resolved.cpf
    )
    if (!cpfValidation.ok) {
      return reply.status(400).send({ message: cpfValidation.message })
    }

    const structuralValidation = validateResolvedStructuralValues(structuralConfig, resolved)
    if (!structuralValidation.ok) {
      return reply.status(400).send({ message: structuralValidation.message })
    }

    const duplicate = await findDuplicateRegistration(event_id, resolved.email, resolved.cpf)
    if (duplicate && duplicate.id !== participantId) {
      return reply.status(409).send({ message: 'Participante já cadastrado neste evento' })
    }

    const updated = await prisma.registration.update({
      where: { id: participantId },
      data: {
        name: resolved.name,
        email: resolved.email,
        phone: resolved.phone,
        cpf: resolved.cpf,
        category_id: resolved.category_id,
        ...(data.status !== undefined && { status: data.status }),
        form_data: formData as Prisma.InputJsonValue
      },
      include: {
        category: { select: { id: true, name: true } },
        registration_form: { select: { id: true, name: true } }
      }
    })

    return formatParticipant(updated)
  })

  app.withTypeProvider<ZodTypeProvider>().delete('/events/:id/participants/:participantId', {
    preHandler: [requireRoles('admin')],
    schema: { params: participantIdParam }
  }, async (request, reply) => {
    const { id: event_id, participantId } = request.params
    const ctx = await requireEventInCompany(request, reply, event_id)
    if (!ctx) return

    const existing = await getParticipantOr404(event_id, participantId)
    if (!existing) {
      return reply.status(404).send({ message: 'Participante não encontrado' })
    }

    await prisma.registration.update({
      where: { id: participantId },
      data: { status: 'cancelled' }
    })

    return reply.status(204).send()
  })

  app.withTypeProvider<ZodTypeProvider>().get('/events/:id/participants/:participantId/qr', {
    preHandler: [requireRoles('admin', 'viewer')],
    schema: { params: participantIdParam }
  }, async (request, reply) => {
    const { id: event_id, participantId } = request.params
    const ctx = await requireEventInCompany(request, reply, event_id)
    if (!ctx) return

    const qr = await getRegistrationQrImage(participantId, event_id)
    if (!qr) {
      return reply.status(404).send({ message: 'QR Code não disponível' })
    }

    return qr
  })

  const importBodySchema = z.object({
    registration_form_id: z.string().uuid(),
    mapping: importMappingSchema,
    rows: z.array(z.record(z.string(), z.string())).min(1)
  })

  app.withTypeProvider<ZodTypeProvider>().post('/events/:id/participants/import/preview', {
    preHandler: [requireRoles('admin')],
    schema: {
      params: eventIdParam,
      body: importBodySchema
    }
  }, async (request, reply) => {
    const { id: event_id } = request.params
    const ctx = await requireEventInCompany(request, reply, event_id)
    if (!ctx) return

    const { registration_form_id, mapping, rows } = request.body

    const formContext = await loadImportFormContext(event_id, registration_form_id)
    if (!formContext) {
      return reply.status(404).send({ message: 'Formulário não encontrado' })
    }

    try {
      const preview = await previewImportRows(event_id, mapping, rows, formContext)
      return preview
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao validar importação'
      return reply.status(400).send({ message })
    }
  })

  app.withTypeProvider<ZodTypeProvider>().post('/events/:id/participants/import', {
    preHandler: [requireRoles('admin')],
    schema: {
      params: eventIdParam,
      body: importBodySchema
    }
  }, async (request, reply) => {
    const { id: event_id } = request.params
    const ctx = await requireEventInCompany(request, reply, event_id)
    if (!ctx) return

    const { registration_form_id, mapping, rows } = request.body

    const formContext = await loadImportFormContext(event_id, registration_form_id)
    if (!formContext) {
      return reply.status(404).send({ message: 'Formulário não encontrado' })
    }

    try {
      const report = await executeImportRows(
        event_id,
        mapping,
        rows,
        formContext,
        async (data) => {
          await createRegistrationRecord({
            event_id,
            registration_form_id,
            category_id: data.category_id,
            name: data.name,
            email: data.email,
            phone: data.phone,
            cpf: data.cpf,
            form_data: data.form_data,
            origin: 'IMPORT',
            status: 'confirmed',
            sendNotifications: false,
            skipDuplicateCheck: true,
            formFields: formContext.formFields
          })
        }
      )
      return report
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao importar participantes'
      return reply.status(400).send({ message })
    }
  })
}
