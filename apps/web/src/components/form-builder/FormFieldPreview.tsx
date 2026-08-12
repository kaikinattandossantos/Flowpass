'use client'

import {
  FormField,
  fieldTypeLabel,
  sortFormFields
} from '@/lib/form-field-types'
import {
  STRUCTURAL_FIELD_LABELS,
  type StructuralConfig,
  type StructuralFieldKey
} from '@/lib/structural-config'

interface FormFieldPreviewProps {
  fields: FormField[]
  structuralConfig?: StructuralConfig
}

export function FormFieldPreview({ fields, structuralConfig }: FormFieldPreviewProps) {
  const sorted = sortFormFields(fields)

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-bold text-[#0B1F3A] mb-4">Preview do formulário</h2>
      <p className="text-sm text-gray-500 mb-6">
        Visualização aproximada do formulário público.
      </p>

      <div className="space-y-4 border rounded-lg p-4 bg-gray-50">
        {structuralConfig && (Object.keys(structuralConfig) as StructuralFieldKey[]).map((key) => {
          const field = structuralConfig[key]
          if (!field.enabled) return null
          return (
            <PreviewField
              key={key}
              label={STRUCTURAL_FIELD_LABELS[key]}
              required={field.required}
              type={key === 'email' ? 'email' : key === 'phone' ? 'phone' : key === 'category' ? 'select' : 'text'}
            />
          )
        })}

        {sorted.length === 0 ? (
          <p className="text-sm text-gray-500 italic">Nenhum campo personalizado configurado.</p>
        ) : (
          sorted.map((field) => (
            <PreviewField
              key={field.id}
              label={field.label}
              required={field.required}
              type={field.type}
              placeholder={field.placeholder ?? undefined}
              options={field.options ?? undefined}
            />
          ))
        )}

        <div className="pt-2">
          <div className="w-full bg-[#00C896] text-white text-center py-2 rounded-lg text-sm font-semibold opacity-70">
            Enviar inscrição
          </div>
        </div>
      </div>
    </div>
  )
}

function PreviewField({
  label,
  required,
  type,
  placeholder,
  options
}: {
  label: string
  required?: boolean
  type: string
  placeholder?: string
  options?: string[]
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
        <span className="ml-2 text-xs text-gray-400">({fieldTypeLabel(type as FormField['type'])})</span>
      </label>

      {type === 'textarea' ? (
        <div className="h-16 border border-gray-300 rounded-lg bg-white px-3 py-2 text-sm text-gray-400">
          {placeholder || 'Texto longo...'}
        </div>
      ) : type === 'select' ? (
        <div className="border border-gray-300 rounded-lg bg-white px-3 py-2 text-sm text-gray-400">
          {options?.[0] ? `Selecione... (${options.join(', ')})` : 'Selecione...'}
        </div>
      ) : type === 'multi_select' || (type === 'checkbox' && options && options.length > 0) ? (
        <div className="space-y-1">
          {(options ?? ['Opção 1', 'Opção 2']).map((opt) => (
            <label key={opt} className="flex items-center gap-2 text-sm text-gray-600">
              <span className="w-4 h-4 border border-gray-300 rounded bg-white" />
              {opt}
            </label>
          ))}
        </div>
      ) : type === 'checkbox' ? (
        <label className="flex items-center gap-2 text-sm text-gray-600">
          <span className="w-4 h-4 border border-gray-300 rounded bg-white" />
          {label}
        </label>
      ) : (
        <div className="border border-gray-300 rounded-lg bg-white px-3 py-2 text-sm text-gray-400">
          {placeholder || fieldTypeLabel(type as FormField['type'])}
        </div>
      )}
    </div>
  )
}
