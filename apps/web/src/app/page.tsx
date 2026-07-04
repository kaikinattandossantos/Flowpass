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
          Três papéis, um fluxo completo: o administrador cadastra empresas,
          a empresa cria eventos e os participantes se inscrevem, recebem
          confirmação por e-mail e um QR Code único para entrada.
        </p>

        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-cyan-300">1. Admin</p>
            <h2 className="mt-2 text-lg font-semibold">Cadastra empresas</h2>
            <p className="mt-2 text-sm text-slate-300">
              Cria a conta da organização e do gestor responsável pelos eventos.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-cyan-300">2. Empresa</p>
            <h2 className="mt-2 text-lg font-semibold">Cria eventos</h2>
            <p className="mt-2 text-sm text-slate-300">
              Configura categorias, compartilha o link público e acompanha entradas.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-cyan-300">3. Participante</p>
            <h2 className="mt-2 text-lg font-semibold">Se inscreve no evento</h2>
            <p className="mt-2 text-sm text-slate-300">
              Preenche o formulário, recebe e-mail de confirmação e QR Code único.
            </p>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-4 sm:flex-row">
          <a
            href="/login"
            className="rounded-full bg-cyan-400 px-6 py-3 text-center font-medium text-slate-950 transition hover:bg-cyan-300"
          >
            Entrar no painel
          </a>
        </div>
      </div>
    </main>
  );
}