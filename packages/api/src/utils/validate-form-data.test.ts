import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { validateFormData } from './validate-form-data.js'
import { normalizeOptionsInput, validateFieldOptions } from './form-field-options.js'

const baseFields = [
  {
    id: 'f1',
    type: 'text' as const,
    required: true,
    options: null
  },
  {
    id: 'f2',
    type: 'select' as const,
    required: true,
    options: ['A', 'B']
  }
]

describe('validateFormData', () => {
  it('rejects unknown field keys', () => {
    const result = validateFormData(baseFields, { unknown: 'x' })
    assert.equal(result.ok, false)
    if (!result.ok) assert.match(result.message, /desconhecido/)
  })

  it('rejects missing required field', () => {
    const result = validateFormData(baseFields, { f2: 'A' })
    assert.equal(result.ok, false)
    if (!result.ok) assert.match(result.message, /obrigatório/)
  })

  it('rejects invalid select option', () => {
    const result = validateFormData(baseFields, { f1: 'ok', f2: 'Z' })
    assert.equal(result.ok, false)
    if (!result.ok) assert.match(result.message, /inválida/)
  })

  it('accepts valid payload', () => {
    const result = validateFormData(baseFields, { f1: ' Nome ', f2: 'A' })
    assert.equal(result.ok, true)
    if (result.ok) {
      assert.equal(result.data.f1, 'Nome')
      assert.equal(result.data.f2, 'A')
    }
  })

  it('accepts empty dynamic fields when none configured', () => {
    const result = validateFormData([], {})
    assert.equal(result.ok, true)
  })
})

describe('validateFieldOptions', () => {
  it('requires options for select', () => {
    assert.equal(validateFieldOptions('select', []), 'Campos de seleção exigem ao menos uma opção')
  })

  it('normalizes duplicate options', () => {
    const normalized = normalizeOptionsInput([' A ', 'a', 'B', ''])
    assert.deepEqual(normalized, ['A', 'B'])
  })
})
