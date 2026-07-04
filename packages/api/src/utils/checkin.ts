export function parseQrToken(scanned: string): string {
  const trimmed = scanned.trim()

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

  return trimmed
}