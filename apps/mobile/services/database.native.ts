import * as SQLite from 'expo-sqlite'
import * as Crypto from 'expo-crypto'

let db: SQLite.SQLiteDatabase | null = null

export async function initDatabase() {
  db = await SQLite.openDatabaseAsync('flowpass.db')
  
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS registrations (
      token TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      status TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS checkins (
      uuid TEXT PRIMARY KEY,
      token TEXT NOT NULL,
      operator_id TEXT NOT NULL,
      checked_at TEXT NOT NULL,
      synced INTEGER DEFAULT 0
    );
  `)
}

export async function saveRegistrations(registrations: Array<{ t: string, n: string, c: string }>) {
  if (!db) return
  
  await db.withTransactionAsync(async () => {
    await db!.runAsync('DELETE FROM registrations')
    for (const reg of registrations) {
      await db!.runAsync(
        'INSERT INTO registrations (token, name, category, status) VALUES (?, ?, ?, ?)',
        [reg.t, reg.n, reg.c, 'confirmed']
      )
    }
  })
}

export async function validateCheckin(token: string, operatorId: string, expectedCategory?: string) {
  if (!db) throw new Error('DB not initialized')

  const registration = await db.getFirstAsync<{ name: string, category: string }>(
    'SELECT name, category FROM registrations WHERE token = ?',
    [token]
  )

  if (!registration) {
    return { success: false, type: 'error', message: 'QR Code Inválido' }
  }

  if (expectedCategory && registration.category !== expectedCategory) {
    return {
      success: false,
      type: 'wrong_category',
      message: `Categoria incorreta.`,
      name: registration.name,
      correctCategory: registration.category
    }
  }

  const existingCheckin = await db.getFirstAsync(
    'SELECT uuid FROM checkins WHERE token = ?',
    [token]
  )

  if (existingCheckin) {
    return { success: false, type: 'error', message: 'Já realizou check-in', name: registration.name }
  }

  const uuid = Crypto.randomUUID()
  const checkedAt = new Date().toISOString()

  await db.runAsync(
    'INSERT INTO checkins (uuid, token, operator_id, checked_at, synced) VALUES (?, ?, ?, ?, 0)',
    [uuid, token, operatorId, checkedAt]
  )

  return { success: true, type: 'success', name: registration.name, category: registration.category }
}

export async function getUnsyncedCheckins() {
  if (!db) return []
  return await db.getAllAsync<{ uuid: string, token: string, checked_at: string }>(
    'SELECT uuid, token as qr_token, checked_at FROM checkins WHERE synced = 0'
  )
}

export async function markAsSynced(uuids: string[]) {
  if (!db || uuids.length === 0) return
  const placeholders = uuids.map(() => '?').join(',')
  await db.runAsync(`UPDATE checkins SET synced = 1 WHERE uuid IN (${placeholders})`, uuids)
}
