export type SuccessBehavior = 'message' | 'message_redirect' | 'redirect'

export const DEFAULT_SUCCESS_TITLE = 'Inscrição realizada!'
export const DEFAULT_SUCCESS_MESSAGE = 'Sua inscrição foi realizada com sucesso.'
export const DEFAULT_REDIRECT_DELAY = 3

export function parseSuccessBehavior(value: unknown): SuccessBehavior {
  if (value === 'message_redirect' || value === 'redirect') return value
  return 'message'
}

export function validateSuccessSettings(input: {
  success_behavior: SuccessBehavior
  success_title?: string | null
  success_message?: string | null
  redirect_url?: string | null
  redirect_delay?: number | null
}): { ok: true } | { ok: false; message: string } {
  const title = input.success_title?.trim() ?? ''
  const message = input.success_message?.trim() ?? ''

  if (title.length > 120) {
    return { ok: false, message: 'Título de confirmação deve ter no máximo 120 caracteres' }
  }
  if (message.length > 500) {
    return { ok: false, message: 'Mensagem de confirmação deve ter no máximo 500 caracteres' }
  }

  if (input.success_behavior === 'message') {
    return { ok: true }
  }

  if (!input.redirect_url?.trim()) {
    return { ok: false, message: 'URL de redirecionamento é obrigatória para esta opção' }
  }

  if (input.success_behavior === 'message_redirect') {
    const delay = input.redirect_delay ?? DEFAULT_REDIRECT_DELAY
    if (!Number.isInteger(delay) || delay < 1 || delay > 30) {
      return { ok: false, message: 'Tempo para redirecionar deve ser entre 1 e 30 segundos' }
    }
  }

  return { ok: true }
}

export function inferSuccessBehaviorFromLegacy(redirectUrl: string | null | undefined): SuccessBehavior {
  return redirectUrl?.trim() ? 'redirect' : 'message'
}

export function successSettingsForStorage(input: {
  success_behavior: SuccessBehavior
  success_title?: string | null
  success_message?: string | null
  redirect_url?: string | null
  redirect_delay?: number | null
}) {
  return {
    success_behavior: input.success_behavior,
    success_title: input.success_title?.trim() || null,
    success_message: input.success_message?.trim() || null,
    redirect_delay: input.success_behavior === 'message_redirect'
      ? (input.redirect_delay ?? DEFAULT_REDIRECT_DELAY)
      : null
  }
}
