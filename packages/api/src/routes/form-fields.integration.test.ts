import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
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

describe('form-fields integration', { skip: !dbReady }, () => {
  let app: Awaited<ReturnType<typeof buildApp>>
  let adminToken = ''
  let viewerToken = ''
  let operatorToken = ''
  let eventId = ''
  let otherEventId = ''
  let formId = ''
  let fieldId = ''
  let categoryId = ''

  before(async () => {
    app = await buildApp()

    const adminLogin = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: 'admin@flowpass.com.br', password: 'flowpass123' }
    })
    adminToken = adminLogin.json().token

    const company = await prisma.company.findFirst({ where: { subdomain: 'demo' } })
    assert.ok(company)

    const viewer = await prisma.user.upsert({
      where: { email: 'viewer-test@flowpass.com.br' },
      update: {},
      create: {
        company_id: company.id,
        name: 'Viewer Test',
        email: 'viewer-test@flowpass.com.br',
        password_hash: '$2a$10$dummy',
        role: 'viewer'
      }
    })

    const operator = await prisma.user.upsert({
      where: { email: 'operator-test@flowpass.com.br' },
      update: {},
      create: {
        company_id: company.id,
        name: 'Operator Test',
        email: 'operator-test@flowpass.com.br',
        password_hash: '$2a$10$dummy',
        role: 'operator'
      }
    })

    // viewer/operator need real password for login - use bcrypt in seed style
    const bcrypt = await import('bcryptjs')
    const hash = await bcrypt.hash('flowpass123', 10)
    await prisma.user.update({ where: { id: viewer.id }, data: { password_hash: hash } })
    await prisma.user.update({ where: { id: operator.id }, data: { password_hash: hash } })

    const viewerLogin = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: 'viewer-test@flowpass.com.br', password: 'flowpass123' }
    })
    viewerToken = viewerLogin.json().token

    const operatorLogin = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: 'operator-test@flowpass.com.br', password: 'flowpass123' }
    })
    operatorToken = operatorLogin.json().token

    const start = new Date()
    const end = new Date(start.getTime() + 3600000)

    const event = await prisma.event.create({
      data: {
        company_id: company.id,
        name: 'Test Form Event',
        start_at: start,
        end_at: end,
        status: 'active',
        categories: { create: { name: 'Geral' } }
      },
      include: { categories: true }
    })
    eventId = event.id
    categoryId = event.categories[0].id
    const form = await createDefaultRegistrationForm(eventId)
    formId = form.id

    const otherCompany = await prisma.company.create({
      data: {
        name: 'Other Co',
        cnpj: `${Date.now()}`.slice(-14),
        email: `other-${Date.now()}@test.com`,
        subdomain: `other-${Date.now()}`,
        status: 'active'
      }
    })

    const otherEvent = await prisma.event.create({
      data: {
        company_id: otherCompany.id,
        name: 'Other Event',
        start_at: start,
        end_at: end,
        status: 'active'
      }
    })
    otherEventId = otherEvent.id
  })

  after(async () => {
    if (eventId) {
      await prisma.registration.deleteMany({ where: { event_id: eventId } })
      await prisma.registrationForm.deleteMany({ where: { event_id: eventId } })
      await prisma.category.deleteMany({ where: { event_id: eventId } })
      await prisma.event.delete({ where: { id: eventId } }).catch(() => {})
    }
    if (otherEventId) {
      const ev = await prisma.event.findUnique({ where: { id: otherEventId } })
      if (ev) {
        await prisma.event.delete({ where: { id: otherEventId } })
        await prisma.company.delete({ where: { id: ev.company_id } })
      }
    }
    await prisma.$disconnect()
    await app.close()
  })

  it('admin lists form fields', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/events/${eventId}/registration-forms/${formId}/form-fields`,
      headers: { authorization: `Bearer ${adminToken}` }
    })
    assert.equal(res.statusCode, 200)
    assert.ok(Array.isArray(res.json()))
  })

  it('admin creates form field', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/events/${eventId}/registration-forms/${formId}/form-fields`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: {
        label: 'Empresa',
        type: 'text',
        required: true
      }
    })
    assert.equal(res.statusCode, 200)
    fieldId = res.json().id
    assert.ok(fieldId)
  })

  it('admin edits form field', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/events/${eventId}/registration-forms/${formId}/form-fields/${fieldId}`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { label: 'Nome da empresa' }
    })
    assert.equal(res.statusCode, 200)
    assert.equal(res.json().label, 'Nome da empresa')
  })

  it('admin cannot access other company event', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/events/${otherEventId}/registration-forms`,
      headers: { authorization: `Bearer ${adminToken}` }
    })
    assert.equal(res.statusCode, 404)
  })

  it('viewer cannot create field', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/events/${eventId}/registration-forms/${formId}/form-fields`,
      headers: { authorization: `Bearer ${viewerToken}` },
      payload: { label: 'X', type: 'text' }
    })
    assert.equal(res.statusCode, 403)
  })

  it('operator cannot list form fields', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/events/${eventId}/registration-forms/${formId}/form-fields`,
      headers: { authorization: `Bearer ${operatorToken}` }
    })
    assert.equal(res.statusCode, 403)
  })

  it('registration rejects missing required dynamic field', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/events/${eventId}/registrations`,
      payload: {
        category_id: categoryId,
        name: 'João',
        email: 'joao@test.com',
        form_data: {}
      }
    })
    assert.equal(res.statusCode, 400)
  })

  it('registration accepts valid payload', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/events/${eventId}/registrations`,
      payload: {
        category_id: categoryId,
        name: 'João',
        email: 'joao@test.com',
        form_data: { [fieldId]: 'Plug' }
      }
    })
    assert.equal(res.statusCode, 200)
    assert.ok(res.json().has_qr)
  })

  it('admin deletes form field', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: `/events/${eventId}/registration-forms/${formId}/form-fields/${fieldId}`,
      headers: { authorization: `Bearer ${adminToken}` }
    })
    assert.equal(res.statusCode, 204)
  })

  it('event without dynamic fields accepts registration', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/events/${eventId}/registrations`,
      payload: {
        category_id: categoryId,
        name: 'Maria',
        email: 'maria@test.com',
        form_data: {}
      }
    })
    assert.equal(res.statusCode, 200)
  })
})
