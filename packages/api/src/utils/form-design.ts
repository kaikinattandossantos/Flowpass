import {
  DEFAULT_FORM_APPEARANCE,
  type FormAppearance,
  isLegacyAppearance,
  parseFormAppearance
} from './form-appearance'

export type DesignTheme = 'flowpass' | 'light' | 'dark' | 'custom'
export type BlockId = 'logo' | 'banner' | 'header' | 'form' | 'footer'
export type Alignment = 'left' | 'center' | 'right'
export type SizeScale = 'sm' | 'md' | 'lg' | 'xl'
export type LogoSize = 'small' | 'medium' | 'large' | 'custom'
export type BannerHeight = 'small' | 'medium' | 'large'
export type ImageFit = 'cover' | 'contain'
export type RadiusScale = 'none' | 'soft' | 'medium' | 'large'
export type ShadowScale = 'none' | 'soft' | 'medium'
export type CardWidth = 'compact' | 'normal' | 'wide'
export type PaddingScale = 'compact' | 'normal' | 'comfortable'
export type FieldHeight = 'compact' | 'normal' | 'large'
export type ButtonRadius = 'soft' | 'medium' | 'large' | 'pill'
export type ButtonSize = 'normal' | 'large'
export type ButtonWidth = 'auto' | 'full'
export type BackgroundSize = 'cover' | 'contain' | 'original'
export type BackgroundPosition = 'center' | 'top' | 'bottom'
export type BackgroundRepeat = 'no-repeat' | 'repeat'
export type BorderScale = 'none' | 'thin' | 'medium'
export type FontWeight = 'normal' | 'semibold' | 'bold'

export interface FormDesignPage {
  background_type: 'color' | 'image'
  background_color: string
  background_image_url: string | null
  background_size: BackgroundSize
  background_position: BackgroundPosition
  background_repeat: BackgroundRepeat
  overlay_color: string
  overlay_opacity: number
}

export interface FormDesignLogo {
  enabled: boolean
  url: string | null
  size: LogoSize
  custom_width: number
  alignment: Alignment
}

export interface FormDesignBanner {
  enabled: boolean
  url: string | null
  height: BannerHeight
  fit: ImageFit
  radius: RadiusScale
}

export interface FormDesignHeader {
  enabled: boolean
  title_visible: boolean
  description_visible: boolean
  alignment: Alignment
  title_color: string
  title_size: SizeScale
  title_weight: FontWeight
  description_color: string
  description_size: Exclude<SizeScale, 'xl'>
}

export interface FormDesignCard {
  background_color: string
  opacity: number
  border: BorderScale
  border_color: string
  radius: RadiusScale
  shadow: ShadowScale
  width: CardWidth
  padding: PaddingScale
}

export interface FormDesignFields {
  background_color: string
  text_color: string
  placeholder_color: string
  border_color: string
  focus_color: string
  radius: number
  height: FieldHeight
  label_color: string
  label_size: Exclude<SizeScale, 'xl'>
  required_color: string
}

export interface FormDesignButton {
  background_color: string
  text_color: string
  hover_color: string
  radius: ButtonRadius
  size: ButtonSize
  width: ButtonWidth
  alignment: Alignment
}

export interface FormDesignFooter {
  enabled: boolean
  text: string
  color: string
  size: Exclude<SizeScale, 'xl'>
  alignment: Alignment
  show_powered_by: boolean
}

export interface FormDesign {
  version: 3
  theme: DesignTheme
  page: FormDesignPage
  logo: FormDesignLogo
  banner: FormDesignBanner
  header: FormDesignHeader
  blocks: BlockId[]
  card: FormDesignCard
  fields: FormDesignFields
  button: FormDesignButton
  footer: FormDesignFooter
}

export const DEFAULT_BLOCKS: BlockId[] = ['logo', 'banner', 'header', 'form', 'footer']

