'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import axios from 'axios'
import toast from 'react-hot-toast'
import { getHomeRoute, getStoredUser } from '@/store/auth'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333'

interface Company {
  id: string
  name: string
  email: string
  cnpj: string
  status: 'active' | 'inactive'
}

export default function EditCompanyPage() {
  const params = useParams()
  const router = useRouter()
  const companyId = params.id as string
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: '',
    email: '',
    cnpj: '',
    status: 'active' as 'active' | 'inactive'
  })

  useEffect(() => {
    const user = getStoredUser()
    const token = localStorage.getItem('token')

    if (!token || !user || user.role !== 'super_admin') {
      router.push(user ? getHomeRoute(user.role) : '/login')
      return
    }

    axios
      .get(`${API_URL}/admin/companies`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then((res) => {
        const company = res.data.find((c: Company) => c.id === companyId)
        if (!company) {
          toast.error('Empresa não encontrada')
          router.push('/admin/companies')
          return
        }
        setForm({
          name: company.name,
          email: company.email,
          cnpj: company.cnpj,
          status: company.status
        })
      })
      .catch(() => toast.error('Erro ao carregar empresa'))
      .finally(() => setLoading(false))
  }, [companyId, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const token = localStorage.getItem('token')
      await axios.patch(`${API_URL}/admin/companies/${companyId}`, form, {
        headers: { Authorization: `Bearer ${token}` }
      })
      toast.success('Empresa atualizada!')
      router.push('/admin/companies')
    } catch (error: unknown) {
      if (axios.isAxiosError(error) && error.response?.status === 409) {
        toast.error('E-mail ou CNPJ já cadastrado')
      } else {
        toast.error('Erro ao atualizar empresa')
      }
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="p-8">Carregando...</div>

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <button
          onClick={() => router.push('/admin/companies')}
          className="text-[#00C896] hover:underline mb-6"
        >
          ← Voltar
        </button>

        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-[#0B1F3A] mb-8">Editar Empresa</h1>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00C896] outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
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
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00C896] outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as 'active' | 'inactive' })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00C896] outline-none"
              >
                <option value="active">Ativa</option>
                <option value="inactive">Inativa</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full bg-[#00C896] hover:bg-[#00a876] text-white font-semibold py-2 rounded-lg disabled:opacity-50"
            >
              {saving ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
