export type BackgroundType = 'color' | 'image'
export type BackgroundFit = 'cover' | 'contain' | 'repeat'
export type CardWidth = 'normal' | 'wide'
export type ButtonRadius = 'soft' | 'rounded'
export type ButtonWidth = 'auto' | 'full'
export type ContentAlignment = 'left' | 'center'

export interface FormAppearance {
  version?: number
  primary_color: string
  background_type: BackgroundType
  background_color: string
  background_image_url: string | null
  background_overlay: number
  background_fit: BackgroundFit
  logo_url: string | null
  card_color: string
  card_opacity: number
  card_radius: number
  card_width: CardWidth
  text_color: string
  secondary_text_color: string
  border_color: string
  button_color: string
  button_text_color: string
  button_radius: ButtonRadius
  button_width: ButtonWidth
  alignment: ContentAlignment
}

export const DEFAULT_FORM_APPEARANCE: FormAppearance = {
  version: 2,
  primary_color: '#00C896',
  background_type: 'color',
  background_color: '#F5F7FA',
  background_image_url: null,
  background_overlay: 0,
  background_fit: 'cover',
  logo_url: null,
  card_color: '#FFFFFF',
  card_opacity: 100,
  card_radius: 12,
  card_width: 'normal',
  text_color: '#0B1F3A',
  secondary_text_color: '#64748B',
  border_color: '#E2E8F0',
  button_color: '#00C896',
  button_text_color: '#FFFFFF',
  button_radius: 'soft',
  button_width: 'full',
  alignment: 'left'
}

/** Legacy forms saved before appearance v2 — keep original visual layout. */
export const LEGACY_FORM_APPEARANCE: Pick<
  FormAppearance,
  'primary_color' | 'background_color' | 'text_color' | 'button_color'
> = {
  primary_color: '#00C896',
  button_color: '#00C896',
  background_color: '#F8FAFC',
  text_color: '#0B1F3A'
}

const HEX_PATTERN = /^#[0-9A-Fa-f]{6}$/
const LEGACY_KEYS = new Set(['primary_color', 'button_color', 'background_color', 'text_color'])

function normalizeHex(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback
  const trimmed = value.trim()
  if (!HEX_PATTERN.test(trimmed)) return fallback
  return trimmed.toUpperCase()
}

function normalizePercent(value: unknown, fallback: number): number {
  const parsed = typeof value === 'number' ? value : Number.parseInt(String(value ?? ''), 10)
  if (!Number.isFinite(parsed)) return fallback
  return Math.min(100, Math.max(0, parsed))
}

function normalizeRadius(value: unknown, fallback: number): number {
  const parsed = typeof value === 'number' ? value : Number.parseInt(String(value ?? ''), 10)
  if (!Number.isFinite(parsed)) return fallback
  return Math.min(32, Math.max(0, parsed))
}

export function isLegacyAppearance(value: unknown): boolean {
  if (!value || typeof value !== 'object') return true
  const record = value as Record<string, unknown>
  if (record.version !== 2) return true
  return Object.keys(record).every((key) => LEGACY_KEYS.has(key) || key === 'version')
}

