import {
  Download,
  FileJson,
  Flag,
  ListChecks,
  Plus,
  Printer,
  RefreshCw,
  Swords,
  Trophy,
  UsersRound,
} from 'lucide-react'
import { useMemo, useState } from 'react'
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

function TournamentCreator({
  onCreate,
}: {
  onCreate: ReturnType<typeof useSwissTournaments>['createNewTournament']
}) {
  const [name, setName] = useState('Vereinsturnier')
  const [numberOfRounds, setNumberOfRounds] = useState(5)
  const [bulkPlayersText, setBulkPlayersText] = useState(
    'Max Mustermann, 1820\nErika Beispiel, 1650\nSpieler Ohne Rating',
  )
  const [initialSeedingMode, setInitialSeedingMode] =
    useState<SeedingMode>('rating')
  const [byeScore, setByeScore] = useState<ByeScore>(1)
  const [allowMultipleByesPerPlayer, setAllowMultipleByesPerPlayer] =
    useState(false)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Turnier anlegen</CardTitle>
        <CardDescription>
          Bulk-Eingabe: ein Spieler pro Zeile, optional mit Rating nach Komma.
        </CardDescription>
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

        <div className="grid gap-2">
          <Label htmlFor="swiss-bulk">Spielerliste</Label>
          <textarea
            id="swiss-bulk"
            className="min-h-44 rounded-md border bg-background p-3 text-sm outline-none focus:ring-[3px] focus:ring-ring/50"
            value={bulkPlayersText}
            onChange={(event) => setBulkPlayersText(event.currentTarget.value)}
          />
        </div>

        <Button
          onClick={async () => {
            await onCreate({
              name,
              numberOfRounds,
              bulkPlayersText,
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
      tournament?.rounds.find((round) => round.roundNumber === tournament.currentRound) ??
      tournament?.rounds[tournament.rounds.length - 1] ??
      null,
    [tournament],
  )
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
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Badge className="gap-1">
              <Swords className="size-3.5" />
              Schweizer System
            </Badge>
            <Badge variant={app.isRealtime ? 'default' : 'secondary'}>
              {app.isRealtime ? 'Firestore live' : 'Lokal'}
            </Badge>
          </div>
          <h1 className="truncate text-3xl font-semibold tracking-normal sm:text-4xl">
            Swiss Tournaments
          </h1>
        </div>

        <div className="flex flex-wrap gap-2">
          <Select
            value={tournament.id}
            onValueChange={(value) => void app.selectTournament(value)}
          >
            <SelectTrigger className="w-56">
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
          <Button variant="outline" onClick={printPage}>
            <Printer className="size-4" />
            Drucken
          </Button>
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
          <TabsTrigger value="results">Ergebnisse</TabsTrigger>
          <TabsTrigger value="standings">Rangliste</TabsTrigger>
          <TabsTrigger value="settings">Export</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="grid gap-4">
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            {[
              ['Runde', `${tournament.currentRound}/${tournament.numberOfRounds}`],
              ['Spieler', tournament.players.length],
              ['Aktiv', overview?.active ?? 0],
              ['Inaktiv', overview?.inactive ?? 0],
              ['Ausgeschieden', overview?.withdrawn ?? 0],
            ].map(([label, value]) => (
              <Card key={label}>
                <CardHeader className="p-4">
                  <CardDescription>{label}</CardDescription>
                  <CardTitle className="text-2xl">{value}</CardTitle>
                </CardHeader>
              </Card>
            ))}
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
                  <Plus className="size-4" />
                  Hinzufuegen
                </Button>
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
                  <Button onClick={() => void app.generateRound()}>
                    <Plus className="size-4" />
                    Neue Runde
                  </Button>
                  {currentRound && (
                    <>
                      <Button
                        variant="outline"
                        disabled={currentRound.pairings.some(hasRealResult)}
                        onClick={() =>
                          void app.regenerateRound(currentRound.roundNumber)
                        }
                      >
                        <RefreshCw className="size-4" />
                        Neu erzeugen
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => void app.publishRound(currentRound.roundNumber)}
                      >
                        <Flag className="size-4" />
                        Veröffentlichen
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="grid gap-4">
              {currentRound && (
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
                        currentRound.roundNumber,
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

              {currentRound ? (
                <PairingsTable tournament={tournament} pairings={currentRound.pairings} />
              ) : (
                <div className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">
                  Erzeuge die erste Runde, sobald Spieler angelegt sind.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="results" className="grid gap-4">
          {tournament.rounds.map((round) => (
            <Card key={round.id}>
              <CardHeader>
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <CardTitle>Runde {round.roundNumber}</CardTitle>
                  <Button
                    variant="outline"
                    onClick={() => void app.completeRound(round.roundNumber)}
                  >
                    Runde abschliessen
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto rounded-md border">
                  <table className="w-full min-w-[42rem] text-sm">
                    <thead className="bg-muted/70 text-left">
                      <tr>
                        <th className="p-3">Brett</th>
                        <th className="p-3">Weiss</th>
                        <th className="p-3">Schwarz</th>
                        <th className="p-3">Ergebnis</th>
                      </tr>
                    </thead>
                    <tbody>
                      {round.pairings.map((pairing) => (
                        <tr key={pairing.id} className="border-t">
                          <td className="p-3 tabular-nums">{pairing.boardNumber}</td>
                          <td className="p-3">
                            {pairing.isBye
                              ? playerName(tournament, pairing.byePlayerId)
                              : playerName(tournament, pairing.whitePlayerId)}
                          </td>
                          <td className="p-3">
                            {pairing.isBye
                              ? 'Bye'
                              : playerName(tournament, pairing.blackPlayerId)}
                          </td>
                          <td className="p-3">
                            {pairing.isBye ? (
                              <Badge variant="secondary">
                                {pairing.result?.replace('bye-', 'Bye ') ?? 'Bye'}
                              </Badge>
                            ) : (
                              <Select
                                value={pairing.result ?? ''}
                                onValueChange={(value) =>
                                  void app.setResult(
                                    round.roundNumber,
                                    pairing.id,
                                    value as GameResult,
                                  )
                                }
                              >
                                <SelectTrigger className="w-40">
                                  <SelectValue placeholder="offen" />
                                </SelectTrigger>
                                <SelectContent>
                                  {resultOptions.map((option) => (
                                    <SelectItem
                                      key={option.value}
                                      value={option.value}
                                    >
                                      {option.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="standings">
          <StandingsTable standings={app.standings} />
        </TabsContent>

        <TabsContent value="settings" className="grid gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Einstellungen und Export</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid gap-3 md:grid-cols-3">
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
              </div>
            </CardContent>
          </Card>

          <TournamentCreator onCreate={app.createNewTournament} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function PairingsTable({
  tournament,
  pairings,
}: {
  tournament: Tournament
  pairings: Pairing[]
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
            <th className="p-3">Hinweise</th>
          </tr>
        </thead>
        <tbody>
          {pairings.map((pairing) => (
            <tr key={pairing.id} className="border-t align-top">
              <td className="p-3 tabular-nums">{pairing.boardNumber}</td>
              <td className="p-3">
                {pairing.isBye
                  ? playerName(tournament, pairing.byePlayerId)
                  : playerName(tournament, pairing.whitePlayerId)}
                {pairing.isManual && (
                  <Badge className="ml-2" variant="secondary">
                    manuell
                  </Badge>
                )}
              </td>
              <td className="p-3">
                {pairing.isBye ? 'Bye' : playerName(tournament, pairing.blackPlayerId)}
              </td>
              <td className="p-3">{pairing.result ?? 'offen'}</td>
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
