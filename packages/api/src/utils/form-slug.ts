const RESERVED_SLUGS = new Set([
  'admin',
  'api',
  'auth',
  'c',
  'dashboard',
  'f',
  'login',
  'public',
  'health',
  'events',
  'forms',
  'registration',
  'registrations',
  'participants',
  'credentialing',
  'www'
])

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export function normalizeFormSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function validateFormSlug(
  value: string | null | undefined
): { ok: true; value: string | null } | { ok: false; message: string } {
  if (value === null || value === undefined || value === '') {
    return { ok: true, value: null }
  }

  const normalized = normalizeFormSlug(value)
  if (!normalized) {
    return { ok: false, message: 'Link personalizado inválido' }
  }
  if (normalized.length < 3) {
    return { ok: false, message: 'Link personalizado deve ter ao menos 3 caracteres' }
  }
  if (normalized.length > 80) {
    return { ok: false, message: 'Link personalizado deve ter no máximo 80 caracteres' }
  }
  if (!SLUG_PATTERN.test(normalized)) {
    return { ok: false, message: 'Use apenas letras minúsculas, números e hífens no link personalizado' }
  }
  if (RESERVED_SLUGS.has(normalized)) {
    return { ok: false, message: 'Este link personalizado não está disponível' }
  }

  return { ok: true, value: normalized }
}

export function isPublicIdIdentifier(value: string): boolean {
  return /^[a-f0-9]{32}$/i.test(value)
}

export { RESERVED_SLUGS, SLUG_PATTERN }
