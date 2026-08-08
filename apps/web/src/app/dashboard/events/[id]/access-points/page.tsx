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
}

interface AccessPoint {
  id: string
  name: string
  description?: string
  active: boolean
  categories: Array<{ category: Category }>
}

export default function EventAccessPointsPage() {
  const params = useParams()
  const router = useRouter()
  const eventId = params.id as string
  const [points, setPoints] = useState<AccessPoint[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [canEdit, setCanEdit] = useState(false)
  const [form, setForm] = useState({
    name: '',
    description: '',
    category_ids: [] as string[]
  })

  const load = async () => {
    const token = localStorage.getItem('token')
    const headers = { Authorization: `Bearer ${token}` }
    const [pointsRes, catsRes] = await Promise.all([
      axios.get(`${API_URL}/events/${eventId}/access-points`, { headers }),
      axios.get(`${API_URL}/events/${eventId}/categories`, { headers })
    ])
    setPoints(pointsRes.data)
    setCategories(catsRes.data)
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
        toast.error('Erro ao carregar pontos')
      } finally {
        setCanEdit(edit)
        setLoading(false)
      }
    })()
  }, [eventId, router, load])

  const toggleCategory = (catId: string) => {
    setForm((prev) => ({
      ...prev,
      category_ids: prev.category_ids.includes(catId)
        ? prev.category_ids.filter((id) => id !== catId)
        : [...prev.category_ids, catId]
    }))
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const token = localStorage.getItem('token')
      await axios.post(`${API_URL}/events/${eventId}/access-points`, form, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setForm({ name: '', description: '', category_ids: [] })
      await load()
      toast.success('Ponto de acesso criado')
    } catch {
      toast.error('Erro ao criar ponto de acesso')
    }
  }

  const handleDelete = async (pointId: string) => {
    if (!confirm('Excluir ponto de acesso?')) return
    try {
      const token = localStorage.getItem('token')
      await axios.delete(`${API_URL}/events/${eventId}/access-points/${pointId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      await load()
      toast.success('Ponto excluído')
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
        <h1 className="text-2xl font-bold text-[#0B1F3A] mb-2">Pontos de acesso</h1>
        <p className="text-gray-600 mb-6 text-sm">Onde o QR será validado (Portão A, Backstage, Área VIP…)</p>

        {canEdit && (
          <form onSubmit={handleCreate} className="bg-white p-6 rounded-lg shadow mb-6 space-y-3">
            <input placeholder="Nome (ex: Portão A, Backstage)" required value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg" />
            <input placeholder="Descrição" value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg" />
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Categorias aceitas neste ponto:</p>
              {categories.length === 0 ? (
                <p className="text-sm text-gray-500">Cadastre categorias primeiro</p>
              ) : (
                <div className="space-y-1">
                  {categories.map((c) => (
                    <label key={c.id} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={form.category_ids.includes(c.id)}
                        onChange={() => toggleCategory(c.id)}
                      />
                      {c.name}
                    </label>
                  ))}
                </div>
              )}
            </div>
            <button type="submit" className="bg-[#00C896] text-white px-4 py-2 rounded-lg">Adicionar ponto</button>
          </form>
        )}

        <div className="bg-white rounded-lg shadow divide-y">
          {points.length === 0 ? (
            <p className="p-6 text-gray-500">Nenhum ponto cadastrado</p>
          ) : (
            points.map((point) => (
              <div key={point.id} className="p-4 flex justify-between items-start">
                <div>
                  <p className="font-semibold text-[#0B1F3A]">{point.name}</p>
                  {point.description && <p className="text-sm text-gray-600">{point.description}</p>}
                  <p className="text-xs text-gray-500 mt-2">
                    Aceita: {point.categories.length > 0
                      ? point.categories.map((c) => c.category.name).join(', ')
                      : 'nenhuma categoria'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-1 rounded ${point.active ? 'bg-green-100 text-green-800' : 'bg-gray-100'}`}>
                    {point.active ? 'Ativo' : 'Inativo'}
                  </span>
                  {canEdit && (
                    <button onClick={() => handleDelete(point.id)} className="text-red-500 text-sm">Excluir</button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
