export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-950 px-6 py-16 text-white">
      <div className="w-full max-w-4xl rounded-3xl border border-white/10 bg-white/10 p-8 shadow-2xl backdrop-blur">
        <p className="mb-4 text-sm font-semibold uppercase tracking-[0.3em] text-cyan-300">
          FlowPass MVP
        </p>
        <h1 className="text-4xl font-semibold sm:text-6xl">
          Credenciamento inteligente para eventos.
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-slate-300">
          Gerencie inscrições, gere QR Codes, acompanhe entradas em tempo real e
          ofereça uma experiência fluida para organizadores e participantes.
        </p>

        <div className="mt-10 flex flex-col gap-4 sm:flex-row">
          <a
            href="/login"
            className="rounded-full bg-cyan-400 px-6 py-3 text-center font-medium text-slate-950 transition hover:bg-cyan-300"
          >
            Entrar no painel
          </a>
          <a
            href="/register"
            className="rounded-full border border-white/20 px-6 py-3 text-center font-medium text-white transition hover:bg-white/10"
          >
            Criar conta
          </a>
        </div>
      </div>
    </main>
  );
}
