import { LoaderCircle, RadioTower, TriangleAlert } from 'lucide-react'
import { Link, Outlet, useParams } from 'react-router-dom'

import { AppPage } from '@/apps/shared/components/AppPage'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LobbyProvider } from '@/lobbies/LobbyProvider'
import { useLobbyDirectory } from '@/lobbies/useLobbyDirectory'
import { useTrackLobbyDevice } from '@/lobbies/useTrackLobbyDevice'
import { syncErrorMessageKey } from '@/lib/firebase/syncError'
import { useI18n } from '@/lib/i18n'

export function LobbyRoute() {
  const { t } = useI18n()
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
            {t('lobby.loading')}
          </CardContent>
        </Card>
      </AppPage>
    )
  }

  if (directory.error || !lobby) {
    return (
      <AppPage>
        <Card className="border-destructive/45">
          <CardHeader>
            <TriangleAlert className="mb-2 size-8 text-destructive" />
            <CardTitle>{t(directory.error ? 'common.firebaseError' : 'lobby.notFound')}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <p className="type-ui text-muted-foreground">
              {directory.error ? t(syncErrorMessageKey(directory.error)) : t('lobby.notFoundDescription')}
            </p>
            <Button asChild className="w-fit">
              <Link to="/lobbies">{t('lobby.back')}</Link>
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
            <CardTitle>{t('lobby.firebaseRequiredTitle')}</CardTitle>
          </CardHeader>
          <CardContent>
            {t('lobby.firebaseRequired')}
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
