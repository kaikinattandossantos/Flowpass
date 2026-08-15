'use client'

import { useState } from 'react'
import {
  FormAppearance,
  validateHexColor,
  resetFormAppearanceToDefault,
  DEFAULT_FORM_APPEARANCE
} from '@/lib/form-appearance'
import { PublicRegistrationFormView } from '@/components/form-builder/PublicRegistrationFormView'
import { FormImageUpload } from '@/components/form-builder/FormImageUpload'
import { FormField } from '@/lib/form-field-types'
import { FormLayoutEntry, resolveUnifiedFields } from '@/lib/field-layout'
import { StructuralConfig } from '@/lib/structural-config'

interface FormAppearanceTabProps {
  appearance: FormAppearance
  publicTitle: string
  publicDescription: string
  submitButtonText: string
  formName: string
  eventName: string
  eventId: string
  formId: string
  structuralConfig: StructuralConfig
  formFields: FormField[]
  fieldLayout: FormLayoutEntry[]
  categories: Array<{ id: string; name: string }>
  disabled?: boolean
  onChange: (values: {
    appearance: FormAppearance
    publicTitle: string
    publicDescription: string
    submitButtonText: string
  }) => void
}

function ColorField({
  label,
  value,
  disabled,
  onChange
}: {
  label: string
  value: string
  disabled?: boolean
  onChange: (value: string) => void
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700">{label}</label>
      <div className="flex items-center gap-3">
        <input
          type="color"
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          className="h-10 w-14 cursor-pointer rounded border border-gray-300"
        />
        <input
          type="text"
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          className={`w-32 rounded-lg border px-3 py-2 font-mono text-sm ${
            validateHexColor(value) ? 'border-gray-300' : 'border-red-400'
          }`}
        />
      </div>
    </div>
  )
}

