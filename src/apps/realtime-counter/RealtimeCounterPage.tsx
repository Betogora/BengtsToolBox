import { RotateCcw, UsersRound } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'

import { PlayerCard } from '@/apps/realtime-counter/components/PlayerCard'
import { useRealtimeCounter } from '@/apps/realtime-counter/hooks/useRealtimeCounter'
import { FirebaseStatus } from '@/components/shared/FirebaseStatus'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export function RealtimeCounterPage() {
  const { players, incrementPlayer, resetScores, isLoading, error, isRealtime } =
    useRealtimeCounter()
  const [activePlayerId, setActivePlayerId] = useState('person-1')
  const totalScore = useMemo(
    () => players.reduce((sum, player) => sum + player.score, 0),
    [players],
  )

  const activePlayer =
    players.find((player) => player.id === activePlayerId) ?? players[0]

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6 lg:py-10">
      <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <FirebaseStatus isRealtime={isRealtime} />
          <h1 className="mt-4 text-3xl font-semibold tracking-normal sm:text-4xl">
            Echtzeit-Counter
          </h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Waehle deine Kennung aus und zaehle deinen Score hoch. Andere
            Geraete sehen die Aenderungen live, sobald Firebase konfiguriert ist.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => {
            resetScores()
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

      <section className="grid gap-4 md:grid-cols-[0.8fr_1.2fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UsersRound className="size-5 text-primary" />
              Session
            </CardTitle>
            <CardDescription>
              {isLoading ? 'Synchronisiere...' : 'Standard-Session: default'}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="rounded-lg bg-secondary p-4">
              <div className="text-sm text-muted-foreground">Gesamt</div>
              <div className="text-5xl font-semibold tabular-nums">
                {totalScore}
              </div>
            </div>
            <div className="rounded-lg border p-4">
              <div className="text-sm text-muted-foreground">Aktive Kennung</div>
              <div className="mt-1 text-xl font-semibold">
                {activePlayer?.name ?? 'Keine Person'}
              </div>
            </div>
            {activePlayer && (
              <Button
                size="lg"
                onClick={() => {
                  incrementPlayer(activePlayer)
                  toast.success(`${activePlayer.name} +1`)
                }}
              >
                <UsersRound className="size-4" />
                Meinen Score erhoehen
              </Button>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-4 sm:grid-cols-2">
          {players.map((player) => (
            <PlayerCard
              key={player.id}
              player={player}
              isActive={player.id === activePlayerId}
              onSelect={() => setActivePlayerId(player.id)}
              onIncrement={() => incrementPlayer(player)}
            />
          ))}
        </div>
      </section>
    </div>
  )
}
