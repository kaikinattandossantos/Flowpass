import { create } from 'zustand'
import AsyncStorage from '@react-native-async-storage/async-storage'
import axios from 'axios'

interface User {
  id: string
  name: string
  email: string
  role: 'admin' | 'viewer' | 'operator'
}

interface AuthStore {
  user: User | null
  token: string | null
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  loadStorage: () => Promise<void>
}

const API_URL = 'http://localhost:3333' // Change to your IP for physical device

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  token: null,

  login: async (email, password) => {
    try {
      const response = await axios.post(`${API_URL}/auth/login`, { email, password })
      const { token, user } = response.data
      await AsyncStorage.setItem('token', token)
      await AsyncStorage.setItem('user', JSON.stringify(user))
      set({ token, user })
    } catch (error) {
      console.error('Mobile login failed:', error)
      throw error
    }
  },

  logout: async () => {
    await AsyncStorage.removeItem('token')
    await AsyncStorage.removeItem('user')
    set({ token: null, user: null })
  },

  loadStorage: async () => {
    const token = await AsyncStorage.getItem('token')
    const user = await AsyncStorage.getItem('user')
    if (token && user) {
      set({ token, user: JSON.parse(user) })
    }
  }
}))
