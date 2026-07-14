import {
  ArrowRight,
  Globe2,
  Plus,
  RadioTower,
  ShieldCheck,
  UsersRound,
} from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import { AppPage } from '@/apps/shared/components/AppPage'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { IftaInput } from '@/components/ui/ifta-field'
import { useI18n } from '@/lib/i18n'
import { syncErrorMessageKey } from '@/lib/firebase/syncError'
import { useAnonymousSession } from '@/lib/firebase/useAnonymousSession'
import {
  deviceNameMaxLength,
  isValidDeviceName,
  isValidLobbyName,
  lobbyNameMaxLength,
} from '@/lobbies/domain'
import { useDeviceName } from '@/lobbies/deviceIdentity'
import { useLobbyDirectory } from '@/lobbies/useLobbyDirectory'

export function LobbyDirectoryPage() {
  const { formatDateTime, t } = useI18n()
  const navigate = useNavigate()
  const session = useAnonymousSession()
  const directory = useLobbyDirectory()
  const identity = useDeviceName(session.userId)
  const [lobbyName, setLobbyName] = useState('')
  const [deviceName, setDeviceNameInput] = useState(identity.deviceName)
  const [isCreating, setIsCreating] = useState(false)
  const syncError = directory.error ?? session.error ?? identity.error

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!isValidLobbyName(lobbyName) || !isValidDeviceName(deviceName)) {
      toast.error(t('lobby.validationError'))
      return
    }

    setIsCreating(true)
    try {
      identity.setDeviceName(deviceName)
      const lobbyId = await directory.createLobby({ lobbyName, deviceName })
      toast.success(t('lobby.created'))
      navigate(`/lobbies/${lobbyId}`)
    } catch (creationError) {
      toast.error(
        creationError instanceof Error ? creationError.message : t('lobby.createError'),
      )
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <AppPage width="wide">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-3">
          <UsersRound className="size-9 text-primary" />
          <h1 className="type-page-title">{t('lobby.title')}</h1>
        </div>

        <Button asChild className="self-start" variant="outline">
          <Link to="/lobby-admin">
            <ShieldCheck />
            {t('nav.lobbyAdmin')}
          </Link>
        </Button>
      </section>

      {!directory.isFirebaseConfigured && (
        <Card className="border-primary/35 bg-secondary/45">
          <CardContent className="flex gap-3 pt-6">
            <RadioTower className="size-5 shrink-0 text-primary" />
            <p className="type-ui">{t('lobby.firebaseRequired')}</p>
          </CardContent>
        </Card>
      )}

      {syncError && (
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle>{t('common.syncError')}</CardTitle>
            <CardDescription>{t(syncErrorMessageKey(syncError))}</CardDescription>
          </CardHeader>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="size-5 text-primary" />
            {t('lobby.createTitle')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3 md:grid-cols-[1fr_1fr_auto]" onSubmit={handleCreate}>
            <IftaInput
              label={t('lobby.name')}
              maxLength={lobbyNameMaxLength}
              value={lobbyName}
              onChange={(event) => setLobbyName(event.currentTarget.value)}
            />
            <IftaInput
              label={t('lobby.deviceName')}
              maxLength={deviceNameMaxLength}
              value={deviceName}
              onChange={(event) => setDeviceNameInput(event.currentTarget.value)}
            />
            <Button
              className="h-11"
              disabled={!directory.isFirebaseConfigured || isCreating}
              type="submit"
            >
              <Plus />
              {isCreating ? t('lobby.creating') : t('lobby.create')}
            </Button>
          </form>
        </CardContent>
      </Card>

      <section className="grid gap-4">
        <h2 className="type-section-title">{t('lobby.publicTitle')}</h2>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {directory.lobbies.map((lobby) => (
            <Link
              key={lobby.id}
              className="group rounded-lg outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
              to={`/lobbies/${lobby.id}`}
            >
              <Card className="h-full transition-all group-hover:-translate-y-0.5 group-hover:border-primary/45">
                <CardHeader>
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <span className="flex size-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
                      {lobby.kind === 'default' ? <Globe2 /> : <UsersRound />}
                    </span>
                    <Badge variant={lobby.kind === 'default' ? 'default' : 'secondary'}>
                      {lobby.code}
                    </Badge>
                  </div>
                  <CardTitle>{lobby.name}</CardTitle>
                  <CardDescription>
                    {lobby.kind === 'default'
                      ? t('lobby.defaultDescription')
                      : formatDateTime(new Date(lobby.createdAtClientIso), {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex items-center justify-between text-primary">
                  <span className="type-action">{t('lobby.open')}</span>
                  <ArrowRight className="size-5 transition-transform group-hover:translate-x-1" />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>
    </AppPage>
  )
}
