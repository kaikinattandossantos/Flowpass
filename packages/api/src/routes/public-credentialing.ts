import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import {
  getCredentialingLinkByPublicId,
  processCredentialingScan
} from '../services/credentialing-scan'

export async function publicCredentialingRoutes(app: FastifyInstance) {
  const publicIdParam = z.object({
    publicId: z.string().min(16).max(64)
  })

  app.withTypeProvider<ZodTypeProvider>().get('/public/credentialing/:publicId', {
    schema: { params: publicIdParam }
  }, async (request, reply) => {
    const link = await getCredentialingLinkByPublicId(request.params.publicId)
    if (!link) {
      return reply.status(404).send({ message: 'Link de credenciamento não encontrado' })
    }

    return link
  })

  app.withTypeProvider<ZodTypeProvider>().post('/public/credentialing/:publicId/scan', {
    schema: {
      params: publicIdParam,
      body: z.object({
        qr_token: z.string().min(8).max(128)
      })
    }
  }, async (request, reply) => {
    const result = await processCredentialingScan(
      request.params.publicId,
      request.body.qr_token.trim()
    )

    if (result.result === 'link_not_found') {
      return reply.status(404).send({ message: 'Link de credenciamento não encontrado' })
    }

    return result
  })
}
