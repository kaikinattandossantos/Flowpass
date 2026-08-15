import { useCallback, useEffect, useRef, useState } from 'react'
import { Alert } from 'react-native'
import NetInfo from '@react-native-community/netinfo'
import axios from 'axios'
import { API_URL } from '../config/api'
import {
  getUnsyncedCheckins,
  markAsSynced,
  saveRegistrations,
} from '../services/database'

const AUTO_SYNC_INTERVAL_MS = 30_000

interface EventSummary {
  id: string
}

interface SyncOptions {
  silent?: boolean
}

export function useCredentialSync(token: string | null, selectedEvent: EventSummary | null) {
  const [syncing, setSyncing] = useState(false)
  const [lastSync, setLastSync] = useState<string | null>(null)
  const [pendingCount, setPendingCount] = useState(0)
  const [isConnected, setIsConnected] = useState<boolean | null>(null)
  const syncInFlight = useRef(false)

  const refreshPendingCount = useCallback(async () => {
    const pending = await getUnsyncedCheckins()
    setPendingCount(pending.length)
    return pending
  }, [])

  const syncData = useCallback(async ({ silent = false }: SyncOptions = {}) => {
    if (!token || !selectedEvent || syncInFlight.current) return false

    syncInFlight.current = true
    setSyncing(true)

    try {
      const response = await axios.get(`${API_URL}/events/${selectedEvent.id}/sync`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      await saveRegistrations(response.data)

      const unsynced = await getUnsyncedCheckins()
      if (unsynced.length > 0) {
        await axios.post(`${API_URL}/events/${selectedEvent.id}/checkins`, unsynced, {
          headers: { Authorization: `Bearer ${token}` },
        })
        await markAsSynced(unsynced.map((checkin) => checkin.uuid))
      }

      await refreshPendingCount()
      setLastSync(new Date().toLocaleTimeString('pt-BR'))
      if (!silent) Alert.alert('Sucesso', 'Dados sincronizados!')
      return true
    } catch {
      await refreshPendingCount()
      if (!silent) Alert.alert('Erro', 'Sem conexão com o servidor. Os check-ins continuam salvos no aparelho.')
      return false
    } finally {
      syncInFlight.current = false
      setSyncing(false)
    }
  }, [refreshPendingCount, selectedEvent, token])

  useEffect(() => {
    void refreshPendingCount()
    return NetInfo.addEventListener((state) => {
      setIsConnected(state.isConnected)
    })
  }, [refreshPendingCount])

  useEffect(() => {
    if (isConnected && token && selectedEvent) {
      void syncData({ silent: true })
    }
  }, [isConnected, selectedEvent, syncData, token])

  useEffect(() => {
    if (!isConnected || pendingCount === 0 || !token || !selectedEvent) return

    const interval = setInterval(() => {
      void syncData({ silent: true })
    }, AUTO_SYNC_INTERVAL_MS)

    return () => clearInterval(interval)
  }, [isConnected, pendingCount, selectedEvent, syncData, token])

  return {
    isConnected,
    lastSync,
    pendingCount,
    refreshPendingCount,
    syncData,
    syncing,
  }
}
