import {
  Archive,
  ArrowRight,
  Brain,
  ChevronDown,
  ChessKing,
  CheckCircle2,
  CirclePlus,
  Download,
  FileJson,
  GitBranch,
  Hand,
  LayoutDashboard,
  ListChecks,
  Pencil,
  Plus,
  Printer,
  RefreshCw,
  Settings,
  Swords,
  Trash2,
  Trophy,
  UsersRound,
  X,
} from 'lucide-react'
import { Fragment, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { toast } from 'sonner'

import {
  canRemovePlayerFromTournament,
  formatPoints,
  getRoundDisplayLabel,
  recalculateStandings,
} from '@/apps/swiss-tournaments/logic'
import { useSwissTournaments } from '@/apps/swiss-tournaments/hooks/useSwissTournaments'
import { AppPageTitle } from '@/apps/shared/components/AppPageTitle'
import type {
  ByePolicy,
  ByeScore,
  GameResult,
  Pairing,
  PairingWarning,
  PlayerStatus,
  Round,
  SeedingMode,
  Tournament,
  TournamentFormat,
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
import { Input, LabeledInput } from '@/components/ui/input'
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
  { value: '0.5-0.5', label: '0,5-0,5' },
  { value: 'forfeit-1-0', label: 'kampflos 1-0' },
  { value: 'forfeit-0-1', label: 'kampflos 0-1' },
]
const openResultValue = 'open'
type ResultSelectValue = GameResult | typeof openResultValue

const byeScoreOptions: Array<{ value: ByeScore; label: string }> = [
  { value: 1, label: '1 Punkt' },
  { value: 0.5, label: '0,5 Punkte' },
  { value: 0, label: '0 Punkte' },
]

const byePolicyOptions: Array<{ value: ByePolicy; label: string }> = [
  { value: 'protectLateEntrants', label: 'Späte Spieler schützen' },
  { value: 'lowestScore', label: 'Niedrigste Scoregruppe' },
]

const appTitle = 'SK Anderten Turnier-App'
const tournamentWebsiteUrl = 'https://bengtstoolbox.web.app/apps/swiss-tournaments'
const tournamentWebsiteQrUrl = '/qrcode.svg'
const singleLineSelectTriggerClass =
  'min-w-0 [&>span]:min-w-0 [&>span]:truncate [&>span]:whitespace-nowrap'

function roleColorPlaceholder(icon: ReactNode, color: string) {
  return (
    <span className="flex min-w-0 items-center gap-2">
      {icon}
      <span className="truncate">{color}</span>
    </span>
  )
}

const statusLabels: Record<PlayerStatus, string> = {
  active: 'aktiv',
  inactive: 'inaktiv',
  withdrawn: 'ausgeschieden',
}

function playerName(tournament: Tournament, playerId?: string) {
  return tournament.players.find((player) => player.id === playerId)?.name ?? '-'
}

function pairingPlayerIds(pairing: Pairing) {
  return [
    pairing.whitePlayerId,
    pairing.blackPlayerId,
    pairing.byePlayerId,
    pairing.handBrainSides?.white.brainPlayerId,
    pairing.handBrainSides?.white.handPlayerId,
    pairing.handBrainSides?.black.brainPlayerId,
    pairing.handBrainSides?.black.handPlayerId,
  ].filter((playerId): playerId is string => typeof playerId === 'string')
}

function tournamentFormatLabel(format?: Tournament['format']) {
  if (format === 'roundRobin') {
    return 'Round Robin'
  }

  if (format === 'handAndBrain') {
    return 'Hand and Brain'
  }

  return 'Swiss'
}

function renderTournamentFormatIcon(format?: Tournament['format']) {
  if (format === 'roundRobin') {
    return <GitBranch className="size-5 shrink-0" />
  }

  if (format === 'handAndBrain') {
    return <Brain className="size-5 shrink-0" />
  }

  return <Swords className="size-5 shrink-0" />
}

function printablePdfTitle(tournamentName: string) {
  const safeName = tournamentName
    .trim()
    .split('')
    .filter((character) => character.charCodeAt(0) >= 32)
    .join('')
    .replace(/[<>:"/\\|?*]/g, '-')
    .replace(/\s+/g, ' ')
    .replace(/\.+$/g, '')

  return `${safeName || 'Turnier'}.pdf`
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

  const label = result.startsWith('bye-')
    ? result.replace('bye-', 'Bye ')
    : result.replaceAll('forfeit-', 'kampflos ')

  return label.replaceAll('.', ',')
}

function formatDateTime(value?: string) {
  if (!value) {
    return '-'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return '-'
  }

  return new Intl.DateTimeFormat('de-DE', {
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date)
}

function isRoundCompleteForProgress(round: Round) {
  return (
    round.status === 'completed' ||
    (round.pairings.length > 0 && !round.pairings.some(hasMissingGameResult))
  )
}

function completedRoundCount(tournament: Tournament) {
  const completedRegularRounds = new Set(
    tournament.rounds
      .filter((round) => round.roundNumber <= tournament.numberOfRounds)
      .filter(isRoundCompleteForProgress)
      .map((round) => round.roundNumber),
  )

  return Math.min(completedRegularRounds.size, tournament.numberOfRounds)
}

function highestCompletedRoundNumber(tournament: Tournament) {
  return tournament.rounds.reduce(
    (highestRound, round) =>
      isRoundCompleteForProgress(round)
        ? Math.max(highestRound, round.roundNumber)
        : highestRound,
    0,
  )
}

function roundRobinRoundsForPlayerCount(playerCount: number, cycles: number) {
  if (playerCount <= 1) {
    return 1
  }

  return (playerCount % 2 === 0 ? playerCount - 1 : playerCount) * cycles
}

function swissRoundsForPlayerCount(playerCount: number) {
  return Math.min(Math.max(1, playerCount - 1), 10)
}

function defaultRoundsForFormat(
  format: TournamentFormat,
  playerCount: number,
  roundRobinCycles: number,
) {
  if (format === 'roundRobin') {
    return roundRobinRoundsForPlayerCount(playerCount, roundRobinCycles)
  }

  if (format === 'handAndBrain') {
    return 5
  }

  return swissRoundsForPlayerCount(playerCount)
}

function TournamentCompleteBanner({
  completedRounds,
  label,
  numberOfRounds,
}: {
  completedRounds: number
  label: string
  numberOfRounds: number
}) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-emerald-300 bg-emerald-100 px-4 py-3 text-sm font-semibold text-emerald-950">
      <CheckCircle2 className="size-5 shrink-0" />
      <span>{label}</span>
      <Badge className="border-emerald-300 bg-emerald-50 text-emerald-950" variant="outline">
        {completedRounds}/{numberOfRounds} Runden
      </Badge>
    </div>
  )
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
  'repeat-hand-brain-partner': {
    label: 'DUO',
    className: 'border-amber-300 bg-amber-100 text-amber-950',
  },
  'repeat-hand-brain-roles': {
    label: 'ROLLE',
    className: 'border-sky-300 bg-sky-100 text-sky-950',
  },
  'repeat-hand-brain-team': {
    label: 'TEAM',
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
  const [isConfirming, setIsConfirming] = useState(false)
  const confirmButtonRef = useRef<HTMLButtonElement>(null)

  const handleConfirm = async () => {
    if (isConfirming) {
      return
    }

    setIsConfirming(true)

    try {
      await onConfirm()
      setOpen(false)
    } finally {
      setIsConfirming(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent
        onKeyDown={(event) => {
          if (event.key === 'Enter' && !event.defaultPrevented) {
            event.preventDefault()
            void handleConfirm()
          }
        }}
        onOpenAutoFocus={(event) => {
          event.preventDefault()
          confirmButtonRef.current?.focus()
        }}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Abbrechen</Button>
          </DialogClose>
          <Button
            ref={confirmButtonRef}
            disabled={isConfirming}
            variant="destructive"
            onClick={() => void handleConfirm()}
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
      className="grid grid-cols-[repeat(var(--round-count),minmax(0,1fr))] gap-1.5 md:gap-1"
      style={{ '--round-count': totalRounds } as CSSProperties}
    >
      {Array.from({ length: totalRounds }, (_, index) => {
        const roundNumber = index + 1

        return (
          <span
            key={roundNumber}
            className={cn(
              'h-2.5 rounded-full bg-muted md:h-2',
              roundNumber < visibleCurrentRound && 'bg-primary',
              roundNumber === visibleCurrentRound && 'bg-yellow-400',
            )}
          />
        )
      })}
    </div>
  )
}

function TournamentFormatCard({
  format,
}: {
  format: TournamentFormat
}) {
  const label = tournamentFormatLabel(format)

  return (
    <Card>
      <CardHeader className="grid grid-cols-1 items-center gap-3 p-4">
        <CardDescription className="sr-only">
          Turniermodus
        </CardDescription>
        <div className="flex min-h-10 min-w-0 items-center gap-2 rounded-md border border-primary bg-primary/10 px-3 py-2 text-primary">
          {renderTournamentFormatIcon(format)}
          <CardTitle className="min-w-0 truncate text-lg sm:text-xl">
            {label}
          </CardTitle>
        </div>
      </CardHeader>
    </Card>
  )
}

function TournamentFormatPicker({
  format,
  onFormatChange,
}: {
  format: TournamentFormat
  onFormatChange: (format: TournamentFormat) => void
}) {
  const optionClass = (isActive: boolean, isDisabled = false) =>
    cn(
      'flex h-9 min-w-0 items-center gap-1.5 rounded-md border px-2.5 text-left transition-colors',
      isActive
        ? 'border-primary bg-primary/10 text-primary ring-2 ring-primary ring-offset-1 ring-offset-background'
        : 'border-border bg-background text-muted-foreground',
      isDisabled && 'cursor-not-allowed opacity-55',
    )

  return (
    <div className="grid gap-2">
      <Label>Turniermodus</Label>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        <button
          aria-pressed={format === 'swiss'}
          className={optionClass(format === 'swiss')}
          type="button"
          onClick={() => onFormatChange('swiss')}
        >
          <Swords className="size-4 shrink-0" />
          <span className="min-w-0">
            <span className="block whitespace-nowrap text-sm font-semibold">
              {tournamentFormatLabel('swiss')}
            </span>
          </span>
        </button>
        <button
          aria-pressed={format === 'roundRobin'}
          className={optionClass(format === 'roundRobin')}
          type="button"
          onClick={() => onFormatChange('roundRobin')}
        >
          <GitBranch className="size-4 shrink-0" />
          <span className="min-w-0">
            <span className="block whitespace-nowrap text-sm font-semibold">
              {tournamentFormatLabel('roundRobin')}
            </span>
          </span>
        </button>
        <button
          aria-pressed={format === 'handAndBrain'}
          className={optionClass(format === 'handAndBrain')}
          type="button"
          onClick={() => onFormatChange('handAndBrain')}
        >
          <Brain className="size-4 shrink-0" />
          <span className="min-w-0">
            <span className="block whitespace-nowrap text-sm font-semibold">
              {tournamentFormatLabel('handAndBrain')}
            </span>
          </span>
        </button>
      </div>
    </div>
  )
}

type DraftPlayer = {
  id: string
  name: string
  rating: string
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

function defaultTournamentName(format: TournamentFormat = 'swiss') {
  const formatter = new Intl.DateTimeFormat('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })

  const label = tournamentFormatLabel(format)

  return `${label} vom ${formatter.format(new Date())}`
}

function isDefaultTournamentName(value: string) {
  return (
    value === defaultTournamentName('swiss') ||
    value === defaultTournamentName('roundRobin') ||
    value === defaultTournamentName('handAndBrain')
  )
}

function AppTitleHeader() {
  return <AppPageTitle Icon={ChessKing} title={appTitle} />
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
  const [numberOfRounds, setNumberOfRounds] = useState(() =>
    swissRoundsForPlayerCount(
      tournamentPlayersToDraftPlayers(initialTournament).filter(
        (player) => player.name.trim().length > 0,
      ).length,
    ),
  )
  const [roundsManuallyEdited, setRoundsManuallyEdited] = useState(false)
  const [format, setFormat] = useState<TournamentFormat>('swiss')
  const roundRobinCycles = 1
  const [players, setPlayers] = useState<DraftPlayer[]>(() =>
    tournamentPlayersToDraftPlayers(initialTournament),
  )
  const [newDraftPlayerName, setNewDraftPlayerName] = useState('')
  const [newDraftPlayerRating, setNewDraftPlayerRating] = useState('')
  const [initialSeedingMode, setInitialSeedingMode] =
    useState<SeedingMode>('rating')
  const [byeScore, setByeScore] = useState<ByeScore>(1)
  const [createError, setCreateError] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const cleanPlayerCount = players.filter(
    (player) => player.name.trim().length > 0,
  ).length
  const automaticRoundCount = defaultRoundsForFormat(
    format,
    cleanPlayerCount,
    roundRobinCycles,
  )
  const effectiveNumberOfRounds =
    format === 'roundRobin' || !roundsManuallyEdited
      ? automaticRoundCount
      : numberOfRounds
  const handleFormatChange = (nextFormat: TournamentFormat) => {
    setName((currentName) =>
      isDefaultTournamentName(currentName)
        ? defaultTournamentName(nextFormat)
        : currentName,
    )
    setByeScore(nextFormat === 'handAndBrain' ? 0.5 : 1)
    setFormat(nextFormat)
  }
  const handleAddDraftPlayer = () => {
    const draftName = newDraftPlayerName.trim()

    if (!draftName) {
      return
    }

    setPlayers((currentPlayers) => [
      ...currentPlayers,
      {
        id: `draft-${Date.now()}-${currentPlayers.length}-${Math.random()
          .toString(36)
          .slice(2)}`,
        name: draftName,
        rating: newDraftPlayerRating.trim(),
      },
    ])
    setNewDraftPlayerName('')
    setNewDraftPlayerRating('')
  }

  return (
    <Card>
      <CardContent className="grid gap-4 p-6">
        <TournamentFormatPicker
          format={format}
          onFormatChange={handleFormatChange}
        />

        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <LabeledInput
              id="swiss-name"
              label="Turniername"
              value={name}
              onChange={(event) => setName(event.currentTarget.value)}
            />
          </div>
          <div>
            <LabeledInput
              id="swiss-rounds"
              label="Runden"
              min={1}
              readOnly={format === 'roundRobin'}
              type="number"
              value={effectiveNumberOfRounds}
              onChange={(event) => {
                setRoundsManuallyEdited(true)
                setNumberOfRounds(Number(event.currentTarget.value))
              }}
            />
          </div>
        </div>

        <div className="grid gap-3 border-b pb-4 md:grid-cols-2">
          <div>
            <Select
              value={initialSeedingMode}
              disabled={format === 'roundRobin'}
              onValueChange={(value) =>
                setInitialSeedingMode(value as SeedingMode)
              }
            >
              <SelectTrigger label="Sortierung">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="rating">nach Rating</SelectItem>
                <SelectItem value="random">zufällig</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Select
              value={String(byeScore)}
              onValueChange={(value) => setByeScore(Number(value) as ByeScore)}
            >
              <SelectTrigger label="Punkte pro Bye">
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

          <div className="overflow-hidden rounded-md border bg-card/70">
            <div className="grid grid-cols-[minmax(0,1fr)_5.5rem_2.5rem] gap-2 border-b bg-muted/60 px-2.5 py-1.5 text-xs font-semibold text-muted-foreground sm:grid-cols-[minmax(0,1fr)_8rem_2.5rem] sm:px-3">
              <span>Name</span>
              <span>Rating</span>
              <span className="sr-only">Aktion</span>
            </div>
            {players.map((player) => (
              <div
                key={player.id}
                className="grid grid-cols-[minmax(0,1fr)_5.5rem_2.5rem] items-center gap-2 border-b px-2.5 py-1.5 sm:grid-cols-[minmax(0,1fr)_8rem_2.5rem] sm:px-3"
              >
                <Input
                    aria-label={`Name von ${player.name || 'Spieler'}`}
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
                <Input
                    aria-label={`Rating von ${player.name || 'Spieler'}`}
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
                <Button
                  aria-label={`${player.name || 'Spieler'} entfernen`}
                  className="h-9"
                  size="sm"
                  variant="delete"
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
            <form
              className="border-t border-dashed bg-background px-2.5 py-2 sm:px-3"
              onSubmit={(event) => {
                event.preventDefault()
                handleAddDraftPlayer()
              }}
            >
              <div className="grid grid-cols-[minmax(0,1fr)_5.5rem] gap-2 sm:grid-cols-[minmax(0,1fr)_8rem_2.5rem] md:grid-cols-[1fr_8rem_auto]">
                <Input
                  aria-label="Name des neuen Spielers"
                  placeholder="Name"
                  value={newDraftPlayerName}
                  onChange={(event) =>
                    setNewDraftPlayerName(event.currentTarget.value)
                  }
                />
                <Input
                  aria-label="Rating des neuen Spielers"
                  placeholder="Rating"
                  type="number"
                  value={newDraftPlayerRating}
                  onChange={(event) =>
                    setNewDraftPlayerRating(event.currentTarget.value)
                  }
                />
                <Button
                  aria-label="Spieler hinzufügen"
                  className="col-span-2 h-9 w-full sm:col-span-1 sm:w-10 md:w-auto"
                  type="submit"
                  variant="outline"
                  disabled={newDraftPlayerName.trim().length === 0}
                >
                  <CirclePlus className="size-4" />
                  <span className="sm:sr-only md:not-sr-only">Spieler hinzufügen</span>
                </Button>
              </div>
            </form>
          </div>
        </div>

        {createError && (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {createError}
          </div>
        )}

        <Button
          disabled={
            isCreating || players.every((player) => player.name.trim().length === 0)
          }
          onClick={async () => {
            setCreateError(null)
            setIsCreating(true)

            try {
              await onCreate({
                name,
                format,
                numberOfRounds: effectiveNumberOfRounds,
                players: players.map((player) => ({
                  name: player.name,
                  rating: player.rating ? Number(player.rating) : undefined,
                })),
                initialSeedingMode,
                byeScore,
                roundRobinCycles,
              })
              toast.success('Turnier wurde angelegt.')
              onCreated?.()
            } catch (error) {
              const message =
                error instanceof Error
                  ? error.message
                  : 'Das Turnier konnte nicht angelegt werden.'

              setCreateError(message)
              toast.error('Turnier konnte nicht angelegt werden.')
            } finally {
              setIsCreating(false)
            }
          }}
        >
          <ArrowRight className="size-4" />
          {isCreating ? 'Turnier wird gestartet' : 'Turnier starten'}
        </Button>
      </CardContent>
    </Card>
  )
}

function NewTournamentDialog({
  initialTournament,
  onCreate,
  trigger,
}: {
  initialTournament?: Tournament | null
  onCreate: ReturnType<typeof useSwissTournaments>['createNewTournament']
  trigger?: ReactNode
}) {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button>
            <Plus className="size-4" />
            Neues Turnier
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[92vh] w-[calc(100vw-1rem)] overflow-y-auto p-4 sm:max-w-5xl sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <CirclePlus className="size-5 text-primary" />
            Neues Turnier anlegen
          </DialogTitle>
          <DialogDescription className="sr-only">
            Turniermodus, Einstellungen und Spieler für ein neues Turnier festlegen.
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

type ArchivedTournamentSummary = {
  category: string
  completedRounds: number
  standings: ReturnType<typeof recalculateStandings>
  tournament: Tournament
}

function ArchivedTournamentsList({
  entries,
  onDelete,
  onExportCsv,
  onExportJson,
  onPrint,
}: {
  entries: ArchivedTournamentSummary[]
  onDelete: (tournament: Tournament) => void | Promise<void>
  onExportCsv: (tournament: Tournament) => void
  onExportJson: (tournament: Tournament) => void
  onPrint: (tournament: Tournament) => void
}) {
  const topPlayers = (entry: ArchivedTournamentSummary) =>
    entry.standings
      .slice(0, 3)
      .map((row) => `${row.rank}. ${row.playerName} (${formatPoints(row.points)})`)
      .join(', ') || '-'
  const actions = (tournament: Tournament) => (
    <div className="flex flex-nowrap items-center gap-1.5">
      <Button
        aria-label={`${tournament.name} als PDF drucken`}
        size="sm"
        variant="outline"
        onClick={() => onPrint(tournament)}
      >
        <Printer className="size-4" />
        PDF
      </Button>
      <Button
        aria-label={`${tournament.name} als Rangliste CSV exportieren`}
        size="sm"
        variant="outline"
        onClick={() => onExportCsv(tournament)}
      >
        <Download className="size-4" />
        CSV
      </Button>
      <Button
        aria-label={`${tournament.name} als JSON exportieren`}
        size="sm"
        variant="outline"
        onClick={() => onExportJson(tournament)}
      >
        <FileJson className="size-4" />
        JSON
      </Button>
      <ConfirmButton
        title="Vergangenes Turnier löschen?"
        description={`"${tournament.name}" wird dauerhaft aus der Liste vergangener Turniere entfernt.`}
        confirmLabel="Löschen"
        onConfirm={() => onDelete(tournament)}
        trigger={
          <Button
            aria-label={`${tournament.name} löschen`}
            size="sm"
            variant="delete"
          >
            <Trash2 className="size-4" />
          </Button>
        }
      />
    </div>
  )

  if (entries.length === 0) {
    return (
      <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
        Noch keine vergangenen Turniere gespeichert.
      </div>
    )
  }

  return (
    <>
      <div className="grid gap-2 md:hidden">
        {entries.map((entry) => (
          <div
            key={entry.tournament.id}
            className="grid gap-3 rounded-md border bg-background p-3 text-sm"
          >
            <div className="min-w-0">
              <div className="truncate font-semibold">{entry.tournament.name}</div>
              <div className="mt-1 flex flex-wrap gap-1.5">
                <Badge variant="secondary">
                  {entry.category}
                </Badge>
                <Badge variant="outline">
                  {entry.completedRounds}/{entry.tournament.numberOfRounds} Runden
                </Badge>
                <Badge variant="outline">
                  {entry.tournament.players.length} Spieler
                </Badge>
              </div>
            </div>
            <div className="grid gap-1 text-xs text-muted-foreground">
              <span>{formatDateTime(entry.tournament.archivedAtClientIso)}</span>
              <span className="line-clamp-2">Top 3: {topPlayers(entry)}</span>
            </div>
            {actions(entry.tournament)}
          </div>
        ))}
      </div>

      <div className="hidden overflow-x-auto rounded-md border md:block">
        <table className="w-full min-w-[58rem] text-sm">
          <thead className="bg-muted/70 text-left">
            <tr>
              <th className="p-3">Turnier</th>
              <th className="p-3">Archiviert</th>
              <th className="p-3">Kategorie</th>
              <th className="p-3">Umfang</th>
              <th className="p-3">Top 3</th>
              <th className="p-3">Aktionen</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.tournament.id} className="border-t align-middle">
                <td className="max-w-56 p-2.5 font-medium">
                  <span className="block truncate">{entry.tournament.name}</span>
                </td>
                <td className="p-2.5 whitespace-nowrap">
                  {formatDateTime(entry.tournament.archivedAtClientIso)}
                </td>
                <td className="p-2.5">
                  <Badge variant="secondary">
                    {entry.category}
                  </Badge>
                </td>
                <td className="p-2.5 whitespace-nowrap">
                  {entry.tournament.players.length} Spieler, {entry.completedRounds}/
                  {entry.tournament.numberOfRounds} Runden
                </td>
                <td className="max-w-72 p-2.5 text-muted-foreground">
                  <span className="line-clamp-2">{topPlayers(entry)}</span>
                </td>
                <td className="p-2.5">{actions(entry.tournament)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

export function SwissTournamentsPage() {
  const app = useSwissTournaments()
  const tournament = app.activeTournament
  const [isArchiveOpen, setIsArchiveOpen] = useState(false)
  const [newPlayerName, setNewPlayerName] = useState('')
  const [newPlayerRating, setNewPlayerRating] = useState('')
  const [manualWhite, setManualWhite] = useState('')
  const [manualBlack, setManualBlack] = useState('')
  const [manualWhiteBrain, setManualWhiteBrain] = useState('')
  const [manualWhiteHand, setManualWhiteHand] = useState('')
  const [manualBlackBrain, setManualBlackBrain] = useState('')
  const [manualBlackHand, setManualBlackHand] = useState('')
  const [printTournament, setPrintTournament] = useState<Tournament | null>(null)
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

    if (!currentRound) {
      return false
    }

    if (currentRound.status === 'completed') {
      return !draftRound
    }

    return (
      currentRound.status === 'draft' &&
      !currentRound.pairings.some(hasMissingGameResult)
    )
  }, [currentRound, draftRound, tournament])
  const canRegenerateRound = Boolean(draftRound)
  const displayedRounds = useMemo(
    () =>
      tournament
        ? [...tournament.rounds].sort(
            (left, right) => right.roundNumber - left.roundNumber,
          )
        : [],
    [tournament],
  )
  const completedRounds = tournament ? completedRoundCount(tournament) : 0
  const isTournamentComplete =
    Boolean(tournament) &&
    tournament.numberOfRounds > 0 &&
    completedRounds >= tournament.numberOfRounds
  const completionBannerBeforeRoundNumber =
    tournament && isTournamentComplete
      ? displayedRounds.find(
          (round) => round.roundNumber <= tournament.numberOfRounds,
        )?.roundNumber ?? null
      : null
  const archivedTournamentSummaries = useMemo(
    () =>
      app.archivedTournaments.map((entry) => ({
        category: tournamentFormatLabel(entry.format),
        completedRounds: completedRoundCount(entry),
        standings: recalculateStandings(entry),
        tournament: entry,
      })),
    [app.archivedTournaments],
  )
  const visibleStandingsTournament = printTournament ?? tournament
  const visibleStandings = useMemo(
    () => {
      if (!visibleStandingsTournament) {
        return []
      }

      return visibleStandingsTournament.id === tournament?.id
        ? app.standings
        : recalculateStandings(visibleStandingsTournament)
    },
    [app.standings, tournament?.id, visibleStandingsTournament],
  )

  const [activeTab, setActiveTab] = useState('overview')
  const printPage = (targetTournament = tournament) => {
    if (!targetTournament) {
      return
    }

    const originalTitle = document.title
    const preloadQrCode = new Promise<void>((resolve) => {
      const image = new Image()

      image.onload = () => resolve()
      image.onerror = () => resolve()
      image.src = new URL(tournamentWebsiteQrUrl, window.location.origin).toString()
    })

    setPrintTournament(targetTournament)
    setActiveTab('standings')
    window.requestAnimationFrame(async () => {
      await preloadQrCode
      document.title = printablePdfTitle(targetTournament.name)
      window.addEventListener(
        'afterprint',
        () => {
          document.title = originalTitle
          setPrintTournament(null)
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
      <div className="swiss-tournaments-page mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6 lg:py-10">
        <AppTitleHeader />
        {app.error && (
          <Card className="border-destructive">
            <CardHeader>
              <CardTitle>Sync-Fehler</CardTitle>
              <CardDescription>{app.error.message}</CardDescription>
            </CardHeader>
          </Card>
        )}
        <Card>
          <CardHeader className="gap-4">
            <div className="grid gap-1">
              <CardTitle>Kein aktives Turnier</CardTitle>
              <CardDescription>
                Lege ein neues Turnier im Dialog an.
              </CardDescription>
            </div>
            <div>
              <NewTournamentDialog
                initialTournament={app.tournaments[0] ?? null}
                onCreate={app.createNewTournament}
              />
            </div>
          </CardHeader>
        </Card>
      </div>
    )
  }

  const handleAddPlayer = async () => {
    if (newPlayerName.trim().length === 0) {
      return
    }

    await app.addPlayer(
      newPlayerName,
      newPlayerRating ? Number(newPlayerRating) : undefined,
    )
    setNewPlayerName('')
    setNewPlayerRating('')
    toast.success('Spieler wurde hinzugefügt.')
  }

  const canRemovePlayer = (playerId: string) =>
    canRemovePlayerFromTournament(tournament, playerId)
  const manuallyUsedPlayerIds = new Set(
    (draftRound?.pairings ?? [])
      .filter((pairing) => pairing.isManual)
      .flatMap(pairingPlayerIds),
  )
  const manualHandBrainIds = [
    manualWhiteBrain,
    manualWhiteHand,
    manualBlackBrain,
    manualBlackHand,
  ]
  const manualWhiteOptions = tournament.players.filter(
    (player) => !manuallyUsedPlayerIds.has(player.id) && player.id !== manualBlack,
  )
  const manualBlackOptions = tournament.players.filter(
    (player) => !manuallyUsedPlayerIds.has(player.id) && player.id !== manualWhite,
  )
  const canAddManualPairing =
    Boolean(manualWhite) &&
    Boolean(manualBlack) &&
    manualWhite !== manualBlack &&
    !manuallyUsedPlayerIds.has(manualWhite) &&
    !manuallyUsedPlayerIds.has(manualBlack)
  const handBrainOptionFor = (currentPlayerId: string) =>
    tournament.players.filter(
      (player) =>
        !manuallyUsedPlayerIds.has(player.id) &&
        (player.id === currentPlayerId ||
          !manualHandBrainIds.some((playerId) => playerId === player.id)),
    )
  const canAddManualHandBrainPairing =
    tournament.format === 'handAndBrain' &&
    manualHandBrainIds.every(Boolean) &&
    new Set(manualHandBrainIds).size === 4 &&
    manualHandBrainIds.every((playerId) => !manuallyUsedPlayerIds.has(playerId))

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
        <TabsList className="swiss-print-hidden grid h-auto w-full grid-cols-2 sm:grid-cols-4">
          <TabsTrigger value="overview" className="min-w-0 font-semibold tracking-normal">
            <LayoutDashboard className="size-5 text-primary" />
            Übersicht
          </TabsTrigger>
          <TabsTrigger value="players" className="min-w-0 font-semibold tracking-normal">
            <UsersRound className="size-5 text-primary" />
            Spieler
          </TabsTrigger>
          <TabsTrigger value="pairings" className="min-w-0 font-semibold tracking-normal">
            <Swords className="size-5 text-primary" />
            Paarungen
          </TabsTrigger>
          <TabsTrigger value="standings" className="min-w-0 font-semibold tracking-normal">
            <Trophy className="size-5 text-primary" />
            Rangliste
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="grid gap-4">
          <section className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="gap-3 p-4 md:gap-2">
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-3">
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
            <TournamentFormatCard
              format={tournament.format ?? 'swiss'}
            />
            <NewTournamentDialog
              initialTournament={tournament}
              onCreate={app.createNewTournament}
              trigger={
                <Button className="h-full min-h-0 w-full rounded-lg px-4 text-base shadow-sm">
                  <Plus className="size-5" />
                  <span className="min-w-0 truncate">
                    Neues Turnier
                  </span>
                </Button>
              }
            />
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
              <CardTitle className="flex items-center gap-2">
                <Settings className="size-5 text-primary" />
                Einstellungen und Export
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid gap-3 md:grid-cols-4 xl:grid-cols-5">
                <div>
                  <LabeledInput
                    label="Turniername"
                    value={tournament.name}
                    onChange={(event) =>
                      void app.updateTournamentMeta({
                        name: event.currentTarget.value,
                      })
                    }
                  />
                </div>
                {(tournament.format ?? 'swiss') !== 'roundRobin' && (
                  <div>
                    <LabeledInput
                      label="Runden"
                      min={Math.max(1, highestCompletedRoundNumber(tournament))}
                      type="number"
                      value={tournament.numberOfRounds}
                      onChange={(event) =>
                        void app.updateTournamentMeta({
                          numberOfRounds: Number(event.currentTarget.value),
                        })
                      }
                    />
                  </div>
                )}
                <div>
                  <Select
                    value={String(tournament.settings.byeScore)}
                    onValueChange={(value) =>
                      void app.updateSettings({
                        byeScore: Number(value) as ByeScore,
                      })
                    }
                  >
                    <SelectTrigger
                      className={singleLineSelectTriggerClass}
                      label="Punkte pro Bye"
                    >
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
                <div>
                  <Select
                    value={tournament.settings.byePolicy}
                    onValueChange={(value) =>
                      void app.updateSettings({
                        byePolicy: value as ByePolicy,
                      })
                    }
                  >
                    <SelectTrigger
                      className={singleLineSelectTriggerClass}
                      label="Bye-Vergabe"
                    >
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
                <Button variant="outline" onClick={() => printPage()}>
                  <Printer className="size-4" />
                  PDF
                </Button>
                <Button variant="outline" onClick={() => app.exportStandingsCsv()}>
                  <Download className="size-4" />
                  CSV
                </Button>
                <Button variant="outline" onClick={() => app.exportTournamentJson()}>
                  <FileJson className="size-4" />
                  JSON
                </Button>
              </div>

              <div className="grid gap-3 border-t pt-4">
                <button
                  aria-expanded={isArchiveOpen}
                  className="flex w-full items-center justify-between gap-3 rounded-md px-0 py-1 text-left"
                  type="button"
                  onClick={() => setIsArchiveOpen((current) => !current)}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <Archive className="size-5 shrink-0 text-primary" />
                    <span className="truncate text-base font-semibold">
                      Vergangene Turniere
                    </span>
                    <Badge variant="secondary">{archivedTournamentSummaries.length}</Badge>
                  </span>
                  <ChevronDown
                    className={cn(
                      'size-4 shrink-0 text-muted-foreground transition-transform',
                      isArchiveOpen && 'rotate-180',
                    )}
                  />
                </button>
                {isArchiveOpen && (
                  <ArchivedTournamentsList
                    entries={archivedTournamentSummaries}
                    onDelete={async (archivedTournament) => {
                      await app.deleteTournament(archivedTournament.id)
                      toast.success('Vergangenes Turnier wurde geloescht.')
                    }}
                    onExportCsv={app.exportStandingsCsv}
                    onExportJson={app.exportTournamentJson}
                    onPrint={printPage}
                  />
                )}
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
              <form
                className="rounded-md border border-dashed bg-background p-3"
                onSubmit={(event) => {
                  event.preventDefault()
                  void handleAddPlayer()
                }}
              >
                <div className="grid grid-cols-[minmax(0,1fr)_6.5rem] gap-2 md:grid-cols-[1fr_10rem_auto] md:gap-3">
                  <LabeledInput
                    label="Name"
                    value={newPlayerName}
                    onChange={(event) => setNewPlayerName(event.currentTarget.value)}
                  />
                  <LabeledInput
                    label="Rating"
                    type="number"
                    value={newPlayerRating}
                    onChange={(event) => setNewPlayerRating(event.currentTarget.value)}
                  />
                  <Button
                    className="col-span-2 h-9 w-full md:col-span-1 md:w-auto"
                    type="submit"
                    variant="outline"
                    disabled={newPlayerName.trim().length === 0}
                  >
                    <CirclePlus className="size-4" />
                    Spieler hinzufügen
                  </Button>
                </div>
              </form>

              <div className="grid gap-2 md:hidden">
                <div className="grid grid-cols-[minmax(0,1fr)_6.5rem] gap-2 px-2.5 text-xs font-semibold text-muted-foreground">
                  <span>Name</span>
                  <span>Rating</span>
                </div>
                {tournament.players.map((player, index) => {
                  const canRemove = canRemovePlayer(player.id)

                  return (
                    <div
                      key={player.id}
                      className="grid gap-3 rounded-md border bg-card p-2.5 text-sm"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="flex h-6 min-w-7 items-center justify-center rounded-md border bg-secondary px-2 text-xs font-semibold leading-none tabular-nums">
                            #{index + 1}
                          </span>
                          <Badge className="h-6" variant={statusVariant(player.status)}>
                            {statusLabels[player.status]}
                          </Badge>
                        </div>
                        <span className="text-xs text-muted-foreground tabular-nums">
                          ab Runde {player.addedInRound}
                        </span>
                      </div>

                      <div className="grid grid-cols-[minmax(0,1fr)_6.5rem] gap-2">
                        <Input
                          aria-label={`Name von ${player.name}`}
                          value={player.name}
                          onChange={(event) =>
                            void app.updatePlayer(player.id, {
                              name: event.currentTarget.value,
                              rating: player.rating,
                            })
                          }
                        />
                        <Input
                          aria-label={`Rating von ${player.name}`}
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
                      </div>

                      <div className="grid grid-cols-[minmax(0,1fr)_2.25rem] gap-2">
                        <Select
                          value={player.status}
                          onValueChange={(value) =>
                            void app.changePlayerStatus(
                              player.id,
                              value as PlayerStatus,
                            )
                          }
                        >
                          <SelectTrigger label="Status">
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
                          className="size-9 px-0"
                          disabled={!canRemove}
                          title={
                            canRemove
                              ? `${player.name} entfernen`
                              : 'Spieler ist bereits in einer Runde verwendet.'
                          }
                          variant="delete"
                          onClick={async () => {
                            if (!canRemove) {
                              return
                            }

                            await app.removePlayer(player.id)
                            toast.success(`${player.name} wurde entfernt.`)
                          }}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="hidden overflow-x-auto rounded-md border md:block">
                <table className="w-full min-w-[52rem] text-sm">
                  <thead className="bg-muted/70 text-left">
                    <tr>
                      <th className="p-3">#</th>
                      <th className="p-3">Name</th>
                      <th className="p-3">Rating</th>
                      <th className="p-3">Ab Runde</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Aktion</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tournament.players.map((player, index) => {
                      const canRemove = canRemovePlayer(player.id)

                      return (
                      <tr key={player.id} className="border-t">
                        <td className="p-3 tabular-nums">{index + 1}</td>
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
                              className="h-9"
                              disabled={!canRemove}
                              size="sm"
                              title={
                                canRemove
                                  ? `${player.name} entfernen`
                                  : 'Spieler ist bereits in einer Runde verwendet.'
                              }
                              variant="delete"
                              onClick={async () => {
                                if (!canRemove) {
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
                      )
                    })}
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
              </div>
            </CardHeader>
            <CardContent className="grid gap-4">
              {displayedRounds.length > 0 ? (
                displayedRounds.map((round, index) => {
                  const isCurrentRound = index === 0
                  const isEditable = isCurrentRound && round.status === 'draft'
                  const roundLabel = getRoundDisplayLabel(tournament, round.roundNumber)
                  const canCreateNextRound =
                    isCurrentRound &&
                    (round.status === 'completed' ||
                      (round.status === 'draft' &&
                        !round.pairings.some(hasMissingGameResult)))
                  const canGoBackToRound =
                    index === 1 &&
                    round.status === 'completed' &&
                    currentRound?.roundNumber === round.roundNumber + 1

                  return (
                    <Fragment key={round.id}>
                      {round.roundNumber === completionBannerBeforeRoundNumber && (
                        <TournamentCompleteBanner
                          completedRounds={tournament.numberOfRounds}
                          label="Turnier beendet"
                          numberOfRounds={tournament.numberOfRounds}
                        />
                      )}
                      <Card
                        className={cn(
                          'overflow-hidden',
                          isCurrentRound
                            ? 'border-l-4 border-l-primary bg-primary/5'
                            : 'bg-card/80 opacity-85',
                        )}
                      >
                      <CardHeader className="p-4 sm:p-6">
                        <div className="flex min-w-0 flex-col gap-2 md:flex-row md:items-center md:justify-between">
                          <div className="flex min-w-0 flex-wrap items-center gap-2">
                            <CardTitle>{roundLabel}</CardTitle>
                            <Badge variant={isCurrentRound ? 'default' : 'outline'}>
                              {isCurrentRound ? 'aktuell' : 'archiviert'}
                            </Badge>
                            <Badge variant="secondary">{round.status}</Badge>
                            <Badge variant="outline">
                              {round.pairings.length} Bretter/Byes
                            </Badge>
                          </div>
                          <div className="flex w-full min-w-0 flex-col justify-end gap-2 md:w-auto md:flex-row">
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
                                  <Button
                                    aria-label="Runde wieder bearbeiten"
                                    className="h-8 w-full shrink-0 p-0 md:w-10"
                                    title="Runde wieder bearbeiten"
                                    variant="outline"
                                  >
                                    <Pencil className="size-4" />
                                  </Button>
                                }
                              />
                            )}
                            {isCurrentRound && (
                              <>
                                <Button
                                  className="h-8 w-full md:w-auto"
                                  disabled={!canCreateNextRound}
                                  onClick={() => void app.generateRound()}
                                >
                                  <Plus className="size-4" />
                                  Neue Runde
                                </Button>
                                {isEditable && (
                                  <Button
                                    className="h-8 w-full md:w-auto"
                                    variant="outline"
                                    disabled={!canRegenerateRound}
                                    onClick={() => void app.regenerateRound()}
                                  >
                                    <RefreshCw className="size-4" />
                                    Neu erzeugen
                                  </Button>
                                )}
                                <ConfirmButton
                                title={`${roundLabel} löschen?`}
                                description={
                                  index + 1 < displayedRounds.length
                                    ? 'Die aktuelle Runde und alle Paarungen darin werden gelöscht. Die vorherige Runde wird wieder geöffnet und kann bearbeitet werden.'
                                    : 'Die aktuelle Runde und alle Paarungen darin werden gelöscht.'
                                }
                                confirmLabel="Löschen"
                                onConfirm={async () => {
                                  await app.deleteLatestRound()
                                  toast.success(
                                    index + 1 < displayedRounds.length
                                      ? `${roundLabel} wurde gelöscht. Die vorherige Runde ist wieder bearbeitbar.`
                                      : `${roundLabel} wurde gelöscht.`,
                                  )
                                }}
                                trigger={
                                  <Button
                                    aria-label="Aktuelle Runde löschen"
                                    className="h-8 w-full p-0 md:w-10"
                                    size="sm"
                                    title="Aktuelle Runde löschen"
                                    variant="delete"
                                  >
                                    <Trash2 className="size-4" />
                                  </Button>
                                  }
                                />
                              </>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="grid gap-4 p-4 pt-0 sm:p-6 sm:pt-0">
                        <PairingsTable
                          editable={isEditable}
                          pairings={round.pairings}
                          resultCorrectionEnabled={!isEditable && round.status === 'completed'}
                          showWarnings
                          tournament={tournament}
                          onManualPairingRemove={(pairingId) =>
                            void app.removeManualPairing(round.roundNumber, pairingId)
                          }
                          onResultCorrection={(pairingId, result) =>
                            app.correctResult(round.roundNumber, pairingId, result)
                          }
                          onResultChange={(pairingId, result) =>
                            void app.setResult(round.roundNumber, pairingId, result)
                          }
                        />
                        {isEditable && draftRound && (
                          <div className="grid gap-3 rounded-md border border-dashed bg-background p-3">
                            {tournament.format === 'handAndBrain' && (
                              <div className="grid gap-2">
                                <div className="flex items-center gap-2 text-sm font-semibold">
                                  <Brain className="size-4 text-primary" />
                                  Hand-and-Brain-Brett fixieren
                                </div>
                                <div className="grid gap-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_8.5rem]">
                                  <div className="grid gap-2 sm:grid-cols-2">
                                    <Select value={manualWhiteBrain} onValueChange={setManualWhiteBrain}>
                                      <SelectTrigger
                                        className={singleLineSelectTriggerClass}
                                        label="Weiß · Brain"
                                      >
                                        <SelectValue
                                          placeholder={roleColorPlaceholder(
                                            <Brain className="size-4 shrink-0 text-primary" />,
                                            'Weiß',
                                          )}
                                        />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {handBrainOptionFor(manualWhiteBrain).map((player) => (
                                          <SelectItem key={player.id} value={player.id}>
                                            {player.name}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                    <Select value={manualWhiteHand} onValueChange={setManualWhiteHand}>
                                      <SelectTrigger
                                        className={singleLineSelectTriggerClass}
                                        label="Weiß · Hand"
                                      >
                                        <SelectValue
                                          placeholder={roleColorPlaceholder(
                                            <Hand className="size-4 shrink-0 text-primary" />,
                                            'Weiß',
                                          )}
                                        />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {handBrainOptionFor(manualWhiteHand).map((player) => (
                                          <SelectItem key={player.id} value={player.id}>
                                            {player.name}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div className="grid gap-2 sm:grid-cols-2">
                                    <Select value={manualBlackBrain} onValueChange={setManualBlackBrain}>
                                      <SelectTrigger
                                        className={singleLineSelectTriggerClass}
                                        label="Schwarz · Brain"
                                      >
                                        <SelectValue
                                          placeholder={roleColorPlaceholder(
                                            <Brain className="size-4 shrink-0 text-primary" />,
                                            'Schwarz',
                                          )}
                                        />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {handBrainOptionFor(manualBlackBrain).map((player) => (
                                          <SelectItem key={player.id} value={player.id}>
                                            {player.name}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                    <Select value={manualBlackHand} onValueChange={setManualBlackHand}>
                                      <SelectTrigger
                                        className={singleLineSelectTriggerClass}
                                        label="Schwarz · Hand"
                                      >
                                        <SelectValue
                                          placeholder={roleColorPlaceholder(
                                            <Hand className="size-4 shrink-0 text-primary" />,
                                            'Schwarz',
                                          )}
                                        />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {handBrainOptionFor(manualBlackHand).map((player) => (
                                          <SelectItem key={player.id} value={player.id}>
                                            {player.name}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <Button
                                    className="h-9 w-full"
                                    disabled={!canAddManualHandBrainPairing}
                                    onClick={async () => {
                                      if (!canAddManualHandBrainPairing) {
                                        return
                                      }

                                      await app.addManualHandBrainPairing(draftRound.roundNumber, {
                                        white: {
                                          brainPlayerId: manualWhiteBrain,
                                          handPlayerId: manualWhiteHand,
                                        },
                                        black: {
                                          brainPlayerId: manualBlackBrain,
                                          handPlayerId: manualBlackHand,
                                        },
                                      })
                                      setManualWhiteBrain('')
                                      setManualWhiteHand('')
                                      setManualBlackBrain('')
                                      setManualBlackHand('')
                                      toast.success('Hand-and-Brain-Brett fixiert.')
                                    }}
                                  >
                                    H&B fixieren
                                  </Button>
                                </div>
                              </div>
                            )}
                            <div className="grid gap-2 md:gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_8.5rem]">
                              <Select value={manualWhite} onValueChange={setManualWhite}>
                                <SelectTrigger
                                  className={singleLineSelectTriggerClass}
                                  label="Weiß"
                                >
                                  <SelectValue
                                    placeholder={roleColorPlaceholder(
                                      <ChessKing className="size-4 shrink-0 text-primary" />,
                                      'Weiß',
                                    )}
                                  />
                                </SelectTrigger>
                                <SelectContent>
                                  {manualWhiteOptions.map((player) => (
                                    <SelectItem key={player.id} value={player.id}>
                                      {player.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Select value={manualBlack} onValueChange={setManualBlack}>
                                <SelectTrigger
                                  className={singleLineSelectTriggerClass}
                                  label="Schwarz"
                                >
                                  <SelectValue
                                    placeholder={roleColorPlaceholder(
                                      <ChessKing className="size-4 shrink-0 text-primary" />,
                                      'Schwarz',
                                    )}
                                  />
                                </SelectTrigger>
                                <SelectContent>
                                  {manualBlackOptions.map((player) => (
                                    <SelectItem key={player.id} value={player.id}>
                                      {player.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Button
                                className="h-9 w-full"
                                disabled={!canAddManualPairing}
                                onClick={async () => {
                                  if (!canAddManualPairing) {
                                    return
                                  }

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
                                {tournament.format === 'handAndBrain' ? 'Einzel fixieren' : 'Fixieren'}
                              </Button>
                            </div>
                          </div>
                        )}
                      </CardContent>
                      </Card>
                    </Fragment>
                  )
                })
              ) : (
                <div className="flex flex-col gap-3 rounded-md border border-dashed p-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                  <span>Erzeuge die erste Runde, sobald Spieler angelegt sind.</span>
                  <Button
                    className="w-full sm:w-auto"
                    disabled={!canGenerateRound}
                    onClick={() => void app.generateRound()}
                  >
                    <Plus className="size-4" />
                    Neue Runde
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="standings">
          <StandingsTable
            standings={visibleStandings}
            tournamentName={visibleStandingsTournament.name}
          />
        </TabsContent>

      </Tabs>
    </div>
  )
}

function ResultCorrectionBadge({
  onCorrect,
  pairing,
}: {
  onCorrect: (pairingId: string, result?: GameResult) => unknown
  pairing: Pairing
}) {
  const [isSaving, setIsSaving] = useState(false)
  const handleCorrection = async (value: ResultSelectValue) => {
    if (isSaving) {
      return
    }

    const result = value === openResultValue ? undefined : (value as GameResult)

    setIsSaving(true)

    try {
      await onCorrect(pairing.id, result)
      toast.success('Ergebnis wurde korrigiert.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Select
      disabled={isSaving}
      value={pairing.result ?? openResultValue}
      onValueChange={(value) => void handleCorrection(value as ResultSelectValue)}
    >
      <SelectTrigger
        aria-label={`Ergebnis ${resultLabel(pairing.result)} korrigieren`}
        className={cn(
          'inline-flex h-auto w-auto min-w-0 justify-center rounded-md px-2.5 py-0.5 text-xs font-semibold shadow-none',
          'border-border bg-background text-foreground hover:bg-accent focus:ring-ring/40',
          '[&>span]:truncate [&>svg]:hidden',
          !pairing.result && 'bg-muted text-muted-foreground',
        )}
        title="Ergebnis korrigieren"
      >
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

function PairingsTable({
  editable = false,
  onManualPairingRemove,
  onResultCorrection,
  onResultChange,
  tournament,
  pairings,
  resultCorrectionEnabled = false,
  showWarnings = true,
}: {
  editable?: boolean
  onManualPairingRemove?: (pairingId: string) => void
  onResultCorrection?: (pairingId: string, result?: GameResult) => unknown
  onResultChange?: (pairingId: string, result?: GameResult) => void
  tournament: Tournament
  pairings: Pairing[]
  resultCorrectionEnabled?: boolean
  showWarnings?: boolean
}) {
  const canChangePairings = editable
  const handleResultSelect = (pairingId: string, value: ResultSelectValue) => {
    onResultChange?.(
      pairingId,
      value === openResultValue ? undefined : (value as GameResult),
    )
  }
  const visibleWarningsForPairing = (pairing: Pairing) =>
    (pairing.warnings ?? []).filter(
      (warning) =>
        tournament.format !== 'roundRobin' || warning.id !== 'large-point-gap',
    )
  const sideLabel = (
    side: NonNullable<Pairing['handBrainSides']>['white'] | undefined,
  ) => {
    if (!side) {
      return '-'
    }

    return `Brain: ${playerName(tournament, side.brainPlayerId)} · Hand: ${playerName(
      tournament,
      side.handPlayerId,
    )}`
  }
  const renderSide = (
    side: NonNullable<Pairing['handBrainSides']>['white'] | undefined,
  ) => {
    if (!side) {
      return '-'
    }

    return (
      <div className="grid gap-1 leading-tight">
        <div className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-1.5">
          <Brain className="size-3.5 shrink-0 text-primary" />
          <span className="sr-only">Brain</span>
          <span className="min-w-0 truncate font-medium">
            {playerName(tournament, side.brainPlayerId)}
          </span>
        </div>
        <div className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-1.5">
          <Hand className="size-3.5 shrink-0 text-primary" />
          <span className="sr-only">Hand</span>
          <span className="min-w-0 truncate font-medium">
            {playerName(tournament, side.handPlayerId)}
          </span>
        </div>
      </div>
    )
  }
  const whiteLabel = (pairing: Pairing) => {
    if (pairing.isBye) {
      return playerName(tournament, pairing.byePlayerId)
    }

    if (pairing.kind === 'handAndBrain') {
      return sideLabel(pairing.handBrainSides?.white)
    }

    return playerName(tournament, pairing.whitePlayerId)
  }
  const blackLabel = (pairing: Pairing) => {
    if (pairing.isBye) {
      return 'Bye'
    }

    if (pairing.kind === 'handAndBrain') {
      return sideLabel(pairing.handBrainSides?.black)
    }

    return playerName(tournament, pairing.blackPlayerId)
  }
  const renderWhite = (pairing: Pairing) => {
    if (pairing.isBye) {
      return playerName(tournament, pairing.byePlayerId)
    }

    if (pairing.kind === 'handAndBrain') {
      return renderSide(pairing.handBrainSides?.white)
    }

    return playerName(tournament, pairing.whitePlayerId)
  }
  const renderBlack = (pairing: Pairing) => {
    if (pairing.isBye) {
      return 'Bye'
    }

    if (pairing.kind === 'handAndBrain') {
      return renderSide(pairing.handBrainSides?.black)
    }

    return playerName(tournament, pairing.blackPlayerId)
  }
  const pairingRemoveLabel = (pairing: Pairing) =>
    `Fixierte Paarung ${whiteLabel(pairing)} gegen ${blackLabel(pairing)} lösen`

  const canCorrectResult = (pairing: Pairing) =>
    resultCorrectionEnabled && !pairing.isBye && Boolean(onResultCorrection)

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
          <SelectTrigger className="w-full" label="Ergebnis">
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

    if (canCorrectResult(pairing) && onResultCorrection) {
      return (
        <ResultCorrectionBadge
          pairing={pairing}
          onCorrect={onResultCorrection}
        />
      )
    }

    return (
      <Badge variant={pairing.result ? 'outline' : 'secondary'}>
        {resultLabel(pairing.result)}
      </Badge>
    )
  }

  const renderMobileWarnings = (pairing: Pairing) => {
    const visibleWarnings = visibleWarningsForPairing(pairing)
    const removeLabel = pairingRemoveLabel(pairing)

    return (
      <div className="flex flex-wrap gap-1">
        {pairing.isManual && (
          <span
            className="inline-flex items-center overflow-hidden rounded-md border border-yellow-300 bg-yellow-100 text-xs font-semibold text-yellow-950"
            title={removeLabel}
          >
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
        {visibleWarnings.length === 0 && !pairing.isManual ? (
          <Badge variant="outline">OK</Badge>
        ) : (
          visibleWarnings.map((entry) => {
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
  }

  return (
    <>
      <div className="grid gap-2 md:hidden">
        {pairings.map((pairing) => {
          const whiteName = renderWhite(pairing)
          const blackName = renderBlack(pairing)

          return (
            <div
              key={pairing.id}
              className={cn(
                'rounded-md border bg-card p-2.5 text-sm',
                pairing.isManual && 'bg-primary/5',
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="font-semibold tabular-nums whitespace-nowrap">
                  Brett {pairing.boardNumber}
                  {pairing.kind === 'single' && (
                    <Badge className="ml-2 align-middle" variant="secondary">
                      Einzelpartie
                    </Badge>
                  )}
                </div>
                {showWarnings && renderMobileWarnings(pairing)}
              </div>
              <div className="mt-2.5 grid grid-cols-2 gap-2">
                <div className="min-w-0">
                  <div className="text-xs font-medium text-muted-foreground">
                    Wei&szlig;
                  </div>
                  <div className="whitespace-normal">{whiteName}</div>
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-medium text-muted-foreground">
                    Schwarz
                  </div>
                  <div className="whitespace-normal">{blackName}</div>
                </div>
              </div>
              <div className="mt-2.5">
                {(!editable || !onResultChange) && (
                  <div className="mb-1.5 text-xs font-medium text-muted-foreground">
                    Ergebnis
                  </div>
                )}
                {renderMobileResult(pairing)}
              </div>
            </div>
          )
        })}
      </div>

      <div className="hidden overflow-x-auto rounded-md border md:block">
        <table className="w-full min-w-[48rem] table-fixed text-sm">
          <colgroup>
            <col className="w-40" />
            <col />
            <col />
            <col className="w-36" />
            {showWarnings && <col className="w-56" />}
          </colgroup>
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
          {pairings.map((pairing) => {
            const visibleWarnings = visibleWarningsForPairing(pairing)

            return (
              <tr
                key={pairing.id}
                className={cn(
                  'border-t align-top',
                  pairing.isManual && 'bg-primary/5',
                )}
              >
              <td className="p-3 tabular-nums">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span>{pairing.boardNumber}</span>
                  {pairing.kind === 'single' && (
                    <Badge variant="secondary">Einzelpartie</Badge>
                  )}
                </div>
              </td>
              <td className="p-3">
                {renderWhite(pairing)}
              </td>
              <td className="p-3">
                {renderBlack(pairing)}
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
                    <SelectTrigger className="w-28">
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
                ) : canCorrectResult(pairing) && onResultCorrection ? (
                  <ResultCorrectionBadge
                    pairing={pairing}
                    onCorrect={onResultCorrection}
                  />
                ) : (
                  <Badge variant={pairing.result ? 'outline' : 'secondary'}>
                    {resultLabel(pairing.result)}
                  </Badge>
                )}
              </td>
              {showWarnings && (
                <td className="p-3">
                  <div className="flex max-h-14 flex-wrap gap-1 overflow-hidden">
                    {pairing.isManual && (
                      <span className="inline-flex items-center overflow-hidden rounded-md border border-yellow-300 bg-yellow-100 text-xs font-semibold text-yellow-950">
                        <span className="px-2 py-0.5">FIXIERT</span>
                        {editable && onManualPairingRemove && (
                          <Button
                            aria-label={pairingRemoveLabel(pairing)}
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
                    {visibleWarnings.length === 0 && !pairing.isManual ? (
                      <Badge variant="outline">OK</Badge>
                    ) : (
                      visibleWarnings.map((entry) => {
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
            )
          })}
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
  const [expandedPlayerId, setExpandedPlayerId] = useState<string | null>(null)
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
      'swiss-round-cell inline-flex h-7 min-w-11 items-center justify-start rounded px-2 text-xs font-semibold tabular-nums',
      cell.color === 'W' && 'border border-border bg-white text-foreground',
      cell.color === 'B' && 'bg-primary text-primary-foreground',
      cell.outcome === 'bye' && 'border border-dashed border-border bg-muted text-muted-foreground',
      cell.outcome === 'open' && 'border border-border bg-background text-muted-foreground',
    )
  const toggleExpandedPlayer = (playerId: string) => {
    setExpandedPlayerId((currentPlayerId) =>
      currentPlayerId === playerId ? null : playerId,
    )
  }
  const roundColumnCount = Math.max(
    0,
    ...standings.map((row) => row.roundHistory.length),
  )
  const visibleRoundGridColumns = Math.min(Math.max(roundColumnCount, 1), 6)
  const roundCellLabelWidth = Math.max(
    4,
    ...standings.flatMap((row) => row.roundHistory.map((cell) => cell.label.length)),
  )
  const roundCellWidthStyle = {
    '--swiss-round-cell-width': `${roundCellLabelWidth * 0.45 + 1.85}rem`,
    '--swiss-round-grid-columns': visibleRoundGridColumns,
  } as CSSProperties


  return (
    <Card className="swiss-standings-card">
      <CardHeader>
        <div className="swiss-export-title hidden">
          <h1>{tournamentName}</h1>
        </div>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="size-5 text-primary" />
          Rangliste
        </CardTitle>
      </CardHeader>
      <CardContent style={roundCellWidthStyle}>
        <div className="swiss-standings-mobile rounded-md border md:hidden">
          <table className="w-full table-fixed text-sm">
            <colgroup>
              <col className="w-11" />
              <col />
              <col className="w-14" />
              <col className="w-16" />
              <col className="w-9" />
            </colgroup>
            <thead className="bg-muted/70 text-left">
              <tr>
                <th className="px-1.5 py-2 font-semibold">Platz</th>
                <th className="py-2 pl-4 pr-1.5 font-semibold">Name</th>
                <th className="px-1 py-2 text-center font-semibold">Punkte</th>
                <th className="px-1 py-2 text-center font-semibold">Buchholz</th>
                <th className="px-1 py-2 text-center font-semibold">SB</th>
              </tr>
            </thead>
            <tbody>
              {standings.map((row) => {
                const isExpanded = expandedPlayerId === row.playerId
                const detailsId = `swiss-standing-details-${row.playerId}`

                return (
                  <Fragment key={row.playerId}>
                    <tr
                      aria-controls={detailsId}
                      aria-expanded={isExpanded}
                      className={cn(
                        'cursor-pointer border-t align-middle outline-none transition-colors hover:bg-primary/5 focus-visible:bg-primary/10',
                        podiumClass(row.rank),
                      )}
                      role="button"
                      tabIndex={0}
                      onClick={() => toggleExpandedPlayer(row.playerId)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault()
                          toggleExpandedPlayer(row.playerId)
                        }
                      }}
                    >
                      <td className="px-1.5 py-2 tabular-nums">{row.rank}</td>
                      <td className="min-w-0 py-2 pl-4 pr-1.5 font-medium">
                        <span className="block min-w-0 truncate">{row.playerName}</span>
                      </td>
                      <td className="px-1 py-2 text-center tabular-nums">
                        <span className="inline-flex min-w-9 items-center justify-center rounded-md border border-primary/25 bg-primary/10 px-1.5 py-0.5 font-semibold text-primary">
                          {formatPoints(row.points)}
                        </span>
                      </td>
                      <td className="px-1 py-2 text-center tabular-nums">
                        {formatPoints(row.buchholz)}
                      </td>
                      <td className="px-1 py-2 text-center tabular-nums">
                        {formatPoints(row.sonnebornBerger)}
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr
                        id={detailsId}
                        className={cn('border-t bg-background/70', podiumClass(row.rank))}
                      >
                        <td className="px-2 pb-2 pt-0" colSpan={5}>
                          <div className="grid gap-2 py-2">
                            <div className="flex flex-wrap gap-1">
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
                            <div className="flex flex-wrap items-center gap-2 text-[11px] font-medium text-muted-foreground">
                              <span>Siege: {row.wins}</span>
                              <span>Byes: {row.receivedByes}</span>
                              <Badge
                                className="h-5 px-1.5 text-[10px]"
                                variant={statusVariant(row.status)}
                              >
                                {statusLabels[row.status]}
                              </Badge>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>

        <div className="swiss-standings-table-wrap swiss-standings-desktop hidden overflow-x-auto rounded-md border md:block">
          <table className="swiss-standings-table w-full min-w-[68rem] text-sm">
            <thead className="bg-muted/70 text-left">
              <tr>
                <th className="p-3">Platz</th>
                <th className="p-3">Name</th>
                <th className="p-3">Punkte</th>
                <th className="p-3">Buchholz</th>
                <th className="p-3">SB</th>
                <th className="p-3">Siege</th>
                <th className="swiss-rounds-heading p-3">Runden</th>
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
                  <td className="swiss-round-table-cell p-3">
                    <div className="swiss-round-grid">
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
        <div className="swiss-export-qr hidden" aria-hidden="true">
          <img
            src={tournamentWebsiteQrUrl}
            title={tournamentWebsiteUrl}
            alt=""
          />
        </div>
      </CardContent>
    </Card>
  )
}
