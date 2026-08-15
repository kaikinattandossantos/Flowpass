export type SuccessBehavior = 'message' | 'message_redirect' | 'redirect'

export const DEFAULT_SUCCESS_TITLE = 'Inscrição realizada!'
export const DEFAULT_SUCCESS_MESSAGE = 'Sua inscrição foi realizada com sucesso.'
export const DEFAULT_REDIRECT_DELAY = 3

export function parseSuccessBehavior(value: unknown): SuccessBehavior {
  if (value === 'message_redirect' || value === 'redirect') return value
  return 'message'
}

export function inferSuccessBehaviorFromLegacy(redirectUrl: string | null | undefined): SuccessBehavior {
  return redirectUrl?.trim() ? 'redirect' : 'message'
}

export function validateSuccessSettings(input: {
  successBehavior: SuccessBehavior
  successTitle: string
  successMessage: string
  redirectUrl: string | null
  redirectDelay: number | null
}): string | null {
  if (input.successTitle.trim().length > 120) {
    return 'Título de confirmação deve ter no máximo 120 caracteres'
  }
  if (input.successMessage.trim().length > 500) {
    return 'Mensagem de confirmação deve ter no máximo 500 caracteres'
  }

  if (input.successBehavior === 'message') {
    return null
  }

  if (!input.redirectUrl?.trim()) {
    return 'URL de redirecionamento é obrigatória para esta opção'
  }
  if (input.redirectUrl.trim() && !/^https?:\/\/.+/i.test(input.redirectUrl.trim())) {
    return 'Informe uma URL válida começando com http:// ou https://'
  }

  if (input.successBehavior === 'message_redirect') {
    const delay = input.redirectDelay ?? DEFAULT_REDIRECT_DELAY
    if (!Number.isInteger(delay) || delay < 1 || delay > 30) {
      return 'Tempo para redirecionar deve ser entre 1 e 30 segundos'
    }
  }

  return null
}
