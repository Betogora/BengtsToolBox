import type { Database } from 'firebase/database'
import { useCallback, useEffect, useEffectEvent, useRef, useState } from 'react'
import { ensureAnonymousUser, isFirebaseConfigured } from './client'
import { readLocalValue, writeLocalValue } from './localStore'
import { getRealtimeDatabase, updateRealtimeValue } from './realtimeDatabase'
import { createSyncError, syncFailure, syncSuccess, type SyncError } from './syncError'

export function useRealtimeDatabaseDoc<T>(path: string, initialValue: T, loadInitialValue: () => Promise<T>) {
  const localKey = `app-hub:realtime:${path}`
  const initial = useEffectEvent(() => initialValue)
  const load = useEffectEvent(loadInitialValue)
  const [cached] = useState(() => readLocalValue(localKey, initialValue))
  const [data, setData] = useState(cached.value)
  const current = useRef(data)
  const [isLoading, setIsLoading] = useState(isFirebaseConfigured)
  const [pending, setPending] = useState(0)
  const [error, setError] = useState<SyncError | null>(cached.ok ? null : cached.error)
  const [online, setOnline] = useState(!isFirebaseConfigured)
  const [networkOnline, setNetworkOnline] = useState(() => typeof navigator === 'undefined' || navigator.onLine)
  const [storePath, setStorePath] = useState(path)
  if (storePath !== path) {
    const local = readLocalValue(localKey, initialValue)
    setStorePath(path)
    setData(local.value)
    setIsLoading(isFirebaseConfigured)
    setOnline(!isFirebaseConfigured)
    setError(local.ok ? null : local.error)
  }

  useEffect(() => {
    const changed = () => setNetworkOnline(navigator.onLine)
    window.addEventListener('online', changed)
    window.addEventListener('offline', changed)
    return () => { window.removeEventListener('online', changed); window.removeEventListener('offline', changed) }
  }, [])

  useEffect(() => {
    let active = true
    let unsubscribe: (() => void) | undefined
    let connection: (() => void) | undefined
    let disconnect: (() => void) | undefined
    const local = readLocalValue(localKey, initial())
    current.current = local.value
    if (!isFirebaseConfigured) return
    void (async () => {
      try {
        const database: Database = (await getRealtimeDatabase())!
        const { get, goOffline, goOnline, onValue, ref, runTransaction } = await import('firebase/database')
        if (!active) return
        goOnline(database)
        disconnect = () => goOffline(database)
        try { await ensureAnonymousUser() } catch (error) { throw createSyncError(error, 'auth', 'subscribe') }
        if (!active) return
        connection = onValue(ref(database, '.info/connected'), (snapshot) => {
          if (active) setOnline(snapshot.val() === true)
        })
        const reference = ref(database, path)
        if (!(await get(reference)).exists()) {
          const seed = await load()
          if (!active) return
          await runTransaction(reference, (value) => value ?? seed, { applyLocally: false })
        }
        if (!active) return
        unsubscribe = onValue(reference, (snapshot) => {
          if (!active) return
          const value = (snapshot.val() ?? initial()) as T
          current.current = value
          setData(value)
          setIsLoading(false)
          const result = writeLocalValue(localKey, value)
          setError(result.ok ? null : result.error)
        }, (error) => {
          if (active) { setError(createSyncError(error, 'realtime-database', 'subscribe')); setIsLoading(false) }
        })
      } catch (error) {
        if (active) { setError(createSyncError(error, 'realtime-database', 'read')); setIsLoading(false) }
      }
    })()
    return () => { active = false; unsubscribe?.(); connection?.(); disconnect?.() }
  }, [localKey, path])

  const change = useCallback(async (update: (value: T) => T | undefined) => {
    setPending((count) => count + 1)
    try {
      if (isFirebaseConfigured) {
        const result = await updateRealtimeValue<T>((await getRealtimeDatabase())!, path, update)
        setError((current) => current?.source === 'local-storage' ? current : null)
        return syncSuccess(result.committed)
      }
      const next = update(current.current)
      if (next === undefined) return syncSuccess(false)
      const result = writeLocalValue(localKey, next)
      if (!result.ok) { setError(result.error); return syncFailure(false, result.error) }
      current.current = next
      setData(next)
      setError(null)
      return syncSuccess(true)
    } catch (error) {
      const failure = createSyncError(error, 'realtime-database', 'save')
      setError(failure)
      return syncFailure(false, failure)
    } finally { setPending((count) => count - 1) }
  }, [localKey, path])

  return { data, change, isLoading, isPending: pending > 0, error, online: online && networkOnline, isRealtime: isFirebaseConfigured }
}
