'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import axios from 'axios'
import { io } from 'socket.io-client'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import toast from 'react-hot-toast'

interface Stats {
  total_registered: number
  total_checked_in: number
  by_category: Array<{ name: string; checked_in: number }>
}

interface CheckinEvent {
  registration_id: string
  name: string
  category: string
  checked_at: string
  operator_name: string
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333'

export default function LivePage() {
  const params = useParams()
  const eventId = params.id as string
  const [stats, setStats] = useState<Stats | null>(null)
  const [checkins, setCheckins] = useState<CheckinEvent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) return

    // Fetch initial stats
    const fetchStats = async () => {
      try {
        const response = await axios.get(`${API_URL}/events/${eventId}/stats`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        setStats(response.data)
      } catch {
        toast.error('Erro ao carregar estatísticas')
      } finally {
        setLoading(false)
      }
    }

    fetchStats()

    // Connect to WebSocket for real-time updates
    const socket = io(`${API_URL}/events/${eventId}`, {
      auth: { token }
    })

    socket.on('checkin', (data: CheckinEvent) => {
      setCheckins((prev) => [data, ...prev.slice(0, 19)])
      // Refresh stats
      fetchStats()
    })

    return () => {
      socket.disconnect()
    }
  }, [eventId])

  if (loading) {
    return <div className="p-8">Carregando...</div>
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <h1 className="text-3xl font-bold text-[#0B1F3A] mb-8">Acompanhamento em Tempo Real</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-gray-600 text-sm">Inscritos</p>
          <p className="text-4xl font-bold text-[#0B1F3A]">{stats?.total_registered || 0}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-gray-600 text-sm">Entradas Confirmadas</p>
          <p className="text-4xl font-bold text-[#00C896]">{stats?.total_checked_in || 0}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-gray-600 text-sm">Taxa de Entrada</p>
          <p className="text-4xl font-bold text-[#0B1F3A]">
            {stats ? Math.round((stats.total_checked_in / stats.total_registered) * 100) : 0}%
          </p>
        </div>
      </div>

      {stats && stats.by_category.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold text-[#0B1F3A] mb-4">Entradas por Categoria</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={stats.by_category}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="checked_in" fill="#00C896" name="Entradas" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-[#0B1F3A] mb-4">Últimas Entradas</h2>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {checkins.length === 0 ? (
            <p className="text-gray-600">Nenhuma entrada ainda</p>
          ) : (
            checkins.map((checkin, idx) => (
              <div key={idx} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                <div>
                  <p className="font-semibold text-[#0B1F3A]">{checkin.name}</p>
                  <p className="text-sm text-gray-600">{checkin.category}</p>
                </div>
                <p className="text-xs text-gray-500">
                  {new Date(checkin.checked_at).toLocaleTimeString('pt-BR')}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
