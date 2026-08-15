import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import { buildApp } from '../app.js'
import { prisma } from '../../../database/index.js'
import { createRegistrationRecord } from '../services/registration-create.js'

let dbReady = false
try {
  await prisma.$connect()
  await prisma.$queryRaw`SELECT 1`
  dbReady = true
} catch {
  dbReady = false
}

async function createAccessPoint(
  app: Awaited<ReturnType<typeof buildApp>>,
  eventId: string,
  token: string,
  payload: {
    name: string
    allows_all_categories?: boolean
    category_ids?: string[]
    active?: boolean
  }
) {
  const res = await app.inject({
    method: 'POST',
    url: `/events/${eventId}/access-points`,
    headers: { authorization: `Bearer ${token}` },
    payload: {
      active: true,
      allows_all_categories: true,
      category_ids: [],
      ...payload
    }
  })
  assert.equal(res.statusCode, 200, res.body)
  return res.json()
}

describe('credentialing integration', { skip: !dbReady }, () => {
  let app: Awaited<ReturnType<typeof buildApp>>
  let adminToken = ''
  let otherAdminToken = ''
  let eventId = ''
  let otherEventId = ''
  let categoryBomJardim = ''
  let categoryRioFormoso = ''
  let categorySaíre = ''
  let registrationAll: { id: string; qr_token: string | null; name: string }
  let registrationRio: { id: string; qr_token: string | null; name: string }
  let registrationBom: { id: string; qr_token: string | null; name: string }
  let linkAllPublicId = ''
  let linkRioPublicId = ''
  let linkMultiPublicId = ''
  let inactiveLinkPublicId = ''

  before(async () => {
    app = await buildApp()

    adminToken = (await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: 'admin@flowpass.com.br', password: 'flowpass123' }
    })).json().token

    const companyA = await prisma.company.findFirst({ where: { subdomain: 'demo' } })
    assert.ok(companyA)

    const companyB = await prisma.company.create({
      data: {
        name: 'Credentialing Co B',
        cnpj: `${Date.now()}`.slice(-14),
        email: `cred-b-${Date.now()}@test.com`,
        subdomain: `cred-b-${Date.now()}`,
        status: 'active'
      }
    })

    const bcrypt = await import('bcryptjs')
    const hash = await bcrypt.hash('flowpass123', 10)
    const otherAdmin = await prisma.user.create({
      data: {
        company_id: companyB.id,
        name: 'Admin B',
        email: `admin-b-${Date.now()}@test.com`,
        password_hash: hash,
        role: 'admin'
      }
    })
    otherAdminToken = (await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: otherAdmin.email, password: 'flowpass123' }
    })).json().token

    const start = new Date()
    const end = new Date(start.getTime() + 3600000)

    const event = await prisma.event.create({
      data: {
        company_id: companyA!.id,
        name: 'ACOLHER',
        start_at: start,
        end_at: end,
        status: 'active',
        categories: {
          create: [
            { name: 'Bom Jardim' },
            { name: 'Rio Formoso' },
            { name: 'Sairé' }
          ]
        }
      },
      include: { categories: true }
    })
    eventId = event.id
    categoryBomJardim = event.categories.find((c) => c.name === 'Bom Jardim')!.id
    categoryRioFormoso = event.categories.find((c) => c.name === 'Rio Formoso')!.id
    categorySaíre = event.categories.find((c) => c.name === 'Sairé')!.id

    const otherEvent = await prisma.event.create({
      data: {
        company_id: companyB.id,
        name: 'Outro Evento',
        start_at: start,
        end_at: end,
        status: 'active',
        categories: { create: { name: 'VIP' } }
      },
      include: { categories: true }
    })
    otherEventId = otherEvent.id

    registrationAll = await createRegistrationRecord({
      event_id: eventId,
      category_id: categoryRioFormoso,
      name: 'Participante Geral',
      email: `geral-${Date.now()}@test.com`,
      form_data: {},
      origin: 'MANUAL',
      status: 'confirmed',
      sendNotifications: false,
      skipDuplicateCheck: true
    })

    registrationRio = await createRegistrationRecord({
      event_id: eventId,
      category_id: categoryRioFormoso,
      name: 'Participante Rio',
      email: `rio-${Date.now()}@test.com`,
      form_data: {},
      origin: 'MANUAL',
      status: 'confirmed',
      sendNotifications: false,
      skipDuplicateCheck: true
    })

    registrationBom = await createRegistrationRecord({
      event_id: eventId,
      category_id: categoryBomJardim,
      name: 'Participante Bom Jardim',
      email: `bom-${Date.now()}@test.com`,
      form_data: {},
      origin: 'MANUAL',
      status: 'confirmed',
      sendNotifications: false,
      skipDuplicateCheck: true
    })

    const otherRegistration = await createRegistrationRecord({
      event_id: otherEventId,
      category_id: otherEvent.categories[0].id,
      name: 'Outro Evento',
      email: `other-${Date.now()}@test.com`,
      form_data: {},
      origin: 'MANUAL',
      status: 'confirmed',
      sendNotifications: false,
      skipDuplicateCheck: true
    })

    assert.ok(registrationAll.qr_token)
    assert.ok(registrationRio.qr_token)
    assert.ok(registrationBom.qr_token)
    assert.ok(otherRegistration.qr_token)

    linkAllPublicId = (await createAccessPoint(app, eventId, adminToken, {
      name: 'Credenciamento Geral',
      allows_all_categories: true
    })).public_id

    linkRioPublicId = (await createAccessPoint(app, eventId, adminToken, {
      name: 'Mesa Rio Formoso',
      allows_all_categories: false,
      category_ids: [categoryRioFormoso]
    })).public_id

    linkMultiPublicId = (await createAccessPoint(app, eventId, adminToken, {
      name: 'Mesa Bom Jardim + Sairé',
      allows_all_categories: false,
      category_ids: [categoryBomJardim, categorySaíre]
    })).public_id

    inactiveLinkPublicId = (await createAccessPoint(app, eventId, adminToken, {
      name: 'Link Inativo',
      allows_all_categories: true,
      active: false
    })).public_id
  })

  after(async () => {
    if (eventId) {
      await prisma.checkIn.deleteMany({
        where: { registration: { event_id: eventId } }
      })
      await prisma.accessPoint.deleteMany({ where: { event_id: eventId } })
      await prisma.registration.deleteMany({ where: { event_id: eventId } })
      await prisma.category.deleteMany({ where: { event_id: eventId } })
      await prisma.event.delete({ where: { id: eventId } }).catch(() => {})
    }
    if (otherEventId) {
      await prisma.registration.deleteMany({ where: { event_id: otherEventId } })
      await prisma.category.deleteMany({ where: { event_id: otherEventId } })
      await prisma.event.delete({ where: { id: otherEventId } }).catch(() => {})
    }
    await prisma.$disconnect()
    await app.close()
  })

  it('accepts all categories on general link', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/public/credentialing/${linkAllPublicId}/scan`,
      payload: { qr_token: registrationBom.qr_token }
    })
    assert.equal(res.statusCode, 200)
    assert.equal(res.json().result, 'success')
    assert.equal(res.json().name, 'Participante Bom Jardim')
  })

  it('accepts single allowed category', async () => {
    const fresh = await createRegistrationRecord({
      event_id: eventId,
      category_id: categoryRioFormoso,
      name: 'Rio Fresh',
      email: `rio-fresh-${Date.now()}@test.com`,
      form_data: {},
      origin: 'MANUAL',
      status: 'confirmed',
      sendNotifications: false,
      skipDuplicateCheck: true
    })

    const res = await app.inject({
      method: 'POST',
      url: `/public/credentialing/${linkRioPublicId}/scan`,
      payload: { qr_token: fresh.qr_token }
    })
    assert.equal(res.statusCode, 200)
    assert.equal(res.json().result, 'success')
  })

  it('accepts multiple allowed categories', async () => {
    const fresh = await createRegistrationRecord({
      event_id: eventId,
      category_id: categorySaíre,
      name: 'Saire Fresh',
      email: `saire-fresh-${Date.now()}@test.com`,
      form_data: {},
      origin: 'MANUAL',
      status: 'confirmed',
      sendNotifications: false,
      skipDuplicateCheck: true
    })

    const res = await app.inject({
      method: 'POST',
      url: `/public/credentialing/${linkMultiPublicId}/scan`,
      payload: { qr_token: fresh.qr_token }
    })
    assert.equal(res.statusCode, 200)
    assert.equal(res.json().result, 'success')
  })

  it('rejects unauthorized category', async () => {
    const fresh = await createRegistrationRecord({
      event_id: eventId,
      category_id: categoryRioFormoso,
      name: 'Rio Blocked',
      email: `rio-block-${Date.now()}@test.com`,
      form_data: {},
      origin: 'MANUAL',
      status: 'confirmed',
      sendNotifications: false,
      skipDuplicateCheck: true
    })

    const res = await app.inject({
      method: 'POST',
      url: `/public/credentialing/${linkMultiPublicId}/scan`,
      payload: { qr_token: fresh.qr_token }
    })
    assert.equal(res.statusCode, 200)
    assert.equal(res.json().result, 'unauthorized_category')
    assert.match(res.json().message, /Rio Formoso/)
  })

  it('rejects QR from another event', async () => {
    const otherRegistration = await prisma.registration.findFirst({
      where: { event_id: otherEventId },
      select: { qr_token: true }
    })

    const res = await app.inject({
      method: 'POST',
      url: `/public/credentialing/${linkAllPublicId}/scan`,
      payload: { qr_token: otherRegistration!.qr_token }
    })
    assert.equal(res.statusCode, 200)
    assert.equal(res.json().result, 'invalid_qr')
  })

  it('rejects invalid QR token', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/public/credentialing/${linkAllPublicId}/scan`,
      payload: { qr_token: 'token-invalido-1234567890abcdef' }
    })
    assert.equal(res.statusCode, 200)
    assert.equal(res.json().result, 'invalid_qr')
  })

  it('returns already checked in for duplicate scan', async () => {
    const first = await app.inject({
      method: 'POST',
      url: `/public/credentialing/${linkAllPublicId}/scan`,
      payload: { qr_token: registrationAll.qr_token }
    })
    assert.equal(first.statusCode, 200)
    assert.equal(first.json().result, 'success')

    const second = await app.inject({
      method: 'POST',
      url: `/public/credentialing/${linkAllPublicId}/scan`,
      payload: { qr_token: registrationAll.qr_token }
    })
    assert.equal(second.statusCode, 200)
    assert.equal(second.json().result, 'already_checked_in')
    assert.ok(second.json().checked_at)
  })

  it('reconciles offline check-ins from multiple devices and keeps the earliest as valid', async () => {
    const fresh = await createRegistrationRecord({
      event_id: eventId,
      category_id: categoryRioFormoso,
      name: 'Offline Multi Device',
      email: `offline-multi-${Date.now()}@test.com`,
      form_data: {},
      origin: 'MANUAL',
      status: 'confirmed',
      sendNotifications: false,
      skipDuplicateCheck: true
    })

    const laterUuid = crypto.randomUUID()
    const earlierUuid = crypto.randomUUID()
    const later = new Date(Date.now() - 1_000).toISOString()
    const earlier = new Date(Date.now() - 5_000).toISOString()

    const res = await app.inject({
      method: 'POST',
      url: `/events/${eventId}/checkins`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: [
        { uuid: laterUuid, qr_token: fresh.qr_token, checked_at: later, device_id: 'device-b' },
        { uuid: earlierUuid, qr_token: fresh.qr_token, checked_at: earlier, device_id: 'device-a' }
      ]
    })

    assert.equal(res.statusCode, 200, res.body)
    assert.deepEqual(res.json().results.map((item: { status: string }) => item.status), [
      'duplicate',
      'accepted'
    ])

    const stored = await prisma.checkIn.findMany({
      where: { registration_id: fresh.id },
      orderBy: { checked_at: 'asc' }
    })
    assert.equal(stored.length, 2)
    assert.equal(stored[0].uuid, earlierUuid)
    assert.equal(stored[0].is_duplicate, false)
    assert.equal(stored[0].device_id, 'device-a')
    assert.equal(stored[1].uuid, laterUuid)
    assert.equal(stored[1].is_duplicate, true)
  })

  it('is idempotent when the same offline UUID is synchronized twice', async () => {
    const fresh = await createRegistrationRecord({
      event_id: eventId,
      category_id: categoryRioFormoso,
      name: 'Offline Idempotent',
      email: `offline-idempotent-${Date.now()}@test.com`,
      form_data: {},
      origin: 'MANUAL',
      status: 'confirmed',
      sendNotifications: false,
      skipDuplicateCheck: true
    })
    const uuid = crypto.randomUUID()
    const payload = [{
      uuid,
      qr_token: fresh.qr_token,
      checked_at: new Date().toISOString(),
      device_id: 'device-idempotent'
    }]

    const first = await app.inject({
      method: 'POST',
      url: `/events/${eventId}/checkins`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload
    })
    const second = await app.inject({
      method: 'POST',
      url: `/events/${eventId}/checkins`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload
    })

    assert.equal(first.json().results[0].status, 'accepted')
    assert.equal(second.json().results[0].status, 'already_synced')
    assert.equal(await prisma.checkIn.count({ where: { uuid } }), 1)
  })

  it('rejects an expired QR during offline synchronization', async () => {
    const fresh = await createRegistrationRecord({
      event_id: eventId,
      category_id: categoryRioFormoso,
      name: 'Expired Offline',
      email: `expired-offline-${Date.now()}@test.com`,
      form_data: {},
      origin: 'MANUAL',
      status: 'confirmed',
      sendNotifications: false,
      skipDuplicateCheck: true
    })
    await prisma.registration.update({
      where: { id: fresh.id },
      data: { qr_token_expires_at: new Date(Date.now() - 1_000) }
    })

    const uuid = crypto.randomUUID()
    const res = await app.inject({
      method: 'POST',
      url: `/events/${eventId}/checkins`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: [{
        uuid,
        qr_token: fresh.qr_token,
        checked_at: new Date().toISOString(),
        device_id: 'device-expired'
      }]
    })

    assert.equal(res.statusCode, 200, res.body)
    assert.equal(res.json().results[0].status, 'expired_qr')
    assert.equal(await prisma.checkIn.count({ where: { uuid } }), 0)
  })

  it('rejects inactive link', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/public/credentialing/${inactiveLinkPublicId}/scan`,
      payload: { qr_token: registrationRio.qr_token }
    })
    assert.equal(res.statusCode, 200)
    assert.equal(res.json().result, 'inactive_link')
  })

  it('isolates companies on admin access-points list', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/events/${eventId}/access-points`,
      headers: { authorization: `Bearer ${otherAdminToken}` }
    })
    assert.equal(res.statusCode, 404)
  })

  it('assigns default category from registration form', async () => {
    const formRes = await app.inject({
      method: 'POST',
      url: `/events/${eventId}/registration-forms`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { name: 'Inscrição Rio Formoso' }
    })
    assert.equal(formRes.statusCode, 200)
    const form = formRes.json()

    const patchRes = await app.inject({
      method: 'PATCH',
      url: `/events/${eventId}/registration-forms/${form.id}`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: {
        default_category_id: categoryRioFormoso,
        status: 'active',
        structural_config: {
          name: { enabled: true, required: true },
          email: { enabled: true, required: true },
          phone: { enabled: false, required: false },
          cpf: { enabled: false, required: false },
          category: { enabled: false, required: false }
        }
      }
    })
    assert.equal(patchRes.statusCode, 200)

    const submitRes = await app.inject({
      method: 'POST',
      url: `/public/forms/${form.public_id}/registrations`,
      payload: {
        name: 'Auto Categoria',
        email: `auto-cat-${Date.now()}@test.com`,
        form_data: {}
      }
    })
    assert.equal(submitRes.statusCode, 200)

    const created = await prisma.registration.findUnique({
      where: { id: submitRes.json().participant.id },
      include: { category: true }
    })
    assert.equal(created?.category_id, categoryRioFormoso)
    assert.equal(created?.category?.name, 'Rio Formoso')
  })
})
