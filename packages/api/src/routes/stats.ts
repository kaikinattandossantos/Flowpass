import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { prisma } from '../../../database'

export async function statsRoutes(app: FastifyInstance) {
  app.addHook('preHandler', async (request) => {
    await request.jwtVerify()
  })

  app.withTypeProvider<ZodTypeProvider>().get('/events/:id/stats', {
    schema: {
      params: z.object({ id: z.string().uuid() })
    }
  }, async (request) => {
    const { id: event_id } = request.params

    const [total_registered, total_checked_in, by_category] = await Promise.all([
      prisma.registration.count({ where: { event_id, status: 'confirmed' } }),
      prisma.checkIn.count({ where: { registration: { event_id } } }),
      prisma.category.findMany({
        where: { event_id },
        include: {
          _count: {
            select: { registrations: { where: { checkins: { some: {} } } } }
          }
        }
      })
    ])

    return {
      total_registered,
      total_checked_in,
      by_category: by_category.map((c: any) => ({
        name: c.name,
        checked_in: c._count.registrations
      }))
    }
  })
}
