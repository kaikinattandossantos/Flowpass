export function parseQrToken(scanned: string): string | null {
  const trimmed = scanned.trim()
  if (!trimmed) return null

  if (trimmed.startsWith('data:image')) {
    return null
  }

  try {
    const url = new URL(trimmed)
    const pathParts = url.pathname.split('/').filter(Boolean)
    const ingressoIndex = pathParts.indexOf('ingresso')
    if (ingressoIndex !== -1 && pathParts[ingressoIndex + 1]) {
      return pathParts[ingressoIndex + 1]
    }
    const tokenParam = url.searchParams.get('token')
    if (tokenParam) return tokenParam
  } catch {
    // not a URL — use raw token
  }

  if (/^[a-f0-9]{64}$/i.test(trimmed)) {
    return trimmed.toLowerCase()
  }

  return trimmed
}

export function describeQrInput(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) return 'Informe o código do QR ou o link do ingresso.'
  if (trimmed.startsWith('data:image')) {
    return 'Isso é a imagem do QR, não o código. Use o link do ingresso ou o código exibido abaixo do QR.'
  }
  if (trimmed.includes('/inscrever/')) {
    return 'Esse é o link de inscrição, não do ingresso. Inscreva-se primeiro ou abra o link do ingresso (/ingresso/...).'
  }
  const parsed = parseQrToken(trimmed)
  if (!parsed || !/^[a-f0-9]{64}$/i.test(parsed)) {
    return 'Código inválido. Cole o link completo do ingresso ou o código de 64 caracteres.'
  }
  return null
}