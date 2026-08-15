'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import axios from 'axios'
import toast from 'react-hot-toast'
import { canManageEvents, getStoredUser } from '@/store/auth'
import { EventBreadcrumb } from '@/components/dashboard/EventBreadcrumb'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333'

interface Category {
  id: string
  name: string
}

interface RegistrationLink {
  id: string
  name: string
  slug: string
  description?: string
  active: boolean
  form_mode: 'shared' | 'own'
  default_category?: Category | null
}

export default function EventRegistrationLinksPage() {
  const params = useParams()
  const router = useRouter()
  const eventId = params.id as string
  const [links, setLinks] = useState<RegistrationLink[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [canEdit, setCanEdit] = useState(false)
  const [form, setForm] = useState({
    name: '',
    slug: '',
    description: '',
    default_category_id: '',
    form_mode: 'shared' as 'shared' | 'own',
    active: true
  })

  const load = async () => {
    const token = localStorage.getItem('token')
    const headers = { Authorization: `Bearer ${token}` }
    const [linksRes, catsRes] = await Promise.all([
      axios.get(`${API_URL}/events/${eventId}/registration-links`, { headers }),
      axios.get(`${API_URL}/events/${eventId}/categories`, { headers })
    ])
    setLinks(linksRes.data)
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
        toast.error('Erro ao carregar links')
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
      await axios.post(`${API_URL}/events/${eventId}/registration-links`, {
        ...form,
        slug: form.slug || undefined,
        default_category_id: form.default_category_id || undefined
      }, { headers: { Authorization: `Bearer ${token}` } })
      setForm({ name: '', slug: '', description: '', default_category_id: '', form_mode: 'shared', active: true })
      await load()
      toast.success('Link criado')
    } catch {
      toast.error('Erro ao criar link (verifique o slug)')
    }
  }

  const handleDelete = async (linkId: string) => {
    if (!confirm('Excluir link?')) return
    try {
      const token = localStorage.getItem('token')
      await axios.delete(`${API_URL}/events/${eventId}/registration-links/${linkId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      await load()
      toast.success('Link excluído')
    } catch {
      toast.error('Erro ao excluir')
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl">
        <EventBreadcrumb />
        <p className="text-gray-600">Carregando...</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl">
      <EventBreadcrumb />
      <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        Esta área foi descontinuada na navegação. Use{' '}
        <Link href={`/dashboard/events/${eventId}/forms`} className="font-semibold underline">
          Formulários
        </Link>{' '}
        — cada formulário já possui link público próprio em <code>/f/{'{publicId}'}</code>.
        Os dados existentes foram preservados.
      </div>
        <h1 className="text-2xl font-bold text-[#0B1F3A] mb-2">Links de inscrição</h1>
        <p className="text-gray-600 mb-6 text-sm">Cada link gera uma URL própria de inscrição</p>

        {canEdit && (
          <form onSubmit={handleCreate} className="bg-white p-6 rounded-lg shadow mb-6 space-y-3">
            <input placeholder="Nome (ex: VIP, Público)" required value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg" />
            <input placeholder="Slug (ex: vip) — gerado automaticamente se vazio" value={form.slug}
              onChange={(e) => setForm({ ...form, slug: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg" />
            <input placeholder="Descrição" value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg" />
            <select value={form.default_category_id}
              onChange={(e) => setForm({ ...form, default_category_id: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg">
              <option value="">Categoria padrão (opcional)</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select value={form.form_mode}
              onChange={(e) => setForm({ ...form, form_mode: e.target.value as 'shared' | 'own' })}
              className="w-full px-3 py-2 border rounded-lg">
              <option value="shared">Formulário compartilhado do evento</option>
              <option value="own">Formulário próprio (futuro)</option>
            </select>
            <button type="submit" className="bg-[#00C896] text-white px-4 py-2 rounded-lg">Adicionar link</button>
          </form>
        )}

        <div className="bg-white rounded-lg shadow divide-y">
          {links.length === 0 ? (
            <p className="p-6 text-gray-500">Nenhum link cadastrado</p>
          ) : (
            links.map((link) => (
              <div key={link.id} className="p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold text-[#0B1F3A]">{link.name}</p>
                    <p className="text-sm text-[#00C896] font-mono">/e/{eventId}/{link.slug}</p>
                    {link.description && <p className="text-sm text-gray-600 mt-1">{link.description}</p>}
                    <p className="text-xs text-gray-500 mt-1">
                      Formulário: {link.form_mode === 'shared' ? 'compartilhado' : 'próprio'}
                      {link.default_category && ` · Categoria padrão: ${link.default_category.name}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-1 rounded ${link.active ? 'bg-green-100 text-green-800' : 'bg-gray-100'}`}>
                      {link.active ? 'Ativo' : 'Inativo'}
                    </span>
                    {canEdit && (
                      <button onClick={() => handleDelete(link.id)} className="text-red-500 text-sm">Excluir</button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
    </div>
  )
}
