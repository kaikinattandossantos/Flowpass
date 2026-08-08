export type StructuralFieldKey = 'name' | 'email' | 'phone' | 'cpf' | 'category'

export interface StructuralFieldConfig {
  enabled: boolean
  required: boolean
}

export type StructuralConfig = Record<StructuralFieldKey, StructuralFieldConfig>

export const STRUCTURAL_FIELD_LABELS: Record<StructuralFieldKey, string> = {
  name: 'Nome',
  email: 'E-mail',
  phone: 'Telefone',
  cpf: 'CPF',
  category: 'Categoria'
}

export const DEFAULT_STRUCTURAL_CONFIG: StructuralConfig = {
  name: { enabled: true, required: true },
  email: { enabled: true, required: true },
  phone: { enabled: true, required: false },
  cpf: { enabled: false, required: false },
  category: { enabled: true, required: true }
}

export function parseStructuralConfig(raw: unknown): StructuralConfig {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_STRUCTURAL_CONFIG }
  const input = raw as Partial<Record<StructuralFieldKey, Partial<StructuralFieldConfig>>>
  const result = { ...DEFAULT_STRUCTURAL_CONFIG }

  for (const key of Object.keys(DEFAULT_STRUCTURAL_CONFIG) as StructuralFieldKey[]) {
    const value = input[key]
    if (!value || typeof value !== 'object') continue
    result[key] = {
      enabled: value.enabled ?? result[key].enabled,
      required: value.required ?? result[key].required
    }
  }

  result.name.enabled = true
  result.name.required = true

  return result
}

export function buildStructuralColumns(config: StructuralConfig): string[] {
  return (Object.keys(config) as StructuralFieldKey[])
    .filter((key) => config[key].enabled)
    .map((key) => STRUCTURAL_FIELD_LABELS[key])
}
