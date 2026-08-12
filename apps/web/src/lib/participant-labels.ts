export type ParticipantStatus = 'pending' | 'confirmed' | 'cancelled'
export type ParticipantOrigin = 'MANUAL' | 'IMPORT' | 'PUBLIC_FORM'

export const STATUS_LABELS: Record<ParticipantStatus, string> = {
  pending: 'Pendente',
  confirmed: 'Credenciado',
  cancelled: 'Cancelado'
}

export const ORIGIN_LABELS: Record<ParticipantOrigin, string> = {
  MANUAL: 'Cadastro manual',
  IMPORT: 'Importação',
  PUBLIC_FORM: 'Formulário'
}

export const STATUS_OPTIONS: Array<{ value: ParticipantStatus | ''; label: string }> = [
  { value: '', label: 'Todos os status' },
  { value: 'pending', label: 'Pendente' },
  { value: 'confirmed', label: 'Credenciado' },
  { value: 'cancelled', label: 'Cancelado' }
]

export function formatCpfDisplay(cpf: string | null | undefined): string {
  if (!cpf) return '—'
  if (cpf.length !== 11) return cpf
  return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
}
