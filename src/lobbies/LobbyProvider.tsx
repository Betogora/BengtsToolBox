import type { PropsWithChildren } from 'react'

import { ActiveLobbyContext } from '@/lobbies/LobbyContext'
import type { Lobby } from '@/lobbies/types'

export function LobbyProvider({ children, lobby }: PropsWithChildren<{ lobby: Lobby }>) {
  return (
    <ActiveLobbyContext.Provider value={{ lobby, isScoped: lobby.id !== 'default' }}>
      {children}
    </ActiveLobbyContext.Provider>
  )
}
