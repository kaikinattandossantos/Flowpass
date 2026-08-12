'use client'

import { FormField } from '@/lib/form-field-types'

interface DynamicFormFieldsProps {
  fields: FormField[]
  values: Record<string, string | string[] | boolean>
  onChange: (fieldId: string, value: string | string[] | boolean) => void
  errors?: Record<string, string>
}

const inputClass =
  'w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00C896] outline-none'

export function DynamicFormFields({ fields, values, onChange, errors }: DynamicFormFieldsProps) {
  return (
    <>
      {fields.map((field) => {
        const error = errors?.[field.id]
        const options = field.options ?? []

        return (
          <div key={field.id}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </label>

            {field.type === 'textarea' ? (
              <textarea
                required={field.required}
                placeholder={field.placeholder ?? undefined}
                value={(values[field.id] as string) ?? ''}
                onChange={(e) => onChange(field.id, e.target.value)}
                className={`${inputClass} min-h-[96px]`}
              />
            ) : field.type === 'select' ? (
              <select
                required={field.required}
                value={(values[field.id] as string) ?? ''}
                onChange={(e) => onChange(field.id, e.target.value)}
                className={inputClass}
              >
                <option value="">Selecione...</option>
                {options.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            ) : field.type === 'multi_select' || (field.type === 'checkbox' && options.length > 0) ? (
              <div className="space-y-2">
                {options.map((opt) => {
                  const current = Array.isArray(values[field.id]) ? (values[field.id] as string[]) : []
                  const checked = current.includes(opt)
                  return (
                    <label key={opt} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          const next = e.target.checked
                            ? [...current, opt]
                            : current.filter((o) => o !== opt)
                          onChange(field.id, next)
                        }}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-600">{opt}</span>
                    </label>
                  )
                })}
              </div>
            ) : field.type === 'checkbox' ? (
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={values[field.id] === true}
                  onChange={(e) => onChange(field.id, e.target.checked)}
                  required={field.required}
                />
                <span className="text-sm text-gray-600">{field.placeholder || field.label}</span>
              </label>
            ) : (
              <input
                type={
                  field.type === 'number'
                    ? 'number'
                    : field.type === 'email'
                      ? 'email'
                      : field.type === 'phone'
                        ? 'tel'
                        : field.type === 'date'
                          ? 'date'
                          : 'text'
                }
                required={field.required}
                placeholder={field.placeholder ?? undefined}
                value={(values[field.id] as string) ?? ''}
                onChange={(e) => onChange(field.id, e.target.value)}
                className={inputClass}
              />
            )}

            {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
          </div>
        )
      })}
    </>
  )
}
