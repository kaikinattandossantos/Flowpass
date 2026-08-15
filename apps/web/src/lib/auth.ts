import type { Role, User } from '@/store/auth'

export type { User }

export function getHomeForRole(role: Role) {
  if (role === 'super_admin') return '/admin/companies'
  return '/dashboard'
}

export { getStoredUser } from '@/store/auth'
