export interface EventNavItem {
  key: string
  label: string
  path: string
  matchNested?: boolean
}

export interface EventNavSection {
  label: string | null
  items: EventNavItem[]
}

export const EVENT_NAV_SECTIONS: EventNavSection[] = [
  {
    label: null,
    items: [
      { key: 'overview', label: 'Visão geral', path: '' },
      { key: 'participants', label: 'Participantes', path: 'participants' }
    ]
  },
  {
    label: 'Inscrições',
    items: [
      { key: 'forms', label: 'Formulários', path: 'forms', matchNested: true },
      { key: 'categories', label: 'Categorias', path: 'categories' }
    ]
  },
  {
    label: 'Operação',
    items: [
      { key: 'credenciamento', label: 'Credenciamento', path: 'credenciamento' },
      { key: 'live', label: 'Ao vivo', path: 'live' }
    ]
  }
]

export const EVENT_NAV_ITEMS: EventNavItem[] = EVENT_NAV_SECTIONS.flatMap((section) => section.items)

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function parseEventIdFromPath(pathname: string): string | null {
  const match = pathname.match(/^\/dashboard\/events\/([^/]+)/)
  if (!match) return null
  const candidate = match[1]
  if (candidate === 'new') return null
  if (!UUID_PATTERN.test(candidate)) return null
  return candidate
}

export function eventNavHref(eventId: string, path: string): string {
  return path
    ? `/dashboard/events/${eventId}/${path}`
    : `/dashboard/events/${eventId}`
}

export function isEventNavItemActive(
  pathname: string,
  eventId: string,
  item: EventNavItem
): boolean {
  const base = `/dashboard/events/${eventId}`

  if (item.key === 'overview') {
    return pathname === base
  }

  const prefix = `${base}/${item.path}`
  if (item.matchNested) {
    return pathname === prefix || pathname.startsWith(`${prefix}/`)
  }

  return pathname === prefix || pathname.startsWith(`${prefix}/`)
}

export function resolveEventSectionLabel(pathname: string, eventId: string): string | null {
  if (pathname === `/dashboard/events/${eventId}`) return 'Visão geral'

  if (pathname.startsWith(`/dashboard/events/${eventId}/registration-links`)) {
    return 'Links de inscrição'
  }

  if (pathname.startsWith(`/dashboard/events/${eventId}/access-points`)) {
    return 'Pontos de acesso'
  }

  for (const item of EVENT_NAV_ITEMS) {
    if (item.key === 'overview') continue
    if (isEventNavItemActive(pathname, eventId, item)) {
      return item.label
    }
  }

  return null
}

export interface BreadcrumbItem {
  label: string
  href?: string
}

export function buildEventBreadcrumbs(
  pathname: string,
  eventId: string,
  eventName: string | null,
  extra: BreadcrumbItem[] = []
): BreadcrumbItem[] {
  const crumbs: BreadcrumbItem[] = [
    { label: 'Eventos', href: '/dashboard/events' }
  ]

  if (eventName) {
    crumbs.push({
      label: eventName,
      href: `/dashboard/events/${eventId}`
    })
  }

  const section = resolveEventSectionLabel(pathname, eventId)
  const onOverview = pathname === `/dashboard/events/${eventId}`

  if (section && !onOverview) {
    const item = EVENT_NAV_ITEMS.find((entry) => entry.label === section)
    crumbs.push({
      label: section,
      href: item ? eventNavHref(eventId, item.path) : undefined
    })
  }

  return [...crumbs, ...extra]
}
