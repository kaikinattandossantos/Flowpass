'use client'

import { useState, type CSSProperties, type FormEvent } from 'react'
import { FormField } from '@/lib/form-field-types'
import { UnifiedFormField } from '@/lib/field-layout'
import {
  FormAppearance,
  DEFAULT_FORM_APPEARANCE,
  getButtonClassName,
  getCardStyle,
  getPageBackgroundStyle
} from '@/lib/form-appearance'
import type { FormDesign } from '@/lib/form-design'
import { shouldUseLegacyRenderer } from '@/lib/form-design'
import {
  getDesignAlignmentClass,
  getDesignBannerHeightClass,
  getDesignBannerRadiusClass,
  getDesignButtonClass,
  getDesignCardPaddingClass,
  getDesignCardStyle,
  getDesignCardWidthClass,
  getDesignDescriptionClass,
  getDesignFieldHeightClass,
  getDesignFieldStyle,
  getDesignFooterClass,
  getDesignLabelClass,
  getDesignLogoWidth,
  getDesignPageStyle,
  getDesignTitleClass
} from '@/lib/design-styles'
import { DynamicFormFields } from '@/components/form-builder/DynamicFormFields'

export interface PublicFormRendererProps {
  eventName: string
  eventStartAt?: string
  eventLocation?: string | null
  formTitle: string
  formDescription?: string | null
  submitLabel: string
  appearance?: FormAppearance | null
  rawAppearance?: unknown
  design?: FormDesign | null
  unifiedFields: UnifiedFormField[]
  formFields: FormField[]
  categories: Array<{ id: string; name: string }>
  canSubmit?: boolean
  blockMessage?: string | null
  preview?: boolean
  mobile?: boolean
  formData?: Record<string, string | string[] | boolean>
  baseInfo?: { name: string; email: string; phone: string; cpf: string }
  selectedCategory?: string
  onFieldChange?: (fieldId: string, value: string | string[] | boolean) => void
  onBaseInfoChange?: (key: 'name' | 'email' | 'phone' | 'cpf', value: string) => void
  onCategoryChange?: (categoryId: string) => void
  onSubmit?: (event: FormEvent) => void
  submitting?: boolean
  apiError?: string | null
}

function fieldInputStyle(appearance: FormAppearance): CSSProperties {
  return {
    borderColor: appearance.border_color,
    ['--tw-ring-color' as string]: appearance.primary_color
  }
}

