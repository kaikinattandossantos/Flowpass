'use client'

import {
  DEFAULT_STRUCTURAL_CONFIG,
  STRUCTURAL_FIELD_LABELS,
  type StructuralConfig,
  type StructuralFieldKey
} from '@/lib/structural-config'

interface StructuralFieldsEditorProps {
  value: StructuralConfig
  onChange: (value: StructuralConfig) => void
  disabled?: boolean
}

export function StructuralFieldsEditor({ value, onChange, disabled }: StructuralFieldsEditorProps) {
  const updateField = (key: StructuralFieldKey, patch: Partial<{ enabled: boolean; required: boolean }>) => {
    const next = { ...value, [key]: { ...value[key], ...patch } }
    next.name = { enabled: true, required: true }
    onChange(next)
  }

  return (
    <div className="border rounded-lg divide-y">
      {(Object.keys(STRUCTURAL_FIELD_LABELS) as StructuralFieldKey[]).map((key) => {
        const field = value[key] ?? DEFAULT_STRUCTURAL_CONFIG[key]
        const locked = key === 'name'

        return (
          <div key={key} className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p className="font-medium text-[#0B1F3A]">{STRUCTURAL_FIELD_LABELS[key]}</p>
              <p className="text-xs text-gray-500">Campo estrutural do participante</p>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={field.enabled}
                  disabled={disabled || locked}
                  onChange={(e) => updateField(key, { enabled: e.target.checked, required: e.target.checked ? field.required : false })}
                />
                Exibir
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={field.required}
                  disabled={disabled || locked || !field.enabled}
                  onChange={(e) => updateField(key, { required: e.target.checked })}
                />
                Obrigatório
              </label>
            </div>
          </div>
        )
      })}
    </div>
  )
}
