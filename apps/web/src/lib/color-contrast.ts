function hexToRgb(hex: string): [number, number, number] | null {
  const normalized = hex.replace('#', '').trim()
  if (!normalized) return null

  if (normalized.length === 3) {
    return [
      parseInt(normalized[0] + normalized[0], 16),
      parseInt(normalized[1] + normalized[1], 16),
      parseInt(normalized[2] + normalized[2], 16)
    ]
  }

  if (normalized.length === 6) {
    return [
      parseInt(normalized.slice(0, 2), 16),
      parseInt(normalized.slice(2, 4), 16),
      parseInt(normalized.slice(4, 6), 16)
    ]
  }

  return null
}

function getLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((channel) => {
    const s = channel / 255
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
  })

  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs
}

export function isLightBackground(color: string): boolean {
  const rgb = hexToRgb(color)
  if (!rgb) return false
  return getLuminance(...rgb) > 0.5
}

export function getContrastTextColor(color: string): '#000000' | '#ffffff' {
  return isLightBackground(color) ? '#000000' : '#ffffff'
}

export function getContrastMutedTextColor(color: string): string {
  return isLightBackground(color) ? 'rgba(0, 0, 0, 0.75)' : 'rgba(255, 255, 255, 0.9)'
}