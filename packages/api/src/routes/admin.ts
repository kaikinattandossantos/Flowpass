import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { prisma } from '../../../database'
import bcrypt from 'bcryptjs'
import { requireSuperAdmin } from '../lib/auth'

function buildSubdomain(name: string) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '')
    .slice(0, 50) || 'empresa'
}

export async function adminRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireSuperAdmin)

  app.withTypeProvider<ZodTypeProvider>().get('/admin/companies', async () => {
    return prisma.company.findMany({
      orderBy: { created_at: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        cnpj: true,
        status: true,
        subdomain: true,
        created_at: true,
        _count: { select: { users: true, events: true } }
      }
    })
  })

  app.withTypeProvider<ZodTypeProvider>().post('/admin/companies', {
    schema: {
      body: z.object({
        name: z.string().min(1),
        email: z.string().email(),
        cnpj: z.string().min(1),
        status: z.enum(['active', 'inactive']).default('active'),
        admin_name: z.string().min(1),
        admin_email: z.string().email(),
        admin_password: z.string().min(6)
      })
    }
  }, async (request, reply) => {
    const { name, email, cnpj, status, admin_name, admin_email, admin_password } = request.body

    const existing = await prisma.company.findFirst({
      where: { OR: [{ cnpj }, { email }] }
    })
    if (existing) {
      return reply.status(409).send({ message: 'E-mail ou CNPJ já cadastrado' })
    }

    const adminExists = await prisma.user.findUnique({ where: { email: admin_email } })
    if (adminExists) {
      return reply.status(409).send({ message: 'E-mail do administrador já cadastrado' })
    }

    let subdomain = buildSubdomain(name)
    const subdomainTaken = await prisma.company.findUnique({ where: { subdomain } })
    if (subdomainTaken) {
      subdomain = `${subdomain}-${Date.now().toString(36).slice(-4)}`
    }

    const password_hash = await bcrypt.hash(admin_password, 10)

    const company = await prisma.company.create({
      data: {
        name,
        email,
        cnpj,
        status,
        subdomain,
        users: {
          create: {
            name: admin_name,
            email: admin_email,
            password_hash,
            role: 'admin'
          }
        }
      },
      include: {
        users: {
          select: { id: true, name: true, email: true, role: true }
        }
      }
    })

    return company
  })

  app.withTypeProvider<ZodTypeProvider>().patch('/admin/companies/:id', {
    schema: {
      params: z.object({ id: z.string().uuid() }),
      body: z.object({
        name: z.string().min(1).optional(),
        email: z.string().email().optional(),
        cnpj: z.string().min(1).optional(),
        status: z.enum(['active', 'inactive']).optional()
      })
    }
  }, async (request, reply) => {
    const { id } = request.params
    const data = request.body

    const company = await prisma.company.findUnique({ where: { id } })
    if (!company) {
      return reply.status(404).send({ message: 'Empresa não encontrada' })
    }

    if (data.cnpj || data.email) {
      const conflict = await prisma.company.findFirst({
        where: {
          id: { not: id },
          OR: [
            ...(data.cnpj ? [{ cnpj: data.cnpj }] : []),
            ...(data.email ? [{ email: data.email }] : [])
          ]
        }
      })
      if (conflict) {
        return reply.status(409).send({ message: 'E-mail ou CNPJ já cadastrado' })
      }
    }

    return prisma.company.update({
      where: { id },
      data
    })
  })
}