function LegacyLayout(props: PublicFormRendererProps & { colors: FormAppearance }) {
  const {
    eventName,
    eventStartAt,
    eventLocation,
    formTitle,
    formDescription,
    submitLabel,
    colors,
    unifiedFields,
    formFields,
    categories,
    canSubmit = true,
    blockMessage,
    preview = false,
    mobile = false,
    formData = {},
    baseInfo = { name: '', email: '', phone: '', cpf: '' },
    selectedCategory = '',
    onFieldChange,
    onBaseInfoChange,
    onCategoryChange,
    onSubmit,
    submitting = false,
    apiError
  } = props

  const containerClass = mobile ? 'max-w-sm mx-auto' : 'max-w-2xl mx-auto'

  const renderField = (field: UnifiedFormField) => {
    if (field.kind === 'custom') {
      const fullField = formFields.find((item) => item.id === field.id)
      if (!fullField) return null
      return (
        <DynamicFormFields
          key={field.id}
          fields={[fullField]}
          values={preview ? {} : formData}
          onChange={preview ? () => {} : (fieldId, value) => onFieldChange?.(fieldId, value)}
        />
      )
    }

    const { key, label, required } = field
    if (key === 'category') {
      return (
        <div key={key}>
          <label className="mb-1 block text-sm font-medium" style={{ color: colors.text_color }}>
            {label} {required && <span className="text-red-500">*</span>}
          </label>
          <select
            value={selectedCategory}
            disabled={preview}
            onChange={(e) => onCategoryChange?.(e.target.value)}
            className="w-full rounded-lg border px-4 py-2 outline-none focus:ring-2"
            style={fieldInputStyle(colors)}
            required={required}
          >
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        </div>
      )
    }

    const inputType = key === 'email' ? 'email' : key === 'phone' ? 'tel' : 'text'
    const valueKey = key as 'name' | 'email' | 'phone' | 'cpf'
    return (
      <div key={key}>
        <label className="mb-1 block text-sm font-medium" style={{ color: colors.text_color }}>
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        <input
          type={inputType}
          required={required}
          disabled={preview}
          value={baseInfo[valueKey]}
          onChange={(e) => onBaseInfoChange?.(valueKey, e.target.value)}
          className="w-full rounded-lg border px-4 py-2 outline-none focus:ring-2"
          style={fieldInputStyle(colors)}
        />
      </div>
    )
  }

  return (
    <div className={containerClass} style={{ backgroundColor: colors.background_color }}>
      <div className="overflow-hidden rounded-lg bg-white shadow-xl">
        <div className="p-8 text-white" style={{ backgroundColor: colors.text_color }}>
          <p className="mb-1 text-sm" style={{ color: colors.primary_color }}>{eventName}</p>
          <h1 className="mb-2 text-2xl font-bold md:text-3xl">{formTitle}</h1>
          {formDescription && <p className="text-gray-300">{formDescription}</p>}
          {(eventStartAt || eventLocation) && (
            <div className="mt-4 flex flex-wrap gap-4 text-sm text-gray-300">
              {eventStartAt && <span>{new Date(eventStartAt).toLocaleDateString('pt-BR')}</span>}
              {eventLocation && <span>{eventLocation}</span>}
            </div>
          )}
        </div>

        {!canSubmit ? (
          <div className="p-8">
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              <p className="font-semibold">Inscrições encerradas</p>
              <p>{blockMessage ?? 'Este formulário não está aceitando inscrições no momento.'}</p>
            </div>
          </div>
        ) : (
          <form onSubmit={preview ? (e) => e.preventDefault() : onSubmit} className="space-y-6 p-8">
            {apiError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {apiError}
              </div>
            )}
            <div className="space-y-6">{unifiedFields.map(renderField)}</div>
            <button
              type={preview ? 'button' : 'submit'}
              disabled={preview || submitting}
              className="w-full rounded-lg py-3 font-bold text-white transition disabled:opacity-50"
              style={{ backgroundColor: colors.button_color }}
            >
              {preview ? submitLabel : submitting ? 'Enviando...' : submitLabel}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

function ModernLayout(props: PublicFormRendererProps & { colors: FormAppearance }) {
  const {
    eventName,
    formTitle,
    formDescription,
    submitLabel,
    colors,
    unifiedFields,
    formFields,
    categories,
    canSubmit = true,
    blockMessage,
    preview = false,
    mobile = false,
    formData = {},
    baseInfo = { name: '', email: '', phone: '', cpf: '' },
    selectedCategory = '',
    onFieldChange,
    onBaseInfoChange,
    onCategoryChange,
    onSubmit,
    submitting = false,
    apiError
  } = props

  const alignClass = colors.alignment === 'center' ? 'text-center items-center' : 'text-left items-start'
  const containerWidth = colors.card_width === 'wide'
    ? mobile ? 'max-w-sm' : 'max-w-3xl'
    : mobile ? 'max-w-sm' : 'max-w-xl'

  const renderField = (field: UnifiedFormField) => {
    if (field.kind === 'custom') {
      const fullField = formFields.find((item) => item.id === field.id)
      if (!fullField) return null
      return (
        <DynamicFormFields
          key={field.id}
          fields={[fullField]}
          values={preview ? {} : formData}
          onChange={preview ? () => {} : (fieldId, value) => onFieldChange?.(fieldId, value)}
        />
      )
    }

    const { key, label, required } = field
    if (key === 'category') {
      return (
        <div key={key} className="w-full">
          <label className="mb-1 block text-sm font-medium" style={{ color: colors.text_color }}>
            {label} {required && <span className="text-red-500">*</span>}
          </label>
          <select
            value={selectedCategory}
            disabled={preview}
            onChange={(e) => onCategoryChange?.(e.target.value)}
            className="w-full rounded-lg border px-4 py-2 outline-none focus:ring-2"
            style={fieldInputStyle(colors)}
            required={required}
          >
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        </div>
      )
    }

    const inputType = key === 'email' ? 'email' : key === 'phone' ? 'tel' : 'text'
    const valueKey = key as 'name' | 'email' | 'phone' | 'cpf'
    return (
      <div key={key} className="w-full">
        <label className="mb-1 block text-sm font-medium" style={{ color: colors.text_color }}>
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        <input
          type={inputType}
          required={required}
          disabled={preview}
          value={baseInfo[valueKey]}
          onChange={(e) => onBaseInfoChange?.(valueKey, e.target.value)}
          className="w-full rounded-lg border px-4 py-2 outline-none focus:ring-2"
          style={fieldInputStyle(colors)}
        />
      </div>
    )
  }

  return (
    <div className={`mx-auto w-full ${containerWidth} px-4`}>
      <div className={`mb-8 flex flex-col ${alignClass}`}>
        {colors.logo_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={colors.logo_url}
            alt="Logo"
            className="mb-6 max-h-20 max-w-[220px] object-contain"
          />
        )}
        <h1 className="text-3xl font-bold md:text-4xl" style={{ color: colors.text_color }}>
          {formTitle}
        </h1>
        {formDescription && (
          <p className="mt-3 max-w-2xl text-base md:text-lg" style={{ color: colors.secondary_text_color }}>
            {formDescription}
          </p>
        )}
        <p className="mt-2 text-sm" style={{ color: colors.secondary_text_color }}>{eventName}</p>
      </div>

      <div className="shadow-xl" style={getCardStyle(colors)}>
        <div className="p-6 md:p-8">
          {!canSubmit ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              <p className="font-semibold">Inscrições encerradas</p>
              <p>{blockMessage ?? 'Este formulário não está aceitando inscrições no momento.'}</p>
            </div>
          ) : (
            <form onSubmit={preview ? (e) => e.preventDefault() : onSubmit} className="space-y-6">
              {apiError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {apiError}
                </div>
              )}
              <div className="space-y-6">{unifiedFields.map(renderField)}</div>
              <div className={colors.button_width === 'auto' ? 'flex' : ''}>
                <button
                  type={preview ? 'button' : 'submit'}
                  disabled={preview || submitting}
                  className={getButtonClassName(colors)}
                  style={{
                    backgroundColor: colors.button_color,
                    color: colors.button_text_color
                  }}
                >
                  {preview ? submitLabel : submitting ? 'Enviando...' : submitLabel}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

function V3DesignLayout(props: PublicFormRendererProps & { design: FormDesign }) {
  const {
    design,
    eventName,
    formTitle,
    formDescription,
    submitLabel,
    unifiedFields,
    formFields,
    categories,
    canSubmit = true,
    blockMessage,
    preview = false,
    mobile = false,
    formData = {},
    baseInfo = { name: '', email: '', phone: '', cpf: '' },
    selectedCategory = '',
    onFieldChange,
    onBaseInfoChange,
    onCategoryChange,
    onSubmit,
    submitting = false,
    apiError
  } = props

  const [buttonHovered, setButtonHovered] = useState(false)
  const fieldHeightClass = getDesignFieldHeightClass(design.fields.height)
  const fieldStyle = getDesignFieldStyle(design)
  const labelClass = getDesignLabelClass(design)

  const renderField = (field: UnifiedFormField) => {
    if (field.kind === 'custom') {
      const fullField = formFields.find((item) => item.id === field.id)
      if (!fullField) return null
      return (
        <DynamicFormFields
          key={field.id}
          fields={[fullField]}
          values={preview ? {} : formData}
          onChange={preview ? () => {} : (fieldId, value) => onFieldChange?.(fieldId, value)}
        />
      )
    }

    const { key, label, required } = field
    if (key === 'category') {
      return (
        <div key={key} className="w-full">
          <label className={labelClass} style={{ color: design.fields.label_color }}>
            {label} {required && <span style={{ color: design.fields.required_color }}>*</span>}
          </label>
          <select
            value={selectedCategory}
            disabled={preview}
            onChange={(e) => onCategoryChange?.(e.target.value)}
            className={`w-full border px-4 outline-none focus:ring-2 ${fieldHeightClass}`}
            style={fieldStyle}
            required={required}
          >
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        </div>
      )
    }

    const inputType = key === 'email' ? 'email' : key === 'phone' ? 'tel' : 'text'
    const valueKey = key as 'name' | 'email' | 'phone' | 'cpf'
    return (
      <div key={key} className="w-full">
        <label className={labelClass} style={{ color: design.fields.label_color }}>
          {label} {required && <span style={{ color: design.fields.required_color }}>*</span>}
        </label>
        <input
          type={inputType}
          required={required}
          disabled={preview}
          value={baseInfo[valueKey]}
          onChange={(e) => onBaseInfoChange?.(valueKey, e.target.value)}
          className={`w-full border px-4 outline-none focus:ring-2 ${fieldHeightClass}`}
          style={fieldStyle}
        />
      </div>
    )
  }

  const renderLogoBlock = () => {
    if (!design.logo.enabled || !design.logo.url) return null
    return (
      <div className={`mb-6 flex w-full ${getDesignAlignmentClass(design.logo.alignment)}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={design.logo.url}
          alt="Logo"
          className="max-h-24 object-contain"
          style={{ maxWidth: getDesignLogoWidth(design) }}
        />
      </div>
    )
  }

  const renderBannerBlock = () => {
    if (!design.banner.enabled || !design.banner.url) return null
    return (
      <div className={`mb-6 w-full overflow-hidden ${getDesignBannerRadiusClass(design.banner.radius)}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={design.banner.url}
          alt="Banner"
          className={`w-full ${getDesignBannerHeightClass(design.banner.height)} ${design.banner.fit === 'contain' ? 'object-contain' : 'object-cover'}`}
        />
      </div>
    )
  }

  const renderHeaderBlock = () => {
    if (!design.header.enabled) return null
    const showTitle = design.header.title_visible
    const showDescription = design.header.description_visible && !!formDescription
    if (!showTitle && !showDescription) return null

    return (
      <div className={`mb-6 flex w-full flex-col ${getDesignAlignmentClass(design.header.alignment)}`}>
        {showTitle && (
          <h1 className={getDesignTitleClass(design)} style={{ color: design.header.title_color }}>
            {formTitle}
          </h1>
        )}
        {showDescription && (
          <p
            className={`mt-3 max-w-2xl ${getDesignDescriptionClass(design)}`}
            style={{ color: design.header.description_color }}
          >
            {formDescription}
          </p>
        )}
        <p className="mt-2 text-sm" style={{ color: design.header.description_color }}>{eventName}</p>
      </div>
    )
  }

  const renderFormBlock = () => (
    <div style={getDesignCardStyle(design)}>
      <div className={getDesignCardPaddingClass(design)}>
        {!canSubmit ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <p className="font-semibold">Inscrições encerradas</p>
            <p>{blockMessage ?? 'Este formulário não está aceitando inscrições no momento.'}</p>
          </div>
        ) : (
          <form onSubmit={preview ? (e) => e.preventDefault() : onSubmit} className="space-y-6">
            {apiError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {apiError}
              </div>
            )}
            <div className="space-y-6">{unifiedFields.map(renderField)}</div>
            <div className={`flex ${getDesignAlignmentClass(design.button.alignment)}`}>
              <button
                type={preview ? 'button' : 'submit'}
                disabled={preview || submitting}
                className={getDesignButtonClass(design)}
                style={{
                  backgroundColor: buttonHovered ? design.button.hover_color : design.button.background_color,
                  color: design.button.text_color
                }}
                onMouseEnter={() => setButtonHovered(true)}
                onMouseLeave={() => setButtonHovered(false)}
              >
                {preview ? submitLabel : submitting ? 'Enviando...' : submitLabel}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )

  const renderFooterBlock = () => {
    if (!design.footer.enabled) return null
    const hasText = !!design.footer.text.trim()
    if (!hasText && !design.footer.show_powered_by) return null

    return (
      <div
        className={`mt-6 flex w-full flex-col gap-1 ${getDesignFooterClass(design)}`}
        style={{ color: design.footer.color }}
      >
        {hasText && <p>{design.footer.text}</p>}
        {design.footer.show_powered_by && (
          <p className="opacity-80">Powered by FlowPass</p>
        )}
      </div>
    )
  }

  const blockRenderers = {
    logo: renderLogoBlock,
    banner: renderBannerBlock,
    header: renderHeaderBlock,
    form: renderFormBlock,
    footer: renderFooterBlock
  } as const

  return (
    <div className={`mx-auto w-full ${getDesignCardWidthClass(design, mobile)} px-4`}>
      {design.blocks.map((blockId) => {
        const render = blockRenderers[blockId]
        const content = render()
        if (!content) return null
        return <div key={blockId}>{content}</div>
      })}
    </div>
  )
}

export function PublicFormRenderer(props: PublicFormRendererProps) {
  const colors = props.appearance ?? DEFAULT_FORM_APPEARANCE
  const legacy = shouldUseLegacyRenderer(props.rawAppearance ?? props.appearance)

  if (legacy) {
    return <LegacyLayout {...props} colors={colors} />
  }

  if (props.design) {
    return (
      <div className="min-h-full py-8 md:py-12" style={getDesignPageStyle(props.design)}>
        <V3DesignLayout {...props} design={props.design} />
      </div>
    )
  }

  return (
    <div className="min-h-full py-8 md:py-12" style={getPageBackgroundStyle(colors)}>
      <ModernLayout {...props} colors={colors} />
    </div>
  )
}