export const DEFAULT_FORM_DESIGN: FormDesign = {
  version: 3,
  theme: 'flowpass',
  page: {
    background_type: 'color',
    background_color: '#F5F7FA',
    background_image_url: null,
    background_size: 'cover',
    background_position: 'center',
    background_repeat: 'no-repeat',
    overlay_color: '#000000',
    overlay_opacity: 0
  },
  logo: {
    enabled: true,
    url: null,
    size: 'medium',
    custom_width: 180,
    alignment: 'left'
  },
  banner: {
    enabled: false,
    url: null,
    height: 'medium',
    fit: 'cover',
    radius: 'none'
  },
  header: {
    enabled: true,
    title_visible: true,
    description_visible: true,
    alignment: 'left',
    title_color: '#0B1F3A',
    title_size: 'lg',
    title_weight: 'bold',
    description_color: '#64748B',
    description_size: 'md'
  },
  blocks: [...DEFAULT_BLOCKS],
  card: {
    background_color: '#FFFFFF',
    opacity: 100,
    border: 'none',
    border_color: '#E2E8F0',
    radius: 'soft',
    shadow: 'soft',
    width: 'normal',
    padding: 'normal'
  },
  fields: {
    background_color: '#FFFFFF',
    text_color: '#0B1F3A',
    placeholder_color: '#94A3B8',
    border_color: '#E2E8F0',
    focus_color: '#00C896',
    radius: 8,
    height: 'normal',
    label_color: '#0B1F3A',
    label_size: 'sm',
    required_color: '#EF4444'
  },
  button: {
    background_color: '#00C896',
    text_color: '#FFFFFF',
    hover_color: '#00A67E',
    radius: 'soft',
    size: 'normal',
    width: 'full',
    alignment: 'left'
  },
  footer: {
    enabled: false,
    text: '',
    color: '#64748B',
    size: 'sm',
    alignment: 'center',
    show_powered_by: true
  }
}

export const THEME_PRESETS: Record<Exclude<DesignTheme, 'custom'>, FormDesign> = {
  flowpass: DEFAULT_FORM_DESIGN,
  light: {
    ...DEFAULT_FORM_DESIGN,
    theme: 'light',
    page: { ...DEFAULT_FORM_DESIGN.page, background_color: '#FFFFFF' },
    card: { ...DEFAULT_FORM_DESIGN.card, shadow: 'medium' }
  },
  dark: {
    ...DEFAULT_FORM_DESIGN,
    theme: 'dark',
    page: { ...DEFAULT_FORM_DESIGN.page, background_color: '#0B1F3A' },
    header: {
      ...DEFAULT_FORM_DESIGN.header,
      title_color: '#FFFFFF',
      description_color: '#CBD5E1'
    },
    card: {
      ...DEFAULT_FORM_DESIGN.card,
      background_color: '#111827',
      border_color: '#334155'
    },
    fields: {
      ...DEFAULT_FORM_DESIGN.fields,
      background_color: '#1F2937',
      text_color: '#F8FAFC',
      placeholder_color: '#94A3B8',
      border_color: '#334155',
      label_color: '#F8FAFC'
    }
  }
}

const HEX_PATTERN = /^#[0-9A-Fa-f]{6}$/

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

function normalizePx(value: unknown, fallback: number, min: number, max: number): number {
  const parsed = typeof value === 'number' ? value : Number.parseInt(String(value ?? ''), 10)
  if (!Number.isFinite(parsed)) return fallback
  return Math.min(max, Math.max(min, parsed))
}

function normalizeEnum<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback
}

function normalizeUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed || null
}

function normalizeBlocks(value: unknown): BlockId[] {
  const allowed: BlockId[] = ['logo', 'banner', 'header', 'form', 'footer']
  if (!Array.isArray(value)) return [...DEFAULT_BLOCKS]
  const seen = new Set<BlockId>()
  const result: BlockId[] = []
  for (const item of value) {
    if (typeof item !== 'string' || !allowed.includes(item as BlockId)) continue
    const block = item as BlockId
    if (seen.has(block)) continue
    seen.add(block)
    result.push(block)
  }
  if (!result.includes('form')) result.push('form')
  return result.length ? result : [...DEFAULT_BLOCKS]
}

