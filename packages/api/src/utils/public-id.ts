import crypto from 'crypto'

export function generatePublicId(): string {
  return crypto.randomBytes(16).toString('hex')
}
