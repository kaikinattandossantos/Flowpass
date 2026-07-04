'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface PublicHeaderProps {
  search?: string
  onSearchChange?: (value: string) => void
  showSearch?: boolean
}

export function PublicHeader({ search = '', onSearchChange, showSearch = false }: PublicHeaderProps) {
  const pathname = usePathname()

  const navLinkClass = (href: string) =>
    `text-sm font-medium transition ${
      pathname === href
        ? 'text-[var(--accent)]'
        : 'text-slate-600 hover:text-[var(--brand)]'
    }`

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-white/95 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex h-16 items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--brand)] text-white font-bold text-sm">
              FP
            </span>
            <div className="leading-tight">
              <p className="font-bold text-[var(--brand)] text-lg tracking-tight">FlowPass</p>
              <p className="text-[10px] uppercase tracking-widest text-slate-500 hidden sm:block">
                Credenciamento corporativo
              </p>
            </div>
          </Link>

          {showSearch && onSearchChange && (
            <div className="hidden md:flex flex-1 max-w-xl mx-6">
              <div className="relative w-full">
                <svg
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => onSearchChange(e.target.value)}
                  placeholder="Buscar eventos, cidades ou organizadores..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-full border border-[var(--border)] bg-slate-50 focus:bg-white focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent outline-none text-sm"
                />
              </div>
            </div>
          )}

          <nav className="flex items-center gap-4 sm:gap-6">
            <Link href="/inscrever" className={navLinkClass('/inscrever')}>
              Eventos
            </Link>
            <Link
              href="/login"
              className="text-sm font-semibold px-4 py-2 rounded-full border border-[var(--brand)] text-[var(--brand)] hover:bg-[var(--brand)] hover:text-white transition"
            >
              Área do organizador
            </Link>
          </nav>
        </div>
      </div>
    </header>
  )
}