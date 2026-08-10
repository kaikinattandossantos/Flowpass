'use client'

import { FormField, fieldTypeLabel } from '@/lib/form-field-types'
import { FormLayoutEntry, resolveUnifiedFields } from '@/lib/field-layout'
import { type StructuralConfig } from '@/lib/structural-config'
import { DynamicFormFields } from '@/components/form-builder/DynamicFormFields'

interface FormBuilderPreviewProps {
  open: boolean
  formName: string
  structuralConfig: StructuralConfig
  formFields: FormField[]
  fieldLayout: FormLayoutEntry[]
  onClose: () => void
}

export function FormBuilderPreview({
  open,
  formName,
  structuralConfig,
  formFields,
  fieldLayout,
  onClose
}: FormBuilderPreviewProps) {
  if (!open) return null

  const unified = resolveUnifiedFields(structuralConfig, formFields, fieldLayout)
  const dynamicFields = unified
    .filter((field) => field.kind === 'custom')
    .map((field) => formFields.find((item) => item.id === field.id))
    .filter(Boolean) as FormField[]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white shadow-xl">
        <div className="sticky top-0 flex items-center justify-between border-b bg-white px-6 py-4">
          <div>
            <p className="text-sm text-gray-500">Visualizar formulário</p>
            <h2 className="text-xl font-bold text-[#0B1F3A]">{formName}</h2>
          </div>
          <button type="button" onClick={onClose} className="text-gray-500 hover:text-gray-700">Fechar</button>
        </div>

        <div className="p-6 space-y-6">
          {unified.map((field) => {
            if (field.kind === 'custom') return null

            return (
              <div key={field.key}>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {field.label} {field.required && <span className="text-red-500">*</span>}
                </label>
                <div className="rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-400">
                  {fieldTypeLabel(field.key === 'category' ? 'select' : field.key === 'email' ? 'email' : field.key === 'phone' ? 'phone' : field.key === 'cpf' ? 'cpf' : 'text')}
                </div>
              </div>
            )
          })}

          {dynamicFields.length > 0 && (
            <DynamicFormFields fields={dynamicFields} values={{}} onChange={() => {}} />
          )}

          <div className="w-full rounded-lg bg-[#00C896] py-3 text-center text-sm font-semibold text-white opacity-80">
            Enviar inscrição
          </div>
        </div>
      </div>
    </div>
  )
}
