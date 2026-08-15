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
  const [lastAttempt, setLastAttempt] = useState<string | null>(null)
  const [syncError, setSyncError] = useState<string | null>(null)
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
    setLastAttempt(new Date().toLocaleTimeString('pt-BR'))

    try {
      const response = await axios.get(`${API_URL}/events/${selectedEvent.id}/sync`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10_000,
      })
      await saveRegistrations(response.data)

      const unsynced = await getUnsyncedCheckins()
      if (unsynced.length > 0) {
        await axios.post(`${API_URL}/events/${selectedEvent.id}/checkins`, unsynced, {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 10_000,
        })
        await markAsSynced(unsynced.map((checkin) => checkin.uuid))
      }

      await refreshPendingCount()
      setLastSync(new Date().toLocaleTimeString('pt-BR'))
      setSyncError(null)
      if (!silent) Alert.alert('Sucesso', 'Dados sincronizados!')
      return true
    } catch {
      await refreshPendingCount()
      setSyncError('Servidor indisponível; nova tentativa automática em até 30 segundos.')
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
    if (!token || !selectedEvent) return

    const interval = setInterval(() => {
      void refreshPendingCount().then((pending) => {
        if (pending.length > 0) void syncData({ silent: true })
      })
    }, AUTO_SYNC_INTERVAL_MS)

    return () => clearInterval(interval)
  }, [refreshPendingCount, selectedEvent, syncData, token])

  return {
    isConnected,
    lastAttempt,
    lastSync,
    pendingCount,
    refreshPendingCount,
    syncData,
    syncError,
    syncing,
  }
}
