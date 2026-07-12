import {
  collection,
  doc,
  getDocs,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore'

import { ensureAnonymousUser, getFirebaseServices } from '@/lib/firebase/client'
import { firebasePaths } from '@/lib/firebase/paths'
import { isActiveLobby, type Lobby, type LobbyDevice } from '@/lobbies/types'

type AdminRequest = {
  pin: string
  cursor?: string | null
}

type AdminLobbyOverview = {
  lobbies: Lobby[]
  nextCursor: null
}

type AdminDeviceOverview = {
  devices: LobbyDevice[]
  nextCursor: null
}

// Deliberately a convenience barrier, not a security boundary. The value is visible
// in the web bundle; Firestore Rules remain responsible for protecting normal data.
export const LOBBY_ADMIN_PIN = '5340'

export function isLobbyAdminPin(pin: string) {
  return pin === LOBBY_ADMIN_PIN
}

export function isLobbyAdminPermissionError(error: unknown) {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'permission-denied'
  )
}

function requireAdminPin(pin: string) {
  if (!isLobbyAdminPin(pin)) {
    throw new Error('Der Admin-PIN ist nicht korrekt.')
  }
}

async function requireFirebase() {
  const services = getFirebaseServices()
  const user = await ensureAnonymousUser()

  if (!services || !user) {
    throw new Error('Die Lobby-Verwaltung benötigt Firebase.')
  }

  return { services, user }
}

export async function getLobbyAdminOverview(request: AdminRequest) {
  requireAdminPin(request.pin)
  const { services } = await requireFirebase()
  const snapshot = await getDocs(collection(services.db, firebasePaths.lobbies()))
  const lobbies = snapshot.docs
    .map((entry) => ({ id: entry.id, ...entry.data() }) as Lobby)
    .filter(isActiveLobby)
    .sort((left, right) => {
      if (left.id === 'default') return -1
      if (right.id === 'default') return 1
      return right.createdAtClientIso.localeCompare(left.createdAtClientIso)
    })

  return { lobbies, nextCursor: null } satisfies AdminLobbyOverview
}

export async function getLobbyDevices(request: AdminRequest & { lobbyId: string }) {
  requireAdminPin(request.pin)
  const { services } = await requireFirebase()
  const snapshot = await getDocs(
    collection(services.db, firebasePaths.lobbyDevices(request.lobbyId)),
  )
  const devices = snapshot.docs
    .map((entry) => {
      const data = entry.data()
      return {
        deviceId: entry.id,
        deviceName: String(data.deviceName ?? entry.id),
        firstSeenAtIso: String(data.firstSeenAtClientIso ?? ''),
        lastSeenAtIso: String(data.lastSeenAtClientIso ?? ''),
      }
    })
    .sort((left, right) => right.lastSeenAtIso.localeCompare(left.lastSeenAtIso))

  return { devices, nextCursor: null } satisfies AdminDeviceOverview
}

export async function deleteLobby(request: { pin: string; lobbyId: string }) {
  requireAdminPin(request.pin)

  if (request.lobbyId === 'default') {
    throw new Error('Die globale Lobby kann nicht entfernt werden.')
  }

  const { services, user } = await requireFirebase()
  const deletedAtClientIso = new Date().toISOString()

  await updateDoc(doc(services.db, firebasePaths.lobby(request.lobbyId)), {
    deletedAt: serverTimestamp(),
    deletedAtClientIso,
    deletedByDeviceId: user.uid,
  })

  return { lobbyId: request.lobbyId }
}
