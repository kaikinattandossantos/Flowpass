'use client'

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'

export default function LegacyFormBuilderRedirectPage() {
  const params = useParams()
  const router = useRouter()
  const eventId = params.id as string

  useEffect(() => {
    router.replace(`/dashboard/events/${eventId}/forms`)
  }, [eventId, router])

  return <div className="p-8">Redirecionando...</div>
}
