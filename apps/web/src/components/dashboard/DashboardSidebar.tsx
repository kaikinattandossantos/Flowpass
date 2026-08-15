'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { getStoredUser, useAuthStore, type Role } from '@/store/auth'
import {
  EVENT_NAV_SECTIONS,
  eventNavHref,
  isEventNavItemActive,
  parseEventIdFromPath
} from '@/lib/event-navigation'
import { useEventNav } from './EventNavContext'

interface DashboardSidebarProps {
  onNavigate?: () => void
}

const NAV_ITEMS: Array<{ href: string; label: string; exact?: boolean }> = [
  { href: '/dashboard', label: 'Visão geral', exact: true },
  { href: '/dashboard/events', label: 'Eventos' },
  { href: '/dashboard/financeiro', label: 'Financeiro' }
]

function roleLabel(role: Role): string {
  if (role === 'admin') return 'Administrador'
  if (role === 'viewer') return 'Visualizador'
  if (role === 'operator') return 'Operador'
  return role
}

function isGlobalNavActive(pathname: string, href: string, exact?: boolean): boolean {
  if (exact) return pathname === href
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function DashboardSidebar({ onNavigate }: DashboardSidebarProps) {
  const pathname = usePathname()
  const logout = useAuthStore((state) => state.logout)
  const user = getStoredUser()
  const routeEventId = parseEventIdFromPath(pathname)
  const { eventId, event, loading } = useEventNav()
  const activeEventId = eventId ?? routeEventId

  return (
    <div className="flex h-full flex-col bg-[#0B1F3A] text-white">
      <div className="border-b border-white/10 px-6 py-5">
        <p className="text-xl font-bold tracking-tight">FlowPass</p>
        <p className="mt-1 text-xs text-white/60">Painel administrativo</p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6">
        <p className="px-3 text-xs font-semibold uppercase tracking-wide text-white/45">
          Navegação
        </p>
        <nav className="mt-3 space-y-1">
          {NAV_ITEMS.map((item) => {
            const active = isGlobalNavActive(pathname, item.href, item.exact)
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                className={`block rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                  active
                    ? 'bg-[#00C896] text-white'
                    : 'text-white/80 hover:bg-white/10 hover:text-white'
                }`}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>

        {activeEventId && (
          <div className="mt-8">
            <p className="px-3 text-xs font-semibold uppercase tracking-wide text-white/45">
              Evento
            </p>
            <div className="mt-3 space-y-1">
              <Link
                href="/dashboard/events"
                onClick={onNavigate}
                className="block rounded-lg px-3 py-2 text-sm text-white/70 transition hover:bg-white/10 hover:text-white"
              >
                ← Todos os eventos
              </Link>

              <div className="rounded-lg bg-white/5 px-3 py-2.5">
                {event?.name ? (
                  <p className="truncate text-sm font-semibold text-white">{event.name}</p>
                ) : loading ? (
                  <div className="h-4 w-3/4 animate-pulse rounded bg-white/10" />
                ) : (
                  <p className="truncate text-sm font-semibold text-white/70">Evento</p>
                )}
              </div>

              {EVENT_NAV_SECTIONS.map((section) => (
                <div key={section.label ?? 'main'} className="pt-2">
                  {section.label && (
                    <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-white/35">
                      {section.label}
                    </p>
                  )}
                  {section.items.map((item) => {
                    const href = eventNavHref(activeEventId, item.path)
                    const active = isEventNavItemActive(pathname, activeEventId, item)
                    return (
                      <Link
                        key={item.key}
                        href={href}
                        onClick={onNavigate}
                        className={`block rounded-lg px-3 py-2 text-sm font-medium transition ${
                          active
                            ? 'bg-[#00C896] text-white'
                            : 'text-white/80 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        {item.label}
                      </Link>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-white/10 px-4 py-4">
        {user && (
          <div className="mb-3 rounded-lg bg-white/5 px-3 py-3">
            <p className="truncate text-sm font-semibold">{user.name}</p>
            <p className="truncate text-xs text-white/60">{user.email}</p>
            <p className="mt-1 text-xs text-[#00C896]">{roleLabel(user.role)}</p>
          </div>
        )}
        <button
          type="button"
          onClick={() => {
            logout()
            window.location.href = '/login'
          }}
          className="w-full rounded-lg border border-white/15 px-3 py-2 text-sm font-medium text-white/90 transition hover:bg-white/10"
        >
          Sair
        </button>
      </div>
    </div>
  )
}
