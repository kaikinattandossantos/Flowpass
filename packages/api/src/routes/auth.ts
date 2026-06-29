import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { prisma } from '../../../database'
import bcrypt from 'bcryptjs'

export async function authRoutes(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().post('/auth/login', {
    schema: {
      body: z.object({
        email: z.string().email(),
        password: z.string()
      })
    }
  }, async (request, reply) => {
    const { email, password } = request.body

    const user = await prisma.user.findUnique({
      where: { email }
    })

    if (!user) {
      return reply.status(401).send({ message: 'Credenciais inválidas' })
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash)

    if (!isPasswordValid) {
      return reply.status(401).send({ message: 'Credenciais inválidas' })
    }

    const token = app.jwt.sign({
      sub: user.id,
      company_id: user.company_id,
      role: user.role
    }, {
      expiresIn: '7d'
    })

    return { token, user: { id: user.id, name: user.name, email: user.email, role: user.role } }
  })
}
