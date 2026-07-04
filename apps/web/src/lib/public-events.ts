import { formatEventAddress } from '@/lib/address'

export interface PublicEvent {
  id: string
  name: string
  description?: string | null
  start_at: string
  end_at: string
  banner_color: string
  accent_color: string
  welcome_message?: string | null
  street: string
  number: string
  complement?: string | null
  neighborhood?: string | null
  city?: string | null
  state?: string | null
  cep: string
  location?: string | null
  categories: Array<{ id: string; name: string; color?: string | null }>
  company: { name: string }
}

export function formatEventDateShort(startAt: string) {
  const start = new Date(startAt)
  return {
    day: start.toLocaleDateString('pt-BR', { day: '2-digit' }),
    month: start.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', ''),
    weekday: start.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', ''),
    time: start.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    full: start.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }
}

export function formatEventDateRange(startAt: string, endAt: string) {
  const start = new Date(startAt)
  const end = new Date(endAt)
  const sameDay = start.toDateString() === end.toDateString()

  if (sameDay) {
    const date = start.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
    const startTime = start.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    const endTime = end.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    return `${date} · ${startTime} – ${endTime}`
  }

  return `${start.toLocaleString('pt-BR')} até ${end.toLocaleString('pt-BR')}`
}

export function getEventCity(event: PublicEvent) {
  return event.city || event.location?.split('·').pop()?.trim() || 'Brasil'
}

export function getEventSummary(event: PublicEvent) {
  return event.welcome_message || event.description || 'Inscrições abertas. Garanta sua vaga e receba o QR Code de entrada.'
}

export function filterPublicEvents(events: PublicEvent[], search: string, category?: string) {
  const term = search.trim().toLowerCase()

  return events.filter((event) => {
    const matchesSearch =
      !term ||
      event.name.toLowerCase().includes(term) ||
      event.company.name.toLowerCase().includes(term) ||
      formatEventAddress(event).toLowerCase().includes(term) ||
      getEventCity(event).toLowerCase().includes(term)

    const matchesCategory =
      !category ||
      category === 'Todos' ||
      event.categories.some((item) => item.name.toLowerCase() === category.toLowerCase())

    return matchesSearch && matchesCategory
  })
}

export function groupEventsByCity(events: PublicEvent[]) {
  const map = new Map<string, PublicEvent[]>()

  for (const event of events) {
    const city = getEventCity(event)
    const list = map.get(city) ?? []
    list.push(event)
    map.set(city, list)
  }

  return Array.from(map.entries()).sort((a, b) => b[1].length - a[1].length)
}