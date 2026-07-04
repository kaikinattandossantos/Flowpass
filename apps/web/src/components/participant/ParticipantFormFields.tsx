'use client'

import type { FormFieldDraft, FormFieldType } from '@/lib/form-fields'

export interface PublicFormField {
  id: string
  label: string
  type: FormFieldType
  required: boolean
  options?: string[]
  order: number
}

interface ParticipantFormFieldsProps {
  fields: PublicFormField[]
  formData: Record<string, string | string[]>
  onChange: (fieldId: string, value: string | string[]) => void
  accentColor?: string
}

export function ParticipantFormFields({
  fields,
  formData,
  onChange,
  accentColor = '#00C896'
}: ParticipantFormFieldsProps) {
  if (fields.length === 0) return null

  return (
    <div className="border-t pt-6 space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-[#0B1F3A]">Informações adicionais</h3>
        <p className="text-sm text-gray-800 mt-1">
          Preencha os campos solicitados pelo organizador do evento.
        </p>
      </div>

      {fields
        .sort((a, b) => a.order - b.order)
        .map((field) => (
          <div key={field.id}>
            <label className="block text-sm font-medium text-gray-900 mb-1">
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </label>

            {field.type === 'select' ? (
              <select
                required={field.required}
                value={typeof formData[field.id] === 'string' ? formData[field.id] : ''}
                onChange={(e) => onChange(field.id, e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none"
                style={{ boxShadow: 'none' }}
                onFocus={(e) => {
                  e.currentTarget.style.boxShadow = `0 0 0 2px ${accentColor}`
                }}
                onBlur={(e) => {
                  e.currentTarget.style.boxShadow = 'none'
                }}
              >
                <option value="">Selecione...</option>
                {field.options?.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            ) : field.type === 'multi_select' ? (
              <div className="space-y-2">
                {field.options?.map((opt) => {
                  const current = Array.isArray(formData[field.id]) ? formData[field.id] : []
                  const checked = current.includes(opt)

                  return (
                    <label key={opt} className="flex items-center gap-2 text-gray-900">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          const next = e.target.checked
                            ? [...current, opt]
                            : current.filter((item) => item !== opt)
                          onChange(field.id, next)
                        }}
                      />
                      <span className="text-sm">{opt}</span>
                    </label>
                  )
                })}
              </div>
            ) : (
              <input
                type={
                  field.type === 'number'
                    ? 'number'
                    : field.type === 'email'
                      ? 'email'
                      : field.type === 'phone' || field.type === 'cpf'
                        ? 'tel'
                        : 'text'
                }
                required={field.required}
                value={typeof formData[field.id] === 'string' ? formData[field.id] : ''}
                placeholder={
                  field.type === 'cpf'
                    ? '000.000.000-00'
                    : field.type === 'phone'
                      ? '(00) 00000-0000'
                      : undefined
                }
                onChange={(e) => onChange(field.id, e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none"
                onFocus={(e) => {
                  e.currentTarget.style.boxShadow = `0 0 0 2px ${accentColor}`
                }}
                onBlur={(e) => {
                  e.currentTarget.style.boxShadow = 'none'
                }}
              />
            )}
          </div>
        ))}
    </div>
  )
}

export function FormFieldBuilder({
  fields,
  onChange
}: {
  fields: FormFieldDraft[]
  onChange: (fields: FormFieldDraft[]) => void
}) {
  const updateField = (index: number, patch: Partial<FormFieldDraft>) => {
    const next = [...fields]
    next[index] = { ...next[index], ...patch }
    onChange(next)
  }

  return (
    <div className="space-y-4">
      {fields.map((field, index) => (
        <div key={index} className="rounded-lg border border-gray-200 p-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">Pergunta *</label>
              <input
                type="text"
                value={field.label}
                onChange={(e) => updateField(index, { label: e.target.value })}
                placeholder="Ex: Empresa, Cargo, Tamanho da camiseta"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-[#00C896]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">Tipo</label>
              <select
                value={field.type}
                onChange={(e) =>
                  updateField(index, {
                    type: e.target.value as FormFieldType,
                    options: ['select', 'multi_select'].includes(e.target.value) ? field.options ?? [] : undefined
                  })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-[#00C896]"
              >
                <option value="text">Texto curto</option>
                <option value="email">E-mail</option>
                <option value="phone">Telefone</option>
                <option value="cpf">CPF</option>
                <option value="number">Número</option>
                <option value="select">Seleção única</option>
                <option value="multi_select">Múltipla escolha</option>
              </select>
            </div>
          </div>

          {['select', 'multi_select'].includes(field.type) && (
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                Opções (separadas por vírgula)
              </label>
              <input
                type="text"
                value={(field.options ?? []).join(', ')}
                onChange={(e) =>
                  updateField(index, {
                    options: e.target.value
                      .split(',')
                      .map((item) => item.trim())
                      .filter(Boolean)
                  })
                }
                placeholder="P, M, G, GG"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-[#00C896]"
              />
            </div>
          )}

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm text-gray-900">
              <input
                type="checkbox"
                checked={field.required}
                onChange={(e) => updateField(index, { required: e.target.checked })}
              />
              Campo obrigatório
            </label>
            <button
              type="button"
              onClick={() => onChange(fields.filter((_, i) => i !== index))}
              className="text-sm text-red-600 hover:underline"
            >
              Remover
            </button>
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={() =>
          onChange([
            ...fields,
            { label: '', type: 'text', required: false, order: fields.length }
          ])
        }
        className="w-full py-2 border-2 border-[#00C896] text-[#00C896] rounded-lg hover:bg-green-50 font-semibold"
      >
        + Adicionar pergunta
      </button>
    </div>
  )
}