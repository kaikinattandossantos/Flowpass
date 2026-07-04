'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { isAxiosError } from 'axios'
import { useAuthStore } from '@/store/auth'
import { getHomeForRole } from '@/lib/auth'
import toast from 'react-hot-toast'
import { PublicHeader } from '@/components/public/PublicHeader'
import { PublicFooter } from '@/components/public/PublicFooter'

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
    <div className="min-h-screen flex flex-col bg-[var(--background)]">
      <PublicHeader />
      <div className="flex-1 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl border border-[var(--border)] shadow-xl p-8">
          <h1 className="text-3xl font-bold text-[var(--brand)] mb-2">Área do organizador</h1>
          <p className="text-slate-600 mb-8">Acesso para administradores e empresas parceiras</p>

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

          <p className="mt-6 text-center text-sm text-slate-600">
            É participante?{' '}
            <Link href="/inscrever" className="font-semibold text-[var(--accent-dark)] hover:underline">
              Ver eventos abertos
            </Link>
          </p>
        </div>
      </div>
      </div>
      <PublicFooter />
    </div>
  )
}