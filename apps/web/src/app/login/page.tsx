'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { isAxiosError } from 'axios'
import { useAuthStore } from '@/store/auth'
import { getHomeForRole } from '@/lib/auth'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const router = useRouter()
  const { login, loading } = useAuthStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await login(email, password)
      const loggedUser = useAuthStore.getState().user
      toast.success('Login realizado com sucesso!')
      router.push(getHomeForRole(loggedUser?.role ?? 'admin'))
    } catch (error: unknown) {
      if (isAxiosError(error) && error.response?.status === 401) {
        toast.error('E-mail ou senha incorretos.')
      } else if (isAxiosError(error) && !error.response) {
        toast.error('Não foi possível conectar à API. Verifique se o servidor está rodando (pnpm dev).')
      } else {
        toast.error('Falha ao fazer login')
      }
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0B1F3A] to-[#1a3a52] flex items-center justify-center">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-xl p-8">
          <h1 className="text-3xl font-bold text-[#0B1F3A] mb-2">FlowPass</h1>
          <p className="text-gray-900 mb-8">Acesso para administradores e empresas</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">E-mail</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00C896] focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">Senha</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00C896] focus:border-transparent"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#00C896] hover:bg-[#00a876] text-white font-semibold py-2 rounded-lg transition disabled:opacity-50"
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>

          <div className="mt-6 space-y-2 text-xs text-gray-800">
            <p><strong>Admin plataforma:</strong> superadmin@flowpass.com.br / flowpass123</p>
            <p><strong>Empresa demo:</strong> admin@flowpass.com.br / flowpass123</p>
          </div>
        </div>
      </div>
    </div>
  )
}