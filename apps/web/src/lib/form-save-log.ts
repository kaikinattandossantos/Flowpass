import axios from 'axios'
import type { FormSavePhase } from '@/lib/form-save-errors'

export interface FormSaveDevLog {
  phase: FormSavePhase
  method?: string
  url?: string
  requestBody?: unknown
  status?: number
  responseBody?: unknown
  message?: string
}

function sanitizeBody(body: unknown): unknown {
  if (!body || typeof body !== 'object') return body
  const copy = { ...(body as Record<string, unknown>) }
  delete copy.password
  delete copy.token
  return copy
}

export function logFormSaveDev(details: FormSaveDevLog): void {
  if (process.env.NODE_ENV !== 'development') return
  console.error('[FormBuilder save]', details.phase, {
    method: details.method,
    url: details.url,
    requestBody: sanitizeBody(details.requestBody),
    status: details.status,
    responseBody: details.responseBody,
    message: details.message
  })
}

export function isAxiosNetworkFailure(err: unknown): boolean {
  if (!axios.isAxiosError(err)) return false
  if (err.response) return false
  return err.code === 'ERR_NETWORK' || err.message === 'Network Error'
}

export function networkFailureMessage(): string {
  return 'Não foi possível conectar à API. Verifique se o servidor está rodando (pnpm dev ou pnpm dev:api) e se NEXT_PUBLIC_API_URL aponta para http://localhost:3333.'
}
