import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { prisma } from '../../../database'
import crypto from 'crypto'
import { io } from '../server'
import { generateQRCode } from '../utils/qr'
import { sendConfirmationEmail, sendAttendanceEmail, sendWhatsAppMessage } from '../services/communication'
import { validateParticipantFormData } from '../utils/registration'
import { formatEventAddress } from '../utils/address'
import { getJwtUser, requireCompanyUser } from '../utils/auth'
import { parseQrToken } from '../utils/checkin'

async function buildTicketResponse(registrationId: string, qrToken: string) {
  const registration = await prisma.registration.findUnique({
    where: { id: registrationId },
    include: {
      category: { select: { name: true } },
      event: {
        select: {
          id: true,
          name: true,
          start_at: true,
          street: true,
          number: true,
          complement: true,
          neighborhood: true,
          city: true,
          state: true,
          cep: true,
          location: true,
          accent_color: true
        }
      }
    }
  })

  if (!registration || !registration.event) return null

  const qrCodeUrl = await generateQRCode(qrToken)

  return {
    id: registration.id,
    name: registration.name,
    email: registration.email,
    qr_token: qrToken,
    qr_code_url: qrCodeUrl,
    category_name: registration.category.name,
    event: {
      id: registration.event.id,
      name: registration.event.name,
      start_at: registration.event.start_at,
      location: formatEventAddress(registration.event),
      accent_color: registration.event.accent_color
    }
  }
}

