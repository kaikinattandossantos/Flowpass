import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { prisma } from '../../../database'
import { requireEventInCompany, requireRoles } from '../lib/auth'

export async function statsRoutes(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().get('/events/:id/stats', {
    preHandler: [requireRoles('admin', 'viewer')],
    schema: {
      params: z.object({ id: z.string().uuid() })
    }
  }, async (request, reply) => {
    const { id: event_id } = request.params
    const ctx = await requireEventInCompany(request, reply, event_id)
    if (!ctx) return

    const [total_registered, total_checked_in, by_category] = await Promise.all([
      prisma.registration.count({ where: { event_id, status: 'confirmed' } }),
      prisma.checkIn.count({ where: { registration: { event_id }, is_duplicate: false } }),
      prisma.category.findMany({
        where: { event_id },
        include: {
          _count: {
            select: { registrations: { where: { checkins: { some: { is_duplicate: false } } } } }
          }
        }
      })
    ])

    return {
      total_registered,
      total_checked_in,
      by_category: by_category.map((c) => ({
        name: c.name,
        checked_in: c._count.registrations
      }))
    }
  })
}
