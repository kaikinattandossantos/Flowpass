import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { prisma } from '../../../database'
import crypto from 'crypto'
import { io } from '../server'
import { generateQRCode } from '../utils/qr'
import { sendConfirmationEmail, sendWhatsAppMessage } from '../services/communication'

export async function registrationRoutes(app: FastifyInstance) {
  // Public registration
  app.withTypeProvider<ZodTypeProvider>().post('/events/:id/registrations', {
    schema: {
      params: z.object({ id: z.string().uuid() }),
      body: z.object({
        category_id: z.string().uuid(),
        name: z.string(),
        email: z.string().email(),
        phone: z.string().optional(),
        form_data: z.record(z.string(), z.any())
      })
    }
  }, async (request, reply) => {
    const { id: event_id } = request.params
    const data = request.body

    // Generate QR token
    const timestamp = Date.now()
    const expiresAt = new Date(timestamp + 30 * 24 * 60 * 60 * 1000) // 30 days
    const secret = process.env.QR_HMAC_SECRET || 'flowpass-qr-secret'
    
    const registration = await prisma.registration.create({
      data: {
        event_id,
        ...data,
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

    // Background tasks for communication
    const event = await prisma.event.findUnique({
      where: { id: event_id },
      include: { company: true }
    })

    const qrCodeDataUrl = await generateQRCode(qrToken)

    if (event) {
      sendConfirmationEmail({
        email: data.email,
        name: data.name,
        eventName: event.name,
        qrCodeUrl: qrCodeDataUrl,
        companyName: event.company.name
      })

      if (data.phone) {
        sendWhatsAppMessage({
          phone: data.phone,
          name: data.name,
          eventName: event.name,
          qrCodeUrl: qrCodeDataUrl
        })
      }
    }

    return { ...registration, qr_token: qrToken }
  })

  // Sync offline for operators
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

    return registrations.map((r: any) => ({
      t: r.qr_token,
      n: r.name,
      c: r.category.name
    }))
  })

  // Batch check-in sync
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

        // Notify real-time dashboard
        io.of(`/events/${event_id}`).emit('checkin', {
          registration_id: registration.id,
          name: registration.name,
          category: registration.category.name,
          checked_at: newCheckin.checked_at,
          operator_name: 'Operator' // Ideally fetch operator name
        })

        results.push(newCheckin)
      }
    }

    return { synced: results.length }
  })
}
