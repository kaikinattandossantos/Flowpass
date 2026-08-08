import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { FieldType, Prisma } from '../../../database'
import { prisma } from '../../../database'
import { requireEventInCompany, requireRoles } from '../lib/auth'
import { getFormInEvent } from './registration-forms'
import {
  BUILDER_FIELD_TYPES,
  optionsForStorage,
  validateFieldOptions,
  type BuilderFieldType
} from '../utils/form-field-options'
import { assertFieldTypeAllowed } from '../utils/validate-form-data'

const formParams = z.object({
  id: z.string().uuid(),
  formId: z.string().uuid()
})

const fieldParams = formParams.extend({ fieldId: z.string().uuid() })

const fieldBodySchema = z.object({
  label: z.string().min(1).max(200),
  type: z.enum([...BUILDER_FIELD_TYPES] as [BuilderFieldType, ...BuilderFieldType[]]),
  required: z.boolean().default(false),
  placeholder: z.string().max(200).optional(),
  options: z.array(z.string()).optional(),
  order: z.number().int().min(0).optional()
})

const fieldPatchSchema = z.object({
  label: z.string().min(1).max(200).optional(),
  type: z.enum([...BUILDER_FIELD_TYPES] as [BuilderFieldType, ...BuilderFieldType[]]).optional(),
  required: z.boolean().optional(),
  placeholder: z.string().max(200).nullable().optional(),
  options: z.array(z.string()).optional(),
  order: z.number().int().min(0).optional()
})

async function requireFormContext(
  request: { params: { id: string; formId: string } },
  reply: { status: (code: number) => { send: (body: unknown) => unknown } }
) {
  const { id: event_id, formId } = request.params
  const ctx = await requireEventInCompany(request as never, reply as never, event_id)
  if (!ctx) return null

  const form = await getFormInEvent(event_id, formId)
  if (!form) {
    reply.status(404).send({ message: 'Formulário não encontrado' })
    return null
  }

  return { ctx, form }
}

function serializeField(field: {
  id: string
  registration_form_id: string
  label: string
  type: FieldType
  required: boolean
  placeholder: string | null
  options: unknown
  order: number
}) {
  return {
    id: field.id,
    registration_form_id: field.registration_form_id,
    label: field.label,
    type: field.type,
    required: field.required,
    placeholder: field.placeholder,
    options: Array.isArray(field.options) ? field.options : null,
    order: field.order
  }
}

export async function formFieldRoutes(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().get('/events/:id/registration-forms/:formId/form-fields', {
    preHandler: [requireRoles('admin', 'viewer')],
    schema: { params: formParams }
  }, async (request, reply) => {
    const context = await requireFormContext(request, reply)
    if (!context) return

    const fields = await prisma.formField.findMany({
      where: { registration_form_id: context.form.id },
      orderBy: { order: 'asc' }
    })

    return fields.map(serializeField)
  })

  app.withTypeProvider<ZodTypeProvider>().post('/events/:id/registration-forms/:formId/form-fields', {
    preHandler: [requireRoles('admin')],
    schema: {
      params: formParams,
      body: fieldBodySchema
    }
  }, async (request, reply) => {
    const context = await requireFormContext(request, reply)
    if (!context) return

    const { label, type, required, placeholder, options, order } = request.body
    const fieldType = type as FieldType

    if (!assertFieldTypeAllowed(fieldType)) {
      return reply.status(400).send({ message: 'Tipo de campo não permitido' })
    }

    const optionsError = validateFieldOptions(fieldType, options)
    if (optionsError) {
      return reply.status(400).send({ message: optionsError })
    }

    const maxOrder = await prisma.formField.aggregate({
      where: { registration_form_id: context.form.id },
      _max: { order: true }
    })

    const field = await prisma.formField.create({
      data: {
        registration_form_id: context.form.id,
        label: label.trim(),
        type: fieldType,
        required,
        placeholder: placeholder?.trim() || null,
        options: optionsForStorage(fieldType, options) ?? Prisma.JsonNull,
        order: order ?? (maxOrder._max.order ?? -1) + 1
      }
    })

    return serializeField(field)
  })

  app.withTypeProvider<ZodTypeProvider>().patch('/events/:id/registration-forms/:formId/form-fields/reorder', {
    preHandler: [requireRoles('admin')],
    schema: {
      params: formParams,
      body: z.object({
        fields: z.array(z.object({
          id: z.string().uuid(),
          order: z.number().int().min(0)
        })).min(1)
      })
    }
  }, async (request, reply) => {
    const context = await requireFormContext(request, reply)
    if (!context) return

    const { fields } = request.body
    const ids = fields.map((f) => f.id)

    const existing = await prisma.formField.findMany({
      where: { registration_form_id: context.form.id, id: { in: ids } },
      select: { id: true }
    })

    if (existing.length !== ids.length) {
      return reply.status(400).send({ message: 'Um ou mais campos não pertencem a este formulário' })
    }

    await prisma.$transaction(
      fields.map((f) =>
        prisma.formField.update({
          where: { id: f.id },
          data: { order: f.order }
        })
      )
    )

    const updated = await prisma.formField.findMany({
      where: { registration_form_id: context.form.id },
      orderBy: { order: 'asc' }
    })

    return updated.map(serializeField)
  })

  app.withTypeProvider<ZodTypeProvider>().patch('/events/:id/registration-forms/:formId/form-fields/:fieldId', {
    preHandler: [requireRoles('admin')],
    schema: {
      params: fieldParams,
      body: fieldPatchSchema
    }
  }, async (request, reply) => {
    const context = await requireFormContext(request, reply)
    if (!context) return

    const existing = await prisma.formField.findFirst({
      where: { id: request.params.fieldId, registration_form_id: context.form.id }
    })
    if (!existing) {
      return reply.status(404).send({ message: 'Campo não encontrado' })
    }

    const nextType = (request.body.type ?? existing.type) as FieldType
    const nextOptions = request.body.options !== undefined
      ? request.body.options
      : existing.options

    if (!assertFieldTypeAllowed(nextType)) {
      return reply.status(400).send({ message: 'Tipo de campo não permitido' })
    }

    const optionsError = validateFieldOptions(nextType, nextOptions)
    if (optionsError) {
      return reply.status(400).send({ message: optionsError })
    }

    const updated = await prisma.formField.update({
      where: { id: existing.id },
      data: {
        ...(request.body.label !== undefined && { label: request.body.label.trim() }),
        ...(request.body.type !== undefined && { type: nextType }),
        ...(request.body.required !== undefined && { required: request.body.required }),
        ...(request.body.placeholder !== undefined && {
          placeholder: request.body.placeholder?.trim() || null
        }),
        ...(request.body.options !== undefined && {
          options: optionsForStorage(nextType, nextOptions) ?? Prisma.JsonNull
        }),
        ...(request.body.order !== undefined && { order: request.body.order })
      }
    })

    return serializeField(updated)
  })

  app.withTypeProvider<ZodTypeProvider>().delete('/events/:id/registration-forms/:formId/form-fields/:fieldId', {
    preHandler: [requireRoles('admin')],
    schema: { params: fieldParams }
  }, async (request, reply) => {
    const context = await requireFormContext(request, reply)
    if (!context) return

    const existing = await prisma.formField.findFirst({
      where: { id: request.params.fieldId, registration_form_id: context.form.id }
    })
    if (!existing) {
      return reply.status(404).send({ message: 'Campo não encontrado' })
    }

    await prisma.formField.delete({ where: { id: existing.id } })
    return reply.status(204).send()
  })
}
