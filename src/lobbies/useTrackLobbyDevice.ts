import { doc, runTransaction, serverTimestamp } from 'firebase/firestore'
import { useEffect } from 'react'

import { getFirebaseServices } from '@/lib/firebase/client'
import { firebasePaths } from '@/lib/firebase/paths'
import { useAnonymousSession } from '@/lib/firebase/useAnonymousSession'
import { readDeviceName } from '@/lobbies/deviceIdentity'
import { ensureDefaultLobbyDocument } from '@/lobbies/repository'

const activityThrottleMs = 5 * 60 * 1000
const activityTimes = new Map<string, number>()

function activityKey(lobbyId: string) {
  return `bengts-toolbox:lobby-activity:${lobbyId}`
}

export function useTrackLobbyDevice(lobbyId?: string) {
  const session = useAnonymousSession()

  useEffect(() => {
    const services = getFirebaseServices()

    if (!lobbyId || !services || !session.isReady || !session.user) {
      return
    }

    const key = activityKey(lobbyId)
    let lastTrackedAt = activityTimes.get(key) ?? 0
    try {
      lastTrackedAt = Math.max(lastTrackedAt, Number(window.sessionStorage.getItem(key) ?? 0))
    } catch { /* Tracking also works when browser storage is blocked. */ }
    const now = Date.now()

    if (now - lastTrackedAt < activityThrottleMs) {
      return
    }

    activityTimes.set(key, now)
    try {
      window.sessionStorage.setItem(key, String(now))
    } catch { /* The in-memory timestamp still throttles requests. */ }
    const deviceName = readDeviceName(session.user.uid).value
    const clientIso = new Date(now).toISOString()
    const reference = doc(
      services.db,
      firebasePaths.lobbyDevice(lobbyId, session.user.uid),
    )

    const trackDevice = async () => {
      if (lobbyId === 'default') {
        await ensureDefaultLobbyDocument()
      }

      await runTransaction(services.db, async (transaction) => {
        const snapshot = await transaction.get(reference)

        if (snapshot.exists()) {
          transaction.update(reference, {
            deviceName,
            lastSeenAt: serverTimestamp(),
            lastSeenAtClientIso: clientIso,
          })
        } else {
          transaction.set(reference, {
            deviceId: session.user!.uid,
            deviceName,
            firstSeenAt: serverTimestamp(),
            firstSeenAtClientIso: clientIso,
            lastSeenAt: serverTimestamp(),
            lastSeenAtClientIso: clientIso,
          })
        }
      })
    }

    trackDevice().catch(() => {
      activityTimes.delete(key)
      try {
        window.sessionStorage.removeItem(key)
      } catch { /* Storage is optional for activity tracking. */ }
    })
  }, [lobbyId, session.isReady, session.user])
}
