import type { CSSProperties } from 'react'
import type { FormDesign } from '@/lib/form-design'

function hexToRgba(hex: string, alpha: number): string {
  const normalized = hex.replace('#', '')
  const r = Number.parseInt(normalized.slice(0, 2), 16)
  const g = Number.parseInt(normalized.slice(2, 4), 16)
  const b = Number.parseInt(normalized.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

function overlayRgba(design: FormDesign): string {
  return hexToRgba(design.page.overlay_color, design.page.overlay_opacity / 100)
}

export function getDesignPageStyle(design: FormDesign): CSSProperties {
  const { page } = design
  if (page.background_type === 'image' && page.background_image_url) {
    const size = page.background_size === 'original' ? 'auto' : page.background_size
    const repeat = page.background_repeat === 'repeat' ? 'repeat' : 'no-repeat'
    const position = page.background_position === 'top'
      ? 'top center'
      : page.background_position === 'bottom'
        ? 'bottom center'
        : 'center'
    return {
      backgroundColor: page.background_color,
      backgroundImage: `linear-gradient(${overlayRgba(design)}, ${overlayRgba(design)}), url(${page.background_image_url})`,
      backgroundSize: size,
      backgroundRepeat: repeat,
      backgroundPosition: position
    }
  }
  return { backgroundColor: page.background_color }
}

export function getDesignCardStyle(design: FormDesign): CSSProperties {
  const { card } = design
  const radiusMap = { none: '0px', soft: '12px', medium: '16px', large: '24px' }
  const borderWidth = card.border === 'thin' ? '1px' : card.border === 'medium' ? '2px' : '0px'
  const shadowMap = {
    none: 'none',
    soft: '0 10px 30px rgba(15, 23, 42, 0.08)',
    medium: '0 20px 45px rgba(15, 23, 42, 0.12)'
  }
  return {
    backgroundColor: hexToRgba(card.background_color, card.opacity / 100),
    borderRadius: radiusMap[card.radius],
    border: borderWidth === '0px' ? undefined : `${borderWidth} solid ${card.border_color}`,
    boxShadow: shadowMap[card.shadow]
  }
}

export function getDesignCardWidthClass(design: FormDesign, mobile?: boolean): string {
  if (mobile) return 'max-w-sm'
  if (design.card.width === 'compact') return 'max-w-md'
  if (design.card.width === 'wide') return 'max-w-3xl'
  return 'max-w-xl'
}

export function getDesignCardPaddingClass(design: FormDesign): string {
  if (design.card.padding === 'compact') return 'p-4 md:p-5'
  if (design.card.padding === 'comfortable') return 'p-8 md:p-10'
  return 'p-6 md:p-8'
}

export function getDesignAlignmentClass(alignment: 'left' | 'center' | 'right'): string {
  if (alignment === 'center') return 'text-center items-center'
  if (alignment === 'right') return 'text-right items-end'
  return 'text-left items-start'
}

export function getDesignLogoWidth(design: FormDesign): number {
  if (design.logo.size === 'small') return 120
  if (design.logo.size === 'large') return 240
  if (design.logo.size === 'custom') return design.logo.custom_width
  return 180
}

export function getDesignBannerHeightClass(height: FormDesign['banner']['height']): string {
  if (height === 'small') return 'h-32 md:h-40'
  if (height === 'large') return 'h-56 md:h-72'
  return 'h-40 md:h-52'
}

export function getDesignBannerRadiusClass(radius: FormDesign['banner']['radius']): string {
  if (radius === 'soft') return 'rounded-xl'
  if (radius === 'medium') return 'rounded-2xl'
  return 'rounded-none'
}

export function getDesignTitleClass(design: FormDesign): string {
  const sizeMap = { sm: 'text-xl md:text-2xl', md: 'text-2xl md:text-3xl', lg: 'text-3xl md:text-4xl', xl: 'text-4xl md:text-5xl' }
  const weightMap = { normal: 'font-normal', semibold: 'font-semibold', bold: 'font-bold' }
  return `${sizeMap[design.header.title_size]} ${weightMap[design.header.title_weight]}`
}

export function getDesignDescriptionClass(design: FormDesign): string {
  const sizeMap = { sm: 'text-sm md:text-base', md: 'text-base md:text-lg', lg: 'text-lg md:text-xl' }
  return sizeMap[design.header.description_size]
}

export function getDesignFieldHeightClass(height: FormDesign['fields']['height']): string {
  if (height === 'compact') return 'py-2'
  if (height === 'large') return 'py-3.5'
  return 'py-2.5'
}

export function getDesignFieldStyle(design: FormDesign): CSSProperties {
  return {
    backgroundColor: design.fields.background_color,
    color: design.fields.text_color,
    borderColor: design.fields.border_color,
    borderRadius: `${design.fields.radius}px`,
    ['--tw-ring-color' as string]: design.fields.focus_color
  }
}

export function getDesignLabelClass(design: FormDesign): string {
  const sizeMap = { sm: 'text-sm', md: 'text-base', lg: 'text-lg' }
  return `mb-1 block font-medium ${sizeMap[design.fields.label_size]}`
}

export function getDesignButtonClass(design: FormDesign): string {
  const radiusMap = {
    soft: 'rounded-lg',
    medium: 'rounded-xl',
    large: 'rounded-2xl',
    pill: 'rounded-full'
  }
  const sizeMap = { normal: 'py-3 px-6', large: 'py-3.5 px-8 text-lg' }
  const width = design.button.width === 'full' ? 'w-full' : 'px-8'
  return `${radiusMap[design.button.radius]} ${sizeMap[design.button.size]} ${width} font-bold transition disabled:opacity-50`
}

export function getDesignFooterClass(design: FormDesign): string {
  const sizeMap = { sm: 'text-sm', md: 'text-base', lg: 'text-lg' }
  return `${sizeMap[design.footer.size]} ${getDesignAlignmentClass(design.footer.alignment)}`
}
