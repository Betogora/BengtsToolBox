import {
  ChevronDown,
  KeyRound,
  LoaderCircle,
  ShieldCheck,
  Trash2,
  UsersRound,
} from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'

import { AppPage } from '@/apps/shared/components/AppPage'
import { ConfirmButton } from '@/apps/shared/components/ConfirmButton'
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
import {
  deleteLobby,
  getLobbyAdminOverview,
  getLobbyDevices,
  isLobbyAdminPin,
  isLobbyAdminPermissionError,
} from '@/lobbies/adminClient'
import type { Lobby, LobbyDevice } from '@/lobbies/types'

function formatAdminDate(value: string, locale: string) {
  if (!value) return '–'
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value))
}

export function LobbyAdminPage() {
  const { language, t } = useI18n()
  const locale = language === 'de' ? 'de-DE' : 'en-GB'
  const [pin, setPin] = useState('')
  const [isUnlocked, setIsUnlocked] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [lobbies, setLobbies] = useState<Lobby[]>([])
  const [nextLobbyCursor, setNextLobbyCursor] = useState<string | null>(null)
  const [selectedLobbyId, setSelectedLobbyId] = useState<string | null>(null)
  const [devices, setDevices] = useState<LobbyDevice[]>([])
  const [nextDeviceCursor, setNextDeviceCursor] = useState<string | null>(null)

  const loadOverview = async (cursor?: string | null) => {
    const result = await getLobbyAdminOverview({ pin, cursor })
    setLobbies((current) => (cursor ? [...current, ...result.lobbies] : result.lobbies))
    setNextLobbyCursor(result.nextCursor)
  }

  const handleUnlock = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!isLobbyAdminPin(pin)) {
      setIsUnlocked(false)
      toast.error(t('lobbyAdmin.pinError'))
      return
    }

    setIsLoading(true)
    try {
      await loadOverview()
      setIsUnlocked(true)
    } catch (loadError) {
      setIsUnlocked(false)
      toast.error(
        t(
          isLobbyAdminPermissionError(loadError)
            ? 'lobbyAdmin.permissionError'
            : 'lobbyAdmin.loadError',
        ),
      )
    } finally {
      setIsLoading(false)
    }
  }

  const loadDevices = async (lobbyId: string, cursor?: string | null) => {
    setIsLoading(true)
    try {
      const result = await getLobbyDevices({ pin, lobbyId, cursor })
      setSelectedLobbyId(lobbyId)
      setDevices((current) => (cursor ? [...current, ...result.devices] : result.devices))
      setNextDeviceCursor(result.nextCursor)
    } catch (loadError) {
      toast.error(
        t(
          isLobbyAdminPermissionError(loadError)
            ? 'lobbyAdmin.permissionError'
            : 'lobbyAdmin.loadError',
        ),
      )
    } finally {
      setIsLoading(false)
    }
  }

  const removeLobby = async (lobbyId: string) => {
    await deleteLobby({ pin, lobbyId })
    setLobbies((current) => current.filter((lobby) => lobby.id !== lobbyId))
    if (selectedLobbyId === lobbyId) {
      setSelectedLobbyId(null)
      setDevices([])
    }
    toast.success(t('lobbyAdmin.deleted'))
  }

  if (!isUnlocked) {
    return (
      <AppPage>
        <Card className="mx-auto w-full max-w-md">
          <CardHeader>
            <div className="mb-3 flex size-12 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <ShieldCheck className="size-6" />
            </div>
            <CardTitle>{t('lobbyAdmin.title')}</CardTitle>
            <CardDescription>{t('lobbyAdmin.unlockDescription')}</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="grid gap-4" onSubmit={handleUnlock}>
              <IftaInput
                autoComplete="current-password"
                autoFocus
                label={t('lobbyAdmin.pin')}
                type="password"
                value={pin}
                onChange={(event) => setPin(event.currentTarget.value)}
              />
              <Button disabled={isLoading} type="submit">
                {isLoading ? <LoaderCircle className="animate-spin" /> : <KeyRound />}
                {t('lobbyAdmin.unlock')}
              </Button>
            </form>
          </CardContent>
        </Card>
      </AppPage>
    )
  }

  const selectedLobby = lobbies.find((lobby) => lobby.id === selectedLobbyId)

  return (
    <AppPage width="wide">
      <section className="flex items-center gap-3">
        <ShieldCheck className="size-9 text-primary" />
        <h1 className="type-page-title">{t('lobbyAdmin.title')}</h1>
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(22rem,0.9fr)]">
        <Card>
          <CardHeader>
            <CardTitle>{t('lobbyAdmin.allLobbies')}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            {lobbies.map((lobby) => (
              <div
                key={lobby.id}
                className="flex flex-col gap-3 rounded-lg border bg-background/65 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <button
                  className="min-w-0 flex-1 text-left outline-none focus-visible:ring-[3px] focus-visible:ring-ring/45"
                  onClick={() => void loadDevices(lobby.id)}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="type-action truncate">{lobby.name}</span>
                    <Badge variant={lobby.kind === 'default' ? 'default' : 'secondary'}>
                      {lobby.code}
                    </Badge>
                  </div>
                  <div className="type-caption mt-1 text-muted-foreground">
                    {lobby.kind === 'default'
                      ? t('lobby.defaultDescription')
                      : formatAdminDate(lobby.createdAtClientIso, locale)}
                  </div>
                </button>

                <div className="flex items-center gap-2">
                  <Button variant="outline" onClick={() => void loadDevices(lobby.id)}>
                    <UsersRound />
                    {t('lobbyAdmin.devices')}
                  </Button>
                  {lobby.kind !== 'default' && (
                    <ConfirmButton
                      confirmLabel={t('common.delete')}
                      description={t('lobbyAdmin.deleteDescription', { name: lobby.name })}
                      title={t('lobbyAdmin.deleteTitle')}
                      onConfirm={() => removeLobby(lobby.id)}
                      trigger={
                        <Button
                          aria-label={t('lobbyAdmin.deleteAria', { name: lobby.name })}
                          size="icon"
                          variant="delete"
                        >
                          <Trash2 />
                        </Button>
                      }
                    />
                  )}
                </div>
              </div>
            ))}

            {nextLobbyCursor && (
              <Button
                disabled={isLoading}
                variant="outline"
                onClick={() => void loadOverview(nextLobbyCursor)}
              >
                <ChevronDown />
                {t('lobbyAdmin.loadMore')}
              </Button>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{selectedLobby?.name ?? t('lobbyAdmin.deviceHistory')}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            {!selectedLobby && (
              <p className="type-ui text-muted-foreground">{t('lobbyAdmin.selectLobby')}</p>
            )}
            {selectedLobby && devices.length === 0 && !isLoading && (
              <p className="type-ui text-muted-foreground">{t('lobbyAdmin.noDevices')}</p>
            )}
            {devices.map((device) => (
              <div key={device.deviceId} className="grid gap-1 rounded-lg border p-3">
                <div className="type-action">{device.deviceName}</div>
                <code className="type-caption break-all text-muted-foreground">
                  {device.deviceId}
                </code>
                <div className="type-caption mt-1 text-muted-foreground">
                  {t('lobbyAdmin.firstSeen')}: {formatAdminDate(device.firstSeenAtIso, locale)}
                </div>
                <div className="type-caption text-muted-foreground">
                  {t('lobbyAdmin.lastSeen')}: {formatAdminDate(device.lastSeenAtIso, locale)}
                </div>
              </div>
            ))}
            {nextDeviceCursor && selectedLobbyId && (
              <Button
                disabled={isLoading}
                variant="outline"
                onClick={() => void loadDevices(selectedLobbyId, nextDeviceCursor)}
              >
                <ChevronDown />
                {t('lobbyAdmin.loadMore')}
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </AppPage>
  )
}
