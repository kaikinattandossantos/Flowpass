import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import crypto from 'crypto'
import { buildApp } from '../app.js'
import { prisma } from '../../../database/index.js'
import { createDefaultRegistrationForm } from '../services/registration-form.js'
import type { StructuralConfig } from '../utils/structural-config.js'

let dbReady = false
try {
  await prisma.$connect()
  await prisma.$queryRaw`SELECT 1`
  dbReady = true
} catch {
  dbReady = false
}

const nameCpfConfig: StructuralConfig = {
  name: { enabled: true, required: true },
  email: { enabled: false, required: false },
  phone: { enabled: false, required: false },
  cpf: { enabled: true, required: true },
  category: { enabled: false, required: false }
}

const emailOptionalConfig: StructuralConfig = {
  name: { enabled: true, required: true },
  email: { enabled: true, required: false },
  phone: { enabled: false, required: false },
  cpf: { enabled: false, required: false },
  category: { enabled: false, required: false }
}

const emailRequiredConfig: StructuralConfig = {
  name: { enabled: true, required: true },
  email: { enabled: true, required: true },
  phone: { enabled: false, required: false },
  cpf: { enabled: false, required: false },
  category: { enabled: false, required: false }
}

describe('structural fields integration', { skip: !dbReady }, () => {
  let app: Awaited<ReturnType<typeof buildApp>>
  let adminToken = ''
  let eventId = ''
  let categoryId = ''
  let formRequiredEmailId = ''
  let formOptionalEmailId = ''
  let formNoEmailId = ''
  let formNameCpfId = ''
  let publicRequiredEmailId = ''
  let publicOptionalEmailId = ''
  let publicNoEmailId = ''
  let publicNameCpfId = ''
  let companyBEventId = ''
  let companyBFormId = ''
  let companyBPublicId = ''

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
        name: 'Structural B',
        cnpj: crypto.randomUUID().replace(/\D/g, '').slice(0, 14),
        email: `structural-b-${Date.now()}@test.com`,
        subdomain: `structural-b-${Date.now()}`,
        status: 'active'
      }
    })

    const start = new Date()
    const end = new Date(start.getTime() + 3600000)

    const event = await prisma.event.create({
      data: {
        company_id: companyA!.id,
        name: 'Structural Fields Event',
        start_at: start,
        end_at: end,
        status: 'active',
        categories: { create: { name: 'Geral' } }
      },
      include: { categories: true }
    })
    eventId = event.id
    categoryId = event.categories[0].id

    const eventB = await prisma.event.create({
      data: {
        company_id: companyB.id,
        name: 'Structural Event B',
        start_at: start,
        end_at: end,
        status: 'active',
        categories: { create: { name: 'VIP' } }
      }
    })
    companyBEventId = eventB.id
    const formB = await createDefaultRegistrationForm(companyBEventId)
    companyBFormId = formB.id
    companyBPublicId = formB.public_id

    async function createForm(name: string, config: StructuralConfig) {
      const res = await app.inject({
        method: 'POST',
        url: `/events/${eventId}/registration-forms`,
        headers: { authorization: `Bearer ${adminToken}` },
        payload: { name, structural_config: config }
      })
      assert.equal(res.statusCode, 200)
      return res.json() as { id: string; public_id: string }
    }

    const required = await createForm('Email obrigatório', emailRequiredConfig)
    formRequiredEmailId = required.id
    publicRequiredEmailId = required.public_id

    const optional = await createForm('Email opcional', emailOptionalConfig)
    formOptionalEmailId = optional.id
    publicOptionalEmailId = optional.public_id

    const noEmail = await createForm('Sem email', nameCpfConfig)
    formNoEmailId = noEmail.id
    publicNoEmailId = noEmail.public_id

    const nameCpf = await createForm('Nome e CPF', nameCpfConfig)
    formNameCpfId = nameCpf.id
    publicNameCpfId = nameCpf.public_id

    for (const formId of [formRequiredEmailId, formOptionalEmailId, formNoEmailId, formNameCpfId]) {
      await app.inject({
        method: 'POST',
        url: `/events/${eventId}/registration-forms/${formId}/publish`,
        headers: { authorization: `Bearer ${adminToken}` }
      })
    }

    await prisma.registration.create({
      data: {
        event_id: eventId,
        category_id: categoryId,
        name: 'Legacy Participant',
        email: 'legacy.structural@test.com',
        status: 'confirmed',
        origin: 'MANUAL',
        form_data: {}
      }
    })
  })

  after(async () => {
    if (eventId) {
      await prisma.registration.deleteMany({ where: { event_id: eventId } })
      await prisma.registrationForm.deleteMany({ where: { event_id: eventId } })
      await prisma.category.deleteMany({ where: { event_id: eventId } })
      await prisma.event.delete({ where: { id: eventId } }).catch(() => {})
    }
    if (companyBEventId) {
      await prisma.registration.deleteMany({ where: { event_id: companyBEventId } })
      await prisma.registrationForm.deleteMany({ where: { event_id: companyBEventId } })
      await prisma.category.deleteMany({ where: { event_id: companyBEventId } })
      await prisma.event.delete({ where: { id: companyBEventId } }).catch(() => {})
    }
    await prisma.$disconnect()
    await app.close()
  })

  it('rejects public submission when email is required but missing', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/public/forms/${publicRequiredEmailId}/registrations`,
      payload: { name: 'Sem Email', form_data: {} }
    })
    assert.equal(res.statusCode, 400)
    assert.match(res.json().message, /E-mail/)
  })

  it('accepts public submission when email is required and provided', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/public/forms/${publicRequiredEmailId}/registrations`,
      payload: {
        name: 'Com Email',
        email: 'required.email@test.com',
        form_data: {}
      }
    })
    assert.equal(res.statusCode, 200)
    assert.equal(res.json().participant.email, 'required.email@test.com')
  })

  it('accepts public submission when email is optional and omitted', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/public/forms/${publicOptionalEmailId}/registrations`,
      payload: { name: 'Email Opcional', form_data: {} }
    })
    assert.equal(res.statusCode, 200)
    assert.equal(res.json().participant.email, null)

    const saved = await prisma.registration.findFirst({
      where: { event_id: eventId, name: 'Email Opcional' }
    })
    assert.equal(saved?.email, null)
  })

  it('accepts public submission when email field is disabled', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/public/forms/${publicNoEmailId}/registrations`,
      payload: {
        name: 'Sem Campo Email',
        cpf: '52998224725',
        form_data: {}
      }
    })
    assert.equal(res.statusCode, 200)
    assert.equal(res.json().participant.email, null)
  })

  it('imports row without email when email is disabled', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/events/${eventId}/participants/import`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: {
        registration_form_id: formNoEmailId,
        mapping: {
          name: 'Nome',
          cpf: 'CPF',
          form_fields: {}
        },
        rows: [{ Nome: 'Importado Sem Email', CPF: '39053344705' }]
      }
    })
    assert.equal(res.statusCode, 200)
    assert.equal(res.json().imported, 1)

    const saved = await prisma.registration.findFirst({
      where: { event_id: eventId, name: 'Importado Sem Email' }
    })
    assert.ok(saved)
    assert.equal(saved!.email, null)
    assert.equal(saved!.cpf, '39053344705')
  })

  it('accepts form with only name and cpf', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/public/forms/${publicNameCpfId}/registrations`,
      payload: {
        name: 'Apenas Nome CPF',
        cpf: '15350946056',
        form_data: {}
      }
    })
    assert.equal(res.statusCode, 200)
    assert.equal(res.json().participant.email, null)
    assert.equal(res.json().participant.cpf, '15350946056')
  })

  it('does not treat two null emails as duplicate', async () => {
    const first = await app.inject({
      method: 'POST',
      url: `/public/forms/${publicNoEmailId}/registrations`,
      payload: { name: 'João Sem Email', cpf: '31641898003', form_data: {} }
    })
    assert.equal(first.statusCode, 200)

    const second = await app.inject({
      method: 'POST',
      url: `/public/forms/${publicNoEmailId}/registrations`,
      payload: { name: 'Maria Sem Email', cpf: '10000000019', form_data: {} }
    })
    assert.equal(second.statusCode, 200)
    assert.notEqual(first.json().participant.id, second.json().participant.id)
  })

  it('still detects duplicate cpf', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/public/forms/${publicNoEmailId}/registrations`,
      payload: { name: 'CPF Duplicado', cpf: '31641898003', form_data: {} }
    })
    assert.equal(res.statusCode, 409)
  })

  it('legacy registration with email continues to work', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/events/${eventId}/participants`,
      headers: { authorization: `Bearer ${adminToken}` }
    })
    assert.equal(res.statusCode, 200)
    const legacy = res.json().find((p: { email: string | null }) => p.email === 'legacy.structural@test.com')
    assert.ok(legacy)
    assert.equal(legacy.name, 'Legacy Participant')
  })

  it('company A cannot submit to company B public form data path', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/events/${companyBEventId}/registration-forms`,
      headers: { authorization: `Bearer ${adminToken}` }
    })
    assert.equal(res.statusCode, 404)

    const publicRes = await app.inject({
      method: 'GET',
      url: `/public/forms/${companyBPublicId}`
    })
    assert.equal(publicRes.statusCode, 200)
    assert.equal(publicRes.json().form.id, companyBFormId)
  })

  it('public form payload excludes disabled structural fields', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/public/forms/${publicNoEmailId}`
    })
    assert.equal(res.statusCode, 200)
    const config = res.json().form.structural_config
    assert.equal(config.email.enabled, false)
    assert.equal(config.cpf.enabled, true)
    assert.equal(config.category.enabled, false)
  })
})
