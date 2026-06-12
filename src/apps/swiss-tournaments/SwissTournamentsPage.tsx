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
  X,
} from 'lucide-react'
import { useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import { toast } from 'sonner'

import { formatPoints } from '@/apps/swiss-tournaments/logic'
import { useSwissTournaments } from '@/apps/swiss-tournaments/hooks/useSwissTournaments'
import type {
  ByePolicy,
  ByeScore,
  GameResult,
  Pairing,
  PairingWarning,
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
const openResultValue = 'open'
type ResultSelectValue = GameResult | typeof openResultValue

const byeScoreOptions: Array<{ value: ByeScore; label: string }> = [
  { value: 1, label: '1 Punkt' },
  { value: 0.5, label: '0.5 Punkte' },
  { value: 0, label: '0 Punkte' },
]

const byePolicyOptions: Array<{ value: ByePolicy; label: string }> = [
  { value: 'protectLateEntrants', label: 'Späte Spieler schützen' },
  { value: 'lowestScore', label: 'Niedrigste Scoregruppe' },
]

const appTitle = 'SK Anderten Turnier-App'

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

function hasMissingGameResult(pairing: Pairing) {
  return !pairing.isBye && !pairing.result
}

function resultLabel(result?: GameResult) {
  if (!result) {
    return 'offen'
  }

  return result.startsWith('bye-') ? result.replace('bye-', 'Bye ') : result
}

type PairingWarningBadgeMeta = {
  label: string
  className: string
}

const warningBadgeMeta: Record<string, PairingWarningBadgeMeta> = {
  'bye-cycle-restarted': {
    label: 'BYE',
    className: 'border-amber-300 bg-amber-100 text-amber-950',
  },
  'color-imbalance': {
    label: 'FARBE',
    className: 'border-sky-300 bg-sky-100 text-sky-950',
  },
  'duplicate-round-player': {
    label: 'DOPPELT',
    className: 'border-red-300 bg-red-100 text-red-950',
  },
  'forced-floater': {
    label: 'FLOATER',
    className: 'border-violet-300 bg-violet-100 text-violet-950',
  },
  'inactive-player': {
    label: 'INAKTIV',
    className: 'border-slate-300 bg-slate-100 text-slate-950',
  },
  'large-point-gap': {
    label: 'ABSTAND',
    className: 'border-orange-300 bg-orange-100 text-orange-950',
  },
  'missing-player': {
    label: 'FEHLT',
    className: 'border-rose-300 bg-rose-100 text-rose-950',
  },
  'multiple-byes': {
    label: 'BYE',
    className: 'border-amber-300 bg-amber-100 text-amber-950',
  },
  'non-fide-fallback': {
    label: 'FALLBACK',
    className: 'border-fuchsia-300 bg-fuchsia-100 text-fuchsia-950',
  },
  'repeat-pairing': {
    label: 'REPEAT',
    className: 'border-red-300 bg-red-100 text-red-950',
  },
  'same-player': {
    label: 'SPIELER',
    className: 'border-red-300 bg-red-100 text-red-950',
  },
  'third-color': {
    label: 'FARBE',
    className: 'border-sky-300 bg-sky-100 text-sky-950',
  },
}

function pairingWarningBadgeMeta(warning: PairingWarning): PairingWarningBadgeMeta {
  return (
    warningBadgeMeta[warning.id] ?? {
      label: warning.severity === 'hard' ? 'STOPP' : 'HINWEIS',
      className:
        warning.severity === 'hard'
          ? 'border-red-300 bg-red-100 text-red-950'
          : 'border-lime-300 bg-lime-100 text-lime-950',
    }
  )
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

function defaultDraftPlayers(): DraftPlayer[] {
  return [
    { id: 'draft-1', name: 'Niklas', rating: '1922' },
    { id: 'draft-2', name: 'Bengt', rating: '1818' },
    { id: 'draft-3', name: 'Thomas', rating: '1697' },
    { id: 'draft-4', name: 'Liam', rating: '1674' },
    { id: 'draft-5', name: 'Ralph', rating: '1614' },
    { id: 'draft-6', name: 'Uwe', rating: '1524' },
    { id: 'draft-7', name: 'Quinn', rating: '1494' },
    { id: 'draft-8', name: 'Matthias', rating: '1485' },
    { id: 'draft-9', name: 'Armin', rating: '1434' },
    { id: 'draft-10', name: 'Nikita', rating: '1311' },
  ]
}

function tournamentPlayersToDraftPlayers(tournament?: Tournament | null): DraftPlayer[] {
  if (!tournament?.players.length) {
    return defaultDraftPlayers()
  }

  return [...tournament.players]
    .sort((left, right) => left.initialSeed - right.initialSeed)
    .map((player, index) => ({
      id: `draft-${player.id}-${index}`,
      name: player.name,
      rating: player.rating === undefined ? '' : String(player.rating),
    }))
}

function defaultTournamentName() {
  const formatter = new Intl.DateTimeFormat('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })

  return `Turnier vom ${formatter.format(new Date())}`
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

function AppTitleHeader() {
  return (
    <section className="flex min-w-0 items-center justify-between gap-3">
      <h1 className="min-w-0 truncate text-3xl font-semibold tracking-normal sm:text-4xl">
        {appTitle}
      </h1>
      <img
        alt="SK Anderten"
        className="h-8 w-auto shrink-0 object-contain sm:h-9"
        src="/sk-anderten-logo.jpg"
      />
    </section>
  )
}

function TournamentCreator({
  initialTournament,
  onCreated,
  onCreate,
}: {
  initialTournament?: Tournament | null
  onCreated?: () => void
  onCreate: ReturnType<typeof useSwissTournaments>['createNewTournament']
}) {
  const [name, setName] = useState(defaultTournamentName)
  const [numberOfRounds, setNumberOfRounds] = useState(5)
  const [players, setPlayers] = useState<DraftPlayer[]>(() =>
    tournamentPlayersToDraftPlayers(initialTournament),
  )
  const [initialSeedingMode, setInitialSeedingMode] =
    useState<SeedingMode>('rating')
  const [byeScore, setByeScore] = useState<ByeScore>(1)

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
            <Label>Sortierung</Label>
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
                <SelectItem value="random">zufällig</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Byepunkte</Label>
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
              label="Spieler hinzufügen"
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
            })
            toast.success('Turnier wurde angelegt.')
            onCreated?.()
          }}
        >
          <Plus className="size-4" />
          Turnier erstellen
        </Button>
      </CardContent>
    </Card>
  )
}