export function parseFormAppearance(value: unknown): FormAppearance {
  if (!value || typeof value !== 'object') {
    return { ...DEFAULT_FORM_APPEARANCE, version: undefined }
  }

  const record = value as Record<string, unknown>

  if (isLegacyAppearance(value)) {
    return {
      ...DEFAULT_FORM_APPEARANCE,
      primary_color: normalizeHex(record.primary_color, LEGACY_FORM_APPEARANCE.primary_color),
      button_color: normalizeHex(record.button_color, LEGACY_FORM_APPEARANCE.button_color),
      background_color: normalizeHex(record.background_color, LEGACY_FORM_APPEARANCE.background_color),
      text_color: normalizeHex(record.text_color, LEGACY_FORM_APPEARANCE.text_color),
      version: undefined
    }
  }

  return {
    version: 2,
    primary_color: normalizeHex(record.primary_color, DEFAULT_FORM_APPEARANCE.primary_color),
    background_type: record.background_type === 'image' ? 'image' : 'color',
    background_color: normalizeHex(record.background_color, DEFAULT_FORM_APPEARANCE.background_color),
    background_image_url: typeof record.background_image_url === 'string' && record.background_image_url.trim()
      ? record.background_image_url.trim()
      : null,
    background_overlay: normalizePercent(record.background_overlay, DEFAULT_FORM_APPEARANCE.background_overlay),
    background_fit: record.background_fit === 'contain' || record.background_fit === 'repeat'
      ? record.background_fit
      : 'cover',
    logo_url: typeof record.logo_url === 'string' && record.logo_url.trim() ? record.logo_url.trim() : null,
    card_color: normalizeHex(record.card_color, DEFAULT_FORM_APPEARANCE.card_color),
    card_opacity: normalizePercent(record.card_opacity, DEFAULT_FORM_APPEARANCE.card_opacity),
    card_radius: normalizeRadius(record.card_radius, DEFAULT_FORM_APPEARANCE.card_radius),
    card_width: record.card_width === 'wide' ? 'wide' : 'normal',
    text_color: normalizeHex(record.text_color, DEFAULT_FORM_APPEARANCE.text_color),
    secondary_text_color: normalizeHex(record.secondary_text_color, DEFAULT_FORM_APPEARANCE.secondary_text_color),
    border_color: normalizeHex(record.border_color, DEFAULT_FORM_APPEARANCE.border_color),
    button_color: normalizeHex(record.button_color, DEFAULT_FORM_APPEARANCE.button_color),
    button_text_color: normalizeHex(record.button_text_color, DEFAULT_FORM_APPEARANCE.button_text_color),
    button_radius: record.button_radius === 'rounded' ? 'rounded' : 'soft',
    button_width: record.button_width === 'auto' ? 'auto' : 'full',
    alignment: record.alignment === 'center' ? 'center' : 'left'
  }
}

function validateOptionalUrl(value: unknown): boolean {
  if (value === null || value === undefined || value === '') return true
  if (typeof value !== 'string') return false
  const trimmed = value.trim()
  if (!trimmed) return true
  if (trimmed.startsWith('/assets/')) return true
  try {
    const parsed = new URL(trimmed)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return trimmed.startsWith('/assets/')
  }
}

export function validateFormAppearance(
  value: unknown
): { ok: true; value: FormAppearance } | { ok: false; message: string } {
  const parsed = parseFormAppearance(value)
  const colorKeys = [
    'primary_color',
    'background_color',
    'card_color',
    'text_color',
    'secondary_text_color',
    'border_color',
    'button_color',
    'button_text_color'
  ] as const

  if (typeof value === 'object' && value) {
    const record = value as Record<string, unknown>
    for (const key of colorKeys) {
      const color = record[key]
      if (color !== undefined && (typeof color !== 'string' || !HEX_PATTERN.test(color.trim()))) {
        return { ok: false, message: 'Cor inválida: use formato HEX, por exemplo #00C896' }
      }
    }
  }

  if (!validateOptionalUrl(parsed.logo_url)) {
    return { ok: false, message: 'URL da logo inválida' }
  }
  if (!validateOptionalUrl(parsed.background_image_url)) {
    return { ok: false, message: 'URL da imagem de fundo inválida' }
  }

  return { ok: true, value: parsed.version === 2 ? parsed : { ...parsed, version: 2 } }
}

export function appearanceForStorage(value: unknown): FormAppearance {
  const validated = validateFormAppearance(value)
  if (!validated.ok) return { ...DEFAULT_FORM_APPEARANCE }
  return { ...validated.value, version: 2 }
}

export function resetFormAppearanceToDefault(): FormAppearance {
  return { ...DEFAULT_FORM_APPEARANCE }
}

export { HEX_PATTERN as FORM_APPEARANCE_HEX_PATTERN }