function migrateV2ToV3(v2: FormAppearance): FormDesign {
  const base = { ...DEFAULT_FORM_DESIGN }
  base.theme = 'custom'
  base.page.background_type = v2.background_type
  base.page.background_color = v2.background_color
  base.page.background_image_url = v2.background_image_url
  base.page.background_size = v2.background_fit === 'contain' ? 'contain' : 'cover'
  base.page.background_repeat = v2.background_fit === 'repeat' ? 'repeat' : 'no-repeat'
  base.page.overlay_opacity = v2.background_overlay
  base.logo.url = v2.logo_url
  base.logo.enabled = !!v2.logo_url
  base.logo.alignment = v2.alignment === 'center' ? 'center' : 'left'
  base.header.alignment = v2.alignment === 'center' ? 'center' : 'left'
  base.header.title_color = v2.text_color
  base.header.description_color = v2.secondary_text_color
  base.card.background_color = v2.card_color
  base.card.opacity = v2.card_opacity
  base.card.radius = v2.card_radius >= 24 ? 'large' : v2.card_radius >= 12 ? 'medium' : v2.card_radius > 0 ? 'soft' : 'none'
  base.card.width = v2.card_width === 'wide' ? 'wide' : 'normal'
  base.fields.border_color = v2.border_color
  base.fields.focus_color = v2.primary_color
  base.fields.text_color = v2.text_color
  base.fields.label_color = v2.text_color
  base.button.background_color = v2.button_color
  base.button.text_color = v2.button_text_color
  base.button.width = v2.button_width
  base.button.radius = v2.button_radius === 'rounded' ? 'pill' : 'soft'
  return base
}

