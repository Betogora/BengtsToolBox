import { createContext, useContext } from 'react'

import { defaultLobby, type Lobby } from '@/lobbies/types'

export type LobbyContext = {
  lobby: Lobby
  isScoped: boolean
}

export const ActiveLobbyContext = createContext<LobbyContext>({
  lobby: defaultLobby,
  isScoped: false,
})

export function useActiveLobby() {
  return useContext(ActiveLobbyContext)
}

export function useActiveLobbyId(explicitLobbyId?: string) {
  const { lobby } = useActiveLobby()
  return explicitLobbyId ?? lobby.id
}
