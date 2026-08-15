'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import axios from 'axios'
import toast from 'react-hot-toast'
import { API_URL } from '@/lib/api'
import { FormField } from '@/lib/form-field-types'
import { UnifiedFormField } from '@/lib/field-layout'
import { parseStructuralConfig, type StructuralConfig } from '@/lib/structural-config'
import { getPageBackgroundStyle, isLegacyAppearance, parseFormAppearance } from '@/lib/form-appearance'
import { normalizeAppearance } from '@/lib/form-design'
import type { FormDesign } from '@/lib/form-design'
import { parseSuccessBehavior, type SuccessBehavior } from '@/lib/success-behavior'
import { PublicRegistrationFormView } from '@/components/form-builder/PublicRegistrationFormView'
import { PublicFormSuccessView } from '@/components/form-builder/PublicFormSuccessView'

interface PublicFormData {
  event: {
    id: string
    name: string
    description: string | null
    start_at: string
    location: string | null
  }
  form: {
    id: string
    name: string
    status: string
    structural_config: StructuralConfig
    redirect_url: string | null
    success_behavior: SuccessBehavior
    success_title: string | null
    success_message: string | null
    redirect_delay: number | null
    public_title: string | null
    public_description: string | null
    submit_button_text: string | null
    appearance: unknown
    design?: FormDesign | null
    design_legacy?: boolean
    raw_appearance?: unknown
  }
  categories: Array<{ id: string; name: string }>
  unified_fields: UnifiedFormField[]
  form_fields: FormField[]
  can_submit: boolean
  block_reason: string | null
  block_message: string | null
}

interface SuccessState {
  behavior: SuccessBehavior
  title: string | null
  message: string | null
  redirectUrl: string | null
  redirectDelay: number | null
}

export default function PublicFormPage() {
  const params = useParams()
  const publicId = params.publicId as string

  const [data, setData] = useState<PublicFormData | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState<SuccessState | null>(null)
  const [apiError, setApiError] = useState<string | null>(null)

  const [formData, setFormData] = useState<Record<string, string | string[] | boolean>>({})
  const [selectedCategory, setSelectedCategory] = useState('')
  const [baseInfo, setBaseInfo] = useState({ name: '', email: '', phone: '', cpf: '' })

  useEffect(() => {
    const load = async () => {
      try {
        const res = await axios.get(`${API_URL}/public/forms/${publicId}`)
        setData(res.data)
        if (res.data.categories.length > 0) {
          setSelectedCategory(res.data.categories[0].id)
        }
      } catch {
        toast.error('Formulário não encontrado')
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [publicId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!data?.can_submit || success) return

    setSubmitting(true)
    setApiError(null)
    try {
      const config = parseStructuralConfig(data.form.structural_config)
      const res = await axios.post(`${API_URL}/public/forms/${publicId}/registrations`, {
        category_id: config.category.enabled ? selectedCategory : undefined,
        name: baseInfo.name,
        email: config.email.enabled ? baseInfo.email : undefined,
        phone: config.phone.enabled ? baseInfo.phone || undefined : undefined,
        cpf: config.cpf.enabled ? baseInfo.cpf || undefined : undefined,
        form_data: formData
      })

      const behavior = parseSuccessBehavior(res.data.success_behavior ?? data.form.success_behavior)
      const redirectUrl = res.data.redirect_url as string | null

      if (behavior === 'redirect' && redirectUrl) {
        window.location.assign(redirectUrl)
        return
      }

      setSuccess({
        behavior,
        title: res.data.success_title ?? data.form.success_title,
        message: res.data.success_message ?? data.form.success_message,
        redirectUrl,
        redirectDelay: res.data.redirect_delay ?? data.form.redirect_delay
      })
    } catch (err: unknown) {
      const message = axios.isAxiosError(err)
        ? err.response?.data?.message ?? 'Erro ao enviar inscrição'
        : 'Erro ao enviar inscrição'
      setApiError(message)
      toast.error(message)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center">Carregando...</div>
  if (!data) return <div className="min-h-screen flex items-center justify-center">Formulário não encontrado</div>

  const rawAppearance = data.form.raw_appearance ?? data.form.appearance
  const design = data.form.design ?? normalizeAppearance(rawAppearance)
  const legacy = data.form.design_legacy ?? isLegacyAppearance(rawAppearance)
  const appearance = legacy ? parseFormAppearance(rawAppearance) : parseFormAppearance(rawAppearance)
  const formTitle = data.form.public_title?.trim() || data.form.name
  const formDescription = data.form.public_description?.trim() || data.event.description
  const submitLabel = data.form.submit_button_text?.trim() || 'Finalizar inscrição'

  if (success) {
    return (
      <PublicFormSuccessView
        appearance={appearance}
        design={design}
        rawAppearance={rawAppearance}
        successBehavior={success.behavior}
        successTitle={success.title}
        successMessage={success.message}
        redirectUrl={success.redirectUrl}
        redirectDelay={success.redirectDelay}
      />
    )
  }

  if (design) {
    return (
      <div className="min-h-screen">
        <PublicRegistrationFormView
          rawAppearance={rawAppearance}
          design={design}
          eventName={data.event.name}
          eventStartAt={data.event.start_at}
          eventLocation={data.event.location}
          formTitle={formTitle}
          formDescription={formDescription || undefined}
          submitLabel={submitLabel}
          appearance={appearance}
          unifiedFields={data.unified_fields}
          formFields={data.form_fields}
          categories={data.categories}
          canSubmit={data.can_submit}
          blockMessage={data.block_message}
          formData={formData}
          baseInfo={baseInfo}
          selectedCategory={selectedCategory}
          onFieldChange={(fieldId, value) => setFormData((prev) => ({ ...prev, [fieldId]: value }))}
          onBaseInfoChange={(key, value) => setBaseInfo((prev) => ({ ...prev, [key]: value }))}
          onCategoryChange={setSelectedCategory}
          onSubmit={handleSubmit}
          submitting={submitting}
          apiError={apiError}
        />
      </div>
    )
  }

  const pageStyle = legacy
    ? { backgroundColor: appearance.background_color }
    : getPageBackgroundStyle(appearance)

  return (
    <div className="min-h-screen py-8 px-4 md:py-12" style={pageStyle}>
      <PublicRegistrationFormView
        rawAppearance={rawAppearance}
        eventName={data.event.name}
        eventStartAt={data.event.start_at}
        eventLocation={data.event.location}
        formTitle={formTitle}
        formDescription={formDescription || undefined}
        submitLabel={submitLabel}
        appearance={appearance}
        unifiedFields={data.unified_fields}
        formFields={data.form_fields}
        categories={data.categories}
        canSubmit={data.can_submit}
        blockMessage={data.block_message}
        formData={formData}
        baseInfo={baseInfo}
        selectedCategory={selectedCategory}
        onFieldChange={(fieldId, value) => setFormData((prev) => ({ ...prev, [fieldId]: value }))}
        onBaseInfoChange={(key, value) => setBaseInfo((prev) => ({ ...prev, [key]: value }))}
        onCategoryChange={setSelectedCategory}
        onSubmit={handleSubmit}
        submitting={submitting}
        apiError={apiError}
      />
    </div>
  )
}
