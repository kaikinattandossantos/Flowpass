'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import axios, { isAxiosError } from 'axios'
import toast from 'react-hot-toast'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333'

function getApiErrorMessage(error: unknown, fallback: string) {
  if (!isAxiosError(error)) return fallback
  const message = error.response?.data?.message
  return typeof message === 'string' ? message : fallback
}

export default function NewCompanyPage() {
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
      const token = localStorage.getItem('token')
      await axios.post(
        `${API_URL}/companies`,
        {
          company_name: form.company_name.trim(),
          cnpj: normalizedCnpj,
          admin_name: form.admin_name.trim(),
          email: form.email.trim().toLowerCase(),
          password: form.password
        },
        { headers: { Authorization: `Bearer ${token}` } }
      )

      toast.success('Empresa cadastrada! O gestor já pode entrar e criar eventos.')
      router.push('/admin')
    } catch (error: unknown) {
      const message = getApiErrorMessage(error, 'Erro ao cadastrar empresa')
      setErrorMessage(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <button onClick={() => router.push('/admin')} className="text-[#0B1F3A] mb-6 hover:underline">
          ← Voltar
        </button>

        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-[#0B1F3A] mb-2">Cadastrar Empresa</h1>
          <p className="text-gray-600 mb-8">
            Crie a conta da empresa e do gestor responsável pelos eventos.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome da Empresa</label>
              <input
                type="text"
                required
                value={form.company_name}
                onChange={(e) => setForm({ ...form, company_name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00C896] outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">CNPJ</label>
              <input
                type="text"
                required
                value={form.cnpj}
                onChange={(e) => setForm({ ...form, cnpj: e.target.value })}
                placeholder="00.000.000/0000-00"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00C896] outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Gestor</label>
              <input
                type="text"
                required
                value={form.admin_name}
                onChange={(e) => setForm({ ...form, admin_name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00C896] outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">E-mail do Gestor</label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00C896] outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Senha inicial</label>
              <input
                type="password"
                required
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00C896] outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar Senha</label>
              <input
                type="password"
                required
                value={form.confirmPassword}
                onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00C896] outline-none"
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
              className="w-full bg-[#00C896] hover:bg-[#00a876] text-white font-semibold py-2 rounded-lg disabled:opacity-50"
            >
              {loading ? 'Cadastrando...' : 'Cadastrar Empresa'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}