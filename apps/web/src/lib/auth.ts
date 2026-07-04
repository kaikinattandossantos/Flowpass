import type { User } from '@/store/auth'

export function getHomeForRole(role: User['role']) {
  return role === 'superadmin' ? '/admin' : '/dashboard'
}

export function getStoredUser(): User | null {
  if (typeof window === 'undefined') return null

  const raw = localStorage.getItem('user')
  if (!raw) return null

  try {
    return JSON.parse(raw) as User
  } catch {
    return null
  }
}