export interface NormalizedFormSettings {
  name: string
  registrationLimit: number | null
  redirectUrl: string | null
}

function parseRegistrationLimit(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const parsed = typeof value === 'number' ? value : Number.parseInt(String(value), 10)
  if (!Number.isInteger(parsed) || parsed < 1) return null
  return parsed
}

function parseRedirectUrl(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? ''
  if (!trimmed) return null
  if (!/^https?:\/\/.+/i.test(trimmed)) return null
  return trimmed
}

export function normalizeFormSettingsForSave(input: {
  name: string
  registrationLimit: unknown
  redirectUrl: string | null | undefined
  limitEnabled: boolean
}): NormalizedFormSettings {
  return {
    name: input.name.trim(),
    registrationLimit: input.limitEnabled ? parseRegistrationLimit(input.registrationLimit) : null,
    redirectUrl: parseRedirectUrl(input.redirectUrl)
  }
}

export function validateNormalizedFormSettings(settings: NormalizedFormSettings): string | null {
  if (!settings.name) {
    return 'Nome do formulário é obrigatório'
  }
  if (settings.registrationLimit !== null && settings.registrationLimit < 1) {
    return 'Limite de inscrições deve ser um número inteiro positivo'
  }
  return null
}
