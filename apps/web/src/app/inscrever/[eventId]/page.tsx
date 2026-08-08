'use client'

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import axios from 'axios'
import { API_URL } from '@/lib/api'

export default function LegacyRegistrationRedirectPage() {
  const params = useParams()
  const router = useRouter()
  const eventId = params.eventId as string

  useEffect(() => {
    const redirect = async () => {
      try {
        const res = await axios.get(`${API_URL}/events/${eventId}/public`)
        const publicId = res.data.primary_form_public_id as string | null
        if (publicId) {
          router.replace(`/f/${publicId}`)
          return
        }
      } catch {
        // fall through
      }
      router.replace('/')
    }
    void redirect()
  }, [eventId, router])

  return <div className="min-h-screen flex items-center justify-center">Redirecionando...</div>
}
