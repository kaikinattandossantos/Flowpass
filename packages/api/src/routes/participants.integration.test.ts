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

describe('participants integration', { skip: !dbReady }, () => {
  let app: Awaited<ReturnType<typeof buildApp>>
  let adminToken = ''
  let viewerToken = ''
  let operatorToken = ''
  let eventId = ''
  let categoryId = ''
  let participantId = ''
  let registrationFormId = ''

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

    const bcrypt = await import('bcryptjs')
    const hash = await bcrypt.hash('flowpass123', 10)

    await prisma.user.upsert({
      where: { email: 'viewer2@flowpass.com.br' },
      update: { password_hash: hash },
      create: {
        company_id: company!.id,
        name: 'Viewer 2',
        email: 'viewer2@flowpass.com.br',
        password_hash: hash,
        role: 'viewer'
      }
    })

    await prisma.user.upsert({
      where: { email: 'operator2@flowpass.com.br' },
      update: { password_hash: hash },
      create: {
        company_id: company!.id,
        name: 'Operator 2',
        email: 'operator2@flowpass.com.br',
        password_hash: hash,
        role: 'operator'
      }
    })

    viewerToken = (await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: 'viewer2@flowpass.com.br', password: 'flowpass123' }
    })).json().token

    operatorToken = (await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: 'operator2@flowpass.com.br', password: 'flowpass123' }
    })).json().token

    const start = new Date()
    const end = new Date(start.getTime() + 3600000)

    const event = await prisma.event.create({
      data: {
        company_id: company!.id,
        name: 'Participants Test Event',
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
    registrationFormId = form.id
    await prisma.registrationForm.update({
      where: { id: registrationFormId },
      data: {
        structural_config: {
          name: { enabled: true, required: true },
          email: { enabled: true, required: true },
          phone: { enabled: true, required: false },
          cpf: { enabled: true, required: false },
          category: { enabled: true, required: true }
        }
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
    await prisma.$disconnect()
    await app.close()
  })

  it('admin creates manual participant', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/events/${eventId}/participants`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: {
        category_id: categoryId,
        name: 'Maria Silva',
        email: 'maria.participant@test.com',
        cpf: '52998224725',
        form_data: {}
      }
    })
    assert.equal(res.statusCode, 200)
    participantId = res.json().id
    assert.equal(res.json().origin, 'MANUAL')
    assert.ok(res.json().has_qr)
  })

  it('rejects duplicate by cpf', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/events/${eventId}/participants`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: {
        category_id: categoryId,
        name: 'Outra Maria',
        email: 'outra@test.com',
        cpf: '529.982.247-25',
        form_data: {}
      }
    })
    assert.equal(res.statusCode, 409)
  })

  it('viewer cannot create participant', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/events/${eventId}/participants`,
      headers: { authorization: `Bearer ${viewerToken}` },
      payload: {
        category_id: categoryId,
        name: 'X',
        email: 'x@test.com',
        form_data: {}
      }
    })
    assert.equal(res.statusCode, 403)
  })

  it('operator cannot list participants', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/events/${eventId}/participants`,
      headers: { authorization: `Bearer ${operatorToken}` }
    })
    assert.equal(res.statusCode, 403)
  })

  it('viewer can list participants', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/events/${eventId}/participants`,
      headers: { authorization: `Bearer ${viewerToken}` }
    })
    assert.equal(res.statusCode, 200)
    assert.ok(Array.isArray(res.json()))
  })

  it('import participants', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/events/${eventId}/participants/import`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: {
        registration_form_id: registrationFormId,
        mapping: { name: 'Nome', email: 'Email', category: 'Categoria', form_fields: {} },
        rows: [
          { Nome: 'João Import', Email: 'joao.import@test.com', Categoria: 'Geral' },
          { Nome: 'Maria Silva', Email: 'maria.participant@test.com', Categoria: 'Geral' }
        ]
      }
    })
    assert.equal(res.statusCode, 200)
    assert.equal(res.json().imported, 1)
    assert.equal(res.json().skipped, 1)
  })

  it('preview import participants', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/events/${eventId}/participants/import/preview`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: {
        registration_form_id: registrationFormId,
        mapping: { name: 'Nome', email: 'Email', category: 'Categoria', form_fields: {} },
        rows: [
          { Nome: 'Preview User', Email: 'preview@test.com', Categoria: 'Geral' },
          { Nome: '', Email: 'invalid@test.com', Categoria: 'Geral' },
          { Nome: 'Maria Silva', Email: 'maria.participant@test.com', Categoria: 'Geral' }
        ]
      }
    })
    assert.equal(res.statusCode, 200)
    const body = res.json()
    assert.equal(body.total, 3)
    assert.equal(body.ready, 1)
    assert.ok(body.errors >= 1)
    assert.ok(body.duplicates >= 1)
  })

  it('returns qr image', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/events/${eventId}/participants/${participantId}/qr`,
      headers: { authorization: `Bearer ${adminToken}` }
    })
    assert.equal(res.statusCode, 200)
    assert.ok(res.json().qr_image.startsWith('data:image'))
  })
})
