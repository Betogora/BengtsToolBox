import {
  Bell,
  Crown,
  History,
  Lock,
  Monitor,
  RotateCcw,
  Trophy,
  Unlock,
  UsersRound,
  Volume2,
  VolumeX,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'

import type {
  BuzzerTeamId,
  BuzzerTimestamp,
} from '@/apps/live-buzzer/types'
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

function timestampToDate(value: BuzzerTimestamp, fallbackIso?: string | null) {
  if (typeof value === 'string') {
    return new Date(value)
  }

  if (value && 'toDate' in value) {
    return value.toDate()
  }

  return fallbackIso ? new Date(fallbackIso) : null
}

function formatBuzzTime(value: BuzzerTimestamp, fallbackIso?: string | null) {
  const date = timestampToDate(value, fallbackIso)

  if (!date || Number.isNaN(date.getTime())) {
    return '-'
  }

  return date.toLocaleTimeString()
}

function displayPlayerName(player: { id: string; name: string }) {
  const fallback = `Nutzer ${player.id.replace('player-', '')}`
  const name = player.name.trim()

  return name || fallback
}

function playBuzzSound() {
  const AudioContextClass = window.AudioContext ?? window.webkitAudioContext

  if (!AudioContextClass) {
    return
  }

  const context = new AudioContextClass()
  const oscillator = context.createOscillator()
  const gain = context.createGain()

  oscillator.type = 'sine'
  oscillator.frequency.value = 720
  gain.gain.setValueAtTime(0.001, context.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.2, context.currentTime + 0.01)
  gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.18)
  oscillator.connect(gain)
  gain.connect(context.destination)
  oscillator.start()
  oscillator.stop(context.currentTime + 0.2)
}

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext
  }
}

