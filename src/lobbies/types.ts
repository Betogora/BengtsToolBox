export const DEFAULT_LOBBY_ID = 'default'

export type LobbyKind = 'default' | 'custom'

export type Lobby = {
  id: string
  code: string
  name: string
  kind: LobbyKind
  createdAtClientIso: string
  createdByDeviceId: string | null
  deletedAtClientIso?: string
  deletedByDeviceId?: string
}

export function isActiveLobby(lobby: Lobby) {
  return !lobby.deletedAtClientIso
}

export type LobbyDevice = {
  deviceId: string
  deviceName: string
  firstSeenAtIso: string
  lastSeenAtIso: string
}

export const defaultLobby: Lobby = {
  id: DEFAULT_LOBBY_ID,
  code: 'DEFAULT',
  name: 'Globale Lobby',
  kind: 'default',
  createdAtClientIso: '1970-01-01T00:00:00.000Z',
  createdByDeviceId: null,
}
