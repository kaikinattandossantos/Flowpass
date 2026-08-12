import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { isValidCpf, normalizeCpf } from './cpf.js'

describe('cpf utils', () => {
  it('normalizes mask', () => {
    assert.equal(normalizeCpf('123.456.789-09'), '12345678909')
  })

  it('validates known valid CPF', () => {
    assert.equal(isValidCpf('529.982.247-25'), true)
  })

  it('rejects invalid CPF', () => {
    assert.equal(isValidCpf('111.111.111-11'), false)
    assert.equal(isValidCpf('123'), false)
  })
})
