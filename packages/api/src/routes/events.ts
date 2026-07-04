import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { prisma } from '../../../database'
import bcrypt from 'bcryptjs'
import { getJwtUser, requireCompanyUser } from '../utils/auth'

export async function eventRoutes(app: FastifyInstance) {
  const requireAuth = async (request: FastifyRequest, reply: FastifyReply) => {
    const companyId = await requireCompanyUser(request, reply)
    if (typeof companyId !== 'string') return
  }

  // Public event details for registration form
  app.withTypeProvider<ZodTypeProvider>().get('/events/:id/public', {
    schema: {
      params: z.object({ id: z.string().uuid() })
    }
  }, async (request, reply) => {
    const { id } = request.params
    const event = await prisma.event.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        description: true,
        start_at: true,
        location: true,
        categories: { select: { id: true, name: true } },
        form_fields: { select: { id: true, label: true, type: true, required: true, options: true, order: true } }
      }
    })
    if (!event) return reply.status(404).send({ message: 'Evento não encontrado' })
    return event
  })

  app.withTypeProvider<ZodTypeProvider>().post('/events', {
    preHandler: [requireAuth],
    schema: {
      body: z.object({
        name: z.string(),
        description: z.string().optional(),
        start_at: z.string().datetime(),
        end_at: z.string().datetime(),
        location: z.string().optional(),
        max_capacity: z.number().optional(),
        is_paid: z.boolean().default(false),
        waitlist_enabled: z.boolean().default(false)
      })
    }
  }, async (request) => {
    const { company_id } = getJwtUser(request)
    const data = request.body

    const event = await prisma.event.create({
      data: {
        ...data,
        company_id,
        status: 'active',
        start_at: new Date(data.start_at),
        end_at: new Date(data.end_at)
      }
    })

    return event
  })

  app.withTypeProvider<ZodTypeProvider>().get('/events', {
    preHandler: [requireAuth]
  }, async (request) => {
    const { company_id } = getJwtUser(request)
    return await prisma.event.findMany({
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

  // Categories
  app.withTypeProvider<ZodTypeProvider>().post('/events/:id/categories', {
    preHandler: [requireAuth],
    schema: {
      params: z.object({ id: z.string().uuid() }),
      body: z.object({
        name: z.string(),
        max_capacity: z.number().optional(),
        color: z.string().optional()
      })
    }
  }, async (request) => {
    const { id: event_id } = request.params
    return await prisma.category.create({
      data: { ...request.body, event_id }
    })
  })

  // Operators
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
        company_id,
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
    return await prisma.operator.findMany({
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
