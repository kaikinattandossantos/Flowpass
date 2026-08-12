'use client'

interface FormSettingsTabProps {
  formName: string
  registrationLimit: number | null
  redirectUrl: string | null
  activeRegistrationCount?: number
  availableSlots?: number | null
  isFull?: boolean
  disabled?: boolean
  onChange: (values: {
    formName: string
    registrationLimit: number | null
    redirectUrl: string | null
  }) => void
}

export function FormSettingsTab({
  formName,
  registrationLimit,
  redirectUrl,
  activeRegistrationCount,
  availableSlots,
  isFull,
  disabled,
  onChange
}: FormSettingsTabProps) {
  const limited = registrationLimit !== null

  return (
    <div className="space-y-8">
      <section className="rounded-lg bg-white p-6 shadow space-y-4">
        <h2 className="font-semibold text-[#0B1F3A]">Informações gerais</h2>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nome do formulário</label>
          <input
            type="text"
            value={formName}
            disabled={disabled}
            onChange={(e) => onChange({ formName: e.target.value, registrationLimit, redirectUrl })}
            className="w-full rounded-lg border border-gray-300 px-3 py-2"
          />
        </div>
      </section>

      <section className="rounded-lg bg-white p-6 shadow space-y-4">
        <h2 className="font-semibold text-[#0B1F3A]">Limite de inscrições</h2>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            checked={!limited}
            disabled={disabled}
            onChange={() => onChange({ formName, registrationLimit: null, redirectUrl })}
          />
          Sem limite
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            checked={limited}
            disabled={disabled}
            onChange={() => onChange({ formName, registrationLimit: registrationLimit ?? 100, redirectUrl })}
          />
          Limitar inscrições
        </label>
        {limited && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Número máximo de inscrições</label>
            <input
              type="number"
              min={1}
              value={registrationLimit ?? ''}
              disabled={disabled}
              onChange={(e) => onChange({
                formName,
                registrationLimit: e.target.value === '' ? null : Number.parseInt(e.target.value, 10),
                redirectUrl
              })}
              className="w-full max-w-xs rounded-lg border border-gray-300 px-3 py-2"
            />
            {typeof activeRegistrationCount === 'number' && registrationLimit !== null && (
              <div className="mt-3 rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-700">
                <p>
                  {activeRegistrationCount} / {registrationLimit} inscrições
                </p>
                {isFull ? (
                  <p className="mt-1 font-medium text-amber-800">Limite atingido</p>
                ) : (
                  <p className="mt-1 text-gray-600">
                    {availableSlots ?? Math.max(0, registrationLimit - activeRegistrationCount)} vagas disponíveis
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </section>

      <section className="rounded-lg bg-white p-6 shadow space-y-4">
        <h2 className="font-semibold text-[#0B1F3A]">Após a inscrição</h2>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            checked={!redirectUrl}
            disabled={disabled}
            onChange={() => onChange({ formName, registrationLimit, redirectUrl: null })}
          />
          Mostrar confirmação do FlowPass
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            checked={!!redirectUrl}
            disabled={disabled}
            onChange={() => onChange({ formName, registrationLimit, redirectUrl: 'https://example.com/obrigado' })}
          />
          Redirecionar para outro endereço
        </label>
        {redirectUrl !== null && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">URL de redirecionamento</label>
            <input
              type="url"
              value={redirectUrl}
              disabled={disabled}
              onChange={(e) => onChange({ formName, registrationLimit, redirectUrl: e.target.value })}
              className={`w-full rounded-lg border px-3 py-2 ${
                redirectUrl.trim() && !/^https?:\/\/.+/i.test(redirectUrl.trim())
                  ? 'border-amber-400'
                  : 'border-gray-300'
              }`}
              placeholder="https://meusite.com/obrigado"
            />
            {redirectUrl.trim() && !/^https?:\/\/.+/i.test(redirectUrl.trim()) && (
              <p className="mt-1 text-xs text-amber-700">
                Informe uma URL válida começando com http:// ou https://
              </p>
            )}
          </div>
        )}
      </section>
    </div>
  )
}