export function FormAppearanceTab({
  appearance,
  publicTitle,
  publicDescription,
  submitButtonText,
  formName,
  eventName,
  eventId,
  formId,
  structuralConfig,
  formFields,
  fieldLayout,
  categories,
  disabled,
  onChange
}: FormAppearanceTabProps) {
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop')
  const unifiedFields = resolveUnifiedFields(structuralConfig, formFields, fieldLayout)
  const displayTitle = publicTitle.trim() || formName

  const patch = (partial: Partial<{
    appearance: FormAppearance
    publicTitle: string
    publicDescription: string
    submitButtonText: string
  }>) => {
    onChange({
      appearance: { ...(partial.appearance ?? appearance), version: 2 },
      publicTitle: partial.publicTitle ?? publicTitle,
      publicDescription: partial.publicDescription ?? publicDescription,
      submitButtonText: partial.submitButtonText ?? submitButtonText
    })
  }

  const patchAppearance = (partial: Partial<FormAppearance>) => {
    patch({ appearance: { ...appearance, ...partial, version: 2 } })
  }

  return (
    <div className="grid gap-8 xl:grid-cols-2">
      <div className="space-y-6">
        <section className="space-y-4 rounded-lg bg-white p-6 shadow">
          <h2 className="font-semibold text-[#0B1F3A]">Logo</h2>
          <FormImageUpload
            label="Logo do formulário"
            kind="logo"
            value={appearance.logo_url}
            eventId={eventId}
            formId={formId}
            disabled={disabled}
            onChange={(url) => patchAppearance({ logo_url: url })}
          />
        </section>

        <section className="space-y-4 rounded-lg bg-white p-6 shadow">
          <h2 className="font-semibold text-[#0B1F3A]">Fundo</h2>
          <label className="flex items-center gap-2 text-sm">
            <input type="radio" checked={appearance.background_type === 'color'} disabled={disabled} onChange={() => patchAppearance({ background_type: 'color', background_image_url: null })} />
            Cor
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="radio" checked={appearance.background_type === 'image'} disabled={disabled} onChange={() => patchAppearance({ background_type: 'image' })} />
            Imagem
          </label>
          {appearance.background_type === 'color' ? (
            <ColorField label="Cor de fundo" value={appearance.background_color} disabled={disabled} onChange={(v) => patchAppearance({ background_color: v })} />
          ) : (
            <>
              <FormImageUpload label="Imagem de fundo" kind="background" value={appearance.background_image_url} eventId={eventId} formId={formId} disabled={disabled} onChange={(url) => patchAppearance({ background_image_url: url })} />
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Ajuste da imagem</label>
                <select value={appearance.background_fit} disabled={disabled} onChange={(e) => patchAppearance({ background_fit: e.target.value as FormAppearance['background_fit'] })} className="w-full rounded-lg border border-gray-300 px-3 py-2">
                  <option value="cover">Cobrir tela</option>
                  <option value="contain">Conter</option>
                  <option value="repeat">Repetir</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Sobreposição do fundo: {appearance.background_overlay}%</label>
                <input type="range" min={0} max={100} value={appearance.background_overlay} disabled={disabled} onChange={(e) => patchAppearance({ background_overlay: Number.parseInt(e.target.value, 10) })} className="w-full" />
              </div>
            </>
          )}
        </section>

        <section className="space-y-4 rounded-lg bg-white p-6 shadow">
          <h2 className="font-semibold text-[#0B1F3A]">Card</h2>
          <ColorField label="Cor" value={appearance.card_color} disabled={disabled} onChange={(v) => patchAppearance({ card_color: v })} />
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Transparência: {appearance.card_opacity}%</label>
            <input type="range" min={40} max={100} value={appearance.card_opacity} disabled={disabled} onChange={(e) => patchAppearance({ card_opacity: Number.parseInt(e.target.value, 10) })} className="w-full" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Arredondamento: {appearance.card_radius}px</label>
            <input type="range" min={0} max={32} value={appearance.card_radius} disabled={disabled} onChange={(e) => patchAppearance({ card_radius: Number.parseInt(e.target.value, 10) })} className="w-full" />
          </div>
          <div className="flex gap-4 text-sm">
            <label className="flex items-center gap-2"><input type="radio" checked={appearance.card_width === 'normal'} disabled={disabled} onChange={() => patchAppearance({ card_width: 'normal' })} />Normal</label>
            <label className="flex items-center gap-2"><input type="radio" checked={appearance.card_width === 'wide'} disabled={disabled} onChange={() => patchAppearance({ card_width: 'wide' })} />Largo</label>
          </div>
        </section>

        <section className="space-y-4 rounded-lg bg-white p-6 shadow">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-[#0B1F3A]">Cores</h2>
            <button type="button" disabled={disabled} onClick={() => patchAppearance({ ...resetFormAppearanceToDefault(), version: 2 })} className="text-sm text-[#00C896]">Restaurar padrão FlowPass</button>
          </div>
          <ColorField label="Cor principal" value={appearance.primary_color} disabled={disabled} onChange={(v) => patchAppearance({ primary_color: v })} />
          <ColorField label="Texto principal" value={appearance.text_color} disabled={disabled} onChange={(v) => patchAppearance({ text_color: v })} />
          <ColorField label="Texto secundário" value={appearance.secondary_text_color} disabled={disabled} onChange={(v) => patchAppearance({ secondary_text_color: v })} />
          <ColorField label="Campos/bordas" value={appearance.border_color} disabled={disabled} onChange={(v) => patchAppearance({ border_color: v })} />
          <ColorField label="Botão" value={appearance.button_color} disabled={disabled} onChange={(v) => patchAppearance({ button_color: v })} />
          <ColorField label="Texto do botão" value={appearance.button_text_color} disabled={disabled} onChange={(v) => patchAppearance({ button_text_color: v })} />
        </section>

        <section className="space-y-4 rounded-lg bg-white p-6 shadow">
          <h2 className="font-semibold text-[#0B1F3A]">Conteúdo</h2>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Título público</label>
            <input type="text" value={publicTitle} disabled={disabled} onChange={(e) => patch({ publicTitle: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2" placeholder={formName} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Descrição</label>
            <textarea value={publicDescription} disabled={disabled} onChange={(e) => patch({ publicDescription: e.target.value })} rows={3} className="w-full rounded-lg border border-gray-300 px-3 py-2" placeholder="Faça sua inscrição preenchendo os dados abaixo." />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Alinhamento</label>
            <div className="flex gap-2">
              <button type="button" disabled={disabled} onClick={() => patchAppearance({ alignment: 'left' })} className={`rounded-lg px-3 py-1.5 text-sm ${appearance.alignment === 'left' ? 'bg-[#0B1F3A] text-white' : 'bg-gray-100'}`}>Esquerda</button>
              <button type="button" disabled={disabled} onClick={() => patchAppearance({ alignment: 'center' })} className={`rounded-lg px-3 py-1.5 text-sm ${appearance.alignment === 'center' ? 'bg-[#0B1F3A] text-white' : 'bg-gray-100'}`}>Centro</button>
            </div>
          </div>
        </section>

        <section className="space-y-4 rounded-lg bg-white p-6 shadow">
          <h2 className="font-semibold text-[#0B1F3A]">Botão</h2>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Texto</label>
            <input type="text" value={submitButtonText} disabled={disabled} onChange={(e) => patch({ submitButtonText: e.target.value })} placeholder="Finalizar inscrição" className="w-full rounded-lg border border-gray-300 px-3 py-2" />
          </div>
          <div className="flex flex-wrap gap-4 text-sm">
            <label className="flex items-center gap-2"><input type="radio" checked={appearance.button_radius === 'soft'} disabled={disabled} onChange={() => patchAppearance({ button_radius: 'soft' })} />Levemente arredondado</label>
            <label className="flex items-center gap-2"><input type="radio" checked={appearance.button_radius === 'rounded'} disabled={disabled} onChange={() => patchAppearance({ button_radius: 'rounded' })} />Arredondado</label>
          </div>
          <div className="flex gap-4 text-sm">
            <label className="flex items-center gap-2"><input type="radio" checked={appearance.button_width === 'auto'} disabled={disabled} onChange={() => patchAppearance({ button_width: 'auto' })} />Automática</label>
            <label className="flex items-center gap-2"><input type="radio" checked={appearance.button_width === 'full'} disabled={disabled} onChange={() => patchAppearance({ button_width: 'full' })} />Largura total</label>
          </div>
        </section>
      </div>

      <section className="space-y-4 xl:sticky xl:top-28 xl:self-start">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-[#0B1F3A]">Preview</h2>
          <div className="flex gap-2">
            <button type="button" onClick={() => setPreviewMode('desktop')} className={`rounded-lg px-3 py-1.5 text-sm ${previewMode === 'desktop' ? 'bg-[#0B1F3A] text-white' : 'bg-gray-100'}`}>Desktop</button>
            <button type="button" onClick={() => setPreviewMode('mobile')} className={`rounded-lg px-3 py-1.5 text-sm ${previewMode === 'mobile' ? 'bg-[#0B1F3A] text-white' : 'bg-gray-100'}`}>Mobile</button>
          </div>
        </div>
        <div className="overflow-hidden rounded-lg border bg-gray-100 p-4" style={previewMode === 'mobile' ? { maxWidth: 390, margin: '0 auto' } : undefined}>
          <PublicRegistrationFormView
            preview
            mobile={previewMode === 'mobile'}
            rawAppearance={{ version: 2, ...appearance }}
            eventName={eventName}
            formTitle={displayTitle}
            formDescription={publicDescription || 'Faça sua inscrição preenchendo os dados abaixo.'}
            submitLabel={submitButtonText.trim() || 'Finalizar inscrição'}
            appearance={{ ...DEFAULT_FORM_APPEARANCE, ...appearance, version: 2 }}
            unifiedFields={unifiedFields}
            formFields={formFields}
            categories={categories.length > 0 ? categories : [{ id: 'preview', name: 'Geral' }]}
            selectedCategory={categories[0]?.id ?? 'preview'}
          />
        </div>
      </section>
    </div>
  )
}
