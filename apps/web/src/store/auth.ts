import { create } from 'zustand'
import axios from 'axios'

export type Role = 'super_admin' | 'admin' | 'viewer' | 'operator'

interface User {
  id: string
  name: string
  email: string
  role: Role
  company_id: string | null
}

interface AuthStore {
  user: User | null
  token: string | null
  loading: boolean
  login: (email: string, password: string) => Promise<User>
  logout: () => void
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333'

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  token: null,
  loading: false,

  login: async (email: string, password: string) => {
    set({ loading: true })
    try {
      const response = await axios.post(`${API_URL}/auth/login`, { email, password })
      const { token, user } = response.data

      localStorage.setItem('token', token)
      localStorage.setItem('user', JSON.stringify(user))

      set({ token, user, loading: false })
      return user as User
    } catch (error) {
      console.error('Login failed:', error)
      set({ loading: false })
      throw error
    }
  },

  logout: () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    set({ user: null, token: null })
  }
}))

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

export function getHomeRoute(role: Role): string {
  if (role === 'super_admin') return '/admin/companies'
  return '/dashboard'
}

export function canManageEvents(role: Role): boolean {
  return role === 'admin'
}
