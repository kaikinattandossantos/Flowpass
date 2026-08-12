const BLOCKED_PROTOCOLS = new Set(['javascript:', 'data:', 'file:', 'vbscript:'])

export function validateRedirectUrl(
  url: string | null | undefined
): { ok: true; value: string | null } | { ok: false; message: string } {
  if (url === null || url === undefined || url.trim() === '') {
    return { ok: true, value: null }
  }

  let parsed: URL
  try {
    parsed = new URL(url.trim())
  } catch {
    return { ok: false, message: 'URL de redirecionamento inválida' }
  }

  const protocol = parsed.protocol.toLowerCase()
  if (BLOCKED_PROTOCOLS.has(protocol)) {
    return { ok: false, message: 'Protocolo de URL não permitido' }
  }

  if (protocol !== 'http:' && protocol !== 'https:') {
    return { ok: false, message: 'URL de redirecionamento deve usar http ou https' }
  }

  return { ok: true, value: parsed.toString() }
}
