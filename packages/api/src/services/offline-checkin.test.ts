import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { shouldIncomingReplaceAccepted } from './offline-checkin.js'

describe('offline check-in reconciliation order', () => {
  it('replaces the accepted check-in when the incoming scan happened earlier', () => {
    assert.equal(shouldIncomingReplaceAccepted({
      incomingCheckedAt: new Date('2026-08-15T12:00:00.000Z'),
      incomingUuid: 'device-a-scan',
      acceptedCheckedAt: new Date('2026-08-15T12:00:01.000Z'),
      acceptedUuid: 'device-b-scan'
    }), true)
  })

  it('keeps the accepted check-in when the incoming scan happened later', () => {
    assert.equal(shouldIncomingReplaceAccepted({
      incomingCheckedAt: new Date('2026-08-15T12:00:02.000Z'),
      incomingUuid: 'device-a-scan',
      acceptedCheckedAt: new Date('2026-08-15T12:00:01.000Z'),
      acceptedUuid: 'device-b-scan'
    }), false)
  })

  it('uses the UUID as a deterministic tie-breaker for equal timestamps', () => {
    const timestamp = new Date('2026-08-15T12:00:00.000Z')
    assert.equal(shouldIncomingReplaceAccepted({
      incomingCheckedAt: timestamp,
      incomingUuid: 'a-scan',
      acceptedCheckedAt: timestamp,
      acceptedUuid: 'b-scan'
    }), true)
  })
})
