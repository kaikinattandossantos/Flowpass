import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { DuplicateParticipantError } from './registration-create.js'
import { resolveCpf } from '../utils/participant.js'

describe('participant utils', () => {
  it('resolveCpf from explicit value', () => {
    assert.equal(resolveCpf('529.982.247-25', [], {}), '52998224725')
  })

  it('DuplicateParticipantError has message', () => {
    const err = new DuplicateParticipantError()
    assert.match(err.message, /cadastrado/)
  })
})

describe('DuplicateParticipantError', () => {
  it('has message', () => {
    const err = new DuplicateParticipantError()
    assert.match(err.message, /cadastrado/)
  })
})
