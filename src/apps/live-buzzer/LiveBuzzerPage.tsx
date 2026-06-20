import {
  Bell,
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
import { useState } from 'react'
import { toast } from 'sonner'

import type { BuzzerTimestamp } from '@/apps/live-buzzer/types'
import { useLiveBuzzer } from '@/apps/live-buzzer/hooks/useLiveBuzzer'
import { AppPageTitle } from '@/apps/shared/components/AppPageTitle'
import { AppPage } from '@/apps/shared/components/AppPage'
import { PlayerCard } from '@/apps/shared/components/PlayerCard'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
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

function displayPlayerName(player: { name: string }) {
  const name = player.name.trim()

  return name || 'Person'
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
    buzz,
    buzzRanks,
    buzzerTeams,
    clearHistory,
    closeRound,
    error,
    isLoading,
    isRealtime,
    openRound,
    players,
    removePlayer,
    resetAndOpenRound,
    roundNumber,
    selectedPlayer,
    selectedPlayerId,
    sessionState,
    teamSummaries,
    updatePlayerName,
    updatePlayerTeam,
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
  const buzzedPlayers = players.filter(
    (player) => player.buzzedAt || player.buzzedAtClientIso,
  )

  if (isPresenterMode) {
    return (
      <AppPage width="wide">
        <section className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <AppPageTitle Icon={Bell} title="Live-Buzzer" />
          <Button variant="outline" onClick={() => setIsPresenterMode(false)}>
            <Monitor className="size-4" />
            Zurück
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
                {winnerTeam?.name ?? '-'}
              </div>
              <Badge className="bg-white text-primary">
                Runde {roundNumber} - {sessionState.isOpen ? 'Live' : 'Gesperrt'}
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
                          {formatBuzzTime(
                            player.buzzedAt,
                            player.buzzedAtClientIso,
                          )}
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
      </AppPage>
    )
  }

  return (
    <AppPage>
      <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <AppPageTitle Icon={Bell} title="Live-Buzzer" />
        <div className="flex flex-wrap gap-2">
          <Badge variant={sessionState.isOpen ? 'default' : 'secondary'}>
            Runde {roundNumber} -{' '}
            {sessionState.isOpen ? 'Freigegeben' : 'Gesperrt'}
          </Badge>
          <Badge variant="outline">{players.length} Spieler</Badge>
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
        <div className="grid gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UsersRound className="size-5 text-primary" />
                Meine Spielerkarte
              </CardTitle>
              {isLoading && <CardDescription>Synchronisiere...</CardDescription>}
            </CardHeader>
            <CardContent>
              {selectedPlayer ? (
                <PlayerCard
                  player={selectedPlayer}
                  isHighlighted
                  isWinner={winner?.id === selectedPlayer.id}
                  onNameChange={(name) => updatePlayerName(selectedPlayer.id, name)}
                  onRemove={async () => {
                    await removePlayer(selectedPlayer.id)
                    toast.success('Spieler wurde entfernt.')
                  }}
                  onTeamChange={(teamId) =>
                    updatePlayerTeam(selectedPlayer.id, teamId)
                  }
                />
              ) : (
                <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
                  Spieler wird angelegt...
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Unlock className="size-5 text-primary" />
                Rundensteuerung
              </CardTitle>
              {!isRealtime && (
                <CardDescription>
                  Lokaler Modus: mehrere Geraete werden erst mit Firebase
                  synchronisiert.
                </CardDescription>
              )}
            </CardHeader>
            <CardContent className="grid gap-3">
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
                <Button
                  variant="outline"
                  onClick={() => {
                    closeRound()
                    toast.success('Runde gesperrt.')
                  }}
                >
                  <Lock className="size-4" />
                  Sperren
                </Button>
              </div>
              <Button
                variant="outline"
                onClick={() => {
                  resetAndOpenRound()
                  toast.success('Runde zurückgesetzt und freigegeben.')
                }}
              >
                <RotateCcw className="size-4" />
                Zurücksetzen und freigeben
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="size-5 text-primary" />
              Buzzer
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-5">
            <Button
              className={cn(
                'h-48 rounded-lg text-6xl font-semibold shadow-sm sm:h-64 sm:text-8xl',
                winner?.id === selectedPlayerId &&
                  'bg-accent text-accent-foreground hover:bg-accent/90',
              )}
              disabled={!canBuzz}
              onClick={async () => {
                const result = await buzz()

                if (
                  isSoundEnabled &&
                  result !== 'blocked' &&
                  result !== 'already-buzzed'
                ) {
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
              <Bell className="size-20 sm:size-24" />
              {winner && winner.id !== selectedPlayerId ? 'NACHBUZZERN' : 'BUZZ'}
            </Button>

            <div className="rounded-lg border p-4">
              <div className="text-sm text-muted-foreground">Ergebnis</div>
              <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-h-7 text-xl font-semibold">
                  {winner ? displayPlayerName(winner) : '-'}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className={winnerTeam?.className} variant="outline">
                    {winnerTeam?.name ?? 'Kein Team'}
                  </Badge>
                  <span className="text-xl font-semibold tabular-nums">
                    {formatBuzzTime(
                      sessionState.lastBuzzedAt,
                      sessionState.lastBuzzedAtClientIso,
                    )}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
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
                Spielerübersicht
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
              const rank = buzzRanks.get(player.id)
              const hasBuzzed = Boolean(player.buzzedAt || player.buzzedAtClientIso)

              return (
                <PlayerCard
                  key={player.id}
                  player={player}
                  buzzLabel={isWinner ? 'Gewinner' : hasBuzzed ? 'Gebuzzert' : 'Bereit'}
                  buzzRank={rank}
                  buzzTime={formatBuzzTime(player.buzzedAt, player.buzzedAtClientIso)}
                  isHighlighted={selectedPlayerId === player.id}
                  isWinner={isWinner}
                  onNameChange={(name) => updatePlayerName(player.id, name)}
                  onRemove={async () => {
                    await removePlayer(player.id)
                    toast.success(`${displayPlayerName(player)} wurde entfernt.`)
                  }}
                  onTeamChange={(teamId) => updatePlayerTeam(player.id, teamId)}
                />
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
            <Button variant="outline" size="sm" onClick={clearHistory}>
              <RotateCcw className="size-4" />
              Leeren
            </Button>
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
    </AppPage>
  )
}
