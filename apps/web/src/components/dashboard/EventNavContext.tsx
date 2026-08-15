'use client'

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from 'react'
import { usePathname } from 'next/navigation'
import axios from 'axios'
import { API_URL, authHeaders } from '@/lib/api'
import { parseEventIdFromPath } from '@/lib/event-navigation'

export interface EventNavSummary {
  id: string
  name: string
}

interface EventNavContextValue {
  eventId: string | null
  event: EventNavSummary | null
  loading: boolean
}

const eventNavCache = new Map<string, EventNavSummary>()
const eventNavFailed = new Set<string>()

const EventNavContext = createContext<EventNavContextValue>({
  eventId: null,
  event: null,
  loading: false
})

export function EventNavProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const eventId = parseEventIdFromPath(pathname)
  const [cacheVersion, setCacheVersion] = useState(0)

  useEffect(() => {
    if (!eventId || eventNavCache.has(eventId) || eventNavFailed.has(eventId)) return

    let cancelled = false

    void axios
      .get(`${API_URL}/events/${eventId}`, { headers: authHeaders() })
      .then((response) => {
        if (cancelled) return
        eventNavCache.set(eventId, {
          id: response.data.id,
          name: response.data.name
        })
        setCacheVersion((value) => value + 1)
      })
      .catch(() => {
        if (cancelled) return
        eventNavFailed.add(eventId)
        setCacheVersion((value) => value + 1)
      })

    return () => {
      cancelled = true
    }
  }, [eventId])

  const value = useMemo(() => {
    void cacheVersion
    const cachedEvent = eventId ? eventNavCache.get(eventId) ?? null : null
    return {
      eventId,
      event: cachedEvent,
      loading: Boolean(
        eventId &&
          !cachedEvent &&
          !eventNavFailed.has(eventId)
      )
    }
  }, [eventId, cacheVersion])

  return (
    <EventNavContext.Provider value={value}>
      {children}
    </EventNavContext.Provider>
  )
}

export function useEventNav() {
  return useContext(EventNavContext)
}
