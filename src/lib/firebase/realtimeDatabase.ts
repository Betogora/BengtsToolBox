import type { Database } from 'firebase/database'
import { ensureAnonymousUser, getFirebaseServices } from './client'
import { createSyncError } from './syncError'

export async function getRealtimeDatabase(): Promise<Database | null> {
  const services = getFirebaseServices()
  if (!services) return null
  const url = import.meta.env.VITE_FIREBASE_DATABASE_URL
  if (!url) throw new Error('VITE_FIREBASE_DATABASE_URL fehlt. Live Buzzer ist noch nicht eingerichtet.')
  const { getDatabase } = await import('firebase/database')
  return getDatabase(services.app, url)
}

export async function isRealtimeConnected(database: Database): Promise<boolean> {
  const { onValue, ref } = await import('firebase/database')
  return new Promise((resolve, reject) => onValue(ref(database, '.info/connected'),
    (snapshot) => resolve(snapshot.val() === true), reject, { onlyOnce: true }))
}

export async function updateRealtimeValue<T>(database: Database, path: string, update: (current: T) => T | undefined) {
  const { onValue, ref, runTransaction } = await import('firebase/database')
  try { await ensureAnonymousUser() } catch (error) {
    throw createSyncError(error, 'auth', 'save')
  }
  // Do not enqueue a press or a round change while disconnected.
  if ((typeof navigator !== 'undefined' && navigator.onLine === false) || !(await isRealtimeConnected(database))) {
    throw Object.assign(new Error('Realtime Database ist offline.'), { code: 'network-unavailable' })
  }
  const reference = ref(database, path)
  let unsubscribe: (() => void) | undefined
  try {
    // An active listener retains the server value for the initial transaction callback.
    // A one-off get() alone can leave that callback with null.
    await new Promise<void>((resolve, reject) => {
      unsubscribe = onValue(reference, () => resolve(), reject)
    })
    return await runTransaction(reference, update, { applyLocally: false })
  } finally { unsubscribe?.() }
}
