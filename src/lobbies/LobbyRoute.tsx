import { LoaderCircle, RadioTower, TriangleAlert } from 'lucide-react'
import { Link, Outlet, useParams } from 'react-router-dom'

import { AppPage } from '@/apps/shared/components/AppPage'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LobbyProvider } from '@/lobbies/LobbyProvider'
import { useLobbyDirectory } from '@/lobbies/useLobbyDirectory'
import { useTrackLobbyDevice } from '@/lobbies/useTrackLobbyDevice'

export function LobbyRoute() {
  const { lobbyId = '' } = useParams()
  const directory = useLobbyDirectory()
  const lobby = directory.lobbies.find((entry) => entry.id === lobbyId)

  useTrackLobbyDevice(lobby?.id)

  if (directory.isLoading) {
    return (
      <AppPage>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6 text-muted-foreground">
            <LoaderCircle className="size-5 animate-spin" />
            Lobby wird geladen...
          </CardContent>
        </Card>
      </AppPage>
    )
  }

  if (!lobby) {
    return (
      <AppPage>
        <Card className="border-destructive/45">
          <CardHeader>
            <TriangleAlert className="mb-2 size-8 text-destructive" />
            <CardTitle>Lobby nicht gefunden</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <p className="type-ui text-muted-foreground">
              Die Lobby wurde gelöscht oder der Link ist nicht gültig.
            </p>
            <Button asChild className="w-fit">
              <Link to="/lobbies">Zu den Lobbys</Link>
            </Button>
          </CardContent>
        </Card>
      </AppPage>
    )
  }

  if (!directory.isFirebaseConfigured && lobby.id !== 'default') {
    return (
      <AppPage>
        <Card>
          <CardHeader>
            <RadioTower className="mb-2 size-8 text-primary" />
            <CardTitle>Firebase erforderlich</CardTitle>
          </CardHeader>
          <CardContent>
            Zentrale Lobbys sind im lokalen Modus nicht verfügbar.
          </CardContent>
        </Card>
      </AppPage>
    )
  }

  return (
    <LobbyProvider lobby={lobby}>
      <Outlet />
    </LobbyProvider>
  )
}
