import {
  History,
  Pencil,
  Plus,
  RotateCcw,
  Trophy,
  Undo2,
  UsersRound,
} from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { toast } from 'sonner'

import type { ScoreboardEvent } from '@/apps/scoreboard/types'
import { useScoreboard } from '@/apps/scoreboard/hooks/useScoreboard'
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
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
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

function ConfirmButton({
  confirmLabel = 'Bestaetigen',
  description,
  onConfirm,
  title,
  trigger,
}: {
  confirmLabel?: string
  description: string
  onConfirm: () => void | Promise<void>
  title: string
  trigger: ReactNode
}) {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Abbrechen</Button>
          </DialogClose>
          <Button
            variant="destructive"
            onClick={async () => {
              await onConfirm()
              setOpen(false)
            }}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function InlineTextEdit({
  ariaLabel,
  className,
  fallback,
  inputClassName,
  onSave,
  value,
}: {
  ariaLabel: string
  className?: string
  fallback: string
  inputClassName?: string
  onSave: (value: string) => void | Promise<void>
  value: string
}) {
  const [isEditing, setIsEditing] = useState(false)
  const displayValue = value.trim() || fallback

  if (isEditing) {
    return (
      <Input
        aria-label={ariaLabel}
        autoFocus
        className={inputClassName}
        defaultValue={displayValue}
        onBlur={async (event) => {
          await onSave(event.currentTarget.value)
          setIsEditing(false)
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.currentTarget.blur()
          }

          if (event.key === 'Escape') {
            setIsEditing(false)
          }
        }}
      />
    )
  }

  return (
    <div className="flex min-w-0 items-center gap-2">
      <span className={cn('min-w-0 truncate', className)}>{displayValue}</span>
      <Button
        variant="ghost"
        size="icon"
        aria-label={`${ariaLabel} bearbeiten`}
        onClick={() => setIsEditing(true)}
      >
        <Pencil className="size-4" />
      </Button>
    </div>
  )
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
    <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:py-10">
      <section className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <InlineTextEdit
            ariaLabel="Scoreboard-Titel"
            className="text-3xl font-semibold tracking-normal sm:text-4xl"
            fallback="Spieleabend"
            inputClassName="h-12 text-3xl font-semibold sm:text-4xl"
            value={state.title}
            onSave={updateTitle}
          />
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
    </div>
  )
}
