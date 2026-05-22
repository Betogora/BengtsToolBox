import { Plus, RotateCcw, Trophy } from 'lucide-react'
import { useMemo } from 'react'
import { toast } from 'sonner'

import { useRealtimeCounter } from '@/apps/realtime-counter/hooks/useRealtimeCounter'
import { counterTeams } from '@/apps/realtime-counter/teams'
import { PlayerCard } from '@/apps/shared/components/PlayerCard'
import type { TeamId } from '@/apps/shared/teams'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { cn } from '@/lib/utils'

export function RealtimeCounterPage() {
  const {
    addPlayer,
    decrementPlayer,
    incrementPlayer,
    isLoading,
    error,
    players,
    removePlayer,
    resetScores,
    updatePlayerName,
    updatePlayerTeam,
  } = useRealtimeCounter()

  const totalScore = useMemo(
    () => players.reduce((sum, player) => sum + player.score, 0),
    [players],
  )
  const teamSummaries = useMemo(
    () =>
      counterTeams.map((team) => ({
        ...team,
        memberCount: players.filter((player) => player.teamId === team.id)
          .length,
        score: players
          .filter((player) => player.teamId === team.id)
          .reduce((sum, player) => sum + player.score, 0),
      })),
    [players],
  )
  const counterTeamIds = useMemo(
    () => new Set<TeamId>(counterTeams.map((team) => team.id)),
    [],
  )
  const unassignedPlayers = players.filter(
    (player) => !player.teamId || !counterTeamIds.has(player.teamId),
  )
  const unassignedScore = unassignedPlayers.reduce(
    (sum, player) => sum + player.score,
    0,
  )

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6 lg:py-10">
      <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-normal sm:text-4xl">
            Counter
          </h1>
        </div>
        <Button
          variant="outline"
          onClick={async () => {
            await resetScores()
            toast.success('Scores wurden zurueckgesetzt.')
          }}
        >
          <RotateCcw className="size-4" />
          Reset
        </Button>
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
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="size-5 text-primary" />
              Team-Scores
            </CardTitle>
            {isLoading && <CardDescription>Synchronisiere...</CardDescription>}
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="rounded-lg bg-secondary p-4">
              <div className="text-sm text-muted-foreground">Gesamt</div>
              <div className="text-5xl font-semibold tabular-nums">
                {totalScore}
              </div>
            </div>

            <div className="grid gap-3">
              {teamSummaries.map((team) => (
                <div
                  key={team.id}
                  className={cn('rounded-lg border p-4', team.className)}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 font-semibold">
                      <span
                        className={cn('size-3 rounded-full', team.dotClassName)}
                      />
                      {team.name}
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
          </CardContent>
        </Card>

        <div className="grid gap-4 sm:grid-cols-2">
          {players.map((player) => (
            <PlayerCard
              key={player.id}
              player={player}
              onDecrement={() => decrementPlayer(player)}
              onIncrement={() => incrementPlayer(player)}
              onNameChange={(name) => updatePlayerName(player.id, name)}
              onRemove={async () => {
                await removePlayer(player.id)
                toast.success(`${player.name} wurde entfernt.`)
              }}
              onTeamChange={(teamId) => updatePlayerTeam(player.id, teamId)}
              score={player.score}
            />
          ))}

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
                Add Person
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  )
}