export async function registrationRoutes(app: FastifyInstance) {
  const requireAuth = async (request: FastifyRequest, reply: FastifyReply) => {
    const companyId = await requireCompanyUser(request, reply)
    if (typeof companyId !== 'string') return
  }

  app.withTypeProvider<ZodTypeProvider>().post('/events/:id/registrations', {
    schema: {
      params: z.object({ id: z.string().uuid() }),
      body: z.object({
        category_id: z.string().uuid(),
        name: z.string().min(1),
        email: z.string().email(),
        phone: z.string().optional(),
        form_data: z.record(z.string(), z.any()).default({})
      })
    }
  }, async (request, reply) => {
    const { id: event_id } = request.params
    const data = request.body
    const normalizedEmail = data.email.trim().toLowerCase()

    const event = await prisma.event.findUnique({
      where: { id: event_id, status: 'active' },
      include: {
        company: true,
        categories: true,
        form_fields: true
      }
    })

    if (!event) {
      return reply.status(404).send({ message: 'Evento não encontrado ou inscrições encerradas.' })
    }

    const category = event.categories.find((item) => item.id === data.category_id)
    if (!category) {
      return reply.status(400).send({ message: 'Categoria inválida para este evento.' })
    }

    const formError = validateParticipantFormData(event.form_fields, data.form_data)
    if (formError) {
      return reply.status(400).send({ message: formError })
    }

    const existingRegistration = await prisma.registration.findFirst({
      where: { event_id, email: normalizedEmail, status: 'confirmed' }
    })

    if (existingRegistration?.qr_token) {
      const ticket = await buildTicketResponse(existingRegistration.id, existingRegistration.qr_token)
      return reply.status(409).send({
        message: 'Este e-mail já está inscrito neste evento.',
        ticket
      })
    }

    const timestamp = Date.now()
    const expiresAt = new Date(timestamp + 30 * 24 * 60 * 60 * 1000)
    const secret = process.env.QR_HMAC_SECRET || 'flowpass-qr-secret'

    const registration = await prisma.registration.create({
      data: {
        event_id,
        category_id: data.category_id,
        name: data.name.trim(),
        email: normalizedEmail,
        phone: data.phone?.trim() || null,
        form_data: data.form_data,
        qr_token_expires_at: expiresAt,
        status: 'confirmed'
      }
    })

    const qrToken = crypto.createHmac('sha256', secret)
      .update(`${registration.id}:${event_id}:${timestamp}`)
      .digest('hex')

    await prisma.registration.update({
      where: { id: registration.id },
      data: { qr_token: qrToken }
    })

    const ticket = await buildTicketResponse(registration.id, qrToken)
    const qrCodeDataUrl = ticket?.qr_code_url

    if (qrCodeDataUrl) {
      sendConfirmationEmail({
        email: normalizedEmail,
        name: data.name.trim(),
        eventName: event.name,
        qrCodeUrl: qrCodeDataUrl,
        companyName: event.company.name
      })

      if (data.phone) {
        sendWhatsAppMessage({
          phone: data.phone,
          name: data.name.trim(),
          eventName: event.name,
          qrCodeUrl: qrCodeDataUrl
        })
      }
    }

    return ticket
  })

  app.withTypeProvider<ZodTypeProvider>().get('/public/tickets/:token', {
    schema: {
      params: z.object({ token: z.string().min(16) })
    }
  }, async (request, reply) => {
    const { token } = request.params

    const registration = await prisma.registration.findUnique({
      where: { qr_token: token },
      include: {
        category: { select: { name: true } },
        event: {
          select: {
            id: true,
            name: true,
            start_at: true,
            street: true,
            number: true,
            complement: true,
            neighborhood: true,
            city: true,
            state: true,
            cep: true,
            location: true,
            accent_color: true,
            status: true
          }
        }
      }
    })

    if (!registration || !registration.event || registration.event.status !== 'active') {
      return reply.status(404).send({ message: 'Ingresso não encontrado.' })
    }

    const ticket = await buildTicketResponse(registration.id, token)
    return ticket
  })

  app.withTypeProvider<ZodTypeProvider>().get('/events/:id/sync', {
    preHandler: [async (request) => await request.jwtVerify()],
    schema: {
      params: z.object({ id: z.string().uuid() })
    }
  }, async (request) => {
    const { id: event_id } = request.params

    const registrations = await prisma.registration.findMany({
      where: { event_id, status: 'confirmed' },
      select: {
        qr_token: true,
        name: true,
        category: { select: { name: true } }
      }
    })

    return registrations.map((r) => ({
      t: r.qr_token,
      n: r.name,
      c: r.category.name
    }))
  })

  app.withTypeProvider<ZodTypeProvider>().post('/events/:id/checkin', {
    preHandler: [requireAuth],
    schema: {
      params: z.object({ id: z.string().uuid() }),
      body: z.object({
        qr_token: z.string().min(16),
        email: z.string().email()
      })
    }
  }, async (request, reply) => {
    const { id: event_id } = request.params
    const { company_id } = getJwtUser(request)
    const normalizedEmail = request.body.email.trim().toLowerCase()
    const qrToken = parseQrToken(request.body.qr_token)

    const event = await prisma.event.findFirst({
      where: { id: event_id, company_id: company_id! }
    })

    if (!event) {
      return reply.status(404).send({ message: 'Evento não encontrado.' })
    }

    const company = await prisma.company.findUnique({
      where: { id: event.company_id },
      select: { name: true }
    })

    const registration = await prisma.registration.findUnique({
      where: { qr_token: qrToken },
      include: { category: true }
    })

    if (!registration) {
      return reply.status(404).send({ message: 'QR Code não encontrado. Verifique o código ou link do ingresso.' })
    }

    if (registration.event_id !== event_id) {
      const correctEvent = await prisma.event.findUnique({
        where: { id: registration.event_id },
        select: { id: true, name: true }
      })

      return reply.status(400).send({
        message: correctEvent
          ? `Este QR Code pertence ao evento "${correctEvent.name}". Abra o credenciamento desse evento.`
          : 'QR Code inválido para este evento.',
        correct_event_id: correctEvent?.id ?? null,
        correct_event_name: correctEvent?.name ?? null
      })
    }

    if (registration.status !== 'confirmed') {
      return reply.status(400).send({ message: 'Inscrição não está confirmada.' })
    }

    if (registration.email !== normalizedEmail) {
      return reply.status(400).send({
        message: 'E-mail não confere com a inscrição. Verifique e tente novamente.',
        participant_name: registration.name
      })
    }

    const existingCheckin = await prisma.checkIn.findFirst({
      where: {
        registration_id: registration.id,
        is_duplicate: false
      },
      orderBy: { checked_at: 'desc' }
    })

    if (existingCheckin) {
      return reply.status(409).send({
        message: 'Participante já realizou check-in.',
        checked_at: existingCheckin.checked_at,
        participant: {
          id: registration.id,
          name: registration.name,
          email: registration.email,
          category: registration.category.name
        }
      })
    }

    const user = getJwtUser(request)
    const checkin = await prisma.checkIn.create({
      data: {
        registration_id: registration.id,
        operator_id: null,
        device_id: `web:${user.sub}`,
        uuid: crypto.randomUUID(),
        synced_at: new Date()
      }
    })

    io.of(`/events/${event_id}`).emit('checkin', {
      registration_id: registration.id,
      name: registration.name,
      category: registration.category.name,
      checked_at: checkin.checked_at,
      operator_name: 'Credenciamento Web'
    })

    sendAttendanceEmail({
      email: registration.email,
      name: registration.name,
      eventName: event.name,
      checkedAt: checkin.checked_at,
      companyName: company?.name ?? 'FlowPass'
    })

    return {
      message: 'Check-in realizado com sucesso!',
      checked_at: checkin.checked_at,
      participant: {
        id: registration.id,
        name: registration.name,
        email: registration.email,
        category: registration.category.name
      }
    }
  })

  app.withTypeProvider<ZodTypeProvider>().get('/events/:id/checkin/preview', {
    preHandler: [requireAuth],
    schema: {
      params: z.object({ id: z.string().uuid() }),
      querystring: z.object({ qr_token: z.string().min(16) })
    }
  }, async (request, reply) => {
    const { id: event_id } = request.params
    const { company_id } = getJwtUser(request)
    const qrToken = parseQrToken(request.query.qr_token)

    const event = await prisma.event.findFirst({
      where: { id: event_id, company_id: company_id! }
    })

    if (!event) {
      return reply.status(404).send({ message: 'Evento não encontrado.' })
    }

    const registration = await prisma.registration.findUnique({
      where: { qr_token: qrToken },
      include: {
        category: { select: { name: true } },
        checkins: {
          where: { is_duplicate: false },
          orderBy: { checked_at: 'desc' },
          take: 1,
          select: { checked_at: true }
        }
      }
    })

    if (!registration) {
      return reply.status(404).send({ message: 'QR Code não encontrado. Verifique o código ou link do ingresso.' })
    }

    if (registration.event_id !== event_id) {
      const correctEvent = await prisma.event.findUnique({
        where: { id: registration.event_id },
        select: { id: true, name: true }
      })

      return reply.status(400).send({
        message: correctEvent
          ? `Este QR Code pertence ao evento "${correctEvent.name}". Abra o credenciamento desse evento.`
          : 'QR Code inválido para este evento.',
        correct_event_id: correctEvent?.id ?? null,
        correct_event_name: correctEvent?.name ?? null
      })
    }

    const maskEmail = (email: string) => {
      const [local, domain] = email.split('@')
      if (!domain) return email
      const visible = local.slice(0, Math.min(2, local.length))
      return `${visible}${'*'.repeat(Math.max(local.length - 2, 2))}@${domain}`
    }

    return {
      id: registration.id,
      name: registration.name,
      masked_email: maskEmail(registration.email),
      category: registration.category.name,
      qr_token: qrToken,
      already_checked_in: registration.checkins.length > 0,
      checked_at: registration.checkins[0]?.checked_at ?? null
    }
  })

  app.withTypeProvider<ZodTypeProvider>().post('/events/:id/checkins', {
    preHandler: [async (request) => await request.jwtVerify()],
    schema: {
      params: z.object({ id: z.string().uuid() }),
      body: z.array(z.object({
        uuid: z.string(),
        qr_token: z.string(),
        checked_at: z.string().datetime(),
        device_id: z.string().optional()
      }))
    }
  }, async (request) => {
    const { id: event_id } = request.params
    const { sub: operator_id } = request.user as { sub: string }
    const checkins = request.body

    const results = []

    for (const checkin of checkins) {
      const registration = await prisma.registration.findUnique({
        where: { qr_token: checkin.qr_token },
        include: { category: true }
      })

      if (!registration) continue

      const existing = await prisma.checkIn.findUnique({
        where: { uuid: checkin.uuid }
      })

      if (!existing) {
        const newCheckin = await prisma.checkIn.create({
          data: {
            registration_id: registration.id,
            operator_id,
            device_id: checkin.device_id,
            checked_at: new Date(checkin.checked_at),
            uuid: checkin.uuid,
            synced_at: new Date()
          }
        })

        io.of(`/events/${event_id}`).emit('checkin', {
          registration_id: registration.id,
          name: registration.name,
          category: registration.category.name,
          checked_at: newCheckin.checked_at,
          operator_name: 'Operator'
        })

        results.push(newCheckin)
      }
    }

    return { synced: results.length }
  })
}