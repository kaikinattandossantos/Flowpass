'use client'

import { useEffect, useState } from 'react'
import axios from 'axios'
import {
  type FormDesign,
  type DesignTheme,
  type BlockId,
  type Alignment,
  applyThemePreset,
  resetFormDesignToDefault,
  FORM_DESIGN_HEX_PATTERN
} from '@/lib/form-design'
import { validateHexColor } from '@/lib/form-appearance'
import { PublicFormRenderer } from '@/components/form-builder/PublicFormRenderer'
import { FormImageUpload } from '@/components/form-builder/FormImageUpload'
import { FormField } from '@/lib/form-field-types'
import { FormLayoutEntry, resolveUnifiedFields } from '@/lib/field-layout'
import { StructuralConfig } from '@/lib/structural-config'
import { API_URL, authHeaders } from '@/lib/api'

interface FormDesignTabProps {
  design: FormDesign
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
    design: FormDesign
    publicTitle: string
    publicDescription: string
    submitButtonText: string
  }) => void
}

interface FormAsset {
  url: string
  key: string
  contentType: string
}

const BLOCK_LABELS: Record<BlockId, string> = {
  logo: 'Logo',
  banner: 'Banner',
  header: 'Cabeçalho',
  form: 'Formulário',
  footer: 'Rodapé'
}

const THEME_OPTIONS: Array<{ id: DesignTheme; label: string }> = [
  { id: 'flowpass', label: 'FlowPass' },
  { id: 'light', label: 'Claro' },
  { id: 'dark', label: 'Escuro' },
  { id: 'custom', label: 'Personalizado' }
]

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
            validateHexColor(value) || FORM_DESIGN_HEX_PATTERN.test(value)
              ? 'border-gray-300'
              : 'border-red-400'
          }`}
        />
      </div>
    </div>
  )
}

function SectionCard({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="space-y-4 rounded-lg bg-white p-6 shadow">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-semibold text-[#0B1F3A]">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  )
}

function AlignmentPicker({
  label,
  value,
  disabled,
  onChange
}: {
  label: string
  value: Alignment
  disabled?: boolean
  onChange: (value: Alignment) => void
}) {
  const options: Array<{ id: Alignment; label: string }> = [
    { id: 'left', label: 'Esquerda' },
    { id: 'center', label: 'Centro' },
    { id: 'right', label: 'Direita' }
  ]
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700">{label}</label>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <button
            key={opt.id}
            type="button"
            disabled={disabled}
            onClick={() => onChange(opt.id)}
            className={`rounded-lg px-3 py-1.5 text-sm ${
              value === opt.id ? 'bg-[#0B1F3A] text-white' : 'bg-gray-100'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}

function AssetLibraryGrid({
  assets,
  disabled,
  onSelect
}: {
  assets: FormAsset[]
  disabled?: boolean
  onSelect: (url: string) => void
}) {
  if (assets.length === 0) return null
  return (
    <div>
      <p className="mb-2 text-sm font-medium text-gray-700">Biblioteca de imagens</p>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {assets.map((asset) => (
          <button
            key={asset.key}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(asset.url)}
            className="overflow-hidden rounded-lg border border-gray-200 bg-gray-50 p-1 hover:border-[#00C896] disabled:opacity-50"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={asset.url} alt="" className="aspect-square w-full object-cover" />
          </button>
        ))}
      </div>
    </div>
  )
}

