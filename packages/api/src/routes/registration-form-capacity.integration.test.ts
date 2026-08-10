import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import crypto from 'crypto'
import { buildApp } from '../app.js'
import { prisma } from '../../../database/index.js'
import { createDefaultRegistrationForm } from '../services/registration-form.js'

let dbReady = false
try {
  await prisma.$connect()
  await prisma.$queryRaw`SELECT 1`
  dbReady = true
} catch {
  dbReady = false
}

const baseStructuralConfig = {
  name: { enabled: true, required: true },
  email: { enabled: true, required: true },
  phone: { enabled: false, required: false },
  cpf: { enabled: false, required: false },
  category: { enabled: false, required: false }
}

const baseLayout = [
  { kind: 'structural', key: 'name' },
  { kind: 'structural', key: 'email' }
]

describe('registration form settings and capacity', { skip: !dbReady }, () => {
  let app: Awaited<ReturnType<typeof buildApp>>
  let adminToken = ''
  let eventId = ''
  let formId = ''
  let publicId = ''
  let companyBEventId = ''
  let companyBFormId = ''

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
        name: 'Capacity Tenant B',
        cnpj: crypto.randomUUID().replace(/\D/g, '').slice(0, 14),
        email: `capacity-b-${Date.now()}@test.com`,
        subdomain: `capacity-b-${Date.now()}`,
        status: 'active'
      }
    })

    const start = new Date()
    const end = new Date(start.getTime() + 3600000)

    const event = await prisma.event.create({
      data: {
        company_id: companyA!.id,
        name: 'Capacity Event',
        start_at: start,
        end_at: end,
        status: 'active'
      }
    })
    eventId = event.id

    const eventB = await prisma.event.create({
      data: {
        company_id: companyB.id,
        name: 'Capacity Event B',
        start_at: start,
        end_at: end,
        status: 'active'
      }
    })
    companyBEventId = eventB.id
    const formBDefault = await createDefaultRegistrationForm(companyBEventId)
    companyBFormId = formBDefault.id

    const createForm = await app.inject({
      method: 'POST',
      url: `/events/${eventId}/registration-forms`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { name: 'Capacity Form' }
    })
    formId = createForm.json().id
    publicId = createForm.json().public_id

    await app.inject({
      method: 'PATCH',
      url: `/events/${eventId}/registration-forms/${formId}`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: {
        structural_config: baseStructuralConfig,
        field_layout: baseLayout
      }
    })

    await app.inject({
      method: 'POST',
      url: `/events/${eventId}/registration-forms/${formId}/publish`,
      headers: { authorization: `Bearer ${adminToken}` }
    })
  })

  after(async () => {
    for (const id of [eventId, companyBEventId]) {
      if (!id) continue
      await prisma.registration.deleteMany({ where: { event_id: id } })
      await prisma.registrationForm.deleteMany({ where: { event_id: id } })
      await prisma.category.deleteMany({ where: { event_id: id } })
      await prisma.event.delete({ where: { id } }).catch(() => {})
    }
    await prisma.$disconnect()
    await app.close()
  })

  async function resetFormRegistrations() {
    await prisma.registration.deleteMany({ where: { registration_form_id: formId } })
  }

  async function seedActiveRegistrations(count: number, origin: 'PUBLIC_FORM' | 'IMPORT' | 'MANUAL' = 'PUBLIC_FORM') {
    const expiresAt = new Date(Date.now() + 86400000)
    for (let i = 0; i < count; i++) {
      await prisma.registration.create({
        data: {
          event_id: eventId,
          registration_form_id: formId,
          name: `Seed ${origin} ${i}`,
          email: `seed-${origin}-${i}-${Date.now()}@test.com`,
          cpf: null,
          form_data: {},
          status: 'confirmed',
          origin,
          qr_token_expires_at: expiresAt
        }
      })
    }
  }

  async function activeCount() {
    return prisma.registration.count({
      where: { registration_form_id: formId, status: { not: 'cancelled' } }
    })
  }

  async function createPublicRegistration(name: string, email: string) {
    return app.inject({
      method: 'POST',
      url: `/public/forms/${publicId}/registrations`,
      payload: { name, email, form_data: {} }
    })
  }

  it('saves registration_limit = 100 with settings-only payload', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/events/${eventId}/registration-forms/${formId}`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: {
        name: 'INSCRIÇÕES RIO FORMOSO',
        registration_limit: 100,
        redirect_url: null
      }
    })
    assert.equal(res.statusCode, 200)
    assert.equal(res.json().registration_limit, 100)
    assert.equal(res.json().redirect_url, null)
    assert.equal(res.json().active_registration_count, 0)
    assert.equal(res.json().available_slots, 100)
  })

  it('accepts string registration_limit via API preprocess', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/events/${eventId}/registration-forms/${formId}`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { registration_limit: '100' }
    })
    assert.equal(res.statusCode, 200)
    assert.equal(res.json().registration_limit, 100)
  })

  it('saves registration_limit = null', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/events/${eventId}/registration-forms/${formId}`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { registration_limit: null }
    })
    assert.equal(res.statusCode, 200)
    assert.equal(res.json().registration_limit, null)
    assert.equal(res.json().available_slots, null)

    await app.inject({
      method: 'PATCH',
      url: `/events/${eventId}/registration-forms/${formId}`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { registration_limit: 100 }
    })
  })

  it('saves redirect_url = null and valid redirect url', async () => {
    const cleared = await app.inject({
      method: 'PATCH',
      url: `/events/${eventId}/registration-forms/${formId}`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { redirect_url: null }
    })
    assert.equal(cleared.statusCode, 200)
    assert.equal(cleared.json().redirect_url, null)

    const withRedirect = await app.inject({
      method: 'PATCH',
      url: `/events/${eventId}/registration-forms/${formId}`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { redirect_url: 'https://meusite.com/obrigado' }
    })
    assert.equal(withRedirect.statusCode, 200)
    assert.match(withRedirect.json().redirect_url, /^https:\/\/meusite\.com\/obrigado/)

    await app.inject({
      method: 'PATCH',
      url: `/events/${eventId}/registration-forms/${formId}`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { redirect_url: null }
    })
  })

  it('normalizes empty redirect_url to null', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/events/${eventId}/registration-forms/${formId}`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { redirect_url: '' }
    })
    assert.equal(res.statusCode, 200)
    assert.equal(res.json().redirect_url, null)
  })

  it('reports 99 of 100 used with one slot left', async () => {
    await resetFormRegistrations()
    await app.inject({
      method: 'PATCH',
      url: `/events/${eventId}/registration-forms/${formId}`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { registration_limit: 100 }
    })
    await seedActiveRegistrations(99)

    const formRes = await app.inject({
      method: 'GET',
      url: `/events/${eventId}/registration-forms/${formId}`,
      headers: { authorization: `Bearer ${adminToken}` }
    })
    assert.equal(formRes.json().active_registration_count, 99)
    assert.equal(formRes.json().available_slots, 1)
    assert.equal(formRes.json().is_full, false)
  })

  it('blocks public submission when limit is reached and reopens after cancellation', async () => {
    await resetFormRegistrations()
    await app.inject({
      method: 'PATCH',
      url: `/events/${eventId}/registration-forms/${formId}`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { registration_limit: 100 }
    })
    await seedActiveRegistrations(99)

    const allowed = await createPublicRegistration('Allowed', 'allowed@test.com')
    assert.equal(allowed.statusCode, 200)

    const blocked = await createPublicRegistration('Blocked', 'blocked@test.com')
    assert.equal(blocked.statusCode, 403)
    assert.match(blocked.json().message, /limite de inscrições/i)

    const lastRegistration = await prisma.registration.findFirst({
      where: { registration_form_id: formId, email: 'allowed@test.com' }
    })
    assert.ok(lastRegistration)

    await app.inject({
      method: 'DELETE',
      url: `/events/${eventId}/participants/${lastRegistration!.id}`,
      headers: { authorization: `Bearer ${adminToken}` }
    })

    assert.equal(await activeCount(), 99)

    const reopened = await createPublicRegistration('Reopened', 'reopened@test.com')
    assert.equal(reopened.statusCode, 200)
  })

  it('returns ten available slots after deleting nine participants', async () => {
    await resetFormRegistrations()
    await app.inject({
      method: 'PATCH',
      url: `/events/${eventId}/registration-forms/${formId}`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { registration_limit: 100 }
    })
    await seedActiveRegistrations(99)

    const registrations = await prisma.registration.findMany({
      where: { registration_form_id: formId, status: { not: 'cancelled' } },
      take: 9
    })

    for (const registration of registrations) {
      await app.inject({
        method: 'DELETE',
        url: `/events/${eventId}/participants/${registration.id}`,
        headers: { authorization: `Bearer ${adminToken}` }
      })
    }

    const formRes = await app.inject({
      method: 'GET',
      url: `/events/${eventId}/registration-forms/${formId}`,
      headers: { authorization: `Bearer ${adminToken}` }
    })
    assert.equal(formRes.json().active_registration_count, 90)
    assert.equal(formRes.json().available_slots, 10)
  })

  it('does not count cancelled participants in capacity', async () => {
    await resetFormRegistrations()
    await app.inject({
      method: 'PATCH',
      url: `/events/${eventId}/registration-forms/${formId}`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { registration_limit: 2 }
    })
    await seedActiveRegistrations(2)

    const cancelled = await prisma.registration.findFirst({
      where: { registration_form_id: formId, status: { not: 'cancelled' } }
    })
    assert.ok(cancelled)
    await prisma.registration.update({
      where: { id: cancelled!.id },
      data: { status: 'cancelled' }
    })

    const reopened = await createPublicRegistration('After Cancel', 'after-cancel@test.com')
    assert.equal(reopened.statusCode, 200)
    assert.equal(await activeCount(), 2)
  })

  it('counts IMPORT and MANUAL origins in the same limit', async () => {
    await resetFormRegistrations()
    await app.inject({
      method: 'PATCH',
      url: `/events/${eventId}/registration-forms/${formId}`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { registration_limit: 3 }
    })

    const publicRes = await createPublicRegistration('Public Origin', 'public-origin@test.com')
    assert.equal(publicRes.statusCode, 200)

    const importRes = await app.inject({
      method: 'POST',
      url: `/events/${eventId}/participants/import`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: {
        registration_form_id: formId,
        mapping: { name: 'Nome', email: 'Email', form_fields: {} },
        rows: [{ Nome: 'Import Origin', Email: 'import-origin@test.com' }]
      }
    })
    assert.equal(importRes.statusCode, 200)
    assert.equal(importRes.json().imported, 1)

    const manualRes = await app.inject({
      method: 'POST',
      url: `/events/${eventId}/participants`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: {
        registration_form_id: formId,
        name: 'Manual Origin',
        email: 'manual-origin@test.com'
      }
    })
    assert.equal(manualRes.statusCode, 200)

    const blocked = await createPublicRegistration('Extra', 'extra@test.com')
    assert.equal(blocked.statusCode, 403)
  })

  it('import preview and execution respect remaining capacity', async () => {
    await resetFormRegistrations()
    await app.inject({
      method: 'PATCH',
      url: `/events/${eventId}/registration-forms/${formId}`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { registration_limit: 100 }
    })
    await seedActiveRegistrations(90)

    const rows = Array.from({ length: 20 }, (_, index) => ({
      Nome: `Import ${index}`,
      Email: `import-capacity-${index}-${Date.now()}@test.com`
    }))

    const preview = await app.inject({
      method: 'POST',
      url: `/events/${eventId}/participants/import/preview`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: {
        registration_form_id: formId,
        mapping: { name: 'Nome', email: 'Email', form_fields: {} },
        rows
      }
    })
    assert.equal(preview.statusCode, 200)
    assert.equal(preview.json().capacity_used, 90)
    assert.equal(preview.json().capacity_available, 10)
    assert.equal(preview.json().ready, 10)
    assert.ok(preview.json().problems.some((problem: { reason: string }) =>
      problem.reason.includes('Limite de inscrições do formulário atingido')
    ))

    const importRes = await app.inject({
      method: 'POST',
      url: `/events/${eventId}/participants/import`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: {
        registration_form_id: formId,
        mapping: { name: 'Nome', email: 'Email', form_fields: {} },
        rows
      }
    })
    assert.equal(importRes.statusCode, 200)
    assert.equal(importRes.json().imported, 10)
    assert.equal(await activeCount(), 100)
  })

  it('protects the last available slot under concurrent submissions', async () => {
    await resetFormRegistrations()
    await app.inject({
      method: 'PATCH',
      url: `/events/${eventId}/registration-forms/${formId}`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { registration_limit: 100 }
    })
    await seedActiveRegistrations(99)

    const [first, second] = await Promise.all([
      createPublicRegistration('Race One', `race-one-${Date.now()}@test.com`),
      createPublicRegistration('Race Two', `race-two-${Date.now()}@test.com`)
    ])

    const successes = [first, second].filter((res) => res.statusCode === 200)
    const failures = [first, second].filter((res) => res.statusCode === 403)
    assert.equal(successes.length, 1)
    assert.equal(failures.length, 1)
    assert.equal(await activeCount(), 100)
  })

  it('tenant A cannot patch tenant B form settings', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/events/${companyBEventId}/registration-forms/${companyBFormId}`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { name: 'Hack' }
    })
    assert.equal(res.statusCode, 404)
  })
})
