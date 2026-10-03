import { useEffect, useState } from 'react'
import { createClockSample, type ClockSample } from '@/apps/live-buzzer/buzzerLogic'
import { createRandomId } from '@/apps/shared/utils'
import { ensureAnonymousUser } from '@/lib/firebase/client'
import { firebasePaths } from '@/lib/firebase/paths'
import { getRealtimeDatabase, isRealtimeConnected } from '@/lib/firebase/realtimeDatabase'
import { createSyncError, type SyncError } from '@/lib/firebase/syncError'

export function useBuzzerClock(enabled: boolean, online: boolean, syncId: string | null) {
  const [measurement, setMeasurement] = useState<{ clock: ClockSample; syncId: string | null } | null>(null)
  const [error, setError] = useState<SyncError | null>(null)
  useEffect(() => {
    if (!enabled || !online) return
    let active = true
    let measuring = false
    const connectionId = createRandomId()
    let cleanup: (() => void) | undefined
    const sampleClock = async () => {
      if (measuring) return
      measuring = true
      try {
        const database = (await getRealtimeDatabase())!
        const { get, onDisconnect, onValue, ref, serverTimestamp, set } = await import('firebase/database')
        const user = await ensureAnonymousUser()
        if (!active || !user) return
        cleanup ??= onValue(ref(database, '.info/connected'), () => {
          if (active) setMeasurement(null)
        })
        const reference = ref(database, firebasePaths.liveBuzzerClock(user.uid, connectionId))
        await onDisconnect(reference).remove()
        let best: ClockSample | null = null
        for (let i = 0; i < 3 && active; i += 1) {
          if (!(await isRealtimeConnected(database))) break
          const start = performance.now()
          await set(reference, { serverAt: serverTimestamp() })
          const snapshot = await get(reference)
          const end = performance.now()
          const serverMs = snapshot.child('serverAt').val()
          if (!Number.isFinite(serverMs)) throw new Error('Missing server time')
          const sample = createClockSample(start, end, serverMs)
          if (!best || sample.uncertaintyMs < best.uncertaintyMs) best = sample
        }
        if (active && best) { setMeasurement({ clock: best, syncId }); setError(null) }
      } catch (error) {
        if (active) { setMeasurement(null); setError(createSyncError(error, 'realtime-database', 'save')) }
      } finally { measuring = false }
    }
    const visibilityChanged = () => {
      setMeasurement(null)
      if (document.visibilityState === 'visible') void sampleClock()
    }
    void sampleClock()
    const interval = window.setInterval(() => { void sampleClock() }, 30_000)
    document.addEventListener('visibilitychange', visibilityChanged)
    return () => {
      active = false
      cleanup?.()
      window.clearInterval(interval)
      document.removeEventListener('visibilitychange', visibilityChanged)
    }
  }, [enabled, online, syncId])
  return { clock: enabled && online && measurement?.syncId === syncId ? measurement.clock : null, error }
}