export function FormDesignTab({
  design,
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
}: FormDesignTabProps) {
  const [mobileTab, setMobileTab] = useState<'edit' | 'preview'>('edit')
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop')
  const [assets, setAssets] = useState<FormAsset[]>([])

  const unifiedFields = resolveUnifiedFields(structuralConfig, formFields, fieldLayout)
  const displayTitle = publicTitle.trim() || formName
  const displayDescription = publicDescription || 'Faça sua inscrição preenchendo os dados abaixo.'
  const displaySubmit = submitButtonText.trim() || 'Finalizar inscrição'

  useEffect(() => {
    let cancelled = false
    void axios
      .get<{ assets: FormAsset[] }>(
        `${API_URL}/events/${eventId}/registration-forms/${formId}/assets`,
        { headers: authHeaders() }
      )
      .then((res) => {
        if (!cancelled) setAssets(res.data.assets ?? [])
      })
      .catch(() => {
        if (!cancelled) setAssets([])
      })
    return () => {
      cancelled = true
    }
  }, [eventId, formId])

  const patch = (partial: Partial<{
    design: FormDesign
    publicTitle: string
    publicDescription: string
    submitButtonText: string
  }>) => {
    onChange({
      design: partial.design ?? design,
      publicTitle: partial.publicTitle ?? publicTitle,
      publicDescription: partial.publicDescription ?? publicDescription,
      submitButtonText: partial.submitButtonText ?? submitButtonText
    })
  }

  const patchDesign = (partial: Partial<FormDesign>, markCustom = true) => {
    patch({
      design: {
        ...design,
        ...partial,
        theme: markCustom ? 'custom' : (partial.theme ?? design.theme)
      }
    })
  }

  const patchPage = (partial: Partial<FormDesign['page']>) => {
    patchDesign({ page: { ...design.page, ...partial } })
  }

  const patchLogo = (partial: Partial<FormDesign['logo']>) => {
    patchDesign({ logo: { ...design.logo, ...partial } })
  }

  const patchBanner = (partial: Partial<FormDesign['banner']>) => {
    patchDesign({ banner: { ...design.banner, ...partial } })
  }

  const patchHeader = (partial: Partial<FormDesign['header']>) => {
    patchDesign({ header: { ...design.header, ...partial } })
  }

  const patchCard = (partial: Partial<FormDesign['card']>) => {
    patchDesign({ card: { ...design.card, ...partial } })
  }

  const patchFields = (partial: Partial<FormDesign['fields']>) => {
    patchDesign({ fields: { ...design.fields, ...partial } })
  }

  const patchButton = (partial: Partial<FormDesign['button']>) => {
    patchDesign({ button: { ...design.button, ...partial } })
  }

  const patchFooter = (partial: Partial<FormDesign['footer']>) => {
    patchDesign({ footer: { ...design.footer, ...partial } })
  }

  const applyTheme = (theme: DesignTheme) => {
    if (theme === 'custom') {
      patchDesign({ theme: 'custom' }, false)
      return
    }
    patch({ design: applyThemePreset(theme, design) })
  }

  const moveBlock = (index: number, direction: -1 | 1) => {
    const next = [...design.blocks]
    const target = index + direction
    if (target < 0 || target >= next.length) return
    ;[next[index], next[target]] = [next[target], next[index]]
    patchDesign({ blocks: next })
  }

  const toggleBlockEnabled = (blockId: BlockId) => {
    if (blockId === 'form') return
    if (blockId === 'logo') patchLogo({ enabled: !design.logo.enabled })
    if (blockId === 'banner') patchBanner({ enabled: !design.banner.enabled })
    if (blockId === 'header') patchHeader({ enabled: !design.header.enabled })
    if (blockId === 'footer') patchFooter({ enabled: !design.footer.enabled })
  }

  const isBlockEnabled = (blockId: BlockId): boolean => {
    if (blockId === 'logo') return design.logo.enabled
    if (blockId === 'banner') return design.banner.enabled
    if (blockId === 'header') return design.header.enabled
    if (blockId === 'form') return true
    return design.footer.enabled
  }

  const editor = (
    <div className="space-y-6">
      <SectionCard title="TEMA">
        <div className="flex flex-wrap gap-2">
          {THEME_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              disabled={disabled}
              onClick={() => applyTheme(opt.id)}
              className={`rounded-lg px-3 py-1.5 text-sm ${
                design.theme === opt.id ? 'bg-[#0B1F3A] text-white' : 'bg-gray-100'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="PÁGINA">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            checked={design.page.background_type === 'color'}
            disabled={disabled}
            onChange={() => patchPage({ background_type: 'color', background_image_url: null })}
          />
          Cor
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            checked={design.page.background_type === 'image'}
            disabled={disabled}
            onChange={() => patchPage({ background_type: 'image' })}
          />
          Imagem
        </label>
        {design.page.background_type === 'color' ? (
          <ColorField
            label="Cor de fundo"
            value={design.page.background_color}
            disabled={disabled}
            onChange={(v) => patchPage({ background_color: v })}
          />
        ) : (
          <>
            <FormImageUpload
              label="Imagem de fundo"
              kind="background"
              value={design.page.background_image_url}
              eventId={eventId}
              formId={formId}
              disabled={disabled}
              onChange={(url) => patchPage({ background_image_url: url, background_type: url ? 'image' : 'color' })}
            />
            <AssetLibraryGrid
              assets={assets}
              disabled={disabled}
              onSelect={(url) => patchPage({ background_image_url: url, background_type: 'image' })}
            />
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Tamanho</label>
              <select
                value={design.page.background_size}
                disabled={disabled}
                onChange={(e) => patchPage({ background_size: e.target.value as FormDesign['page']['background_size'] })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
              >
                <option value="cover">Cobrir</option>
                <option value="contain">Conter</option>
                <option value="original">Original</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Posição</label>
              <select
                value={design.page.background_position}
                disabled={disabled}
                onChange={(e) => patchPage({ background_position: e.target.value as FormDesign['page']['background_position'] })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
              >
                <option value="center">Centro</option>
                <option value="top">Topo</option>
                <option value="bottom">Base</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Repetição</label>
              <select
                value={design.page.background_repeat}
                disabled={disabled}
                onChange={(e) => patchPage({ background_repeat: e.target.value as FormDesign['page']['background_repeat'] })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
              >
                <option value="no-repeat">Sem repetição</option>
                <option value="repeat">Repetir</option>
              </select>
            </div>
            <ColorField
              label="Cor da sobreposição"
              value={design.page.overlay_color}
              disabled={disabled}
              onChange={(v) => patchPage({ overlay_color: v })}
            />
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Opacidade da sobreposição: {design.page.overlay_opacity}%
              </label>
              <input
                type="range"
                min={0}
                max={100}
                value={design.page.overlay_opacity}
                disabled={disabled}
                onChange={(e) => patchPage({ overlay_opacity: Number.parseInt(e.target.value, 10) })}
                className="w-full"
              />
            </div>
          </>
        )}
      </SectionCard>

      <SectionCard title="IDENTIDADE">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={design.logo.enabled}
            disabled={disabled}
            onChange={() => patchLogo({ enabled: !design.logo.enabled })}
          />
          Exibir logo
        </label>
        <FormImageUpload
          label="Logo do formulário"
          kind="logo"
          value={design.logo.url}
          eventId={eventId}
          formId={formId}
          disabled={disabled}
          onChange={(url) => patchLogo({ url, enabled: url ? true : design.logo.enabled })}
        />
        <AssetLibraryGrid assets={assets} disabled={disabled} onSelect={(url) => patchLogo({ url, enabled: true })} />
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Tamanho</label>
          <select
            value={design.logo.size}
            disabled={disabled}
            onChange={(e) => patchLogo({ size: e.target.value as FormDesign['logo']['size'] })}
            className="w-full rounded-lg border border-gray-300 px-3 py-2"
          >
            <option value="small">Pequeno</option>
            <option value="medium">Médio</option>
            <option value="large">Grande</option>
            <option value="custom">Personalizado</option>
          </select>
        </div>
        {design.logo.size === 'custom' && (
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Largura: {design.logo.custom_width}px
            </label>
            <input
              type="range"
              min={80}
              max={320}
              value={design.logo.custom_width}
              disabled={disabled}
              onChange={(e) => patchLogo({ custom_width: Number.parseInt(e.target.value, 10) })}
              className="w-full"
            />
          </div>
        )}
        <AlignmentPicker
          label="Alinhamento da logo"
          value={design.logo.alignment}
          disabled={disabled}
          onChange={(v) => patchLogo({ alignment: v })}
        />
      </SectionCard>

      <SectionCard title="BANNER">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={design.banner.enabled}
            disabled={disabled}
            onChange={() => patchBanner({ enabled: !design.banner.enabled })}
          />
          Exibir banner
        </label>
        <FormImageUpload
          label="Imagem do banner"
          kind="banner"
          value={design.banner.url}
          eventId={eventId}
          formId={formId}
          disabled={disabled}
          onChange={(url) => patchBanner({ url, enabled: url ? true : design.banner.enabled })}
        />
        <AssetLibraryGrid assets={assets} disabled={disabled} onSelect={(url) => patchBanner({ url, enabled: true })} />
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Altura</label>
          <select
            value={design.banner.height}
            disabled={disabled}
            onChange={(e) => patchBanner({ height: e.target.value as FormDesign['banner']['height'] })}
            className="w-full rounded-lg border border-gray-300 px-3 py-2"
          >
            <option value="small">Pequena</option>
            <option value="medium">Média</option>
            <option value="large">Grande</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Ajuste</label>
          <select
            value={design.banner.fit}
            disabled={disabled}
            onChange={(e) => patchBanner({ fit: e.target.value as FormDesign['banner']['fit'] })}
            className="w-full rounded-lg border border-gray-300 px-3 py-2"
          >
            <option value="cover">Cobrir</option>
            <option value="contain">Conter</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Arredondamento</label>
          <select
            value={design.banner.radius}
            disabled={disabled}
            onChange={(e) => patchBanner({ radius: e.target.value as FormDesign['banner']['radius'] })}
            className="w-full rounded-lg border border-gray-300 px-3 py-2"
          >
            <option value="none">Nenhum</option>
            <option value="soft">Leve</option>
            <option value="medium">Médio</option>
          </select>
        </div>
      </SectionCard>

      <SectionCard title="CABEÇALHO">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={design.header.enabled}
            disabled={disabled}
            onChange={() => patchHeader({ enabled: !design.header.enabled })}
          />
          Exibir cabeçalho
        </label>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Título público</label>
          <input
            type="text"
            value={publicTitle}
            disabled={disabled}
            onChange={(e) => patch({ publicTitle: e.target.value, design: { ...design, theme: 'custom' } })}
            className="w-full rounded-lg border border-gray-300 px-3 py-2"
            placeholder={formName}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Descrição</label>
          <textarea
            value={publicDescription}
            disabled={disabled}
            onChange={(e) => patch({ publicDescription: e.target.value, design: { ...design, theme: 'custom' } })}
            rows={3}
            className="w-full rounded-lg border border-gray-300 px-3 py-2"
            placeholder="Faça sua inscrição preenchendo os dados abaixo."
          />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={design.header.title_visible}
            disabled={disabled}
            onChange={() => patchHeader({ title_visible: !design.header.title_visible })}
          />
          Exibir título
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={design.header.description_visible}
            disabled={disabled}
            onChange={() => patchHeader({ description_visible: !design.header.description_visible })}
          />
          Exibir descrição
        </label>
        <AlignmentPicker
          label="Alinhamento"
          value={design.header.alignment}
          disabled={disabled}
          onChange={(v) => patchHeader({ alignment: v })}
        />
        <ColorField label="Cor do título" value={design.header.title_color} disabled={disabled} onChange={(v) => patchHeader({ title_color: v })} />
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Tamanho do título</label>
          <select
            value={design.header.title_size}
            disabled={disabled}
            onChange={(e) => patchHeader({ title_size: e.target.value as FormDesign['header']['title_size'] })}
            className="w-full rounded-lg border border-gray-300 px-3 py-2"
          >
            <option value="sm">Pequeno</option>
            <option value="md">Médio</option>
            <option value="lg">Grande</option>
            <option value="xl">Extra grande</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Peso do título</label>
          <select
            value={design.header.title_weight}
            disabled={disabled}
            onChange={(e) => patchHeader({ title_weight: e.target.value as FormDesign['header']['title_weight'] })}
            className="w-full rounded-lg border border-gray-300 px-3 py-2"
          >
            <option value="normal">Normal</option>
            <option value="semibold">Semi-negrito</option>
            <option value="bold">Negrito</option>
          </select>
        </div>
        <ColorField label="Cor da descrição" value={design.header.description_color} disabled={disabled} onChange={(v) => patchHeader({ description_color: v })} />
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Tamanho da descrição</label>
          <select
            value={design.header.description_size}
            disabled={disabled}
            onChange={(e) => patchHeader({ description_size: e.target.value as FormDesign['header']['description_size'] })}
            className="w-full rounded-lg border border-gray-300 px-3 py-2"
          >
            <option value="sm">Pequeno</option>
            <option value="md">Médio</option>
            <option value="lg">Grande</option>
          </select>
        </div>
      </SectionCard>

      <SectionCard title="BLOCOS">
        <p className="text-sm text-gray-500">Reordene e controle a visibilidade dos blocos da página.</p>
        <div className="space-y-2">
          {design.blocks.map((blockId, index) => (
            <div key={blockId} className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-gray-800">{BLOCK_LABELS[blockId]}</span>
                {blockId !== 'form' && (
                  <label className="flex items-center gap-1 text-xs text-gray-600">
                    <input
                      type="checkbox"
                      checked={isBlockEnabled(blockId)}
                      disabled={disabled}
                      onChange={() => toggleBlockEnabled(blockId)}
                    />
                    Visível
                  </label>
                )}
              </div>
              <div className="flex gap-1">
                <button
                  type="button"
                  disabled={disabled || index === 0}
                  onClick={() => moveBlock(index, -1)}
                  className="rounded border px-2 py-1 text-xs disabled:opacity-40"
                >
                  ↑
                </button>
                <button
                  type="button"
                  disabled={disabled || index === design.blocks.length - 1}
                  onClick={() => moveBlock(index, 1)}
                  className="rounded border px-2 py-1 text-xs disabled:opacity-40"
                >
                  ↓
                </button>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="FORMULÁRIO">
        <ColorField label="Cor de fundo" value={design.card.background_color} disabled={disabled} onChange={(v) => patchCard({ background_color: v })} />
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Opacidade: {design.card.opacity}%</label>
          <input
            type="range"
            min={40}
            max={100}
            value={design.card.opacity}
            disabled={disabled}
            onChange={(e) => patchCard({ opacity: Number.parseInt(e.target.value, 10) })}
            className="w-full"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Borda</label>
          <select
            value={design.card.border}
            disabled={disabled}
            onChange={(e) => patchCard({ border: e.target.value as FormDesign['card']['border'] })}
            className="w-full rounded-lg border border-gray-300 px-3 py-2"
          >
            <option value="none">Nenhuma</option>
            <option value="thin">Fina</option>
            <option value="medium">Média</option>
          </select>
        </div>
        {design.card.border !== 'none' && (
          <ColorField label="Cor da borda" value={design.card.border_color} disabled={disabled} onChange={(v) => patchCard({ border_color: v })} />
        )}
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Arredondamento</label>
          <select
            value={design.card.radius}
            disabled={disabled}
            onChange={(e) => patchCard({ radius: e.target.value as FormDesign['card']['radius'] })}
            className="w-full rounded-lg border border-gray-300 px-3 py-2"
          >
            <option value="none">Nenhum</option>
            <option value="soft">Leve</option>
            <option value="medium">Médio</option>
            <option value="large">Grande</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Sombra</label>
          <select
            value={design.card.shadow}
            disabled={disabled}
            onChange={(e) => patchCard({ shadow: e.target.value as FormDesign['card']['shadow'] })}
            className="w-full rounded-lg border border-gray-300 px-3 py-2"
          >
            <option value="none">Nenhuma</option>
            <option value="soft">Leve</option>
            <option value="medium">Média</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Largura</label>
          <select
            value={design.card.width}
            disabled={disabled}
            onChange={(e) => patchCard({ width: e.target.value as FormDesign['card']['width'] })}
            className="w-full rounded-lg border border-gray-300 px-3 py-2"
          >
            <option value="compact">Compacta</option>
            <option value="normal">Normal</option>
            <option value="wide">Larga</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Padding</label>
          <select
            value={design.card.padding}
            disabled={disabled}
            onChange={(e) => patchCard({ padding: e.target.value as FormDesign['card']['padding'] })}
            className="w-full rounded-lg border border-gray-300 px-3 py-2"
          >
            <option value="compact">Compacto</option>
            <option value="normal">Normal</option>
            <option value="comfortable">Confortável</option>
          </select>
        </div>
      </SectionCard>

      <SectionCard title="CAMPOS">
        <ColorField label="Fundo" value={design.fields.background_color} disabled={disabled} onChange={(v) => patchFields({ background_color: v })} />
        <ColorField label="Texto" value={design.fields.text_color} disabled={disabled} onChange={(v) => patchFields({ text_color: v })} />
        <ColorField label="Placeholder" value={design.fields.placeholder_color} disabled={disabled} onChange={(v) => patchFields({ placeholder_color: v })} />
        <ColorField label="Borda" value={design.fields.border_color} disabled={disabled} onChange={(v) => patchFields({ border_color: v })} />
        <ColorField label="Foco" value={design.fields.focus_color} disabled={disabled} onChange={(v) => patchFields({ focus_color: v })} />
        <ColorField label="Rótulo" value={design.fields.label_color} disabled={disabled} onChange={(v) => patchFields({ label_color: v })} />
        <ColorField label="Obrigatório" value={design.fields.required_color} disabled={disabled} onChange={(v) => patchFields({ required_color: v })} />
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Arredondamento: {design.fields.radius}px</label>
          <input
            type="range"
            min={0}
            max={24}
            value={design.fields.radius}
            disabled={disabled}
            onChange={(e) => patchFields({ radius: Number.parseInt(e.target.value, 10) })}
            className="w-full"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Altura</label>
          <select
            value={design.fields.height}
            disabled={disabled}
            onChange={(e) => patchFields({ height: e.target.value as FormDesign['fields']['height'] })}
            className="w-full rounded-lg border border-gray-300 px-3 py-2"
          >
            <option value="compact">Compacta</option>
            <option value="normal">Normal</option>
            <option value="large">Grande</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Tamanho do rótulo</label>
          <select
            value={design.fields.label_size}
            disabled={disabled}
            onChange={(e) => patchFields({ label_size: e.target.value as FormDesign['fields']['label_size'] })}
            className="w-full rounded-lg border border-gray-300 px-3 py-2"
          >
            <option value="sm">Pequeno</option>
            <option value="md">Médio</option>
            <option value="lg">Grande</option>
          </select>
        </div>
      </SectionCard>

      <SectionCard title="BOTÃO">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Texto</label>
          <input
            type="text"
            value={submitButtonText}
            disabled={disabled}
            onChange={(e) => patch({ submitButtonText: e.target.value, design: { ...design, theme: 'custom' } })}
            placeholder="Finalizar inscrição"
            className="w-full rounded-lg border border-gray-300 px-3 py-2"
          />
        </div>
        <ColorField label="Cor de fundo" value={design.button.background_color} disabled={disabled} onChange={(v) => patchButton({ background_color: v })} />
        <ColorField label="Cor do texto" value={design.button.text_color} disabled={disabled} onChange={(v) => patchButton({ text_color: v })} />
        <ColorField label="Cor hover" value={design.button.hover_color} disabled={disabled} onChange={(v) => patchButton({ hover_color: v })} />
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Arredondamento</label>
          <select
            value={design.button.radius}
            disabled={disabled}
            onChange={(e) => patchButton({ radius: e.target.value as FormDesign['button']['radius'] })}
            className="w-full rounded-lg border border-gray-300 px-3 py-2"
          >
            <option value="soft">Leve</option>
            <option value="medium">Médio</option>
            <option value="large">Grande</option>
            <option value="pill">Pílula</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Tamanho</label>
          <select
            value={design.button.size}
            disabled={disabled}
            onChange={(e) => patchButton({ size: e.target.value as FormDesign['button']['size'] })}
            className="w-full rounded-lg border border-gray-300 px-3 py-2"
          >
            <option value="normal">Normal</option>
            <option value="large">Grande</option>
          </select>
        </div>
        <div className="flex flex-wrap gap-4 text-sm">
          <label className="flex items-center gap-2">
            <input type="radio" checked={design.button.width === 'auto'} disabled={disabled} onChange={() => patchButton({ width: 'auto' })} />
            Automática
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" checked={design.button.width === 'full'} disabled={disabled} onChange={() => patchButton({ width: 'full' })} />
            Largura total
          </label>
        </div>
        <AlignmentPicker
          label="Alinhamento"
          value={design.button.alignment}
          disabled={disabled}
          onChange={(v) => patchButton({ alignment: v })}
        />
      </SectionCard>

      <SectionCard title="RODAPÉ">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={design.footer.enabled}
            disabled={disabled}
            onChange={() => patchFooter({ enabled: !design.footer.enabled })}
          />
          Exibir rodapé
        </label>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Texto</label>
          <textarea
            value={design.footer.text}
            disabled={disabled}
            onChange={(e) => patchFooter({ text: e.target.value })}
            rows={2}
            className="w-full rounded-lg border border-gray-300 px-3 py-2"
            placeholder="Texto opcional do rodapé"
          />
        </div>
        <ColorField label="Cor" value={design.footer.color} disabled={disabled} onChange={(v) => patchFooter({ color: v })} />
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Tamanho</label>
          <select
            value={design.footer.size}
            disabled={disabled}
            onChange={(e) => patchFooter({ size: e.target.value as FormDesign['footer']['size'] })}
            className="w-full rounded-lg border border-gray-300 px-3 py-2"
          >
            <option value="sm">Pequeno</option>
            <option value="md">Médio</option>
            <option value="lg">Grande</option>
          </select>
        </div>
        <AlignmentPicker
          label="Alinhamento"
          value={design.footer.alignment}
          disabled={disabled}
          onChange={(v) => patchFooter({ alignment: v })}
        />
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={design.footer.show_powered_by}
            disabled={disabled}
            onChange={() => patchFooter({ show_powered_by: !design.footer.show_powered_by })}
          />
          Exibir &quot;Powered by FlowPass&quot;
        </label>
      </SectionCard>

      <div className="flex justify-end">
        <button
          type="button"
          disabled={disabled}
          onClick={() => patch({ design: resetFormDesignToDefault() })}
          className="text-sm text-[#00C896]"
        >
          Restaurar padrão FlowPass
        </button>
      </div>
    </div>
  )

  const preview = (
    <section className="space-y-4 xl:sticky xl:top-28 xl:self-start">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-[#0B1F3A]">Preview</h2>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setPreviewMode('desktop')}
            className={`rounded-lg px-3 py-1.5 text-sm ${previewMode === 'desktop' ? 'bg-[#0B1F3A] text-white' : 'bg-gray-100'}`}
          >
            Desktop
          </button>
          <button
            type="button"
            onClick={() => setPreviewMode('mobile')}
            className={`rounded-lg px-3 py-1.5 text-sm ${previewMode === 'mobile' ? 'bg-[#0B1F3A] text-white' : 'bg-gray-100'}`}
          >
            Mobile
          </button>
        </div>
      </div>
      <div
        className="overflow-hidden rounded-lg border bg-gray-100"
        style={previewMode === 'mobile' ? { maxWidth: 390, margin: '0 auto' } : undefined}
      >
        <PublicFormRenderer
          preview
          mobile={previewMode === 'mobile'}
          design={design}
          eventName={eventName}
          formTitle={displayTitle}
          formDescription={displayDescription}
          submitLabel={displaySubmit}
          unifiedFields={unifiedFields}
          formFields={formFields}
          categories={categories.length > 0 ? categories : [{ id: 'preview', name: 'Geral' }]}
          selectedCategory={categories[0]?.id ?? 'preview'}
        />
      </div>
    </section>
  )

  return (
    <div>
      <div className="mb-4 flex gap-2 lg:hidden">
        <button
          type="button"
          onClick={() => setMobileTab('edit')}
          className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium ${
            mobileTab === 'edit' ? 'bg-[#0B1F3A] text-white' : 'bg-gray-100'
          }`}
        >
          Editar
        </button>
        <button
          type="button"
          onClick={() => setMobileTab('preview')}
          className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium ${
            mobileTab === 'preview' ? 'bg-[#0B1F3A] text-white' : 'bg-gray-100'
          }`}
        >
          Preview
        </button>
      </div>

      <div className="grid gap-8 xl:grid-cols-2">
        <div className={mobileTab === 'preview' ? 'hidden xl:block' : undefined}>{editor}</div>
        <div className={mobileTab === 'edit' ? 'hidden xl:block' : undefined}>{preview}</div>
      </div>
    </div>
  )
}
