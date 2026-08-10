import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { prisma } from '../../../database'
import { validateFormData } from '../utils/validate-form-data'
import {
  createRegistrationRecord,
  DuplicateParticipantError,
  RegistrationLimitError
} from '../services/registration-create'
import { formatParticipant } from '../utils/participant'
import {
  parseFieldLayout,
  resolveUnifiedFields
} from '../utils/field-layout'
import { parseStructuralConfig } from '../utils/structural-config'
import {
  resolveStructuralValues,
  validateCpfWhenEnabled,
  validateResolvedStructuralValues
} from '../utils/resolve-structural-values'
import {
  countActiveRegistrationsForForm,
  getRegistrationFormAvailability
} from '../utils/registration-form-limit'

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
    const fieldLayout = parseFieldLayout(form.field_layout, structuralConfig, form.form_fields)
    const unifiedFields = resolveUnifiedFields(structuralConfig, form.form_fields, fieldLayout)
    const activeCount = await countActiveRegistrationsForForm(prisma, form.id)
    const availability = await getRegistrationFormAvailability(form, form.id, activeCount)

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
        structural_config: structuralConfig,
        field_layout: fieldLayout,
        redirect_url: form.redirect_url,
        registration_limit: form.registration_limit,
        active_registration_count: activeCount
      },
      unified_fields: unifiedFields,
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
      can_submit: availability.can_submit,
      block_reason: availability.block_reason ?? null,
      block_message: availability.message ?? null
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

    const activeCount = await countActiveRegistrationsForForm(prisma, form.id)
    const availability = await getRegistrationFormAvailability(form, form.id, activeCount)
    if (!availability.can_submit) {
      return reply.status(403).send({ message: availability.message ?? 'Formulário indisponível' })
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

    const activeFormFields = form.form_fields.filter((field) => field.enabled !== false)
    const formValidation = validateFormData(activeFormFields, data.form_data ?? {})
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
      return {
        participant: formatParticipant(created),
        redirect_url: form.redirect_url
      }
    } catch (err) {
      if (err instanceof DuplicateParticipantError) {
        return reply.status(409).send({ message: err.message })
      }
      if (err instanceof RegistrationLimitError) {
        return reply.status(403).send({ message: err.message })
      }
      if (err instanceof Error && err.message === 'Evento não encontrado') {
        return reply.status(404).send({ message: err.message })
      }
      throw err
    }
  })
}
