'use client'

import { FormField, fieldTypeLabel, sortFormFields } from '@/lib/form-field-types'

interface FormFieldListProps {
  fields: FormField[]
  canEdit: boolean
  busyId: string | null
  onEdit: (field: FormField) => void
  onDelete: (field: FormField) => void
  onMove: (field: FormField, direction: 'up' | 'down') => void
}

export function FormFieldList({
  fields,
  canEdit,
  busyId,
  onEdit,
  onDelete,
  onMove
}: FormFieldListProps) {
  const sorted = sortFormFields(fields)

  if (sorted.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
        <p className="font-medium text-[#0B1F3A] mb-2">Nenhum campo configurado</p>
        <p className="text-sm">
          Adicione campos personalizados para complementar o formulário de inscrição deste evento.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow divide-y">
      {sorted.map((field, index) => (
        <div key={field.id} className="p-4 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <p className="font-semibold text-[#0B1F3A]">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </p>
            <p className="text-sm text-gray-600">
              {fieldTypeLabel(field.type)}
              {field.placeholder ? ` · placeholder: ${field.placeholder}` : ''}
            </p>
            <p className="text-xs text-gray-400 mt-1">Posição {index + 1}</p>
            {field.options && field.options.length > 0 && (
              <p className="text-xs text-gray-500 mt-1">Opções: {field.options.join(', ')}</p>
            )}
          </div>

          {canEdit && (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busyId === field.id || index === 0}
                onClick={() => onMove(field, 'up')}
                className="px-3 py-1 text-sm border rounded-lg disabled:opacity-40"
              >
                ↑
              </button>
              <button
                type="button"
                disabled={busyId === field.id || index === sorted.length - 1}
                onClick={() => onMove(field, 'down')}
                className="px-3 py-1 text-sm border rounded-lg disabled:opacity-40"
              >
                ↓
              </button>
              <button
                type="button"
                disabled={busyId === field.id}
                onClick={() => onEdit(field)}
                className="px-3 py-1 text-sm border border-[#00C896] text-[#00C896] rounded-lg"
              >
                Editar
              </button>
              <button
                type="button"
                disabled={busyId === field.id}
                onClick={() => onDelete(field)}
                className="px-3 py-1 text-sm text-red-500 border border-red-200 rounded-lg"
              >
                Excluir
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
