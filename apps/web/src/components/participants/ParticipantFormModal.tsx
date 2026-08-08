'use client'

import { useState } from 'react'
import { FormField, sortFormFields } from '@/lib/form-field-types'
import { DynamicFormFields } from '@/components/form-builder/DynamicFormFields'
import { STATUS_LABELS } from '@/lib/participant-labels'

export interface ParticipantFormValues {
  name: string
  email: string
  phone: string
  cpf: string
  category_id: string
  status: 'pending' | 'confirmed' | 'cancelled'
  form_data: Record<string, string | string[] | boolean>
}

interface Category {
  id: string
  name: string
}

interface ParticipantFormModalProps {
  open: boolean
  categories: Category[]
  formFields: FormField[]
  initial?: Partial<ParticipantFormValues> & { id?: string }
  saving: boolean
  onClose: () => void
  onSave: (values: ParticipantFormValues) => Promise<void>
}

const emptyValues = (categoryId: string): ParticipantFormValues => ({
  name: '',
  email: '',
  phone: '',
  cpf: '',
  category_id: categoryId,
  status: 'confirmed',
  form_data: {}
})

function draftFromInitial(
  initial: ParticipantFormModalProps['initial'],
  categoryId: string
): ParticipantFormValues {
  return {
    ...emptyValues(initial?.category_id ?? categoryId),
    ...initial,
    form_data: initial?.form_data ?? {}
  }
}

function ParticipantFormModalInner({
  categories,
  formFields,
  initial,
  saving,
  onClose,
  onSave
}: Omit<ParticipantFormModalProps, 'open'>) {
  const defaultCategory = initial?.category_id ?? categories[0]?.id ?? ''
  const [values, setValues] = useState(() => draftFromInitial(initial, defaultCategory))
  const sortedFields = sortFormFields(formFields)
  const isEdit = !!initial?.id

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onSave(values)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
        <h3 className="text-xl font-bold text-[#0B1F3A] mb-4">
          {isEdit ? 'Editar participante' : 'Novo participante'}
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome completo *</label>
              <input
                required
                value={values.name}
                onChange={(e) => setValues({ ...values, name: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">E-mail *</label>
              <input
                type="email"
                required
                value={values.email}
                onChange={(e) => setValues({ ...values, email: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
              <input
                value={values.phone}
                onChange={(e) => setValues({ ...values, phone: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">CPF</label>
              <input
                value={values.cpf}
                onChange={(e) => setValues({ ...values, cpf: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                placeholder="000.000.000-00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Categoria *</label>
              <select
                required
                value={values.category_id}
                onChange={(e) => setValues({ ...values, category_id: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={values.status}
                onChange={(e) =>
                  setValues({ ...values, status: e.target.value as ParticipantFormValues['status'] })
                }
                className="w-full px-3 py-2 border rounded-lg"
              >
                {Object.entries(STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
          </div>

          {sortedFields.length > 0 && (
            <div className="border-t pt-4 space-y-4">
              <p className="text-sm font-medium text-gray-700">Campos personalizados</p>
              <DynamicFormFields
                fields={sortedFields}
                values={values.form_data}
                onChange={(fieldId, value) =>
                  setValues({
                    ...values,
                    form_data: { ...values.form_data, [fieldId]: value }
                  })
                }
              />
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} disabled={saving} className="flex-1 py-2 border rounded-lg">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2 bg-[#00C896] text-white rounded-lg disabled:opacity-50"
            >
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export function ParticipantFormModalKeyed({ open, initial, ...rest }: ParticipantFormModalProps) {
  if (!open) return null
  return <ParticipantFormModalInner key={initial?.id ?? 'new'} initial={initial} {...rest} />
}
