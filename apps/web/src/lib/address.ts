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
  location?: string | null
}) {
  if (event.location) return event.location

  const parts = [
    [event.street, event.number].filter(Boolean).join(', '),
    event.complement,
    event.neighborhood,
    [event.city, event.state].filter(Boolean).join(' - '),
    event.cep ? `CEP ${formatCep(event.cep)}` : null
  ].filter(Boolean)

  return parts.join(' · ')
}