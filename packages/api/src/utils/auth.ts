import { FastifyReply, FastifyRequest } from 'fastify'

export type JwtUser = {
  sub: string
  company_id?: string | null
  role: 'superadmin' | 'admin' | 'viewer' | 'operator'
}

export function getJwtUser(request: FastifyRequest): JwtUser {
  return request.user as JwtUser
}

export async function requireSuperadmin(request: FastifyRequest, reply: FastifyReply) {
  await request.jwtVerify()
  const user = getJwtUser(request)

  if (user.role !== 'superadmin') {
    return reply.status(403).send({ message: 'Acesso restrito ao administrador da plataforma' })
  }
}

export async function requireCompanyUser(request: FastifyRequest, reply: FastifyReply) {
  await request.jwtVerify()
  const user = getJwtUser(request)

  if (!user.company_id) {
    return reply.status(403).send({ message: 'Usuário sem empresa vinculada' })
  }

  return user.company_id
}