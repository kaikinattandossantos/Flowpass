import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { prisma } from '../../../database'
import { getJwtUser, requireRoles } from '../lib/auth'

export async function companyRoutes(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().get('/companies/me', {
    preHandler: [requireRoles('admin', 'viewer')]
  }, async (request) => {
    const { company_id } = getJwtUser(request)

    return prisma.company.findUnique({
      where: { id: company_id! }
    })
  })
}
