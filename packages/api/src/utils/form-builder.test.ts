import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  buildDefaultFieldLayout,
  buildTemplateColumnsFromLayout,
  normalizeFieldLayoutForSave,
  parseFieldLayout,
  resolveBuilderFields,
  resolveUnifiedFields,
  syncLayoutWithStructuralChanges
} from '../utils/field-layout.js'
import { parseStructuralConfig } from '../utils/structural-config.js'
import { validateRedirectUrl } from '../utils/redirect-url.js'
import { normalizeRegistrationLimitInput, validateRegistrationLimit } from '../utils/form-settings.js'

const baseConfig = parseStructuralConfig({
  name: { enabled: true, required: true },
  email: { enabled: true, required: false },
  phone: { enabled: false, required: false },
  cpf: { enabled: true, required: true },
  category: { enabled: false, required: false }
})

const formFields = [
  {
    id: 'f1',
    order: 0,
    label: 'Empresa',
    type: 'text',
    required: false,
    enabled: true,
    placeholder: null,
    options: null,
    registration_form_id: 'x'
  },
  {
    id: 'f2',
    order: 1,
    label: 'Cargo',
    type: 'text',
    required: false,
    enabled: false,
    placeholder: null,
    options: null,
    registration_form_id: 'x'
  }
] as never[]

const interleavedLayout = [
  { kind: 'structural', key: 'name' },
  { kind: 'custom', field_id: 'f1' },
  { kind: 'structural', key: 'phone' },
  { kind: 'structural', key: 'cpf' },
  { kind: 'custom', field_id: 'f2' },
  { kind: 'structural', key: 'email' }
] as const

