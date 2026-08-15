export function credentialingUrl(publicId: string): string {
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/c/${publicId}`
  }
  return `/c/${publicId}`
}

export interface CredentialingLink {
  id: string
  event_id: string
  name: string
  description?: string | null
  active: boolean
  public_id: string
  allows_all_categories: boolean
  categories: Array<{ id: string; name: string }>
  categories_label: string
  checkin_count: number
  created_at: string
}

export type CredentialingScanResponse =
  | { result: 'success'; name: string; category: string | null; checked_at: string }
  | { result: 'unauthorized_category'; name: string; category: string | null; message: string }
  | { result: 'already_checked_in'; name: string; category: string | null; checked_at: string }
  | { result: 'invalid_qr' }
  | { result: 'inactive_link' }

export interface CredentialingPublicInfo {
  event: { id: string; name: string; status: string }
  point: {
    id: string
    name: string
    description?: string | null
    active: boolean
    public_id: string
    allows_all_categories: boolean
    categories: Array<{ id: string; name: string }>
    categories_label: string
    checkin_count: number
  }
}
