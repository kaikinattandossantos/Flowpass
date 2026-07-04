import { create } from 'zustand'
import axios from 'axios'

export interface User {
  id: string
  name: string
  email: string
  role: 'superadmin' | 'admin' | 'viewer' | 'operator'
}

interface AuthStore {
  user: User | null
  token: string | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
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
