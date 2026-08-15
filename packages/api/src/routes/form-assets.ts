import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { requireEventInCompany, requireRoles } from '../lib/auth'
import { getFormInEvent } from './registration-forms'
import { storeFormAsset, readLocalAsset, listFormAssets } from '../services/form-asset-storage'

const formParams = z.object({
  id: z.string().uuid(),
  formId: z.string().uuid()
})

export async function formAssetRoutes(app: FastifyInstance) {
  app.get('/assets/*', async (request, reply) => {
    const key = (request.params as { '*': string })['*']
    const asset = await readLocalAsset(key)
    if (!asset) {
      return reply.status(404).send({ message: 'Arquivo não encontrado' })
    }
    reply.header('Cache-Control', 'public, max-age=31536000, immutable')
    reply.type(asset.contentType)
    return reply.send(asset.buffer)
  })

  app.withTypeProvider<ZodTypeProvider>().post('/events/:id/registration-forms/:formId/assets', {
    preHandler: [requireRoles('admin')],
    schema: {
      params: formParams,
      consumes: ['multipart/form-data']
    }
  }, async (request, reply) => {
    const { id: event_id, formId } = request.params
    const ctx = await requireEventInCompany(request, reply, event_id)
    if (!ctx) return

    const form = await getFormInEvent(event_id, formId)
    if (!form) {
      return reply.status(404).send({ message: 'Formulário não encontrado' })
    }

    const file = await request.file()
    if (!file) {
      return reply.status(400).send({ message: 'Arquivo não enviado' })
    }

    const kindField = file.fields.kind
    const kindValue = kindField && 'value' in kindField ? String(kindField.value) : ''
    if (kindValue !== 'logo' && kindValue !== 'background' && kindValue !== 'banner') {
      return reply.status(400).send({ message: 'Tipo de asset inválido' })
    }

    const buffer = await file.toBuffer()
    const stored = await storeFormAsset({
      companyId: ctx.user.company_id!,
      formId,
      kind: kindValue,
      mimeType: file.mimetype,
      buffer
    })

    if (!stored.ok) {
      return reply.status(400).send({ message: stored.message })
    }

    return stored.asset
  })

  app.withTypeProvider<ZodTypeProvider>().get('/events/:id/registration-forms/:formId/assets', {
    preHandler: [requireRoles('admin', 'viewer')],
    schema: { params: formParams }
  }, async (request, reply) => {
    const { id: event_id, formId } = request.params
    const ctx = await requireEventInCompany(request, reply, event_id)
    if (!ctx) return

    const form = await getFormInEvent(event_id, formId)
    if (!form) {
      return reply.status(404).send({ message: 'Formulário não encontrado' })
    }

    const assets = await listFormAssets({
      companyId: ctx.user.company_id!,
      formId
    })

    return { assets }
  })
}
