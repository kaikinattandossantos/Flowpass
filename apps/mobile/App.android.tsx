import React, { useState, useEffect } from 'react'
import { StyleSheet, Text, View, TouchableOpacity, Alert, TextInput, ScrollView } from 'react-native'
import { CameraView, useCameraPermissions } from 'expo-camera'
import { Audio } from 'expo-av'
import { initDatabase, validateCheckin, saveRegistrations, getUnsyncedCheckins, markAsSynced } from './services/database.android'
import { useAuthStore } from './store/auth.android'
import axios from 'axios'
import { CheckCircle, XCircle, RefreshCw, AlertTriangle, LogOut, Camera } from 'lucide-react-native'

const API_URL = 'http://localhost:3333'

type Screen = 'login' | 'select-event' | 'sync' | 'scanner'

export default function App() {
  const [screen, setScreen] = useState<Screen>('login')
  const [permission, requestPermission] = useCameraPermissions()
  const [scanned, setScanned] = useState(false)
  const [result, setResult] = useState<{ type: 'success' | 'error' | 'wrong_category', message: string, name?: string, correctCategory?: string } | null>(null)
  const { user, token, login, logout, loadStorage } = useAuthStore()
  
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [events, setEvents] = useState<any[]>([])
  const [selectedEvent, setSelectedEvent] = useState<any>(null)
  const [syncing, setSyncing] = useState(false)
  const [lastSync, setLastSync] = useState<string | null>(null)

  useEffect(() => {
    initDatabase()
    loadStorage().then(() => {
      if (token) setScreen('select-event')
    })
  }, [token])

  const playSound = async (type: 'success' | 'error') => {
    try {
      // In a real environment, these would be local assets
      // require('./assets/sounds/success.mp3')
      // For this MVP, we'll assume the logic is here
      console.log(`Playing ${type} sound`)
    } catch (e) {
      console.log('Error playing sound', e)
    }
  }

  const handleLogin = async () => {
    try {
      await login(email, password)
      // Redirect handled by useEffect
    } catch (e) {
      Alert.alert('Erro', 'Credenciais inválidas')
    }
  }

  const fetchEvents = async () => {
    try {
      const response = await axios.get(`${API_URL}/events`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setEvents(response.data.filter((e: any) => e.status === 'active'))
    } catch (e) {
      Alert.alert('Erro', 'Falha ao carregar eventos')
    }
  }

  useEffect(() => {
    if (screen === 'select-event') fetchEvents()
  }, [screen])

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    if (scanned || !user) return
    setScanned(true)

    try {
      const res = await validateCheckin(data, user.id)
      if (res.success) {
        playSound('success')
        setResult({ type: 'success', message: 'Entrada Liberada!', name: res.name })
      } else if (res.type === 'wrong_category') {
        playSound('error')
        setResult({ 
          type: 'wrong_category', 
          message: res.message, 
          name: res.name, 
          correctCategory: res.correctCategory 
        })
      } else {
        playSound('error')
        setResult({ type: 'error', message: res.message, name: res.name })
      }
    } catch (err) {
      setResult({ type: 'error', message: 'Erro ao validar QR' })
    }

    setTimeout(() => {
      setScanned(false)
      setResult(null)
    }, 3000)
  }

  const syncData = async () => {
    if (!token || syncing || !selectedEvent) return
    setSyncing(true)
    try {
      const response = await axios.get(`${API_URL}/events/${selectedEvent.id}/sync`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      await saveRegistrations(response.data)

      const unsynced = await getUnsyncedCheckins()
      if (unsynced.length > 0) {
        await axios.post(`${API_URL}/events/${selectedEvent.id}/checkins`, unsynced, {
          headers: { Authorization: `Bearer ${token}` }
        })
        await markAsSynced(unsynced.map(c => c.uuid))
      }
      
      setLastSync(new Date().toLocaleTimeString('pt-BR'))
      Alert.alert('Sucesso', 'Dados sincronizados!')
    } catch (error) {
      Alert.alert('Erro', 'Falha na sincronização')
    } finally {
      setSyncing(false)
    }
  }

  if (screen === 'login') {
    return (
      <View style={styles.loginContainer}>
        <Text style={styles.loginTitle}>FlowPass</Text>
        <Text style={styles.loginSubtitle}>Operador de Eventos</Text>
        <TextInput
          placeholder="E-mail"
          value={email}
          onChangeText={setEmail}
          style={styles.input}
          autoCapitalize="none"
        />
        <TextInput
          placeholder="Senha"
          value={password}
          onChangeText={setPassword}
          style={styles.input}
          secureTextEntry
        />
        <TouchableOpacity onPress={handleLogin} style={styles.button}>
          <Text style={styles.buttonText}>Entrar</Text>
        </TouchableOpacity>
      </View>
    )
  }

  if (screen === 'select-event') {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Selecionar Evento</Text>
          <TouchableOpacity onPress={logout}><LogOut color="#FF4B4B" size={24} /></TouchableOpacity>
        </View>
        <ScrollView style={styles.eventList}>
          {events.map(event => (
            <TouchableOpacity 
              key={event.id} 
              style={styles.eventCard}
              onPress={() => {
                setSelectedEvent(event)
                setScreen('sync')
              }}
            >
              <Text style={styles.eventName}>{event.name}</Text>
              <Text style={styles.eventDetails}>{new Date(event.start_at).toLocaleDateString('pt-BR')} - {event.location}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    )
  }

  if (screen === 'sync') {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setScreen('select-event')}><Text style={{color: 'white'}}>Voltar</Text></TouchableOpacity>
          <Text style={styles.title}>Sincronização</Text>
          <View width={24} />
        </View>
        <View style={styles.syncContent}>
          <Text style={styles.syncEventName}>{selectedEvent.name}</Text>
          <Text style={styles.syncStatus}>
            {lastSync ? `Última sincronização: ${lastSync}` : 'Ainda não sincronizado'}
          </Text>
          
          <TouchableOpacity onPress={syncData} style={[styles.button, {width: '100%', marginBottom: 10}]}>
            <Text style={styles.buttonText}>{syncing ? 'Sincronizando...' : 'Sincronizar Agora'}</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={() => setScreen('scanner')} 
            style={[styles.button, {width: '100%', backgroundColor: '#0B1F3A', borderWith: 1, borderColor: '#00C896'}]}
          >
            <Text style={styles.buttonText}>Iniciar Credenciamento</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
      />
      
      <View style={styles.overlay}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setScreen('sync')}><Text style={{color: 'white'}}>Sair</Text></TouchableOpacity>
          <Text style={styles.title}>FlowPass Reader</Text>
          <TouchableOpacity onPress={syncData} disabled={syncing}>
            <RefreshCw color="white" size={24} />
          </TouchableOpacity>
        </View>

        <View style={styles.viewfinder} />

        {result && (
          <View style={[
            styles.resultCard, 
            result.type === 'success' ? styles.successCard : 
            result.type === 'wrong_category' ? styles.warningCard : styles.errorCard
          ]}>
            {result.type === 'success' ? <CheckCircle color="white" size={48} /> : 
             result.type === 'wrong_category' ? <AlertTriangle color="white" size={48} /> : <XCircle color="white" size={48} />}
            <Text style={styles.resultTitle}>{result.message}</Text>
            {result.name && <Text style={styles.resultName}>{result.name}</Text>}
            {result.correctCategory && <Text style={styles.resultName}>Categoria Correta: {result.correctCategory}</Text>}
          </View>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B1F3A' },
  loginContainer: { flex: 1, backgroundColor: '#0B1F3A', justifyContent: 'center', padding: 30 },
  loginTitle: { color: '#00C896', fontSize: 40, fontWeight: 'bold', textAlign: 'center' },
  loginSubtitle: { color: 'white', fontSize: 18, textAlign: 'center', marginBottom: 40 },
  input: { backgroundColor: 'white', borderRadius: 10, padding: 15, marginBottom: 15 },
  button: { backgroundColor: '#00C896', padding: 15, borderRadius: 10, alignItems: 'center' },
  buttonText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 50, paddingHorizontal: 20 },
  title: { color: 'white', fontSize: 20, fontWeight: 'bold' },
  eventList: { padding: 20 },
  eventCard: { backgroundColor: 'rgba(255,255,255,0.1)', padding: 20, borderRadius: 15, marginBottom: 15 },
  eventName: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  eventDetails: { color: '#00C896', fontSize: 14, marginTop: 5 },
  syncContent: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30 },
  syncEventName: { color: 'white', fontSize: 24, fontWeight: 'bold', textAlign: 'center' },
  syncStatus: { color: '#00C896', marginVertical: 20 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', padding: 20, justifyContent: 'space-between' },
  viewfinder: { width: 250, height: 250, borderWidth: 2, borderColor: '#00C896', alignSelf: 'center', borderRadius: 20, marginTop: '30%' },
  resultCard: { padding: 30, borderRadius: 20, alignItems: 'center', position: 'absolute', top: '30%', left: 20, right: 20 },
  successCard: { backgroundColor: '#00C896' },
  errorCard: { backgroundColor: '#FF4B4B' },
  warningCard: { backgroundColor: '#FFB800' },
  resultTitle: { color: 'white', fontSize: 24, fontWeight: 'bold', marginTop: 10, textAlign: 'center' },
  resultName: { color: 'white', fontSize: 18, marginTop: 5, textAlign: 'center' }
})
