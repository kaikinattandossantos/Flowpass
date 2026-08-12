import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { prisma } from '../../../database'
import { requireEventInCompany, requireRoles } from '../lib/auth'
import { slugify } from '../utils/slug'

export async function eventSetupRoutes(app: FastifyInstance) {
  const eventIdParam = z.object({ id: z.string().uuid() })

  // --- Categories ---

  app.withTypeProvider<ZodTypeProvider>().get('/events/:id/categories', {
    preHandler: [requireRoles('admin', 'viewer')],
    schema: { params: eventIdParam }
  }, async (request, reply) => {
    const { id: event_id } = request.params
    const ctx = await requireEventInCompany(request, reply, event_id)
    if (!ctx) return

    return prisma.category.findMany({
      where: { event_id },
      orderBy: { name: 'asc' }
    })
  })

  app.withTypeProvider<ZodTypeProvider>().patch('/events/:id/categories/:catId', {
    preHandler: [requireRoles('admin')],
    schema: {
      params: z.object({ id: z.string().uuid(), catId: z.string().uuid() }),
      body: z.object({
        name: z.string().min(1).optional(),
        description: z.string().optional(),
        max_capacity: z.number().optional(),
        color: z.string().optional()
      })
    }
  }, async (request, reply) => {
    const { id: event_id, catId } = request.params
    const ctx = await requireEventInCompany(request, reply, event_id)
    if (!ctx) return

    const category = await prisma.category.findFirst({ where: { id: catId, event_id } })
    if (!category) return reply.status(404).send({ message: 'Categoria não encontrada' })

    return prisma.category.update({ where: { id: catId }, data: request.body })
  })

  app.withTypeProvider<ZodTypeProvider>().delete('/events/:id/categories/:catId', {
    preHandler: [requireRoles('admin')],
    schema: {
      params: z.object({ id: z.string().uuid(), catId: z.string().uuid() })
    }
  }, async (request, reply) => {
    const { id: event_id, catId } = request.params
    const ctx = await requireEventInCompany(request, reply, event_id)
    if (!ctx) return

    const category = await prisma.category.findFirst({ where: { id: catId, event_id } })
    if (!category) return reply.status(404).send({ message: 'Categoria não encontrada' })

    await prisma.category.delete({ where: { id: catId } })
    return reply.status(204).send()
  })

  // --- Registration Links ---

  app.withTypeProvider<ZodTypeProvider>().get('/events/:id/registration-links', {
    preHandler: [requireRoles('admin', 'viewer')],
    schema: { params: eventIdParam }
  }, async (request, reply) => {
    const { id: event_id } = request.params
    const ctx = await requireEventInCompany(request, reply, event_id)
    if (!ctx) return

    return prisma.registrationLink.findMany({
      where: { event_id },
      include: { default_category: { select: { id: true, name: true } } },
      orderBy: { name: 'asc' }
    })
  })

  app.withTypeProvider<ZodTypeProvider>().post('/events/:id/registration-links', {
    preHandler: [requireRoles('admin')],
    schema: {
      params: eventIdParam,
      body: z.object({
        name: z.string().min(1),
        slug: z.string().min(1).optional(),
        description: z.string().optional(),
        active: z.boolean().default(true),
        default_category_id: z.string().uuid().optional(),
        form_mode: z.enum(['shared', 'own']).default('shared')
      })
    }
  }, async (request, reply) => {
    const { id: event_id } = request.params
    const ctx = await requireEventInCompany(request, reply, event_id)
    if (!ctx) return

    const { name, slug: rawSlug, default_category_id, ...rest } = request.body
    const slug = slugify(rawSlug || name)

    if (default_category_id) {
      const cat = await prisma.category.findFirst({ where: { id: default_category_id, event_id } })
      if (!cat) return reply.status(400).send({ message: 'Categoria padrão inválida' })
    }

    try {
      return await prisma.registrationLink.create({
        data: { event_id, name, slug, default_category_id, ...rest },
        include: { default_category: { select: { id: true, name: true } } }
      })
    } catch {
      return reply.status(409).send({ message: 'Slug já existe neste evento' })
    }
  })

  app.withTypeProvider<ZodTypeProvider>().patch('/events/:id/registration-links/:linkId', {
    preHandler: [requireRoles('admin')],
    schema: {
      params: z.object({ id: z.string().uuid(), linkId: z.string().uuid() }),
      body: z.object({
        name: z.string().min(1).optional(),
        slug: z.string().min(1).optional(),
        description: z.string().optional(),
        active: z.boolean().optional(),
        default_category_id: z.string().uuid().nullable().optional(),
        form_mode: z.enum(['shared', 'own']).optional()
      })
    }
  }, async (request, reply) => {
    const { id: event_id, linkId } = request.params
    const ctx = await requireEventInCompany(request, reply, event_id)
    if (!ctx) return

    const link = await prisma.registrationLink.findFirst({ where: { id: linkId, event_id } })
    if (!link) return reply.status(404).send({ message: 'Link não encontrado' })

    const data = { ...request.body }
    if (data.slug) data.slug = slugify(data.slug)

    if (data.default_category_id) {
      const cat = await prisma.category.findFirst({ where: { id: data.default_category_id, event_id } })
      if (!cat) return reply.status(400).send({ message: 'Categoria padrão inválida' })
    }

    try {
      return await prisma.registrationLink.update({
        where: { id: linkId },
        data,
        include: { default_category: { select: { id: true, name: true } } }
      })
    } catch {
      return reply.status(409).send({ message: 'Slug já existe neste evento' })
    }
  })

  app.withTypeProvider<ZodTypeProvider>().delete('/events/:id/registration-links/:linkId', {
    preHandler: [requireRoles('admin')],
    schema: {
      params: z.object({ id: z.string().uuid(), linkId: z.string().uuid() })
    }
  }, async (request, reply) => {
    const { id: event_id, linkId } = request.params
    const ctx = await requireEventInCompany(request, reply, event_id)
    if (!ctx) return

    const link = await prisma.registrationLink.findFirst({ where: { id: linkId, event_id } })
    if (!link) return reply.status(404).send({ message: 'Link não encontrado' })

    await prisma.registrationLink.delete({ where: { id: linkId } })
    return reply.status(204).send()
  })

  // --- Access Points ---

  app.withTypeProvider<ZodTypeProvider>().get('/events/:id/access-points', {
    preHandler: [requireRoles('admin', 'viewer')],
    schema: { params: eventIdParam }
  }, async (request, reply) => {
    const { id: event_id } = request.params
    const ctx = await requireEventInCompany(request, reply, event_id)
    if (!ctx) return

    return prisma.accessPoint.findMany({
      where: { event_id },
      include: {
        categories: {
          include: { category: { select: { id: true, name: true } } }
        }
      },
      orderBy: { name: 'asc' }
    })
  })

  app.withTypeProvider<ZodTypeProvider>().post('/events/:id/access-points', {
    preHandler: [requireRoles('admin')],
    schema: {
      params: eventIdParam,
      body: z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        active: z.boolean().default(true),
        category_ids: z.array(z.string().uuid()).default([])
      })
    }
  }, async (request, reply) => {
    const { id: event_id } = request.params
    const ctx = await requireEventInCompany(request, reply, event_id)
    if (!ctx) return

    const { name, description, active, category_ids } = request.body

    if (category_ids.length > 0) {
      const count = await prisma.category.count({
        where: { event_id, id: { in: category_ids } }
      })
      if (count !== category_ids.length) {
        return reply.status(400).send({ message: 'Uma ou mais categorias são inválidas' })
      }
    }

    return prisma.accessPoint.create({
      data: {
        event_id,
        name,
        description,
        active,
        categories: {
          create: category_ids.map((category_id) => ({ category_id }))
        }
      },
      include: {
        categories: { include: { category: { select: { id: true, name: true } } } }
      }
    })
  })

  app.withTypeProvider<ZodTypeProvider>().patch('/events/:id/access-points/:pointId', {
    preHandler: [requireRoles('admin')],
    schema: {
      params: z.object({ id: z.string().uuid(), pointId: z.string().uuid() }),
      body: z.object({
        name: z.string().min(1).optional(),
        description: z.string().optional(),
        active: z.boolean().optional(),
        category_ids: z.array(z.string().uuid()).optional()
      })
    }
  }, async (request, reply) => {
    const { id: event_id, pointId } = request.params
    const ctx = await requireEventInCompany(request, reply, event_id)
    if (!ctx) return

    const point = await prisma.accessPoint.findFirst({ where: { id: pointId, event_id } })
    if (!point) return reply.status(404).send({ message: 'Ponto de acesso não encontrado' })

    const { category_ids, ...data } = request.body

    if (category_ids !== undefined) {
      const count = await prisma.category.count({
        where: { event_id, id: { in: category_ids } }
      })
      if (count !== category_ids.length) {
        return reply.status(400).send({ message: 'Uma ou mais categorias são inválidas' })
      }

      await prisma.accessPointCategory.deleteMany({ where: { access_point_id: pointId } })
      if (category_ids.length > 0) {
        await prisma.accessPointCategory.createMany({
          data: category_ids.map((category_id) => ({ access_point_id: pointId, category_id }))
        })
      }
    }

    return prisma.accessPoint.update({
      where: { id: pointId },
      data,
      include: {
        categories: { include: { category: { select: { id: true, name: true } } } }
      }
    })
  })

  app.withTypeProvider<ZodTypeProvider>().delete('/events/:id/access-points/:pointId', {
    preHandler: [requireRoles('admin')],
    schema: {
      params: z.object({ id: z.string().uuid(), pointId: z.string().uuid() })
    }
  }, async (request, reply) => {
    const { id: event_id, pointId } = request.params
    const ctx = await requireEventInCompany(request, reply, event_id)
    if (!ctx) return

    const point = await prisma.accessPoint.findFirst({ where: { id: pointId, event_id } })
    if (!point) return reply.status(404).send({ message: 'Ponto de acesso não encontrado' })

    await prisma.accessPoint.delete({ where: { id: pointId } })
    return reply.status(204).send()
  })
}
