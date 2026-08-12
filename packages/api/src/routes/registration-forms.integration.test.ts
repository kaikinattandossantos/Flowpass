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

describe('registration-forms integration', { skip: !dbReady }, () => {
  let app: Awaited<ReturnType<typeof buildApp>>
  let adminToken = ''
  let eventAId = ''
  let eventBId = ''
  let formAId = ''
  let publicId = ''
  let customFieldId = ''

  before(async () => {
    app = await buildApp()
    const adminLogin = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: 'admin@flowpass.com.br', password: 'flowpass123' }
    })
    adminToken = adminLogin.json().token

    const companyA = await prisma.company.findFirst({ where: { subdomain: 'demo' } })
    assert.ok(companyA)

    const companyB = await prisma.company.create({
      data: {
        name: 'Company B',
        cnpj: `${Date.now()}`.slice(-14),
        email: `b-${Date.now()}@test.com`,
        subdomain: `b-${Date.now()}`,
        status: 'active'
      }
    })

    const start = new Date()
    const end = new Date(start.getTime() + 3600000)

    const eventA = await prisma.event.create({
      data: {
        company_id: companyA!.id,
        name: 'Event A',
        start_at: start,
        end_at: end,
        status: 'active',
        categories: { create: { name: 'Geral' } }
      },
      include: { categories: true }
    })
    eventAId = eventA.id

    const eventB = await prisma.event.create({
      data: {
        company_id: companyB.id,
        name: 'Event B',
        start_at: start,
        end_at: end,
        status: 'active',
        categories: { create: { name: 'VIP' } }
      },
      include: { categories: true }
    })
    eventBId = eventB.id
    await createDefaultRegistrationForm(eventBId)
  })

  after(async () => {
    for (const id of [eventAId, eventBId]) {
      if (!id) continue
      await prisma.registration.deleteMany({ where: { event_id: id } })
      await prisma.registrationForm.deleteMany({ where: { event_id: id } })
      await prisma.category.deleteMany({ where: { event_id: id } })
      await prisma.event.delete({ where: { id } }).catch(() => {})
    }
    await prisma.$disconnect()
    await app.close()
  })

  it('creates registration form with custom fields', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/events/${eventAId}/registration-forms`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { name: 'Participantes' }
    })
    assert.equal(res.statusCode, 200)
    formAId = res.json().id
    publicId = res.json().public_id
    assert.ok(publicId.length >= 16)

    const fieldRes = await app.inject({
      method: 'POST',
      url: `/events/${eventAId}/registration-forms/${formAId}/form-fields`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { label: 'Empresa', type: 'text', required: true }
    })
    assert.equal(fieldRes.statusCode, 200)
    customFieldId = fieldRes.json().id

    const category = await prisma.category.findFirst({ where: { event_id: eventAId } })
    await app.inject({
      method: 'PATCH',
      url: `/events/${eventAId}/registration-forms/${formAId}`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: {
        structural_config: {
          name: { enabled: true, required: true },
          email: { enabled: true, required: true },
          phone: { enabled: false, required: false },
          cpf: { enabled: false, required: false },
          category: { enabled: true, required: true }
        },
        field_layout: [
          { kind: 'structural', key: 'name' },
          { kind: 'structural', key: 'email' },
          { kind: 'structural', key: 'category' },
          { kind: 'custom', field_id: customFieldId }
        ]
      }
    })

    await app.inject({
      method: 'POST',
      url: `/events/${eventAId}/registration-forms/${formAId}/publish`,
      headers: { authorization: `Bearer ${adminToken}` }
    })
  })

  it('company A cannot list forms from company B event', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/events/${eventBId}/registration-forms`,
      headers: { authorization: `Bearer ${adminToken}` }
    })
    assert.equal(res.statusCode, 404)
  })

  it('public endpoint returns form data', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/public/forms/${publicId}`
    })
    assert.equal(res.statusCode, 200)
    assert.equal(res.json().form.name, 'Participantes')
    assert.ok(res.json().can_submit)
  })

  it('inactive form rejects submission', async () => {
    await app.inject({
      method: 'PATCH',
      url: `/events/${eventAId}/registration-forms/${formAId}`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { status: 'inactive' }
    })

    const res = await app.inject({
      method: 'POST',
      url: `/public/forms/${publicId}/registrations`,
      payload: {
        category_id: (await prisma.category.findFirst({ where: { event_id: eventAId } }))!.id,
        name: 'Test User',
        email: 'inactive-form@test.com',
        form_data: {}
      }
    })
    assert.equal(res.statusCode, 403)

    await app.inject({
      method: 'PATCH',
      url: `/events/${eventAId}/registration-forms/${formAId}`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { status: 'active' }
    })
  })

  it('public submission creates registration with form id', async () => {
    const category = await prisma.category.findFirst({ where: { event_id: eventAId } })
    assert.ok(category)

    const res = await app.inject({
      method: 'POST',
      url: `/public/forms/${publicId}/registrations`,
      payload: {
        category_id: category.id,
        name: 'Roberto Leão',
        email: 'roberto.form@test.com',
        form_data: { [customFieldId]: 'Plug Social' }
      }
    })
    assert.equal(res.statusCode, 200)

    const saved = await prisma.registration.findFirst({
      where: { email: 'roberto.form@test.com', event_id: eventAId }
    })
    assert.ok(saved)
    assert.equal(saved!.registration_form_id, formAId)
    assert.equal(saved!.origin, 'PUBLIC_FORM')
  })

  it('import requires registration form and stores form id', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/events/${eventAId}/participants/import`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: {
        registration_form_id: formAId,
        mapping: {
          name: 'Nome',
          email: 'Email',
          category: 'Categoria',
          form_fields: { [customFieldId]: 'Empresa' }
        },
        rows: [{ Nome: 'Importado Form', Email: 'import.form@test.com', Categoria: 'Geral', Empresa: 'Plug Social' }]
      }
    })
    assert.equal(res.statusCode, 200)
    assert.equal(res.json().imported, 1)

    const saved = await prisma.registration.findFirst({
      where: { email: 'import.form@test.com', event_id: eventAId }
    })
    assert.equal(saved?.registration_form_id, formAId)
    assert.equal(saved?.origin, 'IMPORT')
  })
})
