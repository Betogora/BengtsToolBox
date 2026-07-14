import { doc, runTransaction, serverTimestamp } from 'firebase/firestore'
import { useEffect } from 'react'

import { getFirebaseServices } from '@/lib/firebase/client'
import { firebasePaths } from '@/lib/firebase/paths'
import { useAnonymousSession } from '@/lib/firebase/useAnonymousSession'
import { readDeviceName } from '@/lobbies/deviceIdentity'
import { ensureDefaultLobbyDocument } from '@/lobbies/repository'

const activityThrottleMs = 5 * 60 * 1000

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
    const lastTrackedAt = Number(window.sessionStorage.getItem(key) ?? 0)
    const now = Date.now()

    if (now - lastTrackedAt < activityThrottleMs) {
      return
    }

    window.sessionStorage.setItem(key, String(now))
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
      window.sessionStorage.removeItem(key)
    })
  }, [lobbyId, session.isReady, session.user])
}
