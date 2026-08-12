import { FastifyRequest, FastifyReply } from 'fastify'
import { prisma } from '../../../database'

export type Role = 'super_admin' | 'admin' | 'viewer' | 'operator'

export interface JwtUser {
  sub: string
  company_id: string | null
  role: Role
}

export function getJwtUser(request: FastifyRequest): JwtUser {
  return request.user as JwtUser
}

export async function requireAuth(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify()
  } catch {
    return reply.status(401).send({ message: 'Não autenticado' })
  }
}

export async function requireSuperAdmin(request: FastifyRequest, reply: FastifyReply) {
  await requireAuth(request, reply)
  if (reply.sent) return

  if (getJwtUser(request).role !== 'super_admin') {
    return reply.status(403).send({ message: 'Acesso restrito ao Super Admin' })
  }
}

export async function requireCompanyMember(request: FastifyRequest, reply: FastifyReply) {
  await requireAuth(request, reply)
  if (reply.sent) return

  const user = getJwtUser(request)
  if (user.role === 'super_admin') {
    return reply.status(403).send({ message: 'Use a área administrativa FlowPass' })
  }
  if (!user.company_id) {
    return reply.status(403).send({ message: 'Usuário sem empresa vinculada' })
  }
}

export function requireRoles(...roles: Role[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const user = await requireCompanyContext(request, reply)
    if (!user) return

    if (!roles.includes(user.role)) {
      return reply.status(403).send({ message: 'Permissão insuficiente' })
    }
  }
}

export async function assertCompanyActive(companyId: string, reply: FastifyReply) {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { status: true }
  })

  if (!company) {
    reply.status(404).send({ message: 'Empresa não encontrada' })
    return false
  }

  if (company.status === 'inactive') {
    reply.status(403).send({ message: 'Empresa inativa' })
    return false
  }

  return true
}

export async function getEventForCompany(eventId: string, companyId: string) {
  return prisma.event.findFirst({
    where: { id: eventId, company_id: companyId }
  })
}

export async function requireCompanyContext(request: FastifyRequest, reply: FastifyReply) {
  await requireCompanyMember(request, reply)
  if (reply.sent) return null

  const user = getJwtUser(request)
  if (!(await assertCompanyActive(user.company_id!, reply))) return null

  return user
}

export async function requireEventInCompany(
  request: FastifyRequest,
  reply: FastifyReply,
  eventId: string
) {
  const user = await requireCompanyContext(request, reply)
  if (!user) return null

  const event = await getEventForCompany(eventId, user.company_id!)
  if (!event) {
    reply.status(404).send({ message: 'Evento não encontrado' })
    return null
  }

  return { user, event }
}

export function denyWriteForViewer(request: FastifyRequest, reply: FastifyReply) {
  if (getJwtUser(request).role === 'viewer') {
    reply.status(403).send({ message: 'Usuários viewer possuem acesso somente leitura' })
    return true
  }
  return false
}
