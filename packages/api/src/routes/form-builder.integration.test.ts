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

describe('form builder integration', { skip: !dbReady }, () => {
  let app: Awaited<ReturnType<typeof buildApp>>
  let adminToken = ''
  let eventId = ''
  let categoryId = ''
  let formAId = ''
  let formBId = ''
  let publicAId = ''
  let customFieldId = ''
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
        name: 'Form Builder B',
        cnpj: crypto.randomUUID().replace(/\D/g, '').slice(0, 14),
        email: `form-builder-b-${Date.now()}@test.com`,
        subdomain: `form-builder-b-${Date.now()}`,
        status: 'active'
      }
    })

    const start = new Date()
    const end = new Date(start.getTime() + 3600000)

    const event = await prisma.event.create({
      data: {
        company_id: companyA!.id,
        name: 'Form Builder Event',
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
        name: 'Form Builder Event B',
        start_at: start,
        end_at: end,
        status: 'active'
      }
    })
    companyBEventId = eventB.id
    const formBDefault = await createDefaultRegistrationForm(companyBEventId)
    companyBFormId = formBDefault.id

    const createA = await app.inject({
      method: 'POST',
      url: `/events/${eventId}/registration-forms`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { name: 'Participantes A' }
    })
    formAId = createA.json().id
    publicAId = createA.json().public_id

    const createB = await app.inject({
      method: 'POST',
      url: `/events/${eventId}/registration-forms`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { name: 'Participantes B' }
    })
    formBId = createB.json().id
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

  it('creates new form as draft with default layout', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/events/${eventId}/registration-forms/${formAId}`,
      headers: { authorization: `Bearer ${adminToken}` }
    })
    assert.equal(res.statusCode, 200)
    assert.equal(res.json().status, 'draft')
    assert.ok(Array.isArray(res.json().field_layout))
    assert.equal(res.json().registration_limit, null)
  })

  it('persists interleaved field layout including disabled structural fields', async () => {
    const custom = await app.inject({
      method: 'POST',
      url: `/events/${eventId}/registration-forms/${formAId}/form-fields`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { label: 'Empresa', type: 'text', required: true }
    })
    customFieldId = custom.json().id

    const layout = [
      { kind: 'structural', key: 'name' },
      { kind: 'custom', field_id: customFieldId },
      { kind: 'structural', key: 'phone' },
      { kind: 'structural', key: 'cpf' }
    ]

    await app.inject({
      method: 'PATCH',
      url: `/events/${eventId}/registration-forms/${formAId}`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: {
        structural_config: {
          name: { enabled: true, required: true },
          email: { enabled: false, required: false },
          phone: { enabled: false, required: false },
          cpf: { enabled: true, required: true, label: 'Documento' },
          category: { enabled: false, required: false }
        },
        field_layout: layout
      }
    })

    const reload = await app.inject({
      method: 'GET',
      url: `/events/${eventId}/registration-forms/${formAId}`,
      headers: { authorization: `Bearer ${adminToken}` }
    })

    assert.deepEqual(
      reload.json().field_layout.map((entry: { kind: string; key?: string; field_id?: string }) =>
        entry.kind === 'structural' ? entry.key : entry.field_id
      ),
      ['name', customFieldId, 'phone', 'cpf', 'email', 'category']
    )
    assert.equal(reload.json().structural_config.cpf.label, 'Documento')
  })

  it('public form excludes disabled structural and custom fields', async () => {
    const hiddenCustom = await app.inject({
      method: 'POST',
      url: `/events/${eventId}/registration-forms/${formAId}/form-fields`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { label: 'Oculto', type: 'text', required: false, enabled: false }
    })
    const hiddenId = hiddenCustom.json().id

    await app.inject({
      method: 'PATCH',
      url: `/events/${eventId}/registration-forms/${formAId}`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: {
        field_layout: [
          { kind: 'structural', key: 'name' },
          { kind: 'structural', key: 'phone' },
          { kind: 'custom', field_id: customFieldId },
          { kind: 'custom', field_id: hiddenId },
          { kind: 'structural', key: 'cpf' }
        ]
      }
    })

    const res = await app.inject({ method: 'GET', url: `/public/forms/${publicAId}` })
    const labels = res.json().unified_fields.map((field: { label: string }) => field.label)
    assert.ok(!labels.includes('Telefone'))
    assert.ok(!labels.includes('Oculto'))
    assert.ok(labels.includes('Empresa'))
  })

  it('patching select field without options preserves existing options', async () => {
    const selectField = await app.inject({
      method: 'POST',
      url: `/events/${eventId}/registration-forms/${formAId}/form-fields`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: {
        label: 'Escola',
        type: 'select',
        required: true,
        options: ['escola A', 'escola B']
      }
    })
    const selectFieldId = selectField.json().id

    const patch = await app.inject({
      method: 'PATCH',
      url: `/events/${eventId}/registration-forms/${formAId}/form-fields/${selectFieldId}`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { label: 'Escola atualizada', required: true, enabled: true }
    })
    assert.equal(patch.statusCode, 200)
    assert.equal(patch.json().label, 'Escola atualizada')
    assert.deepEqual(patch.json().options, ['escola A', 'escola B'])

    await app.inject({
      method: 'PATCH',
      url: `/events/${eventId}/registration-forms/${formAId}/form-fields/${selectFieldId}`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { enabled: false, required: false }
    })
  })

  it('rejects empty options array on select field patch', async () => {
    const selectField = await app.inject({
      method: 'POST',
      url: `/events/${eventId}/registration-forms/${formAId}/form-fields`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: {
        label: 'Turno',
        type: 'select',
        required: false,
        options: ['Manhã', 'Tarde']
      }
    })

    const patch = await app.inject({
      method: 'PATCH',
      url: `/events/${eventId}/registration-forms/${formAId}/form-fields/${selectField.json().id}`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { options: [] }
    })
    assert.equal(patch.statusCode, 400)
    assert.match(patch.json().message, /seleção exigem ao menos uma opção/i)

    await app.inject({
      method: 'DELETE',
      url: `/events/${eventId}/registration-forms/${formAId}/form-fields/${selectField.json().id}`,
      headers: { authorization: `Bearer ${adminToken}` }
    })
  })

  it('saves disabled structural field without removing it from layout', async () => {
    const layout = [
      { kind: 'structural', key: 'name' },
      { kind: 'structural', key: 'phone' },
      { kind: 'custom', field_id: customFieldId },
      { kind: 'structural', key: 'email' }
    ]

    const res = await app.inject({
      method: 'PATCH',
      url: `/events/${eventId}/registration-forms/${formAId}`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: {
        structural_config: {
          name: { enabled: true, required: true },
          email: { enabled: true, required: false },
          phone: { enabled: false, required: false },
          cpf: { enabled: true, required: true, label: 'Documento' },
          category: { enabled: false, required: false }
        },
        field_layout: layout
      }
    })
    assert.equal(res.statusCode, 200)
    assert.ok(res.json().field_layout.some((entry: { kind: string; key?: string }) =>
      entry.kind === 'structural' && entry.key === 'phone'
    ))
  })

  it('custom field can be hidden and re-enabled preserving id', async () => {
    const fieldRes = await app.inject({
      method: 'POST',
      url: `/events/${eventId}/registration-forms/${formAId}/form-fields`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { label: 'Setor', type: 'text', required: false, enabled: true }
    })
    const fieldId = fieldRes.json().id

    await app.inject({
      method: 'PATCH',
      url: `/events/${eventId}/registration-forms/${formAId}/form-fields/${fieldId}`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { enabled: false }
    })

    const hidden = await app.inject({
      method: 'GET',
      url: `/events/${eventId}/registration-forms/${formAId}/form-fields`,
      headers: { authorization: `Bearer ${adminToken}` }
    })
    const hiddenField = hidden.json().find((field: { id: string }) => field.id === fieldId)
    assert.equal(hiddenField.enabled, false)

    await app.inject({
      method: 'PATCH',
      url: `/events/${eventId}/registration-forms/${formAId}/form-fields/${fieldId}`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { enabled: true }
    })

    const reenabled = await app.inject({
      method: 'GET',
      url: `/events/${eventId}/registration-forms/${formAId}/form-fields`,
      headers: { authorization: `Bearer ${adminToken}` }
    })
    const sameField = reenabled.json().find((field: { id: string }) => field.id === fieldId)
    assert.equal(sameField.id, fieldId)
    assert.equal(sameField.enabled, true)
  })

  it('draft form rejects public submission', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/public/forms/${publicAId}/registrations`,
      payload: { name: 'Draft User', cpf: '52998224725', form_data: {} }
    })
    assert.equal(res.statusCode, 403)
  })

  it('public form respects unified order', async () => {
    await app.inject({
      method: 'POST',
      url: `/events/${eventId}/registration-forms/${formAId}/publish`,
      headers: { authorization: `Bearer ${adminToken}` }
    })

    const res = await app.inject({ method: 'GET', url: `/public/forms/${publicAId}` })
    assert.equal(res.statusCode, 200)
    const labels = res.json().unified_fields.map((field: { label: string }) => field.label)
    assert.deepEqual(labels.slice(0, 2), ['Nome', 'Empresa'])
  })

  it('active form accepts submission after publish', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/public/forms/${publicAId}/registrations`,
      payload: { name: 'Published User', cpf: '39053344705', form_data: { [customFieldId]: 'Plug Social' } }
    })
    assert.equal(res.statusCode, 200)
  })

  it('registration limit blocks extra submissions', async () => {
    await app.inject({
      method: 'PATCH',
      url: `/events/${eventId}/registration-forms/${formBId}`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: {
        registration_limit: 1,
        structural_config: {
          name: { enabled: true, required: true },
          email: { enabled: false, required: false },
          phone: { enabled: false, required: false },
          cpf: { enabled: true, required: true },
          category: { enabled: false, required: false }
        },
        field_layout: [{ kind: 'structural', key: 'name' }, { kind: 'structural', key: 'cpf' }]
      }
    })

    await app.inject({
      method: 'POST',
      url: `/events/${eventId}/registration-forms/${formBId}/publish`,
      headers: { authorization: `Bearer ${adminToken}` }
    })

    const formB = await prisma.registrationForm.findUnique({ where: { id: formBId } })
    assert.ok(formB)

    const first = await app.inject({
      method: 'POST',
      url: `/public/forms/${formB.public_id}/registrations`,
      payload: { name: 'Limit One', cpf: '11144477735', form_data: {} }
    })
    assert.equal(first.statusCode, 200)

    const second = await app.inject({
      method: 'POST',
      url: `/public/forms/${formB.public_id}/registrations`,
      payload: { name: 'Limit Two', cpf: '15350946056', form_data: {} }
    })
    assert.equal(second.statusCode, 403)
  })

  it('limits are independent per form', async () => {
    const countA = await prisma.registration.count({ where: { registration_form_id: formAId, status: { not: 'cancelled' } } })
    const countB = await prisma.registration.count({ where: { registration_form_id: formBId, status: { not: 'cancelled' } } })
    assert.ok(countA >= 1)
    assert.equal(countB, 1)
  })

  it('rejects dangerous redirect url', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/events/${eventId}/registration-forms/${formAId}`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { redirect_url: 'javascript:alert(1)' }
    })
    assert.equal(res.statusCode, 400)
  })

  it('accepts valid redirect url', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/events/${eventId}/registration-forms/${formAId}`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { redirect_url: 'https://meusite.com/obrigado' }
    })
    assert.equal(res.statusCode, 200)
    assert.match(res.json().redirect_url, /^https:\/\/meusite\.com\/obrigado/)
  })

  it('tenant A cannot patch tenant B form', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/events/${companyBEventId}/registration-forms/${companyBFormId}`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { name: 'Hack' }
    })
    assert.equal(res.statusCode, 404)
  })

  it('saves builder payload transactionally', async () => {
    const fieldsRes = await app.inject({
      method: 'GET',
      url: `/events/${eventId}/registration-forms/${formAId}/form-fields`,
      headers: { authorization: `Bearer ${adminToken}` }
    })

    const res = await app.inject({
      method: 'PUT',
      url: `/events/${eventId}/registration-forms/${formAId}/builder`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: {
        name: 'Participantes Builder',
        slug: 'participantes-builder-test',
        structural_config: {
          name: { enabled: true, required: true },
          email: { enabled: false, required: false },
          phone: { enabled: false, required: false },
          cpf: { enabled: true, required: true, label: 'Documento' },
          category: { enabled: false, required: false }
        },
        field_layout: [
          { kind: 'structural', key: 'name' },
          { kind: 'custom', field_id: customFieldId },
          { kind: 'structural', key: 'cpf' }
        ],
        registration_limit: 50,
        redirect_url: null,
        default_category_id: categoryId,
        public_title: 'Inscrições Builder',
        public_description: 'Preencha seus dados.',
        success_message: 'Inscrição realizada com sucesso!',
        submit_button_text: 'Finalizar inscrição',
        appearance: {
          primary_color: '#00C896',
          button_color: '#00C896',
          background_color: '#F8FAFC',
          text_color: '#0B1F3A'
        },
        fields: fieldsRes.json().map((field: { id: string; label: string; type: string; required: boolean; enabled?: boolean; placeholder?: string | null; options?: string[] | null }) => ({
          id: field.id,
          label: field.label,
          type: field.type,
          required: field.required,
          enabled: field.enabled !== false,
          placeholder: field.placeholder,
          options: field.options ?? undefined
        })),
        deleted_field_ids: []
      }
    })

    assert.equal(res.statusCode, 200)
    assert.equal(res.json().slug, 'participantes-builder-test')
    assert.equal(res.json().public_title, 'Inscrições Builder')
    assert.equal(res.json().registration_limit, 50)

    const bySlug = await app.inject({ method: 'GET', url: '/public/forms/participantes-builder-test' })
    assert.equal(bySlug.statusCode, 200)
    assert.equal(bySlug.json().form.public_title, 'Inscrições Builder')

    const byPublicId = await app.inject({ method: 'GET', url: `/public/forms/${publicAId}` })
    assert.equal(byPublicId.statusCode, 200)
  })

  it('rejects duplicate slug', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: `/events/${eventId}/registration-forms/${formBId}/builder`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: {
        name: 'Participantes B',
        slug: 'participantes-builder-test',
        structural_config: {
          name: { enabled: true, required: true },
          email: { enabled: false, required: false },
          phone: { enabled: false, required: false },
          cpf: { enabled: true, required: true },
          category: { enabled: false, required: false }
        },
        field_layout: [{ kind: 'structural', key: 'name' }, { kind: 'structural', key: 'cpf' }],
        fields: [],
        deleted_field_ids: []
      }
    })
    assert.equal(res.statusCode, 409)
    assert.match(res.json().message, /já está em uso/i)
  })

  it('existing default form remains active after migration semantics', async () => {
    assert.equal((await prisma.registrationForm.findUnique({ where: { id: companyBFormId } }))!.status, 'active')
  })
})
