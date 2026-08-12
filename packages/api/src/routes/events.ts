import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { prisma } from '../../../database'
import bcrypt from 'bcryptjs'
import {
  getJwtUser,
  requireCompanyContext,
  requireEventInCompany,
  requireRoles
} from '../lib/auth'
import { createDefaultRegistrationForm } from '../services/registration-form'

export async function eventRoutes(app: FastifyInstance) {
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
        status: true,
        company: { select: { status: true } },
        categories: { select: { id: true, name: true } },
        registration_forms: {
          select: { public_id: true, name: true, status: true },
          orderBy: { created_at: 'asc' },
          take: 1
        }
      }
    })
    if (!event || event.company.status === 'inactive') {
      return reply.status(404).send({ message: 'Evento não encontrado' })
    }
    const primaryForm = event.registration_forms[0]
    const { company: _, registration_forms, ...publicEvent } = event
    return {
      ...publicEvent,
      primary_form_public_id: primaryForm?.public_id ?? null
    }
  })

  app.withTypeProvider<ZodTypeProvider>().post('/events', {
    preHandler: [requireRoles('admin')],
    schema: {
      body: z.object({
        name: z.string(),
        description: z.string().optional(),
        start_at: z.string().datetime(),
        end_at: z.string().datetime(),
        location: z.string().optional(),
        image_url: z.string().url().optional(),
        max_capacity: z.number().optional(),
        is_paid: z.boolean().default(false),
        waitlist_enabled: z.boolean().default(false)
      })
    }
  }, async (request, reply) => {
    if (reply.sent) return

    const { company_id } = getJwtUser(request)
    const data = request.body

    const event = await prisma.event.create({
      data: {
        ...data,
        company_id: company_id!,
        status: 'active',
        start_at: new Date(data.start_at),
        end_at: new Date(data.end_at)
      }
    })

    await createDefaultRegistrationForm(event.id)

    return event
  })

  app.withTypeProvider<ZodTypeProvider>().get('/events', {
    preHandler: [requireCompanyContext]
  }, async (request, reply) => {
    if (reply.sent) return

    const { company_id, role } = getJwtUser(request)

    if (role === 'operator') {
      const operatorEvents = await prisma.operator.findMany({
        where: { user_id: getJwtUser(request).sub, active: true },
        select: { event_id: true }
      })
      const eventIds = operatorEvents.map(o => o.event_id)
      return prisma.event.findMany({
        where: { company_id: company_id!, id: { in: eventIds }, status: 'active' },
        orderBy: { created_at: 'desc' }
      })
    }

    return prisma.event.findMany({
      where: { company_id: company_id! },
      orderBy: { created_at: 'desc' }
    })
  })

  app.withTypeProvider<ZodTypeProvider>().get('/events/:id', {
    preHandler: [requireCompanyContext],
    schema: {
      params: z.object({ id: z.string().uuid() })
    }
  }, async (request, reply) => {
    const { id } = request.params
    const ctx = await requireEventInCompany(request, reply, id)
    if (!ctx) return

    const event = await prisma.event.findFirst({
      where: { id, company_id: ctx.user.company_id! },
      include: {
        categories: true,
        registration_links: {
          include: { default_category: { select: { id: true, name: true } } }
        },
        access_points: {
          include: {
            categories: { include: { category: { select: { id: true, name: true } } } }
          }
        },
        registration_forms: {
          include: {
            _count: { select: { form_fields: true, registrations: true } }
          },
          orderBy: { created_at: 'asc' }
        },
        registrations: { orderBy: { created_at: 'desc' } },
        operators: { include: { user: true } }
      }
    })

    return event
  })

  app.withTypeProvider<ZodTypeProvider>().post('/events/:id/categories', {
    preHandler: [requireRoles('admin')],
    schema: {
      params: z.object({ id: z.string().uuid() }),
      body: z.object({
        name: z.string(),
        description: z.string().optional(),
        max_capacity: z.number().optional(),
        color: z.string().optional()
      })
    }
  }, async (request, reply) => {
    const { id: event_id } = request.params
    const ctx = await requireEventInCompany(request, reply, event_id)
    if (!ctx) return

    return prisma.category.create({
      data: { ...request.body, event_id }
    })
  })

  app.withTypeProvider<ZodTypeProvider>().post('/events/:id/operators', {
    preHandler: [requireRoles('admin')],
    schema: {
      params: z.object({ id: z.string().uuid() }),
      body: z.object({
        name: z.string(),
        email: z.string().email()
      })
    }
  }, async (request, reply) => {
    const { id: event_id } = request.params
    const ctx = await requireEventInCompany(request, reply, event_id)
    if (!ctx) return

    const { company_id } = ctx.user
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
    preHandler: [requireRoles('admin', 'viewer')],
    schema: { params: z.object({ id: z.string().uuid() }) }
  }, async (request, reply) => {
    const { id: event_id } = request.params
    const ctx = await requireEventInCompany(request, reply, event_id)
    if (!ctx) return

    return prisma.operator.findMany({
      where: { event_id },
      include: { user: true }
    })
  })

  app.withTypeProvider<ZodTypeProvider>().delete('/events/:id/operators/:opId', {
    preHandler: [requireRoles('admin')],
    schema: {
      params: z.object({ id: z.string().uuid(), opId: z.string().uuid() })
    }
  }, async (request, reply) => {
    const { id: event_id, opId } = request.params
    const ctx = await requireEventInCompany(request, reply, event_id)
    if (!ctx) return

    const operator = await prisma.operator.findFirst({
      where: { id: opId, event_id }
    })
    if (!operator) {
      return reply.status(404).send({ message: 'Operador não encontrado' })
    }

    await prisma.operator.update({
      where: { id: opId },
      data: { active: false }
    })
    return reply.status(204).send()
  })
}
