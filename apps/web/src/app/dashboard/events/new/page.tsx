'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import toast from 'react-hot-toast'

interface Category {
  name: string
  max_capacity?: number
  color?: string
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333'

export default function NewEventPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)

  const [step1, setStep1] = useState({
    name: '',
    description: '',
    start_at: '',
    end_at: '',
    location: '',
    max_capacity: '',
    is_paid: false,
    waitlist_enabled: false
  })

  const [categories, setCategories] = useState<Category[]>([{ name: 'Geral', color: '#00C896' }])
  const handleCreateEvent = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      
      const eventRes = await axios.post(`${API_URL}/events`, {
        ...step1,
        max_capacity: step1.max_capacity ? parseInt(step1.max_capacity) : null,
        start_at: new Date(step1.start_at).toISOString(),
        end_at: new Date(step1.end_at).toISOString()
      }, {
        headers: { Authorization: `Bearer ${token}` }
      })

      const eventId = eventRes.data.id

      for (const cat of categories) {
        await axios.post(`${API_URL}/events/${eventId}/categories`, cat, {
          headers: { Authorization: `Bearer ${token}` }
        })
      }

      toast.success('Evento criado com sucesso!')
      router.push(`/dashboard/events/${eventId}`)
    } catch {
      toast.error('Erro ao criar evento')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-[#0B1F3A]">Novo Evento</h1>
          <div className="text-sm text-gray-600">Etapa {step} de 3</div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8">
          {step === 1 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-[#0B1F3A] mb-4">Informações Gerais</h2>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Evento *</label>
                <input
                  type="text"
                  required
                  value={step1.name}
                  onChange={(e) => setStep1({...step1, name: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00C896] outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                <textarea
                  value={step1.description}
                  onChange={(e) => setStep1({...step1, description: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00C896] outline-none h-24"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Data e Hora de Início *</label>
                  <input
                    type="datetime-local"
                    required
                    value={step1.start_at}
                    onChange={(e) => setStep1({...step1, start_at: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00C896] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Data e Hora de Fim *</label>
                  <input
                    type="datetime-local"
                    required
                    value={step1.end_at}
                    onChange={(e) => setStep1({...step1, end_at: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00C896] outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Local</label>
                <input
                  type="text"
                  value={step1.location}
                  onChange={(e) => setStep1({...step1, location: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00C896] outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Capacidade Máxima</label>
                <input
                  type="number"
                  value={step1.max_capacity}
                  onChange={(e) => setStep1({...step1, max_capacity: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00C896] outline-none"
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={step1.waitlist_enabled}
                  onChange={(e) => setStep1({...step1, waitlist_enabled: e.target.checked})}
                  className="mr-2"
                />
                <label className="text-sm text-gray-700">Habilitar fila de espera</label>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-[#0B1F3A] mb-4">Categorias de Acesso</h2>
              
              <div className="space-y-4">
                {categories.map((cat, idx) => (
                  <div key={idx} className="flex gap-4 items-end">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                      <input
                        type="text"
                        value={cat.name}
                        onChange={(e) => {
                          const newCats = [...categories]
                          newCats[idx].name = e.target.value
                          setCategories(newCats)
                        }}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00C896] outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Capacidade</label>
                      <input
                        type="number"
                        value={cat.max_capacity || ''}
                        onChange={(e) => {
                          const newCats = [...categories]
                          newCats[idx].max_capacity = e.target.value ? parseInt(e.target.value) : undefined
                          setCategories(newCats)
                        }}
                        className="w-24 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00C896] outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Cor</label>
                      <input
                        type="color"
                        value={cat.color || '#00C896'}
                        onChange={(e) => {
                          const newCats = [...categories]
                          newCats[idx].color = e.target.value
                          setCategories(newCats)
                        }}
                        className="w-16 h-10 border border-gray-300 rounded-lg cursor-pointer"
                      />
                    </div>
                    {categories.length > 1 && (
                      <button
                        onClick={() => setCategories(categories.filter((_, i) => i !== idx))}
                        className="px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                      >
                        Remover
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <button
                onClick={() => setCategories([...categories, { name: '', color: '#00C896' }])}
                className="w-full py-2 border-2 border-[#00C896] text-[#00C896] rounded-lg hover:bg-green-50 font-semibold"
              >
                + Adicionar Categoria
              </button>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-[#0B1F3A] mb-4">Revisão</h2>
              
              <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                <p><strong>Nome:</strong> {step1.name}</p>
                <p><strong>Data:</strong> {new Date(step1.start_at).toLocaleDateString('pt-BR')}</p>
                <p><strong>Local:</strong> {step1.location}</p>
                <p><strong>Categorias:</strong> {categories.map(c => c.name).join(', ')}</p>
              </div>
            </div>
          )}

          <div className="flex justify-between mt-8">
            <button
              onClick={() => setStep(Math.max(1, step - 1))}
              disabled={step === 1}
              className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              Anterior
            </button>

            {step < 3 ? (
              <button
                onClick={() => setStep(step + 1)}
                className="px-6 py-2 bg-[#00C896] text-white rounded-lg hover:bg-[#00a876]"
              >
                Próximo
              </button>
            ) : (
              <>
                <button
                  onClick={() => router.push('/dashboard')}
                  className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Salvar como Rascunho
                </button>
                <button
                  onClick={handleCreateEvent}
                  disabled={loading}
                  className="px-6 py-2 bg-[#00C896] text-white rounded-lg hover:bg-[#00a876] disabled:opacity-50"
                >
                  {loading ? 'Publicando...' : 'Publicar Evento'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
