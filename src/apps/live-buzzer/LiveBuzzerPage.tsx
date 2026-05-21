import {
  Bell,
  Lock,
  RotateCcw,
  Shield,
  Trophy,
  Unlock,
  UsersRound,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'

import { useLiveBuzzer } from '@/apps/live-buzzer/hooks/useLiveBuzzer'
import { FirebaseStatus } from '@/components/shared/FirebaseStatus'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

function formatBuzzTime(value: string | null) {
  if (!value) {
    return '-'
  }

  return new Date(value).toLocaleTimeString()
}

export function LiveBuzzerPage() {
  const {
    buzz,
    clearRound,
    closeRound,
    choosePlayer,
    error,
    isLoading,
    isRealtime,
    maxPlayers,
    minPlayers,
    openRound,
    playerCount,
    players,
    roundNumber,
    saveSelectedName,
    selectedName,
    selectedPlayer,
    selectedPlayerId,
    sessionState,
    setSelectedName,
    updatePlayerCount,
    winner,
  } = useLiveBuzzer()
  const [isAdmin, setIsAdmin] = useState(false)

  const buzzerStatus = useMemo(() => {
    if (winner?.id === selectedPlayerId) {
      return 'Gewonnen'
    }

    if (winner) {
      return 'Gesperrt'
    }

    if (sessionState.isOpen) {
      return 'Bereit'
    }

    return 'Gesperrt'
  }, [selectedPlayerId, sessionState.isOpen, winner])

  const canBuzz = sessionState.isOpen && !winner && Boolean(selectedPlayer)

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6 lg:py-10">
      <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <FirebaseStatus isRealtime={isRealtime} />
          <h1 className="mt-4 text-3xl font-semibold tracking-normal sm:text-4xl">
            Live-Buzzer
          </h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Waehle deine Nutzerkennung, gib dir einen Namen und buzzere in der
            gemeinsamen Quizrunde.
          </p>
        </div>
        <Badge variant={sessionState.isOpen ? 'default' : 'secondary'}>
          Runde {roundNumber} · {sessionState.isOpen ? 'Freigegeben' : 'Gesperrt'}
        </Badge>
      </section>

      {error && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle>Firebase-Fehler</CardTitle>
            <CardDescription>{error.message}</CardDescription>
          </CardHeader>
        </Card>
      )}

      <section className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="size-5 text-primary" />
              Buzzer
            </CardTitle>
            <CardDescription>
              {isLoading ? 'Synchronisiere...' : 'Standard-Session: default'}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-5">
            <div className="rounded-lg bg-secondary p-5">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-sm text-muted-foreground">
                    Aktiver Nutzer
                  </div>
                  <div className="mt-1 text-2xl font-semibold">
                    {selectedPlayer?.name ?? selectedName}
                  </div>
                </div>
                <Badge variant={buzzerStatus === 'Bereit' ? 'default' : 'secondary'}>
                  {buzzerStatus}
                </Badge>
              </div>
            </div>

            <Button
              className={cn(
                'h-48 rounded-lg text-3xl font-semibold shadow-sm sm:h-64 sm:text-5xl',
                winner?.id === selectedPlayerId &&
                  'bg-accent text-accent-foreground hover:bg-accent/90',
              )}
              disabled={!canBuzz}
              onClick={async () => {
                const didWin = await buzz()

                if (didWin) {
                  toast.success('Buzz registriert.')
                } else {
                  toast.error('Diese Runde ist bereits gesperrt.')
                }
              }}
            >
              <Bell className="size-10 sm:size-12" />
              BUZZ
            </Button>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border p-4">
                <div className="text-sm text-muted-foreground">Gewinner</div>
                <div className="mt-1 min-h-7 text-xl font-semibold">
                  {winner?.name ?? '-'}
                </div>
              </div>
              <div className="rounded-lg border p-4">
                <div className="text-sm text-muted-foreground">Buzz-Zeit</div>
                <div className="mt-1 min-h-7 text-xl font-semibold tabular-nums">
                  {formatBuzzTime(sessionState.lastBuzzedAt)}
                </div>
              </div>
              <div className="rounded-lg border p-4">
                <div className="text-sm text-muted-foreground">Spieler</div>
                <div className="mt-1 min-h-7 text-xl font-semibold tabular-nums">
                  {playerCount}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UsersRound className="size-5 text-primary" />
                Meine Kennung
              </CardTitle>
              <CardDescription>
                Die Auswahl wird lokal auf diesem Geraet gespeichert.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="player-select">Nutzer</Label>
                <Select value={selectedPlayerId} onValueChange={choosePlayer}>
                  <SelectTrigger id="player-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {players.map((player) => (
                      <SelectItem key={player.id} value={player.id}>
                        Nutzer {player.position} · {player.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="player-name">Name</Label>
                <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                  <Input
                    id="player-name"
                    value={selectedName}
                    onBlur={() => {
                      saveSelectedName()
                    }}
                    onChange={(event) => setSelectedName(event.target.value)}
                  />
                  <Button
                    variant="outline"
                    onClick={() => {
                      saveSelectedName()
                      toast.success('Name gespeichert.')
                    }}
                  >
                    Speichern
                  </Button>
                </div>
              </div>

              <Separator />

              <Button
                variant={isAdmin ? 'default' : 'outline'}
                role="switch"
                aria-checked={isAdmin}
                onClick={() => setIsAdmin((current) => !current)}
              >
                <Shield className="size-4" />
                Admin-Modus {isAdmin ? 'aktiv' : 'aus'}
              </Button>
            </CardContent>
          </Card>

          {isAdmin && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="size-5 text-primary" />
                  Admin
                </CardTitle>
                <CardDescription>
                  Freigeben, sperren und Spieleranzahl einstellen.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    onClick={() => {
                      openRound()
                      toast.success('Runde freigegeben.')
                    }}
                  >
                    <Unlock className="size-4" />
                    Freigeben
                  </Button>
                  <Button variant="outline" onClick={closeRound}>
                    <Lock className="size-4" />
                    Sperren
                  </Button>
                </div>
                <Button variant="outline" onClick={clearRound}>
                  <RotateCcw className="size-4" />
                  Gewinner zuruecksetzen
                </Button>

                <div className="grid gap-2">
                  <Label htmlFor="player-count">Spieleranzahl</Label>
                  <Input
                    id="player-count"
                    type="number"
                    min={minPlayers}
                    max={maxPlayers}
                    value={playerCount}
                    onChange={(event) =>
                      updatePlayerCount(Number(event.target.value))
                    }
                  />
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </section>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="size-5 text-primary" />
            Spieleruebersicht
          </CardTitle>
          <CardDescription>
            Reihenfolge, Namen und Buzz-Status der aktuellen Runde.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {players.map((player) => {
            const isWinner = winner?.id === player.id

            return (
              <div
                key={player.id}
                className={cn(
                  'rounded-lg border p-4 transition-colors',
                  selectedPlayerId === player.id && 'border-primary/60 bg-primary/5',
                  isWinner && 'border-accent bg-accent/10',
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm text-muted-foreground">
                      Nutzer {player.position}
                    </div>
                    <div className="mt-1 text-lg font-semibold">
                      {player.name}
                    </div>
                  </div>
                  {isWinner ? (
                    <Badge>
                      <Trophy className="size-3.5" />
                      Gewinner
                    </Badge>
                  ) : (
                    <Badge variant={player.buzzedAt ? 'secondary' : 'outline'}>
                      {player.buzzedAt ? 'Gebuzzert' : 'Bereit'}
                    </Badge>
                  )}
                </div>
                <div className="mt-3 text-sm text-muted-foreground tabular-nums">
                  Buzz: {formatBuzzTime(player.buzzedAt)}
                </div>
              </div>
            )
          })}
        </CardContent>
      </Card>
    </div>
  )
}
