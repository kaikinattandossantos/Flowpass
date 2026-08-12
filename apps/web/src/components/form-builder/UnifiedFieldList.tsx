'use client'

import { useState } from 'react'
import { FormField, fieldTypeLabel } from '@/lib/form-field-types'
import {
  FormLayoutEntry,
  resolveBuilderFields,
  structuralFieldTypeLabel,
  type UnifiedFormField
} from '@/lib/field-layout'
import { type StructuralConfig, type StructuralFieldKey } from '@/lib/structural-config'

export type FieldListItem =
  | { kind: 'structural'; key: StructuralFieldKey; unified: Extract<UnifiedFormField, { kind: 'structural' }> }
  | { kind: 'custom'; field: FormField; unified: Extract<UnifiedFormField, { kind: 'custom' }> }

interface UnifiedFieldListProps {
  structuralConfig: StructuralConfig
  formFields: FormField[]
  fieldLayout: FormLayoutEntry[]
  canEdit: boolean
  onLayoutChange: (layout: FormLayoutEntry[]) => void
  onEditStructural: (key: StructuralFieldKey) => void
  onEditCustom: (field: FormField) => void
}

function buildItems(
  structuralConfig: StructuralConfig,
  formFields: FormField[],
  fieldLayout: FormLayoutEntry[]
): FieldListItem[] {
  const unified = resolveBuilderFields(structuralConfig, formFields, fieldLayout)
  const fieldMap = new Map(formFields.map((field) => [field.id, field]))

  return unified.map((item) => {
    if (item.kind === 'structural') {
      return { kind: 'structural', key: item.key, unified: item }
    }
    const field = fieldMap.get(item.id)
    if (!field) return null
    return { kind: 'custom', field, unified: item }
  }).filter(Boolean) as FieldListItem[]
}

function VisibilityBadge({ enabled }: { enabled: boolean }) {
  if (enabled) {
    return (
      <span className="rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-800">
        Exibido
      </span>
    )
  }
  return (
    <span className="rounded-full border border-gray-300 bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
      Não exibido
    </span>
  )
}

export function UnifiedFieldList({
  structuralConfig,
  formFields,
  fieldLayout,
  canEdit,
  onLayoutChange,
  onEditStructural,
  onEditCustom
}: UnifiedFieldListProps) {
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const items = buildItems(structuralConfig, formFields, fieldLayout)

  const reorder = (from: number, to: number) => {
    if (from === to || from < 0 || to < 0 || from >= items.length || to >= items.length) return

    const nextLayout = [...fieldLayout]
    const fromEntry = items[from]
    const toEntry = items[to]

    const fromLayoutIndex = nextLayout.findIndex((entry) =>
      fromEntry.kind === 'structural'
        ? entry.kind === 'structural' && entry.key === fromEntry.key
        : entry.kind === 'custom' && entry.field_id === fromEntry.field.id
    )
    const toLayoutIndex = nextLayout.findIndex((entry) =>
      toEntry.kind === 'structural'
        ? entry.kind === 'structural' && entry.key === toEntry.key
        : entry.kind === 'custom' && entry.field_id === toEntry.field.id
    )

    if (fromLayoutIndex < 0 || toLayoutIndex < 0) return
    const [moved] = nextLayout.splice(fromLayoutIndex, 1)
    nextLayout.splice(toLayoutIndex, 0, moved)
    onLayoutChange(nextLayout)
  }

  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500">
        Nenhum campo configurado. Adicione campos personalizados para complementar o formulário.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {items.map((item, index) => {
        const label = item.unified.label
        const required = item.unified.required
        const enabled = item.unified.enabled
        const typeLabel = item.kind === 'structural'
          ? structuralFieldTypeLabel(item.key)
          : fieldTypeLabel(item.field.type)

        return (
          <div
            key={item.kind === 'structural' ? `s-${item.key}` : `c-${item.field.id}`}
            draggable={canEdit}
            onDragStart={() => setDragIndex(index)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => {
              if (dragIndex !== null) reorder(dragIndex, index)
              setDragIndex(null)
            }}
            onDragEnd={() => setDragIndex(null)}
            className={`flex items-center gap-3 rounded-lg border p-4 transition ${
              enabled
                ? 'border-gray-200 bg-white shadow-sm'
                : 'border-gray-200/80 bg-gray-50/90 opacity-90'
            } ${dragIndex === index ? 'border-[#00C896] ring-2 ring-[#00C896]/20' : ''}`}
          >
            {canEdit && (
              <button
                type="button"
                aria-label="Arrastar campo"
                className="cursor-grab px-1 text-gray-400 hover:text-gray-600"
              >
                ☰
              </button>
            )}

            <button
              type="button"
              onClick={() => item.kind === 'structural' ? onEditStructural(item.key) : onEditCustom(item.field)}
              className="flex flex-1 items-center gap-3 text-left"
            >
              <div className="min-w-0 flex-1">
                <div className={`font-medium ${enabled ? 'text-[#0B1F3A]' : 'text-gray-600'}`}>
                  {label}
                </div>
                <div className={`text-sm ${enabled ? 'text-gray-500' : 'text-gray-400'}`}>
                  {typeLabel} · {required ? 'Obrigatório' : 'Opcional'}
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <VisibilityBadge enabled={enabled} />
                <span className="text-gray-400" aria-hidden="true">&gt;</span>
              </div>
            </button>
          </div>
        )
      })}
    </div>
  )
}
