import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { prisma } from '../../../database'
import { validateFormData } from '../utils/validate-form-data'
import {
  createRegistrationRecord,
  DuplicateParticipantError
} from '../services/registration-create'
import { formatParticipant } from '../utils/participant'
import { parseStructuralConfig } from '../utils/structural-config'
import {
  resolveStructuralValues,
  validateCpfWhenEnabled,
  validateResolvedStructuralValues
} from '../utils/resolve-structural-values'

export async function publicFormRoutes(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().get('/public/forms/:publicId', {
    schema: { params: z.object({ publicId: z.string().min(16).max(64) }) }
  }, async (request, reply) => {
    const form = await prisma.registrationForm.findUnique({
      where: { public_id: request.params.publicId },
      include: {
        event: { include: { company: true, categories: { orderBy: { name: 'asc' } } } },
        form_fields: { orderBy: { order: 'asc' } }
      }
    })

    if (!form) {
      return reply.status(404).send({ message: 'Formulário não encontrado' })
    }

    const structuralConfig = parseStructuralConfig(form.structural_config)

    return {
      event: {
        id: form.event.id,
        name: form.event.name,
        description: form.event.description,
        start_at: form.event.start_at,
        end_at: form.event.end_at,
        location: form.event.location,
        status: form.event.status
      },
      form: {
        id: form.id,
        name: form.name,
        status: form.status,
        public_id: form.public_id,
        structural_config: structuralConfig
      },
      categories: form.event.categories.map((c) => ({
        id: c.id,
        name: c.name,
        description: c.description,
        color: c.color
      })),
      form_fields: form.form_fields.map((field) => ({
        id: field.id,
        label: field.label,
        type: field.type,
        required: field.required,
        placeholder: field.placeholder,
        options: Array.isArray(field.options) ? field.options : null,
        order: field.order
      })),
      can_submit:
        form.status === 'active'
        && form.event.status === 'active'
        && form.event.company.status === 'active'
    }
  })

  app.withTypeProvider<ZodTypeProvider>().post('/public/forms/:publicId/registrations', {
    schema: {
      params: z.object({ publicId: z.string().min(16).max(64) }),
      body: z.object({
        category_id: z.string().uuid().optional(),
        name: z.string().optional(),
        email: z.string().optional(),
        phone: z.string().optional(),
        cpf: z.string().optional(),
        form_data: z.record(z.string(), z.any()).default({})
      })
    }
  }, async (request, reply) => {
    const form = await prisma.registrationForm.findUnique({
      where: { public_id: request.params.publicId },
      include: {
        event: { include: { company: true, categories: true } },
        form_fields: { orderBy: { order: 'asc' } }
      }
    })

    if (!form) {
      return reply.status(404).send({ message: 'Formulário não encontrado' })
    }

    if (form.status !== 'active') {
      return reply.status(403).send({ message: 'Formulário inativo' })
    }

    if (form.event.status !== 'active') {
      return reply.status(403).send({ message: 'Evento não está aceitando inscrições' })
    }

    if (form.event.company.status !== 'active') {
      return reply.status(403).send({ message: 'Empresa inativa' })
    }

    const structuralConfig = parseStructuralConfig(form.structural_config)
    const data = request.body

    let categoryId: string | null = null
    if (structuralConfig.category.enabled && data.category_id) {
      const category = form.event.categories.find((c) => c.id === data.category_id)
      if (!category) {
        return reply.status(400).send({ message: 'Categoria inválida' })
      }
      categoryId = category.id
    }

    const resolved = resolveStructuralValues(structuralConfig, {
      name: data.name,
      email: data.email,
      phone: data.phone,
      cpf: data.cpf,
      category_id: categoryId
    })

    const cpfValidation = validateCpfWhenEnabled(
      structuralConfig,
      structuralConfig.cpf.enabled ? data.cpf : undefined,
      resolved.cpf
    )
    if (!cpfValidation.ok) {
      return reply.status(400).send({ message: cpfValidation.message })
    }

    const structuralValidation = validateResolvedStructuralValues(structuralConfig, resolved)
    if (!structuralValidation.ok) {
      return reply.status(400).send({ message: structuralValidation.message })
    }

    const formValidation = validateFormData(form.form_fields, data.form_data ?? {})
    if (!formValidation.ok) {
      return reply.status(400).send({ message: formValidation.message })
    }

    if (!resolved.name) {
      return reply.status(400).send({ message: 'Nome é obrigatório' })
    }

    try {
      const created = await createRegistrationRecord({
        event_id: form.event_id,
        registration_form_id: form.id,
        category_id: resolved.category_id,
        name: resolved.name,
        email: resolved.email,
        phone: resolved.phone,
        cpf: resolved.cpf,
        form_data: formValidation.data,
        origin: 'PUBLIC_FORM',
        status: 'confirmed',
        sendNotifications: true,
        formFields: form.form_fields
      })
      return formatParticipant(created)
    } catch (err) {
      if (err instanceof DuplicateParticipantError) {
        return reply.status(409).send({ message: err.message })
      }
      if (err instanceof Error && err.message === 'Evento não encontrado') {
        return reply.status(404).send({ message: err.message })
      }
      throw err
    }
  })
}