function normalizeDesignRecord(record: Record<string, unknown>): FormDesign {
  const defaults = DEFAULT_FORM_DESIGN
  const page = (record.page && typeof record.page === 'object' ? record.page : {}) as Record<string, unknown>
  const logo = (record.logo && typeof record.logo === 'object' ? record.logo : {}) as Record<string, unknown>
  const banner = (record.banner && typeof record.banner === 'object' ? record.banner : {}) as Record<string, unknown>
  const header = (record.header && typeof record.header === 'object' ? record.header : {}) as Record<string, unknown>
  const card = (record.card && typeof record.card === 'object' ? record.card : {}) as Record<string, unknown>
  const fields = (record.fields && typeof record.fields === 'object' ? record.fields : {}) as Record<string, unknown>
  const button = (record.button && typeof record.button === 'object' ? record.button : {}) as Record<string, unknown>
  const footer = (record.footer && typeof record.footer === 'object' ? record.footer : {}) as Record<string, unknown>

  return {
    version: 3,
    theme: normalizeEnum(record.theme, ['flowpass', 'light', 'dark', 'custom'] as const, defaults.theme),
    page: {
      background_type: page.background_type === 'image' ? 'image' : 'color',
      background_color: normalizeHex(page.background_color, defaults.page.background_color),
      background_image_url: normalizeUrl(page.background_image_url),
      background_size: normalizeEnum(page.background_size, ['cover', 'contain', 'original'] as const, defaults.page.background_size),
      background_position: normalizeEnum(page.background_position, ['center', 'top', 'bottom'] as const, defaults.page.background_position),
      background_repeat: normalizeEnum(page.background_repeat, ['no-repeat', 'repeat'] as const, defaults.page.background_repeat),
      overlay_color: normalizeHex(page.overlay_color, defaults.page.overlay_color),
      overlay_opacity: normalizePercent(page.overlay_opacity, defaults.page.overlay_opacity)
    },
    logo: {
      enabled: logo.enabled !== false,
      url: normalizeUrl(logo.url),
      size: normalizeEnum(logo.size, ['small', 'medium', 'large', 'custom'] as const, defaults.logo.size),
      custom_width: normalizePx(logo.custom_width, defaults.logo.custom_width, 80, 320),
      alignment: normalizeEnum(logo.alignment, ['left', 'center', 'right'] as const, defaults.logo.alignment)
    },
    banner: {
      enabled: banner.enabled === true,
      url: normalizeUrl(banner.url),
      height: normalizeEnum(banner.height, ['small', 'medium', 'large'] as const, defaults.banner.height),
      fit: normalizeEnum(banner.fit, ['cover', 'contain'] as const, defaults.banner.fit),
      radius: normalizeEnum(banner.radius, ['none', 'soft', 'medium'] as const, defaults.banner.radius)
    },
    header: {
      enabled: header.enabled !== false,
      title_visible: header.title_visible !== false,
      description_visible: header.description_visible !== false,
      alignment: normalizeEnum(header.alignment, ['left', 'center', 'right'] as const, defaults.header.alignment),
      title_color: normalizeHex(header.title_color, defaults.header.title_color),
      title_size: normalizeEnum(header.title_size, ['sm', 'md', 'lg', 'xl'] as const, defaults.header.title_size),
      title_weight: normalizeEnum(header.title_weight, ['normal', 'semibold', 'bold'] as const, defaults.header.title_weight),
      description_color: normalizeHex(header.description_color, defaults.header.description_color),
      description_size: normalizeEnum(header.description_size, ['sm', 'md', 'lg'] as const, defaults.header.description_size)
    },
    blocks: normalizeBlocks(record.blocks),
    card: {
      background_color: normalizeHex(card.background_color, defaults.card.background_color),
      opacity: normalizePercent(card.opacity, defaults.card.opacity),
      border: normalizeEnum(card.border, ['none', 'thin', 'medium'] as const, defaults.card.border),
      border_color: normalizeHex(card.border_color, defaults.card.border_color),
      radius: normalizeEnum(card.radius, ['none', 'soft', 'medium', 'large'] as const, defaults.card.radius),
      shadow: normalizeEnum(card.shadow, ['none', 'soft', 'medium'] as const, defaults.card.shadow),
      width: normalizeEnum(card.width, ['compact', 'normal', 'wide'] as const, defaults.card.width),
      padding: normalizeEnum(card.padding, ['compact', 'normal', 'comfortable'] as const, defaults.card.padding)
    },
    fields: {
      background_color: normalizeHex(fields.background_color, defaults.fields.background_color),
      text_color: normalizeHex(fields.text_color, defaults.fields.text_color),
      placeholder_color: normalizeHex(fields.placeholder_color, defaults.fields.placeholder_color),
      border_color: normalizeHex(fields.border_color, defaults.fields.border_color),
      focus_color: normalizeHex(fields.focus_color, defaults.fields.focus_color),
      radius: normalizePx(fields.radius, defaults.fields.radius, 0, 24),
      height: normalizeEnum(fields.height, ['compact', 'normal', 'large'] as const, defaults.fields.height),
      label_color: normalizeHex(fields.label_color, defaults.fields.label_color),
      label_size: normalizeEnum(fields.label_size, ['sm', 'md', 'lg'] as const, defaults.fields.label_size),
      required_color: normalizeHex(fields.required_color, defaults.fields.required_color)
    },
    button: {
      background_color: normalizeHex(button.background_color, defaults.button.background_color),
      text_color: normalizeHex(button.text_color, defaults.button.text_color),
      hover_color: normalizeHex(button.hover_color, defaults.button.hover_color),
      radius: normalizeEnum(button.radius, ['soft', 'medium', 'large', 'pill'] as const, defaults.button.radius),
      size: normalizeEnum(button.size, ['normal', 'large'] as const, defaults.button.size),
      width: normalizeEnum(button.width, ['auto', 'full'] as const, defaults.button.width),
      alignment: normalizeEnum(button.alignment, ['left', 'center', 'right'] as const, defaults.button.alignment)
    },
    footer: {
      enabled: footer.enabled === true,
      text: typeof footer.text === 'string' ? footer.text.slice(0, 500) : defaults.footer.text,
      color: normalizeHex(footer.color, defaults.footer.color),
      size: normalizeEnum(footer.size, ['sm', 'md', 'lg'] as const, defaults.footer.size),
      alignment: normalizeEnum(footer.alignment, ['left', 'center', 'right'] as const, defaults.footer.alignment),
      show_powered_by: footer.show_powered_by !== false
    }
  }
}

export function isDesignV3(value: unknown): value is FormDesign {
  return !!value && typeof value === 'object' && (value as Record<string, unknown>).version === 3
}

export function normalizeAppearance(value: unknown): FormDesign | null {
  if (!value || typeof value !== 'object') return null
  const record = value as Record<string, unknown>
  if (record.version === 3) return normalizeDesignRecord(record)
  if (record.version === 2 && !isLegacyAppearance(value)) {
    return migrateV2ToV3(parseFormAppearance(value))
  }
  return null
}