function NewTournamentDialog({
  initialTournament,
  onCreate,
}: {
  initialTournament?: Tournament | null
  onCreate: ReturnType<typeof useSwissTournaments>['createNewTournament']
}) {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="size-4" />
          Neues Turnier
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle>Neues Turnier</DialogTitle>
          <DialogDescription>
            Turnierdaten, Sortierung, Byepunkte und Startspieler festlegen.
          </DialogDescription>
        </DialogHeader>
        {open && (
          <TournamentCreator
            initialTournament={initialTournament}
            onCreate={onCreate}
            onCreated={() => setOpen(false)}
          />
        )}
      </DialogContent>
    </Dialog>
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
  const canRegenerateRound = Boolean(draftRound)
  const hasTournamentStarted = Boolean(tournament && tournament.rounds.length > 0)
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

  const [activeTab, setActiveTab] = useState('overview')
  const printPage = () => {
    const originalTitle = document.title

    setActiveTab('standings')
    window.requestAnimationFrame(() => {
      document.title = tournament.name
      window.addEventListener(
        'afterprint',
        () => {
          document.title = originalTitle
        },
        { once: true },
      )
      window.print()
    })
  }

  if (app.isLoading) {
    return (
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6 lg:py-10">
        <AppTitleHeader />
        <Card>
          <CardHeader>
            <CardTitle>Daten werden geladen</CardTitle>
            <CardDescription>Gespeicherte Turniere werden synchronisiert.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  if (!tournament) {
    return (
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6 lg:py-10">
        <AppTitleHeader />
        {app.error && (
          <Card className="border-destructive">
            <CardHeader>
              <CardTitle>Sync-Fehler</CardTitle>
              <CardDescription>{app.error.message}</CardDescription>
            </CardHeader>
          </Card>
        )}
        <TournamentCreator
          initialTournament={app.tournaments[0] ?? null}
          onCreate={app.createNewTournament}
        />
      </div>
    )
  }

  return (
    <div className="swiss-tournaments-page mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:py-10">
      <AppTitleHeader />

      {app.error && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle>Sync-Fehler</CardTitle>
            <CardDescription>{app.error.message}</CardDescription>
          </CardHeader>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="gap-4">
        <TabsList className="swiss-print-hidden flex h-auto w-full flex-wrap justify-start">
          <TabsTrigger value="overview">Übersicht</TabsTrigger>
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
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <CardTitle>Einstellungen und Export</CardTitle>
                <NewTournamentDialog
                  initialTournament={tournament}
                  onCreate={app.createNewTournament}
                />
              </div>
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
                  <Label>Byepunkte</Label>
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
                <div className="grid gap-2">
                  <Label>Bye-Vergabe</Label>
                  <Select
                    value={tournament.settings.byePolicy}
                    onValueChange={(value) =>
                      void app.updateSettings({
                        byePolicy: value as ByePolicy,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {byePolicyOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
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
                  title="Turnier zurücksetzen?"
                  description="Alle Runden und Ergebnisse werden gelöscht. Spieler, Einstellungen und Turniername bleiben erhalten."
                  confirmLabel="Reset"
                  onConfirm={async () => {
                    await app.resetTournament()
                    toast.success('Turnier wurde zurückgesetzt.')
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
                      toast.success('Spieler wurde hinzugefügt.')
                    }}
                  >
                    <CirclePlus className="size-4" />
                    Spieler hinzufügen
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
                              disabled={hasTournamentStarted}
                              size="icon"
                              title={
                                hasTournamentStarted
                                  ? 'Nach Turnierstart bitte Status auf inaktiv oder ausgeschieden setzen.'
                                  : `${player.name} entfernen`
                              }
                              variant="outline"
                              onClick={async () => {
                                if (hasTournamentStarted) {
                                  return
                                }

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
                  const canGoBackToRound =
                    index === 1 &&
                    round.status === 'completed' &&
                    currentRound?.roundNumber === round.roundNumber + 1

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
                          <div className="flex w-full flex-col gap-2 md:w-auto md:flex-row">
                            {canGoBackToRound && currentRound && (
                              <ConfirmButton
                                title={`Zu Runde ${round.roundNumber} zurückgehen?`}
                                description={`Runde ${currentRound.roundNumber} wird gelöscht. Runde ${round.roundNumber} wird wieder geöffnet und kann bearbeitet werden.`}
                                confirmLabel="Zurückgehen"
                                onConfirm={async () => {
                                  await app.goBackToPreviousRound()
                                  toast.success(
                                    `Runde ${round.roundNumber} wurde wieder geöffnet.`,
                                  )
                                }}
                                trigger={
                                  <Button className="w-full md:w-auto" variant="outline">
                                    <RotateCcw className="size-4" />
                                    Zurück zu Runde {round.roundNumber}
                                  </Button>
                                }
                              />
                            )}
                            <Button
                              className="w-full md:w-auto"
                              variant="outline"
                              disabled={!canCompleteRound}
                              onClick={() => void app.completeRound(round.roundNumber)}
                            >
                              Runde abschließen
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <PairingsTable
                          editable={isEditable}
                          pairings={round.pairings}
                          showWarnings
                          tournament={tournament}
                          onManualPairingRemove={(pairingId) =>
                            void app.removeManualPairing(round.roundNumber, pairingId)
                          }
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
          <StandingsTable
            standings={app.standings}
            tournamentName={tournament.name}
          />
        </TabsContent>

      </Tabs>
    </div>
  )
}

function PairingsTable({
  editable = false,
  onManualPairingRemove,
  onResultChange,
  tournament,
  pairings,
  showWarnings = true,
}: {
  editable?: boolean
  onManualPairingRemove?: (pairingId: string) => void
  onResultChange?: (pairingId: string, result?: GameResult) => void
  tournament: Tournament
  pairings: Pairing[]
  showWarnings?: boolean
}) {
  const canChangePairings = editable
  const handleResultSelect = (pairingId: string, value: ResultSelectValue) => {
    onResultChange?.(
      pairingId,
      value === openResultValue ? undefined : (value as GameResult),
    )
  }

  const renderMobileResult = (pairing: Pairing) => {
    if (pairing.isBye) {
      return <Badge variant="secondary">{resultLabel(pairing.result)}</Badge>
    }

    if (editable && onResultChange) {
      return (
        <Select
          value={pairing.result ?? openResultValue}
          onValueChange={(value) =>
            handleResultSelect(pairing.id, value as ResultSelectValue)
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="offen" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={openResultValue}>offen</SelectItem>
            {resultOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )
    }

    return (
      <Badge variant={pairing.result ? 'outline' : 'secondary'}>
        {resultLabel(pairing.result)}
      </Badge>
    )
  }

  const renderMobileWarnings = (pairing: Pairing) => (
    <div className="flex flex-wrap gap-1">
      {pairing.isManual && (
        <span className="inline-flex items-center overflow-hidden rounded-md border border-yellow-300 bg-yellow-100 text-xs font-semibold text-yellow-950">
          <span className="px-2 py-0.5">FIXIERT</span>
          {editable && onManualPairingRemove && (
            <Button
              aria-label={`Fixierte Paarung ${playerName(
                tournament,
                pairing.whitePlayerId,
              )} gegen ${playerName(tournament, pairing.blackPlayerId)} loesen`}
              className="h-5 w-5 rounded-l-none border-l border-yellow-300 p-0 text-yellow-950 hover:bg-destructive hover:text-destructive-foreground"
              disabled={!canChangePairings}
              size="icon"
              type="button"
              variant="ghost"
              onClick={() => onManualPairingRemove?.(pairing.id)}
            >
              <X className="size-3" />
            </Button>
          )}
        </span>
      )}
      {(pairing.warnings ?? []).length === 0 && !pairing.isManual ? (
        <Badge variant="outline">OK</Badge>
      ) : (
        pairing.warnings?.map((entry) => {
          const badgeMeta = pairingWarningBadgeMeta(entry)

          return (
            <Badge
              key={entry.id}
              className={cn('font-semibold', badgeMeta.className)}
              title={entry.message}
              variant="outline"
            >
              {badgeMeta.label}
            </Badge>
          )
        })
      )}
    </div>
  )

  return (
    <>
      <div className="grid gap-2 md:hidden">
        {pairings.map((pairing) => {
          const whiteName = pairing.isBye
            ? playerName(tournament, pairing.byePlayerId)
            : playerName(tournament, pairing.whitePlayerId)
          const blackName = pairing.isBye
            ? 'Bye'
            : playerName(tournament, pairing.blackPlayerId)

          return (
            <div
              key={pairing.id}
              className={cn(
                'rounded-md border bg-card p-3 text-sm',
                pairing.isManual && 'bg-primary/5',
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="font-semibold tabular-nums">
                  Brett {pairing.boardNumber}
                </div>
                {showWarnings && renderMobileWarnings(pairing)}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div className="min-w-0">
                  <div className="text-xs font-medium text-muted-foreground">
                    Wei&szlig;
                  </div>
                  <div className="truncate font-medium">{whiteName}</div>
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-medium text-muted-foreground">
                    Schwarz
                  </div>
                  <div className="truncate font-medium">{blackName}</div>
                </div>
              </div>
              <div className="mt-3">
                <div className="mb-1.5 text-xs font-medium text-muted-foreground">
                  Ergebnis
                </div>
                {renderMobileResult(pairing)}
              </div>
            </div>
          )
        })}
      </div>

      <div className="hidden overflow-x-auto rounded-md border md:block">
        <table className="w-full min-w-[48rem] text-sm">
          <thead className="bg-muted/70 text-left">
          <tr>
            <th className="p-3">Brett</th>
            <th className="p-3">Weiß</th>
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
              </td>
              <td className="p-3">
                {pairing.isBye ? 'Bye' : playerName(tournament, pairing.blackPlayerId)}
              </td>
              <td className="p-3">
                {pairing.isBye ? (
                  <Badge variant="secondary">{resultLabel(pairing.result)}</Badge>
                ) : editable && onResultChange ? (
                  <Select
                    value={pairing.result ?? openResultValue}
                    onValueChange={(value) =>
                      handleResultSelect(pairing.id, value as ResultSelectValue)
                    }
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="offen" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={openResultValue}>offen</SelectItem>
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
                    {pairing.isManual && (
                      <span className="inline-flex items-center overflow-hidden rounded-md border border-yellow-300 bg-yellow-100 text-xs font-semibold text-yellow-950">
                        <span className="px-2 py-0.5">FIXIERT</span>
                        {editable && onManualPairingRemove && (
                          <Button
                            aria-label={`Fixierte Paarung ${playerName(
                              tournament,
                              pairing.whitePlayerId,
                            )} gegen ${playerName(tournament, pairing.blackPlayerId)} lösen`}
                            className="h-5 w-5 rounded-l-none border-l border-yellow-300 p-0 text-yellow-950 hover:bg-destructive hover:text-destructive-foreground"
                            disabled={!canChangePairings}
                            size="icon"
                            type="button"
                            variant="ghost"
                            onClick={() => onManualPairingRemove?.(pairing.id)}
                          >
                            <X className="size-3" />
                          </Button>
                        )}
                      </span>
                    )}
                    {(pairing.warnings ?? []).length === 0 && !pairing.isManual ? (
                      <Badge variant="outline">OK</Badge>
                    ) : (
                      pairing.warnings?.map((entry) => {
                        const badgeMeta = pairingWarningBadgeMeta(entry)

                        return (
                          <Badge
                            key={entry.id}
                            className={cn('font-semibold', badgeMeta.className)}
                            title={entry.message}
                            variant="outline"
                          >
                            {badgeMeta.label}
                          </Badge>
                        )
                      })
                    )}
                  </div>
                </td>
              )}
            </tr>
          ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

function StandingsTable({
  standings,
  tournamentName,
}: {
  standings: ReturnType<typeof useSwissTournaments>['standings']
  tournamentName: string
}) {
  const podiumClass = (rank: number) =>
    rank === 1
      ? 'swiss-podium-first bg-[#f6e3a5]/65'
      : rank === 2
        ? 'swiss-podium-second bg-[#e6e8eb]/70'
        : rank === 3
          ? 'swiss-podium-third bg-[#e8c0a0]/55'
          : ''
  const roundCellClass = (cell: (typeof standings)[number]['roundHistory'][number]) =>
    cn(
      'swiss-round-cell inline-flex h-7 min-w-11 items-center justify-center rounded px-2 text-xs font-semibold tabular-nums',
      cell.color === 'W' && 'border border-border bg-white text-foreground',
      cell.color === 'B' && 'bg-primary text-primary-foreground',
      cell.outcome === 'bye' && 'border border-dashed border-border bg-muted text-muted-foreground',
      cell.outcome === 'open' && 'border border-border bg-background text-muted-foreground',
    )

  return (
    <Card className="swiss-standings-card">
      <CardHeader>
        <div className="swiss-export-title hidden">
          <div className="text-xs font-semibold uppercase tracking-normal text-primary">
            Rangliste
          </div>
          <h1>{tournamentName}</h1>
        </div>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="size-5 text-primary" />
          Rangliste
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="swiss-standings-table-wrap overflow-x-auto rounded-md border">
          <table className="swiss-standings-table w-full min-w-[68rem] text-sm">
            <thead className="bg-muted/70 text-left">
              <tr>
                <th className="p-3">Platz</th>
                <th className="p-3">Name</th>
                <th className="p-3">Punkte</th>
                <th className="p-3">Buchholz</th>
                <th className="p-3">SB</th>
                <th className="p-3">Siege</th>
                <th className="p-3">Runden</th>
                <th className="swiss-export-hidden-column p-3">Byes</th>
                <th className="swiss-export-hidden-column p-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {standings.map((row) => (
                <tr
                  key={row.playerId}
                  className={cn('border-t', podiumClass(row.rank))}
                >
                  <td className="p-3 tabular-nums">{row.rank}</td>
                  <td className="p-3 font-medium">{row.playerName}</td>
                  <td className="p-3 tabular-nums">
                    <span className="inline-flex min-w-12 items-center justify-center rounded-md border border-primary/25 bg-primary/10 px-2.5 py-1 font-semibold text-primary">
                      {formatPoints(row.points)}
                    </span>
                  </td>
                  <td className="p-3 tabular-nums">{formatPoints(row.buchholz)}</td>
                  <td className="p-3 tabular-nums">
                    {formatPoints(row.sonnebornBerger)}
                  </td>
                  <td className="p-3 tabular-nums">{row.wins}</td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-1.5">
                      {row.roundHistory.map((cell) => (
                        <span
                          key={`${row.playerId}-${cell.roundNumber}`}
                          className={roundCellClass(cell)}
                          title={cell.title}
                        >
                          {cell.label}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="swiss-export-hidden-column p-3 tabular-nums">
                    {row.receivedByes}
                  </td>
                  <td className="swiss-export-hidden-column p-3">
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
