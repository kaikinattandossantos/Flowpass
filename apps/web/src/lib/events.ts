export type EventStatus = 'draft' | 'active' | 'finished'

export interface DashboardEvent {
  id: string
  name: string
  status: EventStatus
  start_at: string
  end_at: string
  location?: string | null
}

const STATUS_LABELS: Record<EventStatus, string> = {
  draft: 'Rascunho',
  active: 'Ativo',
  finished: 'Finalizado'
}

const STATUS_CLASSES: Record<EventStatus, string> = {
  draft: 'bg-gray-100 text-gray-800',
  active: 'bg-green-100 text-green-800',
  finished: 'bg-red-100 text-red-800'
}

export function eventStatusLabel(status: EventStatus): string {
  return STATUS_LABELS[status] ?? status
}

export function eventStatusClass(status: EventStatus): string {
  return STATUS_CLASSES[status] ?? STATUS_CLASSES.draft
}

export function formatEventDate(value: string): string {
  return new Date(value).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  })
}

export function formatEventDateRange(startAt: string, endAt: string): string {
  const start = formatEventDate(startAt)
  const end = formatEventDate(endAt)
  return start === end ? start : `${start} – ${end}`
}

export function isUpcomingEvent(event: DashboardEvent, now = new Date()): boolean {
  return new Date(event.end_at) >= now
}

export function sortEventsByStartAsc(events: DashboardEvent[]): DashboardEvent[] {
  return [...events].sort(
    (a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime()
  )
}
