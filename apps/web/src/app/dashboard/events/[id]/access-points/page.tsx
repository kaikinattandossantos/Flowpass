'use client'

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { eventNavHref } from '@/lib/event-navigation'

export default function EventAccessPointsRedirectPage() {
  const params = useParams()
  const router = useRouter()
  const eventId = params.id as string

  useEffect(() => {
    router.replace(eventNavHref(eventId, 'credenciamento'))
  }, [eventId, router])

  return null
}
