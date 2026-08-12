import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { prisma } from '../../../database'
import bcrypt from 'bcryptjs'
import { getJwtUser, requireRoles } from '../lib/auth'

export async function userRoutes(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().get('/users', {
    preHandler: [requireRoles('admin', 'viewer')]
  }, async (request) => {
    const { company_id } = getJwtUser(request)

    return prisma.user.findMany({
      where: { company_id: company_id! },
      select: { id: true, name: true, email: true, role: true, created_at: true }
    })
  })

  app.withTypeProvider<ZodTypeProvider>().post('/users', {
    preHandler: [requireRoles('admin')],
    schema: {
      body: z.object({
        name: z.string(),
        email: z.string().email(),
        password: z.string().min(6),
        role: z.enum(['admin', 'viewer', 'operator'])
      })
    }
  }, async (request) => {
    const { company_id } = getJwtUser(request)
    const { name, email, password, role } = request.body

    const password_hash = await bcrypt.hash(password, 10)

    return prisma.user.create({
      data: {
        name,
        email,
        password_hash,
        role,
        company_id: company_id!
      },
      select: { id: true, name: true, email: true, role: true }
    })
  })

  app.withTypeProvider<ZodTypeProvider>().delete('/users/:id', {
    preHandler: [requireRoles('admin')],
    schema: {
      params: z.object({ id: z.string().uuid() })
    }
  }, async (request, reply) => {
    const { id } = request.params
    const { company_id, sub } = getJwtUser(request)

    if (id === sub) {
      return reply.status(400).send({ message: 'Não é possível remover o próprio usuário' })
    }

    const user = await prisma.user.findFirst({
      where: { id, company_id: company_id! }
    })

    if (!user) return reply.status(404).send({ message: 'Usuário não encontrado' })

    await prisma.user.delete({ where: { id } })

    return reply.status(204).send()
  })
}
