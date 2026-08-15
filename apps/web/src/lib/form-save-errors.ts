import axios from 'axios'
import { isAxiosNetworkFailure, networkFailureMessage } from '@/lib/form-save-log'

export type FormSavePhase = 'field-delete' | 'field-create' | 'field-update' | 'form-settings' | 'builder-save' | 'reload'

function readApiMessage(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null
  const record = data as Record<string, unknown>
  if (typeof record.message === 'string' && record.message.trim()) {
    return record.message.trim()
  }
  return null
}

export function resolveFormSaveError(err: unknown, phase: FormSavePhase): string {
  if (process.env.NODE_ENV === 'development') {
    console.error('[FormBuilder save]', phase, err)
    if (axios.isAxiosError(err)) {
      console.error('[FormBuilder save] response', {
        status: err.response?.status,
        data: err.response?.data,
        url: err.config?.url,
        method: err.config?.method,
        code: err.code
      })
    }
  }

  if (isAxiosNetworkFailure(err)) {
    return networkFailureMessage()
  }

  const apiMessage = axios.isAxiosError(err) ? readApiMessage(err.response?.data) : null

  if (apiMessage) {
    if (apiMessage.includes('Layout contém campo personalizado inválido')) {
      return 'Não foi possível salvar a ordem dos campos. Atualize a página e tente novamente.'
    }
    if (apiMessage.includes('seleção exigem ao menos uma opção')) {
      return 'Existe uma configuração inválida em um campo de seleção. Revise as opções do campo.'
    }
    if (apiMessage.includes('URL de redirecionamento')) {
      return apiMessage
    }
    if (apiMessage.includes('Limite de inscrições')) {
      return apiMessage
    }
    if (apiMessage.includes('Nome deve permanecer')) {
      return apiMessage
    }
    if (apiMessage.includes('link personalizado')) {
      return apiMessage
    }
    return apiMessage
  }

  if (phase === 'field-delete') {
    return 'Não foi possível remover um campo personalizado. Tente novamente.'
  }
  if (phase === 'field-create' || phase === 'field-update') {
    return 'Não foi possível salvar um campo personalizado. Revise a configuração e tente novamente.'
  }
  if (phase === 'form-settings' || phase === 'builder-save') {
    return 'Não foi possível salvar as configurações do formulário.'
  }
  if (phase === 'reload') {
    return 'As alterações foram salvas, mas não foi possível recarregar o formulário. Atualize a página.'
  }

  return 'Não foi possível salvar as alterações. Tente novamente.'
}
