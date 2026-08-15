export default function FinanceiroPage() {
  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#0B1F3A]">Financeiro</h1>
        <p className="mt-2 text-gray-600">
          Acompanhe pagamentos, vendas de inscrições e repasses por evento.
        </p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm md:p-10">
        <div className="mx-auto max-w-xl text-center">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-[#0B1F3A]/5 text-2xl text-[#0B1F3A]">
            ₢
          </div>
          <h2 className="text-xl font-bold text-[#0B1F3A]">Módulo financeiro em preparação</h2>
          <p className="mt-3 text-sm leading-6 text-gray-600">
            Ainda não há movimentações financeiras registradas. Esta área será usada para
            pagamentos, vendas de inscrições, receitas por evento, taxas e repasses.
          </p>
          <div className="mt-6 rounded-lg bg-gray-50 px-4 py-3 text-left text-sm text-gray-600">
            <p className="font-medium text-[#0B1F3A]">Em breve você poderá visualizar:</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Pagamentos recebidos</li>
              <li>Vendas de inscrições</li>
              <li>Receitas por evento</li>
              <li>Taxas e repasses</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