describe('field layout utils', () => {
  it('interleaves structural and custom fields for public runtime', () => {
    const unified = resolveUnifiedFields(baseConfig, formFields, [...interleavedLayout])
    assert.deepEqual(unified.map((field) => field.label), ['Nome', 'Empresa', 'CPF', 'E-mail'])
  })

  it('builder includes disabled structural and custom fields', () => {
    const builder = resolveBuilderFields(baseConfig, formFields, [...interleavedLayout])
    assert.deepEqual(builder.map((field) => field.label), [
      'Nome',
      'Empresa',
      'Telefone',
      'CPF',
      'Cargo',
      'E-mail'
    ])
    const phone = builder.find((field) => field.kind === 'structural' && field.key === 'phone')
    const cargo = builder.find((field) => field.kind === 'custom' && field.id === 'f2')
    assert.equal(phone?.enabled, false)
    assert.equal(cargo?.enabled, false)
  })

  it('disabling structural field preserves layout position', () => {
    const layout = [...interleavedLayout]
    const disabledPhoneConfig = {
      ...baseConfig,
      phone: { enabled: false, required: false }
    }
    const synced = syncLayoutWithStructuralChanges(layout, disabledPhoneConfig, formFields)
    const phoneIndex = synced.findIndex((entry) => entry.kind === 'structural' && entry.key === 'phone')
    assert.equal(phoneIndex, 2)
  })

  it('reactivating structural field preserves layout position', () => {
    const layout = [...interleavedLayout]
    const enabledPhoneConfig = {
      ...baseConfig,
      phone: { enabled: true, required: false }
    }
    const synced = syncLayoutWithStructuralChanges(layout, enabledPhoneConfig, formFields)
    const builder = resolveBuilderFields(enabledPhoneConfig, formFields, synced)
    const phoneIndex = builder.findIndex((field) => field.kind === 'structural' && field.key === 'phone')
    assert.equal(phoneIndex, 2)
    assert.equal(builder[phoneIndex].enabled, true)
  })

  it('public runtime excludes disabled fields', () => {
    const unified = resolveUnifiedFields(baseConfig, formFields, [...interleavedLayout])
    assert.ok(!unified.some((field) => field.label === 'Telefone'))
    assert.ok(!unified.some((field) => field.label === 'Cargo'))
  })

  it('xlsx template excludes disabled fields', () => {
    const columns = buildTemplateColumnsFromLayout(baseConfig, formFields, [...interleavedLayout])
    assert.deepEqual(columns, ['Nome', 'Empresa', 'CPF', 'E-mail'])
  })

  it('custom field can be hidden without removal from builder', () => {
    const builder = resolveBuilderFields(baseConfig, formFields, [...interleavedLayout])
    const cargo = builder.find((field) => field.kind === 'custom' && field.id === 'f2')
    assert.ok(cargo)
    assert.equal(cargo.enabled, false)
  })

  it('reactivated custom field keeps same id and position', () => {
    const reenabledFields = formFields.map((field) =>
      field.id === 'f2' ? { ...field, enabled: true } : field
    ) as never[]
    const builder = resolveBuilderFields(baseConfig, reenabledFields, [...interleavedLayout])
    const cargo = builder.find((field) => field.kind === 'custom' && field.id === 'f2')
    assert.equal(cargo?.id, 'f2')
    assert.equal(builder.findIndex((field) => field.kind === 'custom' && field.id === 'f2'), 4)
    assert.equal(cargo?.enabled, true)
  })

  it('uses custom structural labels without changing keys', () => {
    const config = parseStructuralConfig({
      name: { enabled: true, required: true },
      email: { enabled: false, required: false },
      phone: { enabled: false, required: false },
      cpf: { enabled: true, required: true, label: 'Documento do participante' },
      category: { enabled: false, required: false }
    })

    const unified = resolveUnifiedFields(config, [], [
      { kind: 'structural', key: 'name' },
      { kind: 'structural', key: 'cpf' }
    ])

    assert.equal(unified[1].kind === 'structural' ? unified[1].key : '', 'cpf')
    assert.equal(unified[1].label, 'Documento do participante')
  })

  it('builds default layout with all structural keys then custom fields', () => {
    const config = parseStructuralConfig(null)
    const layout = buildDefaultFieldLayout(config, [{ id: 'f1', order: 0 }])
    assert.equal(layout.filter((entry) => entry.kind === 'structural').length, 5)
    assert.ok(layout.some((entry) => entry.kind === 'custom' && entry.field_id === 'f1'))
  })

  it('normalizes layout for save keeping disabled structural keys and removing deleted custom fields', () => {
    const config = parseStructuralConfig({
      name: { enabled: true, required: true },
      email: { enabled: true, required: false },
      phone: { enabled: false, required: false },
      cpf: { enabled: false, required: false },
      category: { enabled: false, required: false }
    })

    const normalized = normalizeFieldLayoutForSave(
      [
        { kind: 'structural', key: 'name' },
        { kind: 'structural', key: 'phone' },
        { kind: 'custom', field_id: 'removed-id' }
      ],
      config,
      [{ id: 'f1', order: 0 }]
    )

    assert.ok(normalized.some((entry) => entry.kind === 'structural' && entry.key === 'phone'))
    assert.ok(!normalized.some((entry) => entry.kind === 'custom' && entry.field_id === 'removed-id'))
    assert.ok(normalized.some((entry) => entry.kind === 'custom' && entry.field_id === 'f1'))
  })

  it('parses persisted layout after reload and keeps disabled structural keys', () => {
    const config = parseStructuralConfig({
      name: { enabled: true, required: true },
      email: { enabled: false, required: false },
      phone: { enabled: false, required: false },
      cpf: { enabled: true, required: true },
      category: { enabled: false, required: false }
    })
    const raw = [
      { kind: 'structural', key: 'cpf' },
      { kind: 'structural', key: 'phone' },
      { kind: 'structural', key: 'name' }
    ]
    const parsed = parseFieldLayout(raw, config, [])
    assert.deepEqual(
      parsed.filter((entry) => entry.kind === 'structural').map((entry) => entry.kind === 'structural' ? entry.key : ''),
      ['cpf', 'phone', 'name', 'email', 'category']
    )
  })
})

describe('redirect url validation', () => {
  it('accepts https redirect', () => {
    const result = validateRedirectUrl('https://meusite.com/obrigado')
    assert.equal(result.ok, true)
    if (result.ok) assert.match(result.value ?? '', /^https:\/\//)
  })

  it('rejects javascript redirect', () => {
    const result = validateRedirectUrl('javascript:alert(1)')
    assert.equal(result.ok, false)
  })
})

describe('registration limit validation', () => {
  it('null means unlimited', () => {
    const result = validateRegistrationLimit(null)
    assert.equal(result.ok, true)
    if (result.ok) assert.equal(result.value, null)
  })

  it('coerces string limit values', () => {
    const result = normalizeRegistrationLimitInput('100')
    assert.equal(result.ok, true)
    if (result.ok) assert.equal(result.value, 100)
  })

  it('empty string means unlimited', () => {
    const result = normalizeRegistrationLimitInput('')
    assert.equal(result.ok, true)
    if (result.ok) assert.equal(result.value, null)
  })

  it('rejects invalid limit', () => {
    const result = validateRegistrationLimit(0)
    assert.equal(result.ok, false)
  })
})
