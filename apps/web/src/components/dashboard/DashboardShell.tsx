'use client'

import { useEffect, useState, useSyncExternalStore } from 'react'
import { useRouter } from 'next/navigation'
import { getHomeRoute, getStoredUser } from '@/store/auth'
import { DashboardSidebar } from './DashboardSidebar'
import { EventNavProvider } from './EventNavContext'

interface DashboardShellProps {
  children: React.ReactNode
}

function subscribe() {
  return () => {}
}

function useIsClient() {
  return useSyncExternalStore(subscribe, () => true, () => false)
}

export function DashboardShell({ children }: DashboardShellProps) {
  const router = useRouter()
  const isClient = useIsClient()
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('token')
    const user = getStoredUser()

    if (!token || !user) {
      router.replace('/login')
      return
    }

    if (user.role === 'super_admin') {
      router.replace(getHomeRoute(user.role))
    }
  }, [router])

  if (!isClient) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-gray-600">Carregando...</p>
      </div>
    )
  }

  const token = localStorage.getItem('token')
  const user = getStoredUser()
  const allowed = !!(token && user && user.role !== 'super_admin')

  if (!allowed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-gray-600">Carregando...</p>
      </div>
    )
  }

  return (
    <EventNavProvider>
      <div className="min-h-screen bg-gray-50 lg:flex">
      {mobileOpen && (
        <button
          type="button"
          aria-label="Fechar menu"
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 transform transition-transform duration-200 lg:static lg:z-auto lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="relative h-full">
          <button
            type="button"
            aria-label="Fechar menu"
            onClick={() => setMobileOpen(false)}
            className="absolute right-3 top-3 rounded-lg p-2 text-white/70 hover:bg-white/10 lg:hidden"
          >
            ✕
          </button>
          <DashboardSidebar onNavigate={() => setMobileOpen(false)} />
        </div>
      </aside>

      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3 lg:hidden">
          <button
            type="button"
            aria-label="Abrir menu"
            onClick={() => setMobileOpen(true)}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-[#0B1F3A]"
          >
            ☰
          </button>
          <p className="text-lg font-bold text-[#0B1F3A]">FlowPass</p>
          <div className="w-10" />
        </header>

        <main className="flex-1 px-4 py-6 md:px-8 md:py-8">
          {children}
        </main>
      </div>
      </div>
    </EventNavProvider>
  )
}
