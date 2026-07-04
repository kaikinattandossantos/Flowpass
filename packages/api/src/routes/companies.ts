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

    const normalizedCnpj = cnpj.replace(/\D/g, '')
    if (normalizedCnpj.length !== 14) {
      return reply.status(400).send({ message: 'CNPJ inválido. Informe os 14 dígitos.' })
    }

    const subdomain = company_name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '')

    if (!subdomain) {
      return reply.status(400).send({ message: 'Nome da empresa inválido' })
    }

    const [existingCompany, existingUser, existingSubdomain] = await Promise.all([
      prisma.company.findFirst({
        where: {
          OR: [
            { cnpj: normalizedCnpj },
            { cnpj },
            { email }
          ]
        }
      }),
      prisma.user.findUnique({ where: { email } }),
      prisma.company.findUnique({ where: { subdomain } })
    ])

    if (existingCompany || existingUser) {
      return reply.status(409).send({ message: 'E-mail ou CNPJ já cadastrado' })
    }

    if (existingSubdomain) {
      return reply.status(409).send({ message: 'Já existe uma empresa com nome semelhante. Tente outro nome.' })
    }

    const password_hash = await bcrypt.hash(password, 10)

    const company = await prisma.company.create({
      data: {
        name: company_name,
        cnpj: normalizedCnpj,
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
