'use client'

import { useEffect, useState } from 'react'
import type { SuccessBehavior } from '@/lib/success-behavior'
import {
  DEFAULT_SUCCESS_MESSAGE,
  DEFAULT_SUCCESS_TITLE
} from '@/lib/success-behavior'
import type { FormDesign } from '@/lib/form-design'
import { getDesignCardStyle, getDesignPageStyle } from '@/lib/design-styles'
import {
  FormAppearance,
  getCardStyle,
  getPageBackgroundStyle,
  isLegacyAppearance
} from '@/lib/form-appearance'

interface PublicFormSuccessViewProps {
  appearance: FormAppearance
  design?: FormDesign | null
  rawAppearance: unknown
  successBehavior: SuccessBehavior
  successTitle?: string | null
  successMessage?: string | null
  redirectUrl?: string | null
  redirectDelay?: number | null
}

export function PublicFormSuccessView({
  appearance,
  design,
  rawAppearance,
  successBehavior,
  successTitle,
  successMessage,
  redirectUrl,
  redirectDelay
}: PublicFormSuccessViewProps) {
  const legacy = isLegacyAppearance(rawAppearance)
  const title = successTitle?.trim() || DEFAULT_SUCCESS_TITLE
  const message = successMessage?.trim() || DEFAULT_SUCCESS_MESSAGE
  const delay = redirectDelay ?? 3
  const [secondsLeft, setSecondsLeft] = useState(delay)

  useEffect(() => {
    if (successBehavior !== 'message_redirect' || !redirectUrl) return

    if (secondsLeft <= 0) {
      window.location.assign(redirectUrl)
      return
    }

    const timer = window.setTimeout(() => {
      setSecondsLeft((current) => current - 1)
    }, 1000)

    return () => window.clearTimeout(timer)
  }, [successBehavior, redirectUrl, secondsLeft])

  const pageStyle = design
    ? getDesignPageStyle(design)
    : legacy
      ? { backgroundColor: appearance.background_color }
      : getPageBackgroundStyle(appearance)

  const cardStyle = design
    ? getDesignCardStyle(design)
    : legacy
      ? undefined
      : getCardStyle(appearance)

  const titleColor = design?.header.title_color ?? appearance.text_color
  const messageColor = design?.header.description_color ?? (appearance.secondary_text_color || '#64748B')

  return (
    <div className="flex min-h-screen items-center justify-center p-4" style={pageStyle}>
      <div
        className="w-full max-w-md rounded-lg bg-white p-8 text-center shadow-xl"
        style={cardStyle}
      >
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-2xl text-green-700">
          ✓
        </div>
        <h1 className="mb-2 text-2xl font-bold" style={{ color: titleColor }}>
          {title}
        </h1>
        <p style={{ color: messageColor }}>{message}</p>

        {successBehavior === 'message_redirect' && redirectUrl && (
          <p className="mt-6 text-sm" style={{ color: messageColor }}>
            Você será redirecionado em {Math.max(secondsLeft, 0)} segundo{secondsLeft === 1 ? '' : 's'}...
          </p>
        )}
      </div>
    </div>
  )
}