export function LiveBuzzerPage() {
  const {
    admin,
    buzz,
    buzzRanks,
    buzzerTeams,
    canClaimAdmin,
    claimAdmin,
    clearHistory,
    clearRound,
    closeRound,
    choosePlayer,
    error,
    isAdmin,
    isRealtime,
    maxPlayers,
    minPlayers,
    openRound,
    playerCount,
    players,
    releaseAdmin,
    roundNumber,
    saveSelectedName,
    selectedName,
    selectedPlayer,
    selectedPlayerId,
    selectedTeam,
    sessionState,
    setSelectedName,
    teamSummaries,
    updatePlayerCount,
    updateSelectedTeam,
    winner,
    winnerTeam,
  } = useLiveBuzzer()
  const [isPresenterMode, setIsPresenterMode] = useState(false)
  const [isSoundEnabled, setIsSoundEnabled] = useState(false)

  const selectedHasBuzzed = Boolean(
    selectedPlayer?.buzzedAt ?? selectedPlayer?.buzzedAtClientIso,
  )
  const canBuzz =
    sessionState.isOpen && Boolean(selectedPlayer?.isActive) && !selectedHasBuzzed
  const buzzerStatus = useMemo(() => {
    if (!sessionState.isOpen) {
      return 'Gesperrt'
    }

    if (winner?.id === selectedPlayerId) {
      return 'Gewonnen'
    }

    if (selectedHasBuzzed) {
      return 'Gebuzzert'
    }

    if (winner) {
      return 'Nachbuzzern'
    }

    return 'Bereit'
  }, [selectedHasBuzzed, selectedPlayerId, sessionState.isOpen, winner])
  const buzzedPlayers = players.filter(
    (player) => player.buzzedAt || player.buzzedAtClientIso,
  )

  if (isPresenterMode) {
    return (
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:py-10">
        <section className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <FirebaseStatus isRealtime={isRealtime} />
            <h1 className="mt-4 text-4xl font-semibold tracking-normal sm:text-6xl">
              Live-Buzzer
            </h1>
          </div>
          <Button variant="outline" onClick={() => setIsPresenterMode(false)}>
            <Monitor className="size-4" />
            Zurueck
          </Button>
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <Card className="bg-primary text-primary-foreground">
            <CardHeader>
              <CardTitle className="text-3xl sm:text-5xl">
                {winner ? displayPlayerName(winner) : 'Bereit'}
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="text-8xl font-semibold tabular-nums sm:text-9xl">
                {winnerTeam?.name ?? '—'}
              </div>
              <Badge className="bg-white text-primary">
                Runde {roundNumber} · {sessionState.isOpen ? 'Live' : 'Gesperrt'}
              </Badge>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Buzz-Reihenfolge</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              {buzzedPlayers.length === 0 ? (
                <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
                  Noch kein Buzz.
                </div>
              ) : (
                buzzedPlayers
                  .slice()
                  .sort(
                    (left, right) =>
                      (buzzRanks.get(left.id) ?? 99) -
                      (buzzRanks.get(right.id) ?? 99),
                  )
                  .map((player) => (
                    <div
                      key={player.id}
                      className="flex items-center justify-between gap-4 rounded-lg border p-4"
                    >
                      <div>
                        <div className="text-2xl font-semibold">
                          #{buzzRanks.get(player.id)} {displayPlayerName(player)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {formatBuzzTime(player.buzzedAt, player.buzzedAtClientIso)}
                        </div>
                      </div>
                      {winner?.id === player.id && (
                        <Badge>
                          <Trophy className="size-3.5" />
                          Gewinner
                        </Badge>
                      )}
                    </div>
                  ))
              )}
            </CardContent>
          </Card>
        </section>
      </div>
    )
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6 lg:py-10">
      <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <FirebaseStatus isRealtime={isRealtime} />
          <h1 className="mt-4 text-3xl font-semibold tracking-normal sm:text-4xl">
            Live-Buzzer
          </h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Waehle deine Kennung, dein Team und buzzere in der gemeinsamen
            Quizrunde.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant={sessionState.isOpen ? 'default' : 'secondary'}>
            Runde {roundNumber} · {sessionState.isOpen ? 'Freigegeben' : 'Gesperrt'}
          </Badge>
          {admin && (
            <Badge variant="outline">
              <Crown className="size-3.5" />
              Admin: {displayPlayerName(admin)}
            </Badge>
          )}
        </div>
      </section>

      {error && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle>Firebase-Fehler</CardTitle>
            <CardDescription>{error.message}</CardDescription>
          </CardHeader>
        </Card>
      )}

      <section className="grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
        <Card className="order-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="size-5 text-primary" />
              Buzzer
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-5">
            <div className="rounded-lg bg-secondary p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-sm text-muted-foreground">
                    Aktiver Nutzer
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-2xl font-semibold">
                    {selectedPlayer ? displayPlayerName(selectedPlayer) : selectedName}
                    {selectedTeam && (
                      <Badge className={selectedTeam.className} variant="outline">
                        <span
                          className={cn('size-2 rounded-full', selectedTeam.dotClassName)}
                        />
                        {selectedTeam.name}
                      </Badge>
                    )}
                    {isAdmin && <Crown className="size-5 text-accent" />}
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
                const result = await buzz()

                if (isSoundEnabled && result !== 'blocked' && result !== 'already-buzzed') {
                  playBuzzSound()
                }

                if (result === 'winner') {
                  toast.success('Gewinner-Buzz registriert.')
                } else if (result === 'late') {
                  toast.success('Nachbuzz registriert.')
                } else if (result === 'already-buzzed') {
                  toast.error('Du hast in dieser Runde bereits gebuzzert.')
                } else {
                  toast.error('Diese Runde ist gesperrt.')
                }
              }}
            >
              <Bell className="size-10 sm:size-12" />
              {winner && winner.id !== selectedPlayerId ? 'NACHBUZZERN' : 'BUZZ'}
            </Button>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border p-4">
                <div className="text-sm text-muted-foreground">Gewinner</div>
                <div className="mt-1 min-h-7 text-xl font-semibold">
                  {winner ? displayPlayerName(winner) : '-'}
                </div>
              </div>
              <div className="rounded-lg border p-4">
                <div className="text-sm text-muted-foreground">Team</div>
                <div className="mt-1 min-h-7 text-xl font-semibold">
                  {winnerTeam?.name ?? '-'}
                </div>
              </div>
              <div className="rounded-lg border p-4">
                <div className="text-sm text-muted-foreground">Buzz-Zeit</div>
                <div className="mt-1 min-h-7 text-xl font-semibold tabular-nums">
                  {formatBuzzTime(
                    sessionState.lastBuzzedAt,
                    sessionState.lastBuzzedAtClientIso,
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="order-1 grid gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UsersRound className="size-5 text-primary" />
                Meine Kennung
              </CardTitle>
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
                        {displayPlayerName(player)}
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

              <div className="grid gap-2">
                <Label htmlFor="team-select">Team</Label>
                <Select
                  value={selectedPlayer?.teamId ?? 'none'}
                  onValueChange={(value) =>
                    updateSelectedTeam(
                      value === 'none' ? null : (value as BuzzerTeamId),
                    )
                  }
                >
                  <SelectTrigger id="team-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Kein Team</SelectItem>
                    {buzzerTeams.map((team) => (
                      <SelectItem key={team.id} value={team.id}>
                        {team.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div className="grid gap-2">
                {!admin && (
                  <Button
                    onClick={async () => {
                      const claimed = await claimAdmin()
                      toast[claimed ? 'success' : 'error'](
                        claimed
                          ? 'Admin-Rolle uebernommen.'
                          : 'Es gibt bereits einen Admin.',
                      )
                    }}
                  >
                    <Crown className="size-4" />
                    Admin werden
                  </Button>
                )}
                {admin && !isAdmin && (
                  <Button variant="outline" disabled={!canClaimAdmin}>
                    <Crown className="size-4" />
                    Admin: {displayPlayerName(admin)}
                  </Button>
                )}
                {isAdmin && (
                  <Button
                    variant="default"
                    onClick={async () => {
                      await releaseAdmin()
                      toast.success('Admin-Rolle freigegeben.')
                    }}
                  >
                    <Crown className="size-4" />
                    Admin freigeben
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {isAdmin && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Crown className="size-5 text-primary" />
                  Admin
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4">
                {!isRealtime && (
                  <div className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
                    Lokaler Modus: mehrere Geraete werden erst mit Firebase
                    synchronisiert.
                  </div>
                )}
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

      <section className="grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UsersRound className="size-5 text-primary" />
              Teams
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {teamSummaries.map((team) => (
              <div
                key={team.id}
                className={cn(
                  'rounded-lg border p-4',
                  team.className,
                  team.isWinner && 'ring-2 ring-accent',
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 font-semibold">
                    <span className={cn('size-3 rounded-full', team.dotClassName)} />
                    {team.name}
                  </div>
                  {team.isWinner && <Trophy className="size-4" />}
                </div>
                <div className="mt-2 text-sm tabular-nums">
                  {team.memberCount} Mitglieder
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="flex items-center gap-2">
                <Trophy className="size-5 text-primary" />
                Spieleruebersicht
              </CardTitle>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsPresenterMode(true)}
                >
                  <Monitor className="size-4" />
                  Presenter
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  role="switch"
                  aria-checked={isSoundEnabled}
                  onClick={() => setIsSoundEnabled((current) => !current)}
                >
                  {isSoundEnabled ? (
                    <Volume2 className="size-4" />
                  ) : (
                    <VolumeX className="size-4" />
                  )}
                  Sound
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {players.map((player) => {
              const isWinner = winner?.id === player.id
              const isPlayerAdmin = admin?.id === player.id
              const team = buzzerTeams.find((entry) => entry.id === player.teamId)
              const rank = buzzRanks.get(player.id)

              return (
                <div
                  key={player.id}
                  className={cn(
                    'overflow-hidden rounded-lg border transition-colors',
                    selectedPlayerId === player.id && 'border-primary/60 bg-primary/5',
                    isWinner && 'border-accent bg-accent/10',
                  )}
                >
                  {team && (
                    <div className={cn('h-1 w-full', team.dotClassName)} />
                  )}
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2 text-lg font-semibold">
                          {displayPlayerName(player)}
                          {isPlayerAdmin && <Crown className="size-4 text-accent" />}
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {team && (
                            <Badge className={team.className} variant="outline">
                              {team.name}
                            </Badge>
                          )}
                          {rank && <Badge variant="secondary">#{rank}</Badge>}
                        </div>
                      </div>
                      {isWinner ? (
                        <Badge>
                          <Trophy className="size-3.5" />
                          Gewinner
                        </Badge>
                      ) : (
                        <Badge
                          variant={
                            player.buzzedAt || player.buzzedAtClientIso
                              ? 'secondary'
                              : 'outline'
                          }
                        >
                          {player.buzzedAt || player.buzzedAtClientIso
                            ? 'Gebuzzert'
                            : 'Bereit'}
                        </Badge>
                      )}
                    </div>
                    <div className="mt-3 text-sm text-muted-foreground tabular-nums">
                      Buzz:{' '}
                      {formatBuzzTime(player.buzzedAt, player.buzzedAtClientIso)}
                    </div>
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="flex items-center gap-2">
              <History className="size-5 text-primary" />
              Rundenhistorie
            </CardTitle>
            {isAdmin && (
              <Button variant="outline" size="sm" onClick={clearHistory}>
                <RotateCcw className="size-4" />
                Leeren
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {sessionState.history.length === 0 ? (
            <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              Noch keine Gewinner vorhanden.
            </div>
          ) : (
            <div className="grid gap-3">
              {sessionState.history.map((entry) => {
                const team = buzzerTeams.find(
                  (candidate) => candidate.id === entry.winnerTeamId,
                )

                return (
                  <div
                    key={entry.id}
                    className="flex flex-col gap-2 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <div className="font-semibold">
                        Runde {entry.roundNumber}: {entry.winnerPlayerName}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(entry.createdAt).toLocaleString()}
                      </div>
                    </div>
                    <Badge className={team?.className} variant="outline">
                      {team?.name ?? 'Kein Team'}
                    </Badge>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
