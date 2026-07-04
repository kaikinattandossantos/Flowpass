import Link from 'next/link'

export function PublicFooter() {
  return (
    <footer className="bg-[var(--brand)] text-white mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-2">
            <p className="text-xl font-bold">FlowPass</p>
            <p className="text-white/75 mt-3 max-w-md text-sm leading-relaxed">
              Plataforma profissional de credenciamento para eventos corporativos,
              conferências e encontros empresariais. Inscrição, QR Code e controle de acesso em um só lugar.
            </p>
          </div>
          <div>
            <p className="font-semibold text-sm uppercase tracking-wider text-white/60 mb-3">Participante</p>
            <ul className="space-y-2 text-sm text-white/85">
              <li><Link href="/inscrever" className="hover:text-[var(--accent)] transition">Ver eventos</Link></li>
              <li><Link href="/inscrever" className="hover:text-[var(--accent)] transition">Minhas inscrições</Link></li>
            </ul>
          </div>
          <div>
            <p className="font-semibold text-sm uppercase tracking-wider text-white/60 mb-3">Organizador</p>
            <ul className="space-y-2 text-sm text-white/85">
              <li><Link href="/login" className="hover:text-[var(--accent)] transition">Entrar no painel</Link></li>
              <li><Link href="/login" className="hover:text-[var(--accent)] transition">Criar evento</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-white/10 mt-10 pt-6 text-center text-xs text-white/50">
          © {new Date().getFullYear()} FlowPass. Credenciamento inteligente para eventos.
        </div>
      </div>
    </footer>
  )
}