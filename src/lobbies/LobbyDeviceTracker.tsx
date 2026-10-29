import { useTrackLobbyDevice } from '@/lobbies/useTrackLobbyDevice'

// Renderless wrapper so the shell can load the Firebase-backed tracking outside the startup bundle.
export function LobbyDeviceTracker({ lobbyId }: { lobbyId?: string }) {
  useTrackLobbyDevice(lobbyId)
  return null
}
