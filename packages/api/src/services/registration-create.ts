import crypto from 'crypto'
import {
  FormField,
  prisma,
  Prisma,
  RegistrationOrigin,
  RegistrationStatus
} from '../../../database'
import { generateQRCode } from '../utils/qr'
import { sendConfirmationEmail, sendWhatsAppMessage } from './communication'
import { resolveCpf } from '../utils/participant'
import { normalizeCpf } from '../utils/cpf'

export class DuplicateParticipantError extends Error {
  constructor(message = 'Participante já cadastrado neste evento') {
    super(message)
    this.name = 'DuplicateParticipantError'
  }
}

export async function findDuplicateRegistration(
  eventId: string,
  email: string | null | undefined,
  cpf: string | null
) {
  if (cpf) {
    const byCpf = await prisma.registration.findFirst({
      where: {
        event_id: eventId,
        cpf,
        status: { not: 'cancelled' }
      }
    })
    if (byCpf) return byCpf
  }

  const normalizedEmail = email?.trim()
  if (normalizedEmail) {
    return prisma.registration.findFirst({
      where: {
        event_id: eventId,
        email: { equals: normalizedEmail, mode: 'insensitive' },
        status: { not: 'cancelled' }
      }
    })
  }

  return null
}

export interface CreateRegistrationInput {
  event_id: string
  registration_form_id?: string | null
  category_id?: string | null
  name: string
  email?: string | null
  phone?: string | null
  cpf?: string | null
  form_data: Record<string, unknown>
  origin: RegistrationOrigin
  status?: RegistrationStatus
  sendNotifications?: boolean
  skipDuplicateCheck?: boolean
  formFields?: FormField[]
}

export async function createRegistrationRecord(input: CreateRegistrationInput) {
  const {
    event_id,
    registration_form_id,
    category_id,
    name,
    email,
    phone,
    cpf: explicitCpf,
    form_data,
    origin,
    status = 'confirmed',
    sendNotifications = true,
    skipDuplicateCheck = false,
    formFields: providedFormFields
  } = input

  const event = await prisma.event.findUnique({
    where: { id: event_id },
    include: { company: true }
  })
  if (!event || event.company.status === 'inactive') {
    throw new Error('Evento não encontrado')
  }

  if (category_id) {
    const category = await prisma.category.findFirst({
      where: { id: category_id, event_id }
    })
    if (!category) {
      throw new Error('Categoria inválida para este evento')
    }
  }

  let formFields = providedFormFields
  if (!formFields && registration_form_id) {
    formFields = await prisma.formField.findMany({
      where: { registration_form_id },
      orderBy: { order: 'asc' }
    })
  }

  const cpf = explicitCpf !== undefined
    ? (explicitCpf ? normalizeImportCpf(explicitCpf) : null)
    : resolveCpf(undefined, formFields ?? [], form_data)
  const normalizedEmail = email?.trim().toLowerCase() || null

  if (!skipDuplicateCheck) {
    const duplicate = await findDuplicateRegistration(event_id, normalizedEmail, cpf)
    if (duplicate) {
      throw new DuplicateParticipantError()
    }
  }

  const timestamp = Date.now()
  const expiresAt = new Date(timestamp + 30 * 24 * 60 * 60 * 1000)
  const secret = process.env.QR_HMAC_SECRET || 'flowpass-qr-secret'

  const registration = await prisma.registration.create({
    data: {
      event_id,
      registration_form_id: registration_form_id ?? null,
      category_id: category_id ?? null,
      name: name.trim(),
      email: normalizedEmail,
      phone: phone?.trim() || null,
      cpf,
      form_data: form_data as Prisma.InputJsonValue,
      qr_token_expires_at: expiresAt,
      status,
      origin
    },
    include: {
      category: { select: { id: true, name: true } },
      registration_form: { select: { id: true, name: true } }
    }
  })

  const qrToken = crypto.createHmac('sha256', secret)
    .update(`${registration.id}:${event_id}:${timestamp}`)
    .digest('hex')

  const updated = await prisma.registration.update({
    where: { id: registration.id },
    data: { qr_token: qrToken },
    include: {
      category: { select: { id: true, name: true } },
      registration_form: { select: { id: true, name: true } }
    }
  })

  if (sendNotifications) {
    const qrCodeDataUrl = await generateQRCode(qrToken)
    if (updated.email) {
      sendConfirmationEmail({
        email: updated.email,
        name: updated.name,
        eventName: event.name,
        qrCodeUrl: qrCodeDataUrl,
        companyName: event.company.name
      })
    }
    if (updated.phone) {
      sendWhatsAppMessage({
        phone: updated.phone,
        name: updated.name,
        eventName: event.name,
        qrCodeUrl: qrCodeDataUrl
      })
    }
  }

  return { ...updated, qr_token: qrToken }
}

export async function getRegistrationQrImage(registrationId: string, eventId: string) {
  const registration = await prisma.registration.findFirst({
    where: { id: registrationId, event_id: eventId, status: { not: 'cancelled' } }
  })
  if (!registration?.qr_token) {
    return null
  }
  const qr_image = await generateQRCode(registration.qr_token)
  return { qr_token: registration.qr_token, qr_image }
}

export function normalizeImportCpf(value: string | undefined): string | null {
  if (!value?.trim()) return null
  const digits = normalizeCpf(value)
  return digits.length === 11 ? digits : null
}
