'use client'

import { useMemo, useState } from 'react'
import { PublicHeader } from '@/components/public/PublicHeader'
import { PublicFooter } from '@/components/public/PublicFooter'
import { EventCard } from '@/components/public/EventCard'
import { EventCarousel } from '@/components/public/EventCarousel'
import { CategoryPills } from '@/components/public/CategoryPills'
import { usePublicEvents } from '@/hooks/usePublicEvents'
import { filterPublicEvents, groupEventsByCity } from '@/lib/public-events'

export default function InscreverListPage() {
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

  const cities = useMemo(() => groupEventsByCity(filtered), [filtered])

  return (
    <div className="min-h-screen flex flex-col bg-[var(--background)]">
      <PublicHeader search={search} onSearchChange={setSearch} showSearch />

      <section className="bg-white border-b border-[var(--border)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
          <h1 className="text-3xl sm:text-4xl font-bold text-[var(--brand)]">Eventos com inscrição aberta</h1>
          <p className="text-slate-600 mt-2 max-w-2xl">
            Escolha um evento, preencha o formulário e receba seu ingresso digital com QR Code.
          </p>
          <div className="mt-6 md:hidden">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar eventos..."
              className="w-full px-4 py-3 rounded-xl border border-[var(--border)] outline-none focus:ring-2 focus:ring-[var(--accent)]"
            />
          </div>
        </div>
      </section>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-8">
        <div className="mb-8">
          <CategoryPills categories={categories} selected={category} onChange={setCategory} />
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="h-80 rounded-2xl bg-white border animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border p-12 text-center">
            <h2 className="text-xl font-bold text-[var(--brand)]">Nenhum evento disponível</h2>
            <p className="text-slate-600 mt-2">
              {search || category !== 'Todos'
                ? 'Nenhum evento encontrado para os filtros selecionados.'
                : 'No momento não há eventos ativos com inscrições abertas.'}
            </p>
          </div>
        ) : (
          <>
            <EventCarousel
              title={`${filtered.length} evento(s) encontrado(s)`}
              subtitle="Deslize para explorar ou use os filtros acima"
              events={filtered.slice(0, 10)}
            />

            {cities.map(([city, cityEvents]) => (
              <section key={city} className="mb-12">
                <h2 className="text-xl font-bold text-[var(--brand)] mb-5">{city}</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                  {cityEvents.map((event) => (
                    <EventCard key={event.id} event={event} variant="grid" />
                  ))}
                </div>
              </section>
            ))}
          </>
        )}
      </main>

      <PublicFooter />
    </div>
  )
}