export function normalizeCep(cep: string) {
  return cep.replace(/\D/g, '')
}

export function formatCep(cep: string) {
  const digits = normalizeCep(cep)
  if (digits.length !== 8) return cep
  return `${digits.slice(0, 5)}-${digits.slice(5)}`
}

export function formatEventAddress(event: {
  street: string
  number: string
  complement?: string | null
  neighborhood?: string | null
  city?: string | null
  state?: string | null
  cep?: string | null
}) {
  const line1 = [event.street, event.number].filter(Boolean).join(', ')
  const line2 = [event.complement, event.neighborhood].filter(Boolean).join(' - ')
  const line3 = [event.city, event.state].filter(Boolean).join(' - ')
  const line4 = event.cep ? `CEP ${formatCep(event.cep)}` : null

  return [line1, line2, line3, line4].filter(Boolean).join(' · ')
}