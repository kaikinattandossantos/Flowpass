import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { prisma } from '../../../database'
import bcrypt from 'bcryptjs'
import { getJwtUser, requireCompanyUser } from '../utils/auth'
import { formatEventAddress, normalizeCep } from '../utils/address'
import { optionalPositiveInt } from '../utils/zod'

const categorySchema = z.object({
  name: z.string().min(1),
  max_capacity: optionalPositiveInt,
  color: z.string().optional()
})

const eventBodySchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  start_at: z.string().datetime(),
  end_at: z.string().datetime(),
  cep: z.string().min(8),
  street: z.string().min(1),
  number: z.string().min(1),
  complement: z.string().optional(),
  neighborhood: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  banner_color: z.string().optional(),
  accent_color: z.string().optional(),
  welcome_message: z.string().optional(),
  max_capacity: optionalPositiveInt,
  is_paid: z.boolean().default(false),
  waitlist_enabled: z.boolean().default(false),
  status: z.enum(['draft', 'active']).default('active'),
  categories: z.array(categorySchema).min(1)
})

const publicEventSelect = {
  id: true,
  name: true,
  description: true,
  start_at: true,
  location: true,
  cep: true,
  street: true,
  number: true,
  complement: true,
  neighborhood: true,
  city: true,
  state: true,
  banner_color: true,
  accent_color: true,
  welcome_message: true,
  categories: { select: { id: true, name: true, color: true } },
  form_fields: {
    select: {
      id: true,
      label: true,
      type: true,
      required: true,
      options: true,
      order: true
    }
  }
} as const

export async function eventRoutes(app: FastifyInstance) {
  const requireAuth = async (request: FastifyRequest, reply: FastifyReply) => {
    const companyId = await requireCompanyUser(request, reply)
    if (typeof companyId !== 'string') return
  }

  app.withTypeProvider<ZodTypeProvider>().get('/events/:id/public', {
    schema: {
      params: z.object({ id: z.string().uuid() })
    }
  }, async (request, reply) => {
    const { id } = request.params
    const event = await prisma.event.findUnique({
      where: { id, status: 'active' },
      select: publicEventSelect
    })
    if (!event) return reply.status(404).send({ message: 'Evento não encontrado' })
    return event
  })

  app.withTypeProvider<ZodTypeProvider>().post('/events', {
    preHandler: [requireAuth],
    schema: { body: eventBodySchema }
  }, async (request, reply) => {
    const { company_id } = getJwtUser(request)
    const data = request.body

    const normalizedCep = normalizeCep(data.cep)
    if (normalizedCep.length !== 8) {
      return reply.status(400).send({ message: 'CEP inválido. Informe 8 dígitos.' })
    }

    const startAt = new Date(data.start_at)
    const endAt = new Date(data.end_at)
    if (endAt <= startAt) {
      return reply.status(400).send({ message: 'A data de fim deve ser posterior à data de início.' })
    }

    const address = {
      street: data.street.trim(),
      number: data.number.trim(),
      complement: data.complement?.trim() || null,
      neighborhood: data.neighborhood?.trim() || null,
      city: data.city?.trim() || null,
      state: data.state?.trim() || null,
      cep: normalizedCep
    }

    const event = await prisma.event.create({
      data: {
        company_id: company_id!,
        name: data.name.trim(),
        description: data.description?.trim() || null,
        start_at: startAt,
        end_at: endAt,
        ...address,
        location: formatEventAddress(address),
        banner_color: data.banner_color || '#0B1F3A',
        accent_color: data.accent_color || '#00C896',
        welcome_message: data.welcome_message?.trim() || null,
        max_capacity: data.max_capacity,
        is_paid: data.is_paid,
        waitlist_enabled: data.waitlist_enabled,
        status: data.status,
        categories: {
          create: data.categories.map((category) => ({
            name: category.name.trim(),
            max_capacity: category.max_capacity,
            color: category.color || '#00C896'
          }))
        }
      },
      include: { categories: true }
    })

    return event
  })

  app.withTypeProvider<ZodTypeProvider>().get('/events', {
    preHandler: [requireAuth]
  }, async (request) => {
    const { company_id } = getJwtUser(request)
    return prisma.event.findMany({
      where: { company_id },
      orderBy: { created_at: 'desc' }
    })
  })

  app.withTypeProvider<ZodTypeProvider>().get('/events/:id', {
    preHandler: [requireAuth],
    schema: {
      params: z.object({ id: z.string().uuid() })
    }
  }, async (request, reply) => {
    const { id } = request.params
    const { company_id } = getJwtUser(request)

    const event = await prisma.event.findFirst({
      where: { id, company_id },
      include: {
        categories: true,
        form_fields: true,
        registrations: {
          orderBy: { created_at: 'desc' }
        },
        operators: {
          include: { user: true }
        }
      }
    })

    if (!event) return reply.status(404).send({ message: 'Evento não encontrado' })
    return event
  })

  app.withTypeProvider<ZodTypeProvider>().post('/events/:id/categories', {
    preHandler: [requireAuth],
    schema: {
      params: z.object({ id: z.string().uuid() }),
      body: categorySchema
    }
  }, async (request, reply) => {
    const { id: event_id } = request.params
    const { company_id } = getJwtUser(request)

    const event = await prisma.event.findFirst({
      where: { id: event_id, company_id }
    })

    if (!event) return reply.status(404).send({ message: 'Evento não encontrado' })

    return prisma.category.create({
      data: {
        event_id,
        name: request.body.name.trim(),
        max_capacity: request.body.max_capacity,
        color: request.body.color || '#00C896'
      }
    })
  })

  app.withTypeProvider<ZodTypeProvider>().post('/events/:id/operators', {
    preHandler: [requireAuth],
    schema: {
      params: z.object({ id: z.string().uuid() }),
      body: z.object({
        name: z.string(),
        email: z.string().email()
      })
    }
  }, async (request) => {
    const { id: event_id } = request.params
    const { company_id } = getJwtUser(request)
    const { name, email } = request.body

    const temp_password = Math.random().toString(36).substring(2, 10)
    const password_hash = await bcrypt.hash(temp_password, 10)

    const user = await prisma.user.create({
      data: {
        company_id: company_id!,
        name,
        email,
        password_hash,
        role: 'operator'
      }
    })

    const operator = await prisma.operator.create({
      data: {
        event_id,
        user_id: user.id,
        name,
        email,
        temp_password,
        active: true
      }
    })

    return { ...operator, temp_password }
  })

  app.withTypeProvider<ZodTypeProvider>().get('/events/:id/operators', {
    preHandler: [requireAuth],
    schema: { params: z.object({ id: z.string().uuid() }) }
  }, async (request) => {
    const { id: event_id } = request.params
    return prisma.operator.findMany({
      where: { event_id },
      include: { user: true }
    })
  })

  app.withTypeProvider<ZodTypeProvider>().delete('/events/:id/operators/:opId', {
    preHandler: [requireAuth],
    schema: {
      params: z.object({ id: z.string().uuid(), opId: z.string().uuid() })
    }
  }, async (request, reply) => {
    const { opId } = request.params
    await prisma.operator.update({
      where: { id: opId },
      data: { active: false }
    })
    return reply.status(204).send()
  })
}