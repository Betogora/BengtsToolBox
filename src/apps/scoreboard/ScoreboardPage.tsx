import {
  History,
  ListOrdered,
  Plus,
  RotateCcw,
  Trophy,
  Undo2,
  UsersRound,
} from 'lucide-react'
import { toast } from 'sonner'

import type { ScoreboardEvent } from '@/apps/scoreboard/types'
import { useScoreboard } from '@/apps/scoreboard/hooks/useScoreboard'
import { AppPageTitle } from '@/apps/shared/components/AppPageTitle'
import { AppPage } from '@/apps/shared/components/AppPage'
import { ConfirmButton } from '@/apps/shared/components/ConfirmButton'
import { InlineTextEdit } from '@/apps/shared/components/InlineTextEdit'
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
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

function formatSignedNumber(value: number) {
  const sign = value > 0 ? '+' : ''

  return `${sign}${value}`
}

function formatEventTime(value: string) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return '-'
  }

  return date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function RecentEvents({ events }: { events: ScoreboardEvent[] }) {
  if (events.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
        Noch keine Punkte vergeben.
      </div>
    )
  }

  return (
    <div className="grid gap-2">
      {events.map((event) => (
        <div
          key={event.id}
          className="flex min-w-0 items-center justify-between gap-3 rounded-md border p-3"
        >
          <div className="flex min-w-0 items-center gap-2">
            <span
              className="size-3 shrink-0 rounded-full"
              style={{ backgroundColor: event.playerColor }}
            />
            <span className="min-w-0 truncate text-sm font-medium">
              {event.playerName}
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Badge variant={event.delta > 0 ? 'default' : 'outline'}>
              {formatSignedNumber(event.delta)}
            </Badge>
            <span className="w-12 text-right text-xs text-muted-foreground tabular-nums">
              {formatEventTime(event.createdAtClientIso)}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}

export function ScoreboardPage() {
  const {
    addPlayer,
    changeScore,
    error,
    isLoading,
    isRealtime,
    leader,
    players,
    recentEvents,
    removePlayer,
    resetScores,
    state,
    teamSummaries,
    totalScore,
    unassignedPlayers,
    unassignedScore,
    undoLastScoreChange,
    updatePlayerName,
    updatePlayerTeam,
    updateRoundName,
    updateTitle,
  } = useScoreboard()

  const handleChangeScore = async (playerId: string, delta: number) => {
    const result = await changeScore(playerId, delta)

    if (result === 'saved') {
      toast.success(`${formatSignedNumber(delta)} gespeichert.`)
      return
    }

    if (result === 'blocked') {
      toast.error('Der Punktestand kann nicht unter 0 fallen.')
      return
    }

    toast.error('Person nicht gefunden.')
  }

  const handleUndo = async () => {
    const result = await undoLastScoreChange()

    if (result === 'undone') {
      toast.success('Letzte Punkteaenderung rueckgaengig gemacht.')
      return
    }

    if (result === 'empty') {
      toast.error('Es gibt noch keine Punkteaenderung.')
      return
    }

    toast.error('Die Person der letzten Punkteaenderung existiert nicht mehr.')
  }

  return (
    <AppPage width="wide">
      <section className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <AppPageTitle Icon={ListOrdered}>
            <InlineTextEdit
              ariaLabel="Scoreboard-Titel"
              className="text-3xl font-semibold tracking-normal sm:text-4xl"
              fallback="Spieleabend"
              inputClassName="h-12 text-3xl font-semibold sm:text-4xl"
              value={state.title}
              onSave={updateTitle}
            />
          </AppPageTitle>
          <div className="mt-2 flex min-w-0 flex-wrap items-center gap-2">
            <Badge variant="secondary" className="text-sm">
              {isRealtime ? 'Live-Sync' : 'Lokal'}
            </Badge>
            <InlineTextEdit
              ariaLabel="Aktuelle Runde"
              className="text-sm font-medium"
              fallback="Runde 1"
              inputClassName="h-8 max-w-52 text-sm"
              value={state.roundName}
              onSave={updateRoundName}
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            disabled={recentEvents.length === 0}
            onClick={handleUndo}
          >
            <Undo2 className="size-4" />
            Undo
          </Button>
          <ConfirmButton
            title="Scoreboard zuruecksetzen?"
            description="Alle Punktestaende werden auf 0 gesetzt und der aktuelle Verlauf wird geloescht."
            confirmLabel="Reset"
            onConfirm={async () => {
              await resetScores()
              toast.success('Scoreboard wurde zurueckgesetzt.')
            }}
            trigger={
              <Button variant="outline">
                <RotateCcw className="size-4" />
                Reset
              </Button>
            }
          />
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

      <section className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="grid gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <Trophy className="size-5 text-primary" />
                Team-Scores
              </CardTitle>
              {isLoading && (
                <CardDescription>Synchronisiere...</CardDescription>
              )}
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="rounded-lg bg-secondary p-4">
                <div className="text-sm text-muted-foreground">
                  Fuehrung {leader ? leader.name : '-'}
                </div>
                <div className="text-5xl font-semibold tabular-nums">
                  {leader?.score ?? 0}
                </div>
              </div>

              <div className="grid gap-3">
                {teamSummaries.map((team) => (
                  <div
                    key={team.id}
                    className={cn('rounded-lg border p-4', team.className)}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-2 font-semibold">
                        <span
                          className={cn(
                            'size-3 shrink-0 rounded-full',
                            team.dotClassName,
                          )}
                        />
                        <span className="min-w-0 truncate">{team.name}</span>
                      </div>
                      <div className="text-2xl font-semibold tabular-nums">
                        {team.score}
                      </div>
                    </div>
                    <div className="mt-1 text-sm tabular-nums">
                      {team.memberCount} Personen
                    </div>
                  </div>
                ))}

                {unassignedPlayers.length > 0 && (
                  <div className="rounded-lg border p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-semibold">Kein Team</div>
                      <div className="text-2xl font-semibold tabular-nums">
                        {unassignedScore}
                      </div>
                    </div>
                    <div className="mt-1 text-sm text-muted-foreground tabular-nums">
                      {unassignedPlayers.length} Personen
                    </div>
                  </div>
                )}
              </div>

              <div className="rounded-lg border p-3 text-sm">
                <div className="text-muted-foreground">Gesamt</div>
                <div className="text-2xl font-semibold tabular-nums">
                  {totalScore}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <History className="size-5 text-primary" />
                Verlauf
              </CardTitle>
            </CardHeader>
            <CardContent>
              <RecentEvents events={recentEvents} />
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="flex items-center gap-2 text-2xl font-semibold tracking-normal">
              <UsersRound className="size-5 text-primary" />
              Personen
            </h2>
            <Button
              onClick={async () => {
                await addPlayer()
                toast.success('Person hinzugefuegt.')
              }}
            >
              <Plus className="size-4" />
              Person
            </Button>
          </div>
          <Separator />
          <div className="grid gap-4 sm:grid-cols-2">
            {players.map((player) => (
              <PlayerCard
                key={player.id}
                player={player}
                score={player.score}
                onDecrement={() => handleChangeScore(player.id, -1)}
                onIncrement={() => handleChangeScore(player.id, 1)}
                onIncrementLarge={() => handleChangeScore(player.id, 5)}
                onNameChange={(name) => updatePlayerName(player.id, name)}
                onRemove={async () => {
                  await removePlayer(player.id)
                  toast.success(`${player.name} wurde entfernt.`)
                }}
                onTeamChange={(teamId) => updatePlayerTeam(player.id, teamId)}
              />
            ))}
            {players.length === 0 && (
              <Card className="border-dashed">
                <CardContent className="flex min-h-64 items-center justify-center p-6">
                  <Button
                    className="h-24 w-full flex-col gap-2"
                    variant="outline"
                    onClick={async () => {
                      await addPlayer()
                      toast.success('Person hinzugefuegt.')
                    }}
                  >
                    <Plus className="size-6" />
                    Person hinzufuegen
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </section>
    </AppPage>
  )
}
