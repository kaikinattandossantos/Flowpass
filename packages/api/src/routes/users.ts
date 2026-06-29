import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { prisma } from '../../../database'
import bcrypt from 'bcryptjs'

export async function userRoutes(app: FastifyInstance) {
  app.addHook('preHandler', async (request) => {
    await request.jwtVerify()
  })

  app.withTypeProvider<ZodTypeProvider>().get('/users', async (request) => {
    const { company_id } = request.user as { company_id: string }
    
    const users = await prisma.user.findMany({
      where: { company_id },
      select: { id: true, name: true, email: true, role: true, created_at: true }
    })

    return users
  })

  app.withTypeProvider<ZodTypeProvider>().post('/users', {
    schema: {
      body: z.object({
        name: z.string(),
        email: z.string().email(),
        password: z.string().min(6),
        role: z.enum(['admin', 'viewer', 'operator'])
      })
    }
  }, async (request) => {
    const { company_id } = request.user as { company_id: string }
    const { name, email, password, role } = request.body

    const password_hash = await bcrypt.hash(password, 10)

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password_hash,
        role,
        company_id
      },
      select: { id: true, name: true, email: true, role: true }
    })

    return user
  })

  app.withTypeProvider<ZodTypeProvider>().delete('/users/:id', {
    schema: {
      params: z.object({ id: z.string().uuid() })
    }
  }, async (request, reply) => {
    const { id } = request.params
    const { company_id } = request.user as { company_id: string }

    const user = await prisma.user.findFirst({
      where: { id, company_id }
    })

    if (!user) return reply.status(404).send({ message: 'Usuário não encontrado' })

    await prisma.user.delete({ where: { id } })

    return reply.status(204).send()
  })
}
