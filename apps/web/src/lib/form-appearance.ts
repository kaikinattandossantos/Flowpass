import type { CSSProperties } from 'react'

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

export const LEGACY_FORM_APPEARANCE = {
  primary_color: '#00C896',
  button_color: '#00C896',
  background_color: '#F8FAFC',
  text_color: '#0B1F3A'
} as const

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

export function validateHexColor(value: string): boolean {
  return HEX_PATTERN.test(value.trim())
}

export function resetFormAppearanceToDefault(): FormAppearance {
  return { ...DEFAULT_FORM_APPEARANCE }
}

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

export function validateFormSlugInput(value: string): string | null {
  const normalized = normalizeFormSlug(value)
  if (!normalized) return 'Link personalizado inválido'
  if (normalized.length < 3) return 'Link personalizado deve ter ao menos 3 caracteres'
  if (normalized.length > 80) return 'Link personalizado deve ter no máximo 80 caracteres'
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(normalized)) {
    return 'Use apenas letras minúsculas, números e hífens'
  }
  return null
}

export const APPEARANCE_COLOR_KEYS = [
  'primary_color',
  'background_color',
  'card_color',
  'text_color',
  'secondary_text_color',
  'border_color',
  'button_color',
  'button_text_color'
] as const

export function validateAppearanceColors(appearance: FormAppearance): string | null {
  for (const key of APPEARANCE_COLOR_KEYS) {
    if (!validateHexColor(appearance[key])) {
      return 'Revise as cores da aparência (formato HEX inválido)'
    }
  }
  return null
}

export function getPageBackgroundStyle(appearance: FormAppearance): CSSProperties {
  if (appearance.background_type === 'image' && appearance.background_image_url) {
    const fit = appearance.background_fit === 'contain'
      ? 'contain'
      : appearance.background_fit === 'repeat'
        ? 'repeat'
        : 'cover'
    return {
      backgroundColor: appearance.background_color,
      backgroundImage: `linear-gradient(rgba(15, 23, 42, ${appearance.background_overlay / 100}), rgba(15, 23, 42, ${appearance.background_overlay / 100})), url(${appearance.background_image_url})`,
      backgroundSize: fit === 'repeat' ? 'auto' : fit,
      backgroundRepeat: fit === 'repeat' ? 'repeat' : 'no-repeat',
      backgroundPosition: 'center'
    }
  }

  return { backgroundColor: appearance.background_color }
}

export function getCardStyle(appearance: FormAppearance): CSSProperties {
  const opacity = appearance.card_opacity / 100
  const hex = appearance.card_color.replace('#', '')
  const r = Number.parseInt(hex.slice(0, 2), 16)
  const g = Number.parseInt(hex.slice(2, 4), 16)
  const b = Number.parseInt(hex.slice(4, 6), 16)

  return {
    backgroundColor: `rgba(${r}, ${g}, ${b}, ${opacity})`,
    borderRadius: `${appearance.card_radius}px`
  }
}

export function getButtonClassName(appearance: FormAppearance): string {
  const radius = appearance.button_radius === 'rounded' ? 'rounded-full' : 'rounded-lg'
  const width = appearance.button_width === 'auto' ? 'px-8' : 'w-full'
  return `${radius} ${width} py-3 font-bold transition disabled:opacity-50`
}
