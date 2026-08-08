'use client'

import { useState } from 'react'
import {
  FormField,
  FormFieldType,
  FIELD_TYPE_OPTIONS,
  optionsToText,
  parseOptionsText,
  typeRequiresOptions,
  typeUsesOptions
} from '@/lib/form-field-types'

export interface FormFieldDraft {
  label: string
  type: FormFieldType
  required: boolean
  placeholder: string
  optionsText: string
}

const emptyDraft = (): FormFieldDraft => ({
  label: '',
  type: 'text',
  required: false,
  placeholder: '',
  optionsText: ''
})

function draftFromField(initial?: FormField | null): FormFieldDraft {
  if (!initial) return emptyDraft()
  return {
    label: initial.label,
    type: initial.type,
    required: initial.required,
    placeholder: initial.placeholder ?? '',
    optionsText: optionsToText(initial.options)
  }
}

interface FormFieldEditorProps {
  open: boolean
  initial?: FormField | null
  saving: boolean
  onClose: () => void
  onSave: (draft: FormFieldDraft) => Promise<void>
}

function FormFieldEditorForm({
  initial,
  saving,
  onClose,
  onSave
}: Omit<FormFieldEditorProps, 'open'>) {
  const [draft, setDraft] = useState(() => draftFromField(initial))
  const showOptions = typeUsesOptions(draft.type)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onSave(draft)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6">
        <h3 className="text-xl font-bold text-[#0B1F3A] mb-4">
          {initial ? 'Editar campo' : 'Novo campo'}
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Label</label>
            <input
              required
              value={draft.label}
              onChange={(e) => setDraft({ ...draft, label: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="Ex: Nome da empresa"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
            <select
              value={draft.type}
              onChange={(e) => setDraft({ ...draft, type: e.target.value as FormFieldType })}
              className="w-full px-3 py-2 border rounded-lg"
            >
              {FIELD_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Placeholder</label>
            <input
              value={draft.placeholder}
              onChange={(e) => setDraft({ ...draft, placeholder: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="Opcional"
            />
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={draft.required}
              onChange={(e) => setDraft({ ...draft, required: e.target.checked })}
            />
            Campo obrigatório
          </label>

          {showOptions && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Opções (uma por linha)
                {typeRequiresOptions(draft.type) && <span className="text-red-500"> *</span>}
              </label>
              <textarea
                value={draft.optionsText}
                onChange={(e) => setDraft({ ...draft, optionsText: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg h-28"
                placeholder={'Opção A\nOpção B'}
                required={typeRequiresOptions(draft.type)}
              />
              {draft.type === 'checkbox' && (
                <p className="text-xs text-gray-500 mt-1">
                  Deixe vazio para um único checkbox (sim/não).
                </p>
              )}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="flex-1 py-2 border rounded-lg hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2 bg-[#00C896] text-white rounded-lg hover:bg-[#00a876] disabled:opacity-50"
            >
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export function FormFieldEditor({ open, initial, saving, onClose, onSave }: FormFieldEditorProps) {
  if (!open) return null
  return (
    <FormFieldEditorForm
      key={initial?.id ?? 'new'}
      initial={initial}
      saving={saving}
      onClose={onClose}
      onSave={onSave}
    />
  )
}

export function draftToPayload(draft: FormFieldDraft) {
  const options = typeUsesOptions(draft.type) ? parseOptionsText(draft.optionsText) : undefined
  return {
    label: draft.label.trim(),
    type: draft.type,
    required: draft.required,
    placeholder: draft.placeholder.trim() || undefined,
    options
  }
}
