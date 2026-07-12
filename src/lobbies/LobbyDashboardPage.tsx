import { DashboardPage } from '@/components/layout/DashboardPage'
import { useActiveLobby } from '@/lobbies/LobbyContext'

export function LobbyDashboardPage() {
  const { lobby } = useActiveLobby()
  return <DashboardPage lobby={lobby} />
}
