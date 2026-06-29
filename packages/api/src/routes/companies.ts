import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { prisma } from '../../../database'
import bcrypt from 'bcryptjs'

export async function companyRoutes(app: FastifyInstance) {
  // Public company registration + first admin
  app.withTypeProvider<ZodTypeProvider>().post('/companies', {
    schema: {
      body: z.object({
        company_name: z.string(),
        cnpj: z.string(),
        admin_name: z.string(),
        email: z.string().email(),
        password: z.string()
      })
    }
  }, async (request, reply) => {
    const { company_name, cnpj, admin_name, email, password } = request.body

    const existing = await prisma.company.findFirst({
      where: { OR: [{ cnpj }, { email }] }
    })

    if (existing) {
      return reply.status(409).send({ message: 'E-mail ou CNPJ já cadastrado' })
    }

    const subdomain = company_name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '')

    const password_hash = await bcrypt.hash(password, 10)

    const company = await prisma.company.create({
      data: {
        name: company_name,
        cnpj,
        email,
        subdomain,
        users: {
          create: {
            name: admin_name,
            email,
            password_hash,
            role: 'admin'
          }
        }
      },
      include: { users: true }
    })

    const admin = company.users[0]
    const token = app.jwt.sign({
      sub: admin.id,
      company_id: company.id,
      role: admin.role
    }, {
      expiresIn: '7d'
    })

    return { token, user: { id: admin.id, name: admin.name, email: admin.email, role: admin.role } }
  })

  app.withTypeProvider<ZodTypeProvider>().get('/companies/me', {
    preHandler: [async (request) => await request.jwtVerify()]
  }, async (request) => {
    const { company_id } = request.user as { company_id: string }
    
    const company = await prisma.company.findUnique({
      where: { id: company_id }
    })

    return company
  })
}
