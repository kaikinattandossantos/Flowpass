'use client'

import { normalizeFormSlug, validateFormSlugInput } from '@/lib/form-appearance'
import { publicFormUrl } from '@/lib/registration-form-types'
import type { SuccessBehavior } from '@/lib/success-behavior'
import {
  DEFAULT_REDIRECT_DELAY,
  DEFAULT_SUCCESS_MESSAGE,
  DEFAULT_SUCCESS_TITLE
} from '@/lib/success-behavior'

interface CategoryOption {
  id: string
  name: string
}

interface FormSettingsTabProps {
  formName: string
  slug: string
  publicId: string
  registrationLimit: number | null
  successBehavior: SuccessBehavior
  successTitle: string
  successMessage: string
  redirectUrl: string | null
  redirectDelay: number | null
  defaultCategoryId: string | null
  categories: CategoryOption[]
  activeRegistrationCount?: number
  availableSlots?: number | null
  isFull?: boolean
  disabled?: boolean
  onChange: (values: {
    formName: string
    slug: string
    registrationLimit: number | null
    successBehavior: SuccessBehavior
    successTitle: string
    successMessage: string
    redirectUrl: string | null
    redirectDelay: number | null
    defaultCategoryId: string | null
  }) => void
}

export function FormSettingsTab({
  formName,
  slug,
  publicId,
  registrationLimit,
  successBehavior,
  successTitle,
  successMessage,
  redirectUrl,
  redirectDelay,
  defaultCategoryId,
  categories,
  activeRegistrationCount,
  availableSlots,
  isFull,
  disabled,
  onChange
}: FormSettingsTabProps) {
  const limited = registrationLimit !== null
  const slugError = slug.trim() ? validateFormSlugInput(slug) : null
  const previewLink = publicFormUrl({ slug: slug.trim() ? normalizeFormSlug(slug) : null, public_id: publicId })

  const emit = (partial: Partial<{
    formName: string
    slug: string
    registrationLimit: number | null
    successBehavior: SuccessBehavior
    successTitle: string
    successMessage: string
    redirectUrl: string | null
    redirectDelay: number | null
    defaultCategoryId: string | null
  }>) => onChange({
    formName,
    slug,
    registrationLimit,
    successBehavior,
    successTitle,
    successMessage,
    redirectUrl,
    redirectDelay,
    defaultCategoryId,
    ...partial
  })

  return (
    <div className="space-y-8">
      <section className="space-y-4 rounded-lg bg-white p-6 shadow">
        <h2 className="font-semibold text-[#0B1F3A]">Geral</h2>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Nome interno do formulário</label>
          <input
            type="text"
            value={formName}
            disabled={disabled}
            onChange={(e) => emit({ formName: e.target.value })}
            className="w-full rounded-lg border border-gray-300 px-3 py-2"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Categoria automática</label>
          <p className="mb-2 text-sm text-gray-600">
            Quem se inscrever por este formulário receberá automaticamente a categoria selecionada.
          </p>
          <select
            value={defaultCategoryId ?? ''}
            disabled={disabled}
            onChange={(e) => emit({ defaultCategoryId: e.target.value || null })}
            className="w-full max-w-md rounded-lg border border-gray-300 px-3 py-2"
          >
            <option value="">Nenhuma (definir manualmente ou no formulário)</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>{category.name}</option>
            ))}
          </select>
        </div>
      </section>

      <section className="space-y-4 rounded-lg bg-white p-6 shadow">
        <h2 className="font-semibold text-[#0B1F3A]">Link do formulário</h2>
        <p className="text-sm text-gray-600">Personalize a URL pública. Links antigos pelo identificador interno continuam funcionando.</p>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">URL personalizada</label>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-gray-500">flowpass.com.br/f/</span>
            <input
              type="text"
              value={slug}
              disabled={disabled}
              onChange={(e) => emit({ slug: e.target.value })}
              placeholder="acolher-rio-formoso"
              className={`min-w-[220px] flex-1 rounded-lg border px-3 py-2 ${slugError ? 'border-red-400' : 'border-gray-300'}`}
            />
          </div>
          {slugError && <p className="mt-1 text-xs text-red-600">{slugError}</p>}
          <p className="mt-2 text-xs text-gray-500">Preview: {previewLink}</p>
        </div>
      </section>

      <section className="space-y-4 rounded-lg bg-white p-6 shadow">
        <h2 className="font-semibold text-[#0B1F3A]">Inscrições</h2>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            checked={!limited}
            disabled={disabled}
            onChange={() => emit({ registrationLimit: null })}
          />
          Sem limite
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            checked={limited}
            disabled={disabled}
            onChange={() => emit({ registrationLimit: registrationLimit ?? 100 })}
          />
          Limitar inscrições
        </label>
        {limited && (
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Número máximo de inscrições</label>
            <input
              type="number"
              min={1}
              value={registrationLimit ?? ''}
              disabled={disabled}
              onChange={(e) => emit({
                registrationLimit: e.target.value === '' ? null : Number.parseInt(e.target.value, 10)
              })}
              className="w-full max-w-xs rounded-lg border border-gray-300 px-3 py-2"
            />
            {typeof activeRegistrationCount === 'number' && registrationLimit !== null && (
              <div className="mt-3 rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-700">
                <p>{activeRegistrationCount} / {registrationLimit} inscrições</p>
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

      <section className="space-y-4 rounded-lg bg-white p-6 shadow">
        <h2 className="font-semibold text-[#0B1F3A]">Após a inscrição</h2>

        <label className="flex items-center gap-2 text-sm">
          <input type="radio" checked={successBehavior === 'message'} disabled={disabled} onChange={() => emit({ successBehavior: 'message', redirectUrl: null })} />
          Exibir mensagem de confirmação
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="radio" checked={successBehavior === 'message_redirect'} disabled={disabled} onChange={() => emit({ successBehavior: 'message_redirect', redirectUrl: redirectUrl ?? 'https://example.com/obrigado', redirectDelay: redirectDelay ?? DEFAULT_REDIRECT_DELAY })} />
          Exibir mensagem e redirecionar
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="radio" checked={successBehavior === 'redirect'} disabled={disabled} onChange={() => emit({ successBehavior: 'redirect', redirectUrl: redirectUrl ?? 'https://example.com/obrigado' })} />
          Redirecionar imediatamente
        </label>

        {successBehavior !== 'redirect' && (
          <>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Título</label>
              <input type="text" value={successTitle} disabled={disabled} onChange={(e) => emit({ successTitle: e.target.value })} placeholder={DEFAULT_SUCCESS_TITLE} className="w-full rounded-lg border border-gray-300 px-3 py-2" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Mensagem</label>
              <textarea value={successMessage} disabled={disabled} onChange={(e) => emit({ successMessage: e.target.value })} rows={3} placeholder={DEFAULT_SUCCESS_MESSAGE} className="w-full rounded-lg border border-gray-300 px-3 py-2" />
            </div>
          </>
        )}

        {(successBehavior === 'message_redirect' || successBehavior === 'redirect') && (
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">URL de redirecionamento</label>
            <input
              type="url"
              value={redirectUrl ?? ''}
              disabled={disabled}
              onChange={(e) => emit({ redirectUrl: e.target.value })}
              className={`w-full rounded-lg border px-3 py-2 ${redirectUrl?.trim() && !/^https?:\/\/.+/i.test(redirectUrl.trim()) ? 'border-amber-400' : 'border-gray-300'}`}
              placeholder="https://meusite.com/obrigado"
            />
          </div>
        )}

        {successBehavior === 'message_redirect' && (
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Tempo para redirecionar (segundos)</label>
            <input
              type="number"
              min={1}
              max={30}
              value={redirectDelay ?? DEFAULT_REDIRECT_DELAY}
              disabled={disabled}
              onChange={(e) => emit({ redirectDelay: Number.parseInt(e.target.value, 10) })}
              className="w-full max-w-xs rounded-lg border border-gray-300 px-3 py-2"
            />
          </div>
        )}
      </section>
    </div>
  )
}
