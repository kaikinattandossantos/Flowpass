'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import axios from 'axios'
import toast from 'react-hot-toast'
import { canManageEvents, getStoredUser } from '@/store/auth'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333'

interface Category {
  id: string
  name: string
  description?: string
  color?: string
}

export default function EventCategoriesPage() {
  const params = useParams()
  const router = useRouter()
  const eventId = params.id as string
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [canEdit, setCanEdit] = useState(false)
  const [form, setForm] = useState({ name: '', description: '' })

  const load = async () => {
    const token = localStorage.getItem('token')
    const res = await axios.get(`${API_URL}/events/${eventId}/categories`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    setCategories(res.data)
  }

  useEffect(() => {
    const user = getStoredUser()
    if (!user || !localStorage.getItem('token')) {
      router.push('/login')
      return
    }
    const edit = canManageEvents(user.role)
    void (async () => {
      try {
        await load()
      } catch {
        toast.error('Erro ao carregar categorias')
      } finally {
        setCanEdit(edit)
        setLoading(false)
      }
    })()
  }, [eventId, router, load])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const token = localStorage.getItem('token')
      await axios.post(`${API_URL}/events/${eventId}/categories`, form, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setForm({ name: '', description: '' })
      await load()
      toast.success('Categoria criada')
    } catch {
      toast.error('Erro ao criar categoria')
    }
  }

  const handleDelete = async (catId: string) => {
    if (!confirm('Excluir categoria?')) return
    try {
      const token = localStorage.getItem('token')
      await axios.delete(`${API_URL}/events/${eventId}/categories/${catId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      await load()
      toast.success('Categoria excluída')
    } catch {
      toast.error('Erro ao excluir')
    }
  }

  if (loading) return <div className="p-8">Carregando...</div>

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-3xl mx-auto">
        <button onClick={() => router.push(`/dashboard/events/${eventId}`)} className="text-[#00C896] mb-4">
          ← Voltar ao evento
        </button>
        <h1 className="text-2xl font-bold text-[#0B1F3A] mb-2">Categorias de participante</h1>
        <p className="text-gray-600 mb-6 text-sm">Define QUEM é o participante (VIP, Staff, Público Geral…)</p>

        {canEdit && (
          <form onSubmit={handleCreate} className="bg-white p-6 rounded-lg shadow mb-6 space-y-3">
            <input
              placeholder="Nome (ex: VIP, Imprensa)"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
            />
            <input
              placeholder="Descrição (opcional)"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
            />
            <button type="submit" className="bg-[#00C896] text-white px-4 py-2 rounded-lg">Adicionar</button>
          </form>
        )}

        <div className="bg-white rounded-lg shadow divide-y">
          {categories.length === 0 ? (
            <p className="p-6 text-gray-500">Nenhuma categoria cadastrada</p>
          ) : (
            categories.map((cat) => (
              <div key={cat.id} className="p-4 flex justify-between items-start">
                <div>
                  <p className="font-semibold text-[#0B1F3A]">{cat.name}</p>
                  {cat.description && <p className="text-sm text-gray-600">{cat.description}</p>}
                </div>
                {canEdit && (
                  <button onClick={() => handleDelete(cat.id)} className="text-red-500 text-sm">Excluir</button>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
