'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import axios, { isAxiosError } from 'axios'
import toast from 'react-hot-toast'
import { useAuthStore } from '@/store/auth'
import type { User } from '@/store/auth'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333'

function getApiErrorMessage(error: unknown, fallback: string) {
  if (!isAxiosError(error)) return fallback

  const data = error.response?.data
  if (typeof data?.message === 'string') return data.message

  return fallback
}

export default function RegisterPage() {
  const router = useRouter()

  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [form, setForm] = useState({
    company_name: '',
    cnpj: '',
    admin_name: '',
    email: '',
    password: '',
    confirmPassword: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)

    if (form.password.length < 6) {
      const message = 'A senha deve ter pelo menos 6 caracteres.'
      setErrorMessage(message)
      toast.error(message)
      return
    }

    if (form.password !== form.confirmPassword) {
      const message = 'As senhas não coincidem.'
      setErrorMessage(message)
      toast.error(message)
      return
    }

    const normalizedCnpj = form.cnpj.replace(/\D/g, '')
    if (normalizedCnpj.length !== 14) {
      const message = 'CNPJ inválido. Informe os 14 dígitos.'
      setErrorMessage(message)
      toast.error(message)
      return
    }

    setLoading(true)
    try {
      const response = await axios.post<{ token: string; user: User }>(`${API_URL}/companies`, {
        company_name: form.company_name.trim(),
        cnpj: normalizedCnpj,
        admin_name: form.admin_name.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password
      })

      const { token, user } = response.data
      localStorage.setItem('token', token)
      localStorage.setItem('user', JSON.stringify(user))
      useAuthStore.setState({ token, user, loading: false })

      toast.success('Empresa criada com sucesso!')
      router.push('/dashboard')
    } catch (error: unknown) {
      let message = 'Erro ao criar empresa'

      if (isAxiosError(error)) {
        if (!error.response) {
          message = 'Não foi possível conectar à API. Verifique se o servidor está rodando (pnpm dev).'
        } else if (error.response.status === 409) {
          message = getApiErrorMessage(error, 'E-mail ou CNPJ já cadastrado')
        } else {
          message = getApiErrorMessage(error, 'Erro ao criar empresa')
        }
      }

      setErrorMessage(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0B1F3A] to-[#1a3a52] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-xl p-8">
          <h1 className="text-3xl font-bold text-[#0B1F3A] mb-2">FlowPass</h1>
          <p className="text-gray-600 mb-8">Crie sua conta para começar</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome da Empresa</label>
              <input
                type="text"
                required
                value={form.company_name}
                onChange={(e) => setForm({...form, company_name: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00C896] focus:border-transparent outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">CNPJ</label>
              <input
                type="text"
                required
                value={form.cnpj}
                onChange={(e) => setForm({...form, cnpj: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00C896] focus:border-transparent outline-none"
                placeholder="00.000.000/0000-00"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Seu Nome</label>
              <input
                type="text"
                required
                value={form.admin_name}
                onChange={(e) => setForm({...form, admin_name: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00C896] focus:border-transparent outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({...form, email: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00C896] focus:border-transparent outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
              <input
                type="password"
                required
                value={form.password}
                onChange={(e) => setForm({...form, password: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00C896] focus:border-transparent outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar Senha</label>
              <input
                type="password"
                required
                value={form.confirmPassword}
                onChange={(e) => setForm({...form, confirmPassword: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00C896] focus:border-transparent outline-none"
              />
            </div>

            {errorMessage && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {errorMessage}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#00C896] hover:bg-[#00a876] text-white font-semibold py-2 rounded-lg transition disabled:opacity-50"
            >
              {loading ? 'Criando...' : 'Criar Conta'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-600 mt-6">
            Já tem conta? <a href="/login" className="text-[#00C896] hover:underline">Entrar</a>
          </p>
        </div>
      </div>
    </div>
  )
}
