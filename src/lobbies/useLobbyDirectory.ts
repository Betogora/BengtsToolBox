import { collection, doc, onSnapshot, runTransaction, serverTimestamp, setDoc } from 'firebase/firestore'
import { useCallback, useEffect, useState } from 'react'

import {
  ensureAnonymousUser,
  getFirebaseServices,
  isFirebaseConfigured,
} from '@/lib/firebase/client'
import { firebasePaths } from '@/lib/firebase/paths'
import { createSyncError, type SyncError } from '@/lib/firebase/syncError'
import {
  createLobbyCode,
  isValidDeviceName,
  isValidLobbyName,
  normalizeDeviceName,
  normalizeLobbyName,
} from '@/lobbies/domain'
import { saveDeviceName } from '@/lobbies/deviceIdentity'
import { ensureDefaultLobbyDocument } from '@/lobbies/repository'
import { defaultLobby, isActiveLobby, type Lobby } from '@/lobbies/types'

type CreateLobbyInput = {
  lobbyName: string
  deviceName: string
}

export function useLobbyDirectory() {
  const [lobbies, setLobbies] = useState<Lobby[]>([defaultLobby])
  const [isLoading, setIsLoading] = useState(isFirebaseConfigured)
  const [error, setError] = useState<SyncError | null>(null)

  useEffect(() => {
    const services = getFirebaseServices()

    if (!services) {
      return undefined
    }

    let unsubscribe: (() => void) | undefined
    let isActive = true

    ensureAnonymousUser()
      .then(ensureDefaultLobbyDocument)
      .then(() => {
        if (!isActive) {
          return
        }

        unsubscribe = onSnapshot(
          collection(services.db, firebasePaths.lobbies()),
          (snapshot) => {
            const nextLobbies = snapshot.docs
              .map((entry) => ({ id: entry.id, ...entry.data() }) as Lobby)
              .filter(isActiveLobby)
              .sort((left, right) => {
                if (left.id === defaultLobby.id) return -1
                if (right.id === defaultLobby.id) return 1
                return right.createdAtClientIso.localeCompare(left.createdAtClientIso)
              })

            setLobbies(nextLobbies)
            setIsLoading(false)
          },
          (snapshotError) => {
            setError(createSyncError(snapshotError, 'snapshot', 'subscribe'))
            setIsLoading(false)
          },
        )
      })
      .catch((setupError: unknown) => {
        setError(createSyncError(setupError, 'auth', 'subscribe'))
        setIsLoading(false)
      })

    return () => {
      isActive = false
      unsubscribe?.()
    }
  }, [])

  const createLobby = useCallback(async ({ lobbyName, deviceName }: CreateLobbyInput) => {
    if (!isFirebaseConfigured) {
      throw new Error('Zentrale Lobbys benötigen eine Firebase-Konfiguration.')
    }

    if (!isValidLobbyName(lobbyName) || !isValidDeviceName(deviceName)) {
      throw new Error('Lobby- und Gerätename sind nicht gültig.')
    }

    const services = getFirebaseServices()
    const user = await ensureAnonymousUser()

    if (!services || !user) {
      throw new Error('Die anonyme Firebase-Sitzung ist nicht verfügbar.')
    }

    const deviceNameResult = saveDeviceName(normalizeDeviceName(deviceName))
    const normalizedDeviceName = deviceNameResult.value
    if (!deviceNameResult.ok) setError(deviceNameResult.error)
    const normalizedLobbyName = normalizeLobbyName(lobbyName)

    for (let attempt = 0; attempt < 10; attempt += 1) {
      const code = createLobbyCode()
      const reference = doc(services.db, firebasePaths.lobby(code))
      const createdAtClientIso = new Date().toISOString()
      const created = await runTransaction(services.db, async (transaction) => {
        const snapshot = await transaction.get(reference)

        if (snapshot.exists()) {
          return false
        }

        transaction.set(reference, {
          id: code,
          code,
          name: normalizedLobbyName,
          kind: 'custom',
          createdAt: serverTimestamp(),
          createdAtClientIso,
          createdByDeviceId: user.uid,
        })

        return true
      })

      if (created) {
        await setDoc(doc(services.db, firebasePaths.lobbyDevice(code, user.uid)), {
          deviceId: user.uid,
          deviceName: normalizedDeviceName,
          firstSeenAt: serverTimestamp(),
          firstSeenAtClientIso: createdAtClientIso,
          lastSeenAt: serverTimestamp(),
          lastSeenAtClientIso: createdAtClientIso,
        })
        return code
      }
    }

    throw new Error('Es konnte kein freier Lobbycode erzeugt werden.')
  }, [])

  return {
    createLobby,
    error,
    isFirebaseConfigured,
    isLoading,
    lobbies,
  }
}
