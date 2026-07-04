import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { prisma } from '../../../database'
import bcrypt from 'bcryptjs'
import { getJwtUser, requireCompanyUser, requireSuperadmin } from '../utils/auth'
import { buildSubdomain, normalizeCnpj } from '../utils/company'

const companyBodySchema = z.object({
  company_name: z.string().min(1),
  cnpj: z.string().min(1),
  admin_name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6)
})

async function createCompany(data: z.infer<typeof companyBodySchema>) {
  const { company_name, cnpj, admin_name, email, password } = data

  const normalizedCnpj = normalizeCnpj(cnpj)
  if (normalizedCnpj.length !== 14) {
    return { error: { status: 400, message: 'CNPJ inválido. Informe os 14 dígitos.' } }
  }

  const subdomain = buildSubdomain(company_name)
  if (!subdomain) {
    return { error: { status: 400, message: 'Nome da empresa inválido' } }
  }

  const normalizedEmail = email.trim().toLowerCase()

  const [existingCompany, existingUser, existingSubdomain] = await Promise.all([
    prisma.company.findFirst({
      where: {
        OR: [
          { cnpj: normalizedCnpj },
          { cnpj },
          { email: normalizedEmail }
        ]
      }
    }),
    prisma.user.findUnique({ where: { email: normalizedEmail } }),
    prisma.company.findUnique({ where: { subdomain } })
  ])

  if (existingCompany || existingUser) {
    return { error: { status: 409, message: 'E-mail ou CNPJ já cadastrado' } }
  }

  if (existingSubdomain) {
    return { error: { status: 409, message: 'Já existe uma empresa com nome semelhante. Tente outro nome.' } }
  }

  const password_hash = await bcrypt.hash(password, 10)

  const company = await prisma.company.create({
    data: {
      name: company_name.trim(),
      cnpj: normalizedCnpj,
      email: normalizedEmail,
      subdomain,
      users: {
        create: {
          name: admin_name.trim(),
          email: normalizedEmail,
          password_hash,
          role: 'admin'
        }
      }
    },
    include: {
      users: {
        select: { id: true, name: true, email: true, role: true }
      },
      _count: { select: { events: true } }
    }
  })

  return { company }
}

export async function companyRoutes(app: FastifyInstance) {
  // Superadmin: cadastra empresas
  app.withTypeProvider<ZodTypeProvider>().post('/companies', {
    preHandler: [requireSuperadmin],
    schema: { body: companyBodySchema }
  }, async (request, reply) => {
    const result = await createCompany(request.body)

    if ('error' in result) {
      return reply.status(result.error.status).send({ message: result.error.message })
    }

    const admin = result.company.users[0]

    return {
      company: {
        id: result.company.id,
        name: result.company.name,
        cnpj: result.company.cnpj,
        email: result.company.email,
        subdomain: result.company.subdomain,
        created_at: result.company.created_at
      },
      admin
    }
  })

  // Superadmin: lista empresas
  app.withTypeProvider<ZodTypeProvider>().get('/companies', {
    preHandler: [requireSuperadmin]
  }, async () => {
    return prisma.company.findMany({
      orderBy: { created_at: 'desc' },
      include: {
        _count: { select: { events: true, users: true } }
      }
    })
  })

  // Empresa: dados da própria organização
  app.withTypeProvider<ZodTypeProvider>().get('/companies/me', {
    preHandler: [async (request, reply) => {
      const companyId = await requireCompanyUser(request, reply)
      if (typeof companyId !== 'string') return
    }]
  }, async (request) => {
    const { company_id } = getJwtUser(request)

    return prisma.company.findUnique({
      where: { id: company_id! }
    })
  })
}