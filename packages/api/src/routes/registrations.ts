import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { getSocketIo } from '../lib/socket'
import { getJwtUser, requireEventInCompany, requireRoles } from '../lib/auth'
import { validateFormData } from '../utils/validate-form-data'
import { prisma } from '../../../database'
import {
  createRegistrationRecord,
  DuplicateParticipantError
} from '../services/registration-create'
import { getPrimaryRegistrationForm } from '../services/registration-form'
import { parseStructuralConfig } from '../utils/structural-config'
import {
  resolveStructuralValues,
  validateCpfWhenEnabled,
  validateResolvedStructuralValues
} from '../utils/resolve-structural-values'
import { formatParticipant } from '../utils/participant'

export async function registrationRoutes(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().post('/events/:id/registrations', {
    schema: {
      params: z.object({ id: z.string().uuid() }),
      body: z.object({
        category_id: z.string().uuid().optional(),
        name: z.string(),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        form_data: z.record(z.string(), z.any())
      })
    }
  }, async (request, reply) => {
    const { id: event_id } = request.params
    const data = request.body

    const primaryForm = await getPrimaryRegistrationForm(event_id)
    if (!primaryForm) {
      return reply.status(404).send({ message: 'Formulário não encontrado para este evento' })
    }

    const structuralConfig = parseStructuralConfig(primaryForm.structural_config)

    const formFields = await prisma.formField.findMany({
      where: { registration_form_id: primaryForm.id },
      orderBy: { order: 'asc' }
    })

    const formValidation = validateFormData(formFields, data.form_data ?? {})
    if (!formValidation.ok) {
      return reply.status(400).send({ message: formValidation.message })
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
      email: data.email,
      phone: data.phone,
      cpf: undefined,
      category_id: categoryId
    })

    const structuralValidation = validateResolvedStructuralValues(structuralConfig, resolved)
    if (!structuralValidation.ok) {
      return reply.status(400).send({ message: structuralValidation.message })
    }

    try {
      const created = await createRegistrationRecord({
        event_id,
        registration_form_id: primaryForm.id,
        category_id: resolved.category_id,
        name: resolved.name,
        email: resolved.email,
        phone: resolved.phone,
        form_data: formValidation.data,
        origin: 'PUBLIC_FORM',
        status: 'confirmed',
        sendNotifications: true,
        formFields
      })
      return formatParticipant(created)
    } catch (err) {
      if (err instanceof DuplicateParticipantError) {
        return reply.status(409).send({ message: err.message })
      }
      if (err instanceof Error && err.message === 'Evento não encontrado') {
        return reply.status(404).send({ message: err.message })
      }
      if (err instanceof Error && err.message.includes('Categoria')) {
        return reply.status(400).send({ message: err.message })
      }
      throw err
    }
  })

  app.withTypeProvider<ZodTypeProvider>().get('/events/:id/sync', {
    preHandler: [requireRoles('admin', 'operator')],
    schema: {
      params: z.object({ id: z.string().uuid() })
    }
  }, async (request, reply) => {
    const { id: event_id } = request.params
    const ctx = await requireEventInCompany(request, reply, event_id)
    if (!ctx) return

    if (ctx.user.role === 'operator') {
      const assigned = await prisma.operator.findFirst({
        where: { event_id, user_id: ctx.user.sub, active: true }
      })
      if (!assigned) {
        return reply.status(403).send({ message: 'Operador não vinculado a este evento' })
      }
    }

    const registrations = await prisma.registration.findMany({
      where: { event_id, status: 'confirmed' },
      select: {
        qr_token: true,
        name: true,
        category: { select: { name: true } }
      }
    })

    return registrations.map((r) => ({
      t: r.qr_token,
      n: r.name,
      c: r.category?.name ?? ''
    }))
  })

  app.withTypeProvider<ZodTypeProvider>().post('/events/:id/checkins', {
    preHandler: [requireRoles('admin', 'operator')],
    schema: {
      params: z.object({ id: z.string().uuid() }),
      body: z.array(z.object({
        uuid: z.string(),
        qr_token: z.string(),
        checked_at: z.string().datetime(),
        device_id: z.string().optional()
      }))
    }
  }, async (request, reply) => {
    const { id: event_id } = request.params
    const ctx = await requireEventInCompany(request, reply, event_id)
    if (!ctx) return

    let operatorId: string | null = null
    if (ctx.user.role === 'operator') {
      const operator = await prisma.operator.findFirst({
        where: { event_id, user_id: ctx.user.sub, active: true }
      })
      if (!operator) {
        return reply.status(403).send({ message: 'Operador não vinculado a este evento' })
      }
      operatorId = operator.id
    }

    const checkins = request.body
    const results = []

    for (const checkin of checkins) {
      const registration = await prisma.registration.findFirst({
        where: { qr_token: checkin.qr_token, event_id },
        include: { category: true }
      })

      if (!registration) continue

      const existing = await prisma.checkIn.findUnique({
        where: { uuid: checkin.uuid }
      })

      if (!existing) {
        const newCheckin = await prisma.checkIn.create({
          data: {
            registration_id: registration.id,
            operator_id: operatorId,
            device_id: checkin.device_id,
            checked_at: new Date(checkin.checked_at),
            uuid: checkin.uuid,
            synced_at: new Date()
          }
        })

        const socketIo = getSocketIo()
        socketIo?.of(`/events/${event_id}`).emit('checkin', {
          registration_id: registration.id,
          name: registration.name,
          category: registration.category?.name ?? '',
          checked_at: newCheckin.checked_at,
          operator_name: 'Operator'
        })

        results.push(newCheckin)
      }
    }

    return { synced: results.length }
  })
}
