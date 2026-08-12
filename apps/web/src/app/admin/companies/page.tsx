'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
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
  subdomain: string
  created_at: string
  _count: { users: number; events: number }
}

export default function AdminCompaniesPage() {
  const router = useRouter()
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const user = getStoredUser()
    const token = localStorage.getItem('token')

    if (!token || !user) {
      router.push('/login')
      return
    }

    if (user.role !== 'super_admin') {
      router.push(getHomeRoute(user.role))
      return
    }

    axios
      .get(`${API_URL}/admin/companies`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then((res) => setCompanies(res.data))
      .catch(() => toast.error('Erro ao carregar empresas'))
      .finally(() => setLoading(false))
  }, [router])

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    router.push('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-[#0B1F3A] text-white p-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">FlowPass Admin</h1>
            <p className="text-sm text-gray-300">Gestão de empresas</p>
          </div>
          <button
            onClick={handleLogout}
            className="bg-[#00C896] hover:bg-[#00a876] px-4 py-2 rounded"
          >
            Sair
          </button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-8">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-3xl font-bold text-[#0B1F3A]">Empresas</h2>
          <button
            onClick={() => router.push('/admin/companies/new')}
            className="bg-[#00C896] hover:bg-[#00a876] text-white px-6 py-2 rounded-lg font-semibold"
          >
            + Nova Empresa
          </button>
        </div>

        {loading ? (
          <p className="text-gray-600">Carregando...</p>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Nome</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">E-mail</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">CNPJ</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Status</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Usuários</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Eventos</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Ações</th>
                </tr>
              </thead>
              <tbody>
                {companies.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-600">
                      Nenhuma empresa cadastrada
                    </td>
                  </tr>
                ) : (
                  companies.map((company) => (
                    <tr key={company.id} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-[#0B1F3A]">{company.name}</td>
                      <td className="px-4 py-3">{company.email}</td>
                      <td className="px-4 py-3">{company.cnpj}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          company.status === 'active'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {company.status === 'active' ? 'Ativa' : 'Inativa'}
                        </span>
                      </td>
                      <td className="px-4 py-3">{company._count.users}</td>
                      <td className="px-4 py-3">{company._count.events}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => router.push(`/admin/companies/${company.id}`)}
                          className="text-[#00C896] hover:underline font-medium"
                        >
                          Editar
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  )
}
