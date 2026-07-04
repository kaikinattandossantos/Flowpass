'use client'

import { useEffect, useState } from 'react'
import axios from 'axios'
import type { PublicEvent } from '@/lib/public-events'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333'

export function usePublicEvents() {
  const [events, setEvents] = useState<PublicEvent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await axios.get(`${API_URL}/public/events`)
        setEvents(response.data)
      } catch {
        setEvents([])
      } finally {
        setLoading(false)
      }
    }

    fetchEvents()
  }, [])

  return { events, loading }
}