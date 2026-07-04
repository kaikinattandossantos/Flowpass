'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import toast from 'react-hot-toast'
import { getHomeForRole, getStoredUser } from '@/lib/auth'

interface Company {
  id: string
  name: string
  cnpj: string
  email: string
  subdomain: string
  created_at: string
  _count: { events: number; users: number }
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333'

export default function AdminPage() {
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

    if (user.role !== 'superadmin') {
      router.push(getHomeForRole(user.role))
      return
    }

    const fetchCompanies = async () => {
      try {
        const response = await axios.get(`${API_URL}/companies`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        setCompanies(response.data)
      } catch {
        toast.error('Erro ao carregar empresas')
      } finally {
        setLoading(false)
      }
    }

    fetchCompanies()
  }, [router])

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-[#0B1F3A] text-white p-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">FlowPass Admin</h1>
            <p className="text-sm text-gray-300">Cadastro de empresas na plataforma</p>
          </div>
          <button
            onClick={() => {
              localStorage.removeItem('token')
              localStorage.removeItem('user')
              router.push('/login')
            }}
            className="bg-[#00C896] hover:bg-[#00a876] px-4 py-2 rounded"
          >
            Sair
          </button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-3xl font-bold text-[#0B1F3A]">Empresas</h2>
            <p className="text-gray-600 mt-1">
              O administrador cadastra empresas. Cada empresa cria seus próprios eventos.
            </p>
          </div>
          <button
            onClick={() => router.push('/admin/companies/new')}
            className="bg-[#00C896] hover:bg-[#00a876] text-white px-6 py-2 rounded-lg font-semibold"
          >
            + Nova Empresa
          </button>
        </div>

        {loading ? (
          <p className="text-gray-600">Carregando empresas...</p>
        ) : companies.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-600 mb-4">Nenhuma empresa cadastrada ainda.</p>
            <button
              onClick={() => router.push('/admin/companies/new')}
              className="bg-[#00C896] hover:bg-[#00a876] text-white px-6 py-2 rounded-lg"
            >
              Cadastrar primeira empresa
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Empresa</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">CNPJ</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">E-mail</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Eventos</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Usuários</th>
                </tr>
              </thead>
              <tbody>
                {companies.map((company) => (
                  <tr key={company.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-[#0B1F3A]">{company.name}</td>
                    <td className="px-4 py-3">{company.cnpj}</td>
                    <td className="px-4 py-3">{company.email}</td>
                    <td className="px-4 py-3">{company._count.events}</td>
                    <td className="px-4 py-3">{company._count.users}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  )
}