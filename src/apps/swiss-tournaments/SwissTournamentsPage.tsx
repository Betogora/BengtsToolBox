import {
  CirclePlus,
  Download,
  FileJson,
  ListChecks,
  Plus,
  Printer,
  RefreshCw,
  RotateCcw,
  Swords,
  Trash2,
  Trophy,
  UsersRound,
} from 'lucide-react'
import { useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import { toast } from 'sonner'

import { formatPoints } from '@/apps/swiss-tournaments/logic'
import { useSwissTournaments } from '@/apps/swiss-tournaments/hooks/useSwissTournaments'
import type {
  ByeScore,
  GameResult,
  Pairing,
  PlayerStatus,
  SeedingMode,
  Tournament,
} from '@/apps/swiss-tournaments/types'
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
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'

const resultOptions: Array<{ value: GameResult; label: string }> = [
  { value: '1-0', label: '1-0' },
  { value: '0-1', label: '0-1' },
  { value: '0.5-0.5', label: '0.5-0.5' },
  { value: 'forfeit-1-0', label: 'kampflos 1-0' },
  { value: 'forfeit-0-1', label: 'kampflos 0-1' },
]

const byeScoreOptions: Array<{ value: ByeScore; label: string }> = [
  { value: 1, label: '1 Punkt' },
  { value: 0.5, label: '0.5 Punkte' },
  { value: 0, label: '0 Punkte' },
]

const statusLabels: Record<PlayerStatus, string> = {
  active: 'aktiv',
  inactive: 'inaktiv',
  withdrawn: 'ausgeschieden',
}

function playerName(tournament: Tournament, playerId?: string) {
  return tournament.players.find((player) => player.id === playerId)?.name ?? '-'
}

function statusVariant(status: PlayerStatus) {
  if (status === 'active') {
    return 'default' as const
  }

  return status === 'inactive' ? ('secondary' as const) : ('outline' as const)
}

function hasRealResult(pairing: Pairing) {
  return Boolean(pairing.result && !pairing.isBye)
}

function hasMissingGameResult(pairing: Pairing) {
  return !pairing.isBye && !pairing.result
}

function resultLabel(result?: GameResult) {
  if (!result) {
    return 'offen'
  }

  return result.startsWith('bye-') ? result.replace('bye-', 'Bye ') : result
}

function ConfirmButton({
  confirmLabel,
  description,
  onConfirm,
  title,
  trigger,
}: {
  confirmLabel: string
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

function RoundProgress({
  currentRound,
  numberOfRounds,
}: {
  currentRound: number
  numberOfRounds: number
}) {
  const totalRounds = Math.max(1, numberOfRounds)
  const visibleCurrentRound = Math.min(Math.max(currentRound, 1), totalRounds)

  return (
    <div
      aria-label={`Rundenfortschritt ${visibleCurrentRound} von ${totalRounds}`}
      className="grid grid-cols-[repeat(var(--round-count),minmax(0,1fr))] gap-1.5"
      style={{ '--round-count': totalRounds } as CSSProperties}
    >
      {Array.from({ length: totalRounds }, (_, index) => {
        const roundNumber = index + 1

        return (
          <span
            key={roundNumber}
            className={cn(
              'h-2.5 rounded-full bg-muted',
              roundNumber < visibleCurrentRound && 'bg-primary',
              roundNumber === visibleCurrentRound && 'bg-yellow-400',
            )}
          />
        )
      })}
    </div>
  )
}

type DraftPlayer = {
  id: string
  name: string
  rating: string
}

function createDraftPlayer(index: number): DraftPlayer {
  return {
    id: `draft-${Date.now()}-${index}-${Math.random().toString(36).slice(2)}`,
    name: `Spieler ${index + 1}`,
    rating: '',
  }
}

function AddPlayerCard({
  label,
  onAdd,
}: {
  label: string
  onAdd: () => void | Promise<void>
}) {
  return (
    <div className="rounded-md border border-dashed bg-background p-3">
      <Button
        className="h-9 w-full"
        variant="outline"
        onClick={() => void onAdd()}
      >
        <CirclePlus className="size-4" />
        {label}
      </Button>
    </div>
  )
}

function TournamentCreator({
  onCreate,
}: {
  onCreate: ReturnType<typeof useSwissTournaments>['createNewTournament']
}) {
  const [name, setName] = useState('Vereinsturnier')
  const [numberOfRounds, setNumberOfRounds] = useState(5)
  const [players, setPlayers] = useState<DraftPlayer[]>([
    { id: 'draft-1', name: 'Max Mustermann', rating: '1820' },
    { id: 'draft-2', name: 'Erika Beispiel', rating: '1650' },
    { id: 'draft-3', name: 'Spieler Ohne Rating', rating: '' },
  ])
  const [initialSeedingMode, setInitialSeedingMode] =
    useState<SeedingMode>('rating')
  const [byeScore, setByeScore] = useState<ByeScore>(1)
  const [allowMultipleByesPerPlayer, setAllowMultipleByesPerPlayer] =
    useState(false)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Turnier anlegen</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-3 md:grid-cols-[1fr_10rem]">
          <div className="grid gap-2">
            <Label htmlFor="swiss-name">Turniername</Label>
            <Input
              id="swiss-name"
              value={name}
              onChange={(event) => setName(event.currentTarget.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="swiss-rounds">Runden</Label>
            <Input
              id="swiss-rounds"
              min={1}
              type="number"
              value={numberOfRounds}
              onChange={(event) =>
                setNumberOfRounds(Number(event.currentTarget.value))
              }
            />
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <div className="grid gap-2">
            <Label>Startliste</Label>
            <Select
              value={initialSeedingMode}
              onValueChange={(value) =>
                setInitialSeedingMode(value as SeedingMode)
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="rating">nach Rating</SelectItem>
                <SelectItem value="random">zufaellig</SelectItem>
                <SelectItem value="manual">manuell</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Bye-Wertung</Label>
            <Select
              value={String(byeScore)}
              onValueChange={(value) => setByeScore(Number(value) as ByeScore)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {byeScoreOptions.map((option) => (
                  <SelectItem key={option.value} value={String(option.value)}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <label className="flex items-end gap-2 rounded-md border p-3 text-sm">
            <input
              checked={allowMultipleByesPerPlayer}
              type="checkbox"
              onChange={(event) =>
                setAllowMultipleByesPerPlayer(event.currentTarget.checked)
              }
            />
            Mehrfach-Byes erlauben
          </label>
        </div>

        <div className="grid gap-3">
          <div className="flex items-center">
            <Label>Spieler</Label>
          </div>

          <div className="grid gap-2">
            {players.map((player) => (
              <div
                key={player.id}
                className="grid gap-2 rounded-md border p-3 sm:grid-cols-[minmax(0,1fr)_8rem_2.5rem] sm:items-end"
              >
                <div className="grid gap-1.5">
                  <Label htmlFor={`swiss-create-name-${player.id}`}>Name</Label>
                  <Input
                    id={`swiss-create-name-${player.id}`}
                    value={player.name}
                    onChange={(event) =>
                      setPlayers((currentPlayers) =>
                        currentPlayers.map((entry) =>
                          entry.id === player.id
                            ? { ...entry, name: event.currentTarget.value }
                            : entry,
                        ),
                      )
                    }
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor={`swiss-create-rating-${player.id}`}>Rating</Label>
                  <Input
                    id={`swiss-create-rating-${player.id}`}
                    type="number"
                    value={player.rating}
                    onChange={(event) =>
                      setPlayers((currentPlayers) =>
                        currentPlayers.map((entry) =>
                          entry.id === player.id
                            ? { ...entry, rating: event.currentTarget.value }
                            : entry,
                        ),
                      )
                    }
                  />
                </div>
                <Button
                  aria-label={`${player.name || 'Spieler'} entfernen`}
                  className="self-end"
                  size="icon"
                  variant="outline"
                  onClick={() =>
                    setPlayers((currentPlayers) =>
                      currentPlayers.filter((entry) => entry.id !== player.id),
                    )
                  }
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
            <AddPlayerCard
              label="Spieler hinzufuegen"
              onAdd={() =>
                setPlayers((currentPlayers) => [
                  ...currentPlayers,
                  createDraftPlayer(currentPlayers.length),
                ])
              }
            />
          </div>
        </div>

        <Button
          disabled={players.every((player) => player.name.trim().length === 0)}
          onClick={async () => {
            await onCreate({
              name,
              numberOfRounds,
              players: players.map((player) => ({
                name: player.name,
                rating: player.rating ? Number(player.rating) : undefined,
              })),
              initialSeedingMode,
              byeScore,
              allowMultipleByesPerPlayer,
            })
            toast.success('Turnier wurde angelegt.')
          }}
        >
          <Plus className="size-4" />
          Turnier erstellen
        </Button>
      </CardContent>
    </Card>
  )
}

export function SwissTournamentsPage() {
  const app = useSwissTournaments()
  const tournament = app.activeTournament
  const [newPlayerName, setNewPlayerName] = useState('')
  const [newPlayerRating, setNewPlayerRating] = useState('')
  const [manualWhite, setManualWhite] = useState('')
  const [manualBlack, setManualBlack] = useState('')
  const currentRound = useMemo(
    () =>
      tournament
        ? [...tournament.rounds].sort(
            (left, right) => right.roundNumber - left.roundNumber,
          )[0] ?? null
        : null,
    [tournament],
  )
  const draftRound = useMemo(
    () =>
      tournament?.rounds.find((round) => round.status === 'draft') ?? null,
    [tournament],
  )
  const canGenerateRound = useMemo(() => {
    if (!tournament) {
      return false
    }

    if (tournament.rounds.length === 0) {
      return tournament.numberOfRounds > 0
    }

    return (
      currentRound?.status === 'completed' &&
      currentRound.roundNumber < tournament.numberOfRounds
    )
  }, [currentRound, tournament])
  const canRegenerateRound =
    Boolean(draftRound) && !draftRound?.pairings.some(hasRealResult)
  const displayedRounds = useMemo(
    () =>
      tournament
        ? [...tournament.rounds].sort(
            (left, right) => right.roundNumber - left.roundNumber,
          )
        : [],
    [tournament],
  )
  const isCurrentDraftRound =
    Boolean(currentRound) &&
    Boolean(draftRound) &&
    currentRound?.roundNumber === draftRound?.roundNumber
  const overview = useMemo(() => {
    if (!tournament) {
      return null
    }

    return {
      active: tournament.players.filter((player) => player.status === 'active').length,
      inactive: tournament.players.filter((player) => player.status === 'inactive').length,
      withdrawn: tournament.players.filter((player) => player.status === 'withdrawn').length,
    }
  }, [tournament])

  const printPage = () => window.print()

  if (!tournament) {
    return (
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6 lg:py-10">
        <section>
          <h1 className="text-3xl font-semibold tracking-normal sm:text-4xl">
            Swiss Tournaments
          </h1>
        </section>
        {app.error && (
          <Card className="border-destructive">
            <CardHeader>
              <CardTitle>Sync-Fehler</CardTitle>
              <CardDescription>{app.error.message}</CardDescription>
            </CardHeader>
          </Card>
        )}
        <TournamentCreator onCreate={app.createNewTournament} />
      </div>
    )
  }

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:py-10">
      <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          <h1 className="truncate text-3xl font-semibold tracking-normal sm:text-4xl">
            Swiss Tournaments
          </h1>
        </div>

      </section>

      {app.error && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle>Sync-Fehler</CardTitle>
            <CardDescription>{app.error.message}</CardDescription>
          </CardHeader>
        </Card>
      )}

      <Tabs defaultValue="overview" className="gap-4">
        <TabsList className="flex h-auto w-full flex-wrap justify-start">
          <TabsTrigger value="overview">Uebersicht</TabsTrigger>
          <TabsTrigger value="players">Spieler</TabsTrigger>
          <TabsTrigger value="pairings">Paarungen</TabsTrigger>
          <TabsTrigger value="standings">Rangliste</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="grid gap-4">
          <section className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="gap-3 p-4">
                <div>
                  <CardDescription>Aktuelle Runde</CardDescription>
                  <CardTitle className="text-2xl">
                    {tournament.currentRound}/{tournament.numberOfRounds}
                  </CardTitle>
                </div>
                <RoundProgress
                  currentRound={tournament.currentRound}
                  numberOfRounds={tournament.numberOfRounds}
                />
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="p-4">
                <CardDescription>Gesamtspieler</CardDescription>
                <CardTitle className="text-2xl">
                  {tournament.players.length}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="p-4">
                <CardDescription>Aktive Spieler</CardDescription>
                <CardTitle className="text-2xl">
                  {overview?.active ?? 0}
                </CardTitle>
              </CardHeader>
            </Card>
          </section>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ListChecks className="size-5 text-primary" />
                Aktuelle Runde
              </CardTitle>
            </CardHeader>
            <CardContent>
              {currentRound ? (
                <div className="grid gap-3">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">Runde {currentRound.roundNumber}</Badge>
                    <Badge>{currentRound.status}</Badge>
                    <Badge variant="secondary">
                      {currentRound.pairings.length} Bretter/Byes
                    </Badge>
                  </div>
                  <PairingsTable tournament={tournament} pairings={currentRound.pairings} />
                </div>
              ) : (
                <div className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">
                  Noch keine Runde erzeugt.
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Einstellungen und Export</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid gap-3 md:grid-cols-4">
                <div className="grid gap-2">
                  <Label>Aktives Turnier</Label>
                  <Select
                    value={tournament.id}
                    onValueChange={(value) => void app.selectTournament(value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {app.tournaments.map((entry) => (
                        <SelectItem key={entry.id} value={entry.id}>
                          {entry.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Turniername</Label>
                  <Input
                    value={tournament.name}
                    onChange={(event) =>
                      void app.updateTournamentMeta({
                        name: event.currentTarget.value,
                      })
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Runden</Label>
                  <Input
                    min={1}
                    type="number"
                    value={tournament.numberOfRounds}
                    onChange={(event) =>
                      void app.updateTournamentMeta({
                        numberOfRounds: Number(event.currentTarget.value),
                      })
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Bye global</Label>
                  <Select
                    value={String(tournament.settings.byeScore)}
                    onValueChange={(value) =>
                      void app.updateSettings({
                        byeScore: Number(value) as ByeScore,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {byeScoreOptions.map((option) => (
                        <SelectItem key={option.value} value={String(option.value)}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={printPage}>
                  <Printer className="size-4" />
                  Print/PDF
                </Button>
                <Button variant="outline" onClick={app.exportStandingsCsv}>
                  <Download className="size-4" />
                  Rangliste CSV
                </Button>
                <Button variant="outline" onClick={app.exportTournamentJson}>
                  <FileJson className="size-4" />
                  Turnier JSON
                </Button>
                <ConfirmButton
                  title="Turnier zuruecksetzen?"
                  description="Alle Runden und Ergebnisse werden geloescht. Spieler, Einstellungen und Turniername bleiben erhalten."
                  confirmLabel="Reset"
                  onConfirm={async () => {
                    await app.resetTournament()
                    toast.success('Turnier wurde zurueckgesetzt.')
                  }}
                  trigger={
                    <Button variant="destructive">
                      <RotateCcw className="size-4" />
                      Reset
                    </Button>
                  }
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="players" className="grid gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UsersRound className="size-5 text-primary" />
                Spieler verwalten
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="rounded-md border border-dashed bg-background p-3">
                <div className="grid gap-3 md:grid-cols-[1fr_10rem_auto]">
                  <Input
                    placeholder="Name"
                    value={newPlayerName}
                    onChange={(event) => setNewPlayerName(event.currentTarget.value)}
                  />
                  <Input
                    placeholder="Rating"
                    type="number"
                    value={newPlayerRating}
                    onChange={(event) => setNewPlayerRating(event.currentTarget.value)}
                  />
                  <Button
                    className="h-9 w-full md:w-auto"
                    variant="outline"
                    disabled={newPlayerName.trim().length === 0}
                    onClick={async () => {
                      await app.addPlayer(
                        newPlayerName,
                        newPlayerRating ? Number(newPlayerRating) : undefined,
                      )
                      setNewPlayerName('')
                      setNewPlayerRating('')
                      toast.success('Spieler wurde hinzugefuegt.')
                    }}
                  >
                    <CirclePlus className="size-4" />
                    Spieler hinzufuegen
                  </Button>
                </div>
              </div>

              <div className="overflow-x-auto rounded-md border">
                <table className="w-full min-w-[52rem] text-sm">
                  <thead className="bg-muted/70 text-left">
                    <tr>
                      <th className="p-3">Seed</th>
                      <th className="p-3">Name</th>
                      <th className="p-3">Rating</th>
                      <th className="p-3">Ab Runde</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Aktion</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tournament.players.map((player) => (
                      <tr key={player.id} className="border-t">
                        <td className="p-3 tabular-nums">{player.initialSeed}</td>
                        <td className="p-3">
                          <Input
                            value={player.name}
                            onChange={(event) =>
                              void app.updatePlayer(player.id, {
                                name: event.currentTarget.value,
                                rating: player.rating,
                              })
                            }
                          />
                        </td>
                        <td className="p-3">
                          <Input
                            className="w-28"
                            type="number"
                            value={player.rating ?? ''}
                            onChange={(event) =>
                              void app.updatePlayer(player.id, {
                                name: player.name,
                                rating: event.currentTarget.value
                                  ? Number(event.currentTarget.value)
                                  : undefined,
                              })
                            }
                          />
                        </td>
                        <td className="p-3 tabular-nums">{player.addedInRound}</td>
                        <td className="p-3">
                          <Badge variant={statusVariant(player.status)}>
                            {statusLabels[player.status]}
                          </Badge>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <Select
                              value={player.status}
                              onValueChange={(value) =>
                                void app.changePlayerStatus(
                                  player.id,
                                  value as PlayerStatus,
                                )
                              }
                            >
                              <SelectTrigger className="w-40">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="active">aktiv</SelectItem>
                                <SelectItem value="inactive">inaktiv</SelectItem>
                                <SelectItem value="withdrawn">ausgeschieden</SelectItem>
                              </SelectContent>
                            </Select>
                            <Button
                              aria-label={`${player.name} entfernen`}
                              size="icon"
                              variant="outline"
                              onClick={async () => {
                                await app.removePlayer(player.id)
                                toast.success(`${player.name} wurde entfernt.`)
                              }}
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pairings" className="grid gap-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Swords className="size-5 text-primary" />
                  Paarungen
                </CardTitle>
                <div className="flex flex-wrap gap-2">
                  <Button
                    disabled={!canGenerateRound}
                    onClick={() => void app.generateRound()}
                  >
                    <Plus className="size-4" />
                    Neue Runde
                  </Button>
                  <Button
                    variant="outline"
                    disabled={!isCurrentDraftRound || !canRegenerateRound}
                    onClick={() => void app.regenerateRound()}
                  >
                    <RefreshCw className="size-4" />
                    Neu erzeugen
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="grid gap-4">
              {isCurrentDraftRound && draftRound && (
                <div className="grid gap-3 rounded-md border bg-secondary/35 p-3 md:grid-cols-[1fr_1fr_auto]">
                  <Select value={manualWhite} onValueChange={setManualWhite}>
                    <SelectTrigger>
                      <SelectValue placeholder="Spieler A" />
                    </SelectTrigger>
                    <SelectContent>
                      {tournament.players.map((player) => (
                        <SelectItem key={player.id} value={player.id}>
                          {player.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={manualBlack} onValueChange={setManualBlack}>
                    <SelectTrigger>
                      <SelectValue placeholder="Spieler B" />
                    </SelectTrigger>
                    <SelectContent>
                      {tournament.players.map((player) => (
                        <SelectItem key={player.id} value={player.id}>
                          {player.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    disabled={!manualWhite || !manualBlack}
                    onClick={async () => {
                      await app.addManualPairing(
                        draftRound.roundNumber,
                        manualWhite,
                        manualBlack,
                      )
                      setManualWhite('')
                      setManualBlack('')
                      toast.success('Manuelle Paarung fixiert.')
                    }}
                  >
                    Fixieren
                  </Button>
                </div>
              )}

              {displayedRounds.length > 0 ? (
                displayedRounds.map((round, index) => {
                  const isCurrentRound = index === 0
                  const isEditable = isCurrentRound && round.status === 'draft'
                  const canCompleteRound =
                    isEditable && !round.pairings.some(hasMissingGameResult)

                  return (
                    <Card
                      key={round.id}
                      className={cn(
                        'overflow-hidden',
                        isCurrentRound
                          ? 'border-l-4 border-l-primary bg-primary/5'
                          : 'bg-card/80 opacity-85',
                      )}
                    >
                      <CardHeader>
                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                          <div className="flex flex-wrap items-center gap-2">
                            <CardTitle>Runde {round.roundNumber}</CardTitle>
                            <Badge variant={isCurrentRound ? 'default' : 'outline'}>
                              {isCurrentRound ? 'aktuell' : 'archiviert'}
                            </Badge>
                            <Badge variant="secondary">{round.status}</Badge>
                            <Badge variant="outline">
                              {round.pairings.length} Bretter/Byes
                            </Badge>
                          </div>
                          <Button
                            variant="outline"
                            disabled={!canCompleteRound}
                            onClick={() => void app.completeRound(round.roundNumber)}
                          >
                            Runde abschliessen
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <PairingsTable
                          editable={isEditable}
                          pairings={round.pairings}
                          showWarnings
                          tournament={tournament}
                          onResultChange={(pairingId, result) =>
                            void app.setResult(round.roundNumber, pairingId, result)
                          }
                        />
                      </CardContent>
                    </Card>
                  )
                })
              ) : (
                <div className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">
                  Erzeuge die erste Runde, sobald Spieler angelegt sind.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="standings">
          <StandingsTable standings={app.standings} />
        </TabsContent>

      </Tabs>
    </div>
  )
}

function PairingsTable({
  editable = false,
  onResultChange,
  tournament,
  pairings,
  showWarnings = true,
}: {
  editable?: boolean
  onResultChange?: (pairingId: string, result: GameResult) => void
  tournament: Tournament
  pairings: Pairing[]
  showWarnings?: boolean
}) {
  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full min-w-[48rem] text-sm">
        <thead className="bg-muted/70 text-left">
          <tr>
            <th className="p-3">Brett</th>
            <th className="p-3">Weiss</th>
            <th className="p-3">Schwarz</th>
            <th className="p-3">Ergebnis</th>
            {showWarnings && <th className="p-3">Hinweise</th>}
          </tr>
        </thead>
        <tbody>
          {pairings.map((pairing) => (
            <tr
              key={pairing.id}
              className={cn(
                'border-t align-top',
                pairing.isManual && 'bg-primary/5',
              )}
            >
              <td className="p-3 tabular-nums">{pairing.boardNumber}</td>
              <td className="p-3">
                {pairing.isBye
                  ? playerName(tournament, pairing.byePlayerId)
                  : playerName(tournament, pairing.whitePlayerId)}
                {pairing.isManual && (
                  <Badge className="ml-2 border-primary/40" variant="secondary">
                    fixiert
                  </Badge>
                )}
              </td>
              <td className="p-3">
                {pairing.isBye ? 'Bye' : playerName(tournament, pairing.blackPlayerId)}
              </td>
              <td className="p-3">
                {pairing.isBye ? (
                  <Badge variant="secondary">{resultLabel(pairing.result)}</Badge>
                ) : editable && onResultChange ? (
                  <Select
                    value={pairing.result ?? ''}
                    onValueChange={(value) =>
                      onResultChange(pairing.id, value as GameResult)
                    }
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="offen" />
                    </SelectTrigger>
                    <SelectContent>
                      {resultOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Badge variant={pairing.result ? 'outline' : 'secondary'}>
                    {resultLabel(pairing.result)}
                  </Badge>
                )}
              </td>
              {showWarnings && (
                <td className="p-3">
                  <div className="flex flex-wrap gap-1">
                    {(pairing.warnings ?? []).length === 0 ? (
                      <Badge variant="outline">OK</Badge>
                    ) : (
                      pairing.warnings?.map((entry) => (
                        <Badge
                          key={entry.id}
                          variant={entry.severity === 'hard' ? 'destructive' : 'secondary'}
                        >
                          {entry.message}
                        </Badge>
                      ))
                    )}
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function StandingsTable({
  standings,
}: {
  standings: ReturnType<typeof useSwissTournaments>['standings']
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="size-5 text-primary" />
          Rangliste
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full min-w-[64rem] text-sm">
            <thead className="bg-muted/70 text-left">
              <tr>
                <th className="p-3">Platz</th>
                <th className="p-3">Name</th>
                <th className="p-3">Punkte</th>
                <th className="p-3">Buchholz</th>
                <th className="p-3">SB</th>
                <th className="p-3">Siege</th>
                <th className="p-3">Direkt</th>
                <th className="p-3">Farben</th>
                <th className="p-3">Byes</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {standings.map((row) => (
                <tr key={row.playerId} className="border-t">
                  <td className="p-3 tabular-nums">{row.rank}</td>
                  <td className="p-3 font-medium">{row.playerName}</td>
                  <td className="p-3 tabular-nums">{formatPoints(row.points)}</td>
                  <td className="p-3 tabular-nums">{formatPoints(row.buchholz)}</td>
                  <td className="p-3 tabular-nums">
                    {formatPoints(row.sonnebornBerger)}
                  </td>
                  <td className="p-3 tabular-nums">{row.wins}</td>
                  <td className="p-3 tabular-nums">
                    {row.directEncounterScore === null
                      ? '-'
                      : formatPoints(row.directEncounterScore)}
                  </td>
                  <td className="p-3">{row.colorHistory.join(' ') || '-'}</td>
                  <td className="p-3 tabular-nums">{row.receivedByes}</td>
                  <td className="p-3">
                    <Badge variant={statusVariant(row.status)}>
                      {statusLabels[row.status]}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