export function getPublicAppearanceRaw(form: {
  appearance: unknown
  published_appearance?: unknown | null
}): unknown {
  return form.published_appearance ?? form.appearance
}

export function shouldUseLegacyRenderer(raw: unknown): boolean {
  if (!raw) return true
  if (isDesignV3(raw)) return false
  return isLegacyAppearance(raw)
}

function validateOptionalUrl(value: string | null): boolean {
  if (!value) return true
  if (value.startsWith('/assets/')) return true
  try {
    const parsed = new URL(value)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return value.startsWith('/assets/')
  }
}

export function validateFormDesign(
  value: unknown
): { ok: true; value: FormDesign } | { ok: false; message: string } {
  if (!isDesignV3(value) && !(value && typeof value === 'object' && (value as Record<string, unknown>).version === 2)) {
    const normalized = normalizeAppearance(value)
    if (!normalized) {
      return { ok: false, message: 'Design inválido' }
    }
    return validateFormDesign(normalized)
  }

  const design = isDesignV3(value)
    ? normalizeDesignRecord(value as unknown as Record<string, unknown>)
    : migrateV2ToV3(parseFormAppearance(value))

  const colorPaths: Array<[string, string]> = [
    ['page.background_color', design.page.background_color],
    ['page.overlay_color', design.page.overlay_color],
    ['header.title_color', design.header.title_color],
    ['header.description_color', design.header.description_color],
    ['card.background_color', design.card.background_color],
    ['card.border_color', design.card.border_color],
    ['fields.background_color', design.fields.background_color],
    ['fields.text_color', design.fields.text_color],
    ['fields.placeholder_color', design.fields.placeholder_color],
    ['fields.border_color', design.fields.border_color],
    ['fields.focus_color', design.fields.focus_color],
    ['fields.label_color', design.fields.label_color],
    ['fields.required_color', design.fields.required_color],
    ['button.background_color', design.button.background_color],
    ['button.text_color', design.button.text_color],
    ['button.hover_color', design.button.hover_color],
    ['footer.color', design.footer.color]
  ]

  for (const [, color] of colorPaths) {
    if (!HEX_PATTERN.test(color)) {
      return { ok: false, message: 'Cor inválida: use formato HEX, por exemplo #00C896' }
    }
  }

  if (!validateOptionalUrl(design.page.background_image_url)) {
    return { ok: false, message: 'URL da imagem de fundo inválida' }
  }
  if (!validateOptionalUrl(design.logo.url)) {
    return { ok: false, message: 'URL da logo inválida' }
  }
  if (!validateOptionalUrl(design.banner.url)) {
    return { ok: false, message: 'URL do banner inválida' }
  }

  return { ok: true, value: design }
}

export function designForStorage(value: unknown): FormDesign | null {
  const validated = validateFormDesign(value)
  if (!validated.ok) return null
  return validated.value
}

export function applyThemePreset(theme: Exclude<DesignTheme, 'custom'>, current?: FormDesign): FormDesign {
  const preset = THEME_PRESETS[theme]
  if (!current) return { ...preset, theme }
  return {
    ...preset,
    theme,
    logo: { ...preset.logo, url: current.logo.url, enabled: current.logo.enabled },
    banner: { ...preset.banner, url: current.banner.url, enabled: current.banner.enabled },
    page: {
      ...preset.page,
      background_image_url: current.page.background_image_url,
      background_type: current.page.background_image_url ? 'image' : preset.page.background_type
    }
  }
}

export function resetFormDesignToDefault(): FormDesign {
  return { ...DEFAULT_FORM_DESIGN, blocks: [...DEFAULT_BLOCKS] }
}

export function designEquals(a: unknown, b: unknown): boolean {
  const left = normalizeAppearance(a)
  const right = normalizeAppearance(b)
  if (!left && !right) return JSON.stringify(a) === JSON.stringify(b)
  if (!left || !right) return false
  return JSON.stringify(left) === JSON.stringify(right)
}

export { HEX_PATTERN as FORM_DESIGN_HEX_PATTERN, isLegacyAppearance }
