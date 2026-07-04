'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { PublicHeader } from '@/components/public/PublicHeader'
import { PublicFooter } from '@/components/public/PublicFooter'
import { EventCarousel } from '@/components/public/EventCarousel'
import { EventCard } from '@/components/public/EventCard'
import { CategoryPills } from '@/components/public/CategoryPills'
import { usePublicEvents } from '@/hooks/usePublicEvents'
import {
  filterPublicEvents,
  getEventCity,
  groupEventsByCity
} from '@/lib/public-events'

export default function Home() {
  const { events, loading } = usePublicEvents()
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('Todos')

  const categories = useMemo(() => {
    const names = new Set<string>()
    for (const event of events) {
      for (const item of event.categories) names.add(item.name)
    }
    return ['Todos', ...Array.from(names).sort()]
  }, [events])

  const filtered = useMemo(
    () => filterPublicEvents(events, search, category),
    [events, search, category]
  )

  const featured = useMemo(() => filtered.slice(0, 8), [filtered])
  const upcoming = useMemo(() => {
    const now = Date.now()
    const in30Days = now + 30 * 24 * 60 * 60 * 1000
    return filtered.filter((event) => {
      const start = new Date(event.start_at).getTime()
      return start >= now && start <= in30Days
    })
  }, [filtered])

  const cities = useMemo(() => groupEventsByCity(filtered).slice(0, 3), [filtered])

  return (
    <div className="min-h-screen flex flex-col bg-[var(--background)]">
      <PublicHeader search={search} onSearchChange={setSearch} showSearch />

      <section
        className="relative overflow-hidden text-white"
        style={{ background: 'var(--hero-gradient)' }}
      >
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-0 right-0 w-96 h-96 bg-[var(--accent)] rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
          <div className="absolute bottom-0 left-0 w-72 h-72 bg-blue-400 rounded-full blur-3xl translate-y-1/2 -translate-x-1/3" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--accent)] mb-4">
              Plataforma corporativa de eventos
            </p>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight tracking-tight">
              Encontre eventos profissionais e garanta sua entrada
            </h1>
            <p className="mt-5 text-lg text-white/80 max-w-2xl leading-relaxed">
              Inscreva-se, receba confirmação por e-mail e apresente seu QR Code na entrada.
              Credenciamento seguro para empresas e participantes.
            </p>
          </div>

          <div className="mt-8 max-w-2xl md:hidden">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar eventos..."
              className="w-full px-5 py-3.5 rounded-full border-0 shadow-xl text-[var(--brand)] outline-none"
            />
          </div>

          <div className="mt-10 flex flex-wrap gap-6 text-sm">
            <div className="bg-white/10 backdrop-blur rounded-xl px-5 py-3 border border-white/10">
              <p className="text-2xl font-bold">{loading ? '—' : events.length}</p>
              <p className="text-white/70">Eventos abertos</p>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-xl px-5 py-3 border border-white/10">
              <p className="text-2xl font-bold">{loading ? '—' : cities.length}</p>
              <p className="text-white/70">Cidades</p>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-xl px-5 py-3 border border-white/10">
              <p className="text-2xl font-bold">QR</p>
              <p className="text-white/70">Check-in digital</p>
            </div>
          </div>
        </div>
      </section>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-10">
        <div className="mb-8">
          <CategoryPills categories={categories} selected={category} onChange={setCategory} />
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="h-80 rounded-2xl bg-white border border-[var(--border)] animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[var(--border)] p-12 text-center">
            <h2 className="text-xl font-bold text-[var(--brand)]">Nenhum evento encontrado</h2>
            <p className="text-slate-600 mt-2">Tente outro termo de busca ou categoria.</p>
          </div>
        ) : (
          <>
            <EventCarousel
              title="Em destaque"
              subtitle="Os principais eventos com inscrições abertas"
              events={featured}
              viewAllHref="/inscrever"
            />

            {upcoming.length > 0 && (
              <EventCarousel
                title="Próximos 30 dias"
                subtitle="Agenda corporativa para o mês"
                events={upcoming}
                viewAllHref="/inscrever"
              />
            )}

            {cities.map(([city, cityEvents]) => (
              <EventCarousel
                key={city}
                title={`Eventos em ${city}`}
                subtitle={`${cityEvents.length} evento(s) disponível(is)`}
                events={cityEvents}
              />
            ))}

            <section className="mt-4">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-xl sm:text-2xl font-bold text-[var(--brand)]">Todos os eventos</h2>
                <Link href="/inscrever" className="text-sm font-semibold text-[var(--accent-dark)] hover:underline">
                  Ver página completa
                </Link>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {filtered.map((event) => (
                  <EventCard key={event.id} event={event} variant="grid" />
                ))}
              </div>
            </section>
          </>
        )}

        <section className="mt-16 rounded-2xl overflow-hidden border border-[var(--border)] bg-white shadow-sm">
          <div className="grid md:grid-cols-2">
            <div className="p-8 sm:p-10">
              <p className="text-xs font-bold uppercase tracking-wider text-[var(--accent-dark)]">Para organizadores</p>
              <h2 className="text-2xl font-bold text-[var(--brand)] mt-2">Publique e gerencie seu evento</h2>
              <p className="text-slate-600 mt-3 leading-relaxed">
                Crie eventos, configure categorias, acompanhe inscrições em tempo real
                e faça credenciamento por QR Code na entrada.
              </p>
              <Link
                href="/login"
                className="inline-flex mt-6 px-6 py-3 rounded-full bg-[var(--brand)] text-white font-semibold hover:bg-[#163456] transition"
              >
                Acessar painel
              </Link>
            </div>
            <div
              className="p-8 sm:p-10 text-white flex flex-col justify-center"
              style={{ background: 'var(--hero-gradient)' }}
            >
              <div className="space-y-4">
                {[
                  'Inscrição pública com formulário personalizado',
                  'E-mail automático com QR Code',
                  'Credenciamento e painel ao vivo',
                  'Controle de acesso por categoria'
                ].map((item) => (
                  <p key={item} className="flex items-start gap-3 text-sm text-white/90">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-[var(--brand)] text-xs font-bold">
                      ✓
                    </span>
                    {item}
                  </p>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  )
}