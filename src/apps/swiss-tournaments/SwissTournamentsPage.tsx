import {
  Archive,
  ArrowRight,
  Brain,
  ChevronDown,
  ChessKing,
  CheckCircle2,
  CirclePlus,
  Download,
  Gamepad2,
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
  isPairingComplete,
  recalculateStandings,
  willResultCorrectionRegenerateCurrentDraftRound,
} from '@/apps/swiss-tournaments/logic'
import { useSwissTournaments } from '@/apps/swiss-tournaments/hooks/useSwissTournaments'
import { AppPageTitle } from '@/apps/shared/components/AppPageTitle'
import { AppPage } from '@/apps/shared/components/AppPage'
import { ConfirmButton } from '@/apps/shared/components/ConfirmButton'
import { EmptyState } from '@/apps/shared/components/EmptyState'
import { PresenterLauncher } from '@/apps/shared/components/Presenter'
import type {
  ByePolicy,
  ByeScore,
  GameResult,
  InitialPlayerStatus,
  MarioKartRacer,
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
import { Input } from '@/components/ui/input'
import { IftaInput, IftaSelectTrigger } from '@/components/ui/ifta-field'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useI18n, type TranslationKey } from '@/lib/i18n'
import { cn } from '@/lib/utils'

const resultOptions: Array<{ value: GameResult; labelKey?: TranslationKey; label: string }> = [
  { value: '1-0', label: '1 - 0' },
  { value: '0-1', label: '0 - 1' },
  { value: '0.5-0.5', label: '1/2 - 1/2' },
  { value: 'forfeit-1-0', labelKey: 'swiss.result.forfeit', label: '1 - 0' },
  { value: 'forfeit-0-1', labelKey: 'swiss.result.forfeit', label: '0 - 1' },
]
const openResultValue = 'open'
type ResultSelectValue = GameResult | typeof openResultValue

const byeScoreOptions: Array<{ value: ByeScore; label: string; labelEn: string }> = [
  { value: 1, label: '1 Punkt', labelEn: '1 point' },
  { value: 0.5, label: '1/2 Punkt', labelEn: '1/2 point' },
  { value: 0, label: '0 Punkte', labelEn: '0 points' },
]

const byePolicyOptions: Array<{ value: ByePolicy; labelKey: TranslationKey }> = [
  { value: 'protectLateEntrants', labelKey: 'swiss.byePolicy.protectLateEntrants' },
  { value: 'lowestScore', labelKey: 'swiss.byePolicy.lowestScore' },
]

const appTitle = 'SK Anderten Turnier-App'
const tournamentWebsiteUrl = 'https://bengtstoolbox.web.app/apps/swiss-tournaments'
const tournamentWebsiteQrUrl = '/qrcode.svg'
const singleLineSelectTriggerClass =
  'min-w-0 [&>span]:min-w-0 [&>span]:truncate [&>span]:whitespace-nowrap'

function roleLabel(icon: ReactNode, label: string) {
  return (
    <span className="flex min-w-0 items-center gap-1">
      {icon}
      <span className="truncate">{label}</span>
    </span>
  )
}

const statusLabelKeys: Record<PlayerStatus, TranslationKey> = {
  active: 'swiss.status.active',
  inactive: 'swiss.status.inactive',
  withdrawn: 'swiss.status.withdrawn',
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
    ...(pairing.marioKartRacers?.map((racer) => racer.playerId) ?? []),
  ].filter((playerId): playerId is string => typeof playerId === 'string')
}

function pairingScoringPlayerIds(pairing: Pairing) {
  if (pairing.isBye) {
    return pairing.byePlayerId ? [pairing.byePlayerId] : []
  }

  if (pairing.kind === 'marioKart') {
    return (
      pairing.marioKartRacers
        ?.filter((racer) => racer.role === 'scoring')
        .map((racer) => racer.playerId) ?? []
    )
  }

  return pairingPlayerIds(pairing)
}

function tournamentFormatLabelKey(format?: Tournament['format']): TranslationKey {
  if (format === 'roundRobin') {
    return 'swiss.format.roundRobin'
  }

  if (format === 'handAndBrain') {
    return 'swiss.format.handAndBrain'
  }

  if (format === 'marioKart') {
    return 'swiss.format.marioKart'
  }

  return 'swiss.format.swiss'
}

function pairingCountLabelKey(format?: Tournament['format']): TranslationKey {
  return format === 'marioKart' ? 'swiss.lobbyCount' : 'swiss.boardCount'
}

function renderTournamentFormatIcon(format?: Tournament['format']) {
  if (format === 'roundRobin') {
    return <GitBranch className="size-5 shrink-0" />
  }

  if (format === 'handAndBrain') {
    return <Brain className="size-5 shrink-0" />
  }

  if (format === 'marioKart') {
    return <Gamepad2 className="size-5 shrink-0" />
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
  return !isPairingComplete(pairing)
}

function resultLabel(
  result: GameResult | undefined,
  t: ReturnType<typeof useI18n>['t'],
) {
  if (!result) {
    return t('swiss.result.open')
  }

  if (result === 'bye-0.5') {
    return 'Bye 1/2'
  }

  if (result.startsWith('bye-')) {
    return result.replace('bye-', 'Bye ')
  }

  return (
    resultOptions.find((option) => option.value === result)?.label ??
    result.replaceAll('forfeit-', `${t('swiss.result.forfeit')} `).replaceAll('-', ' - ')
  )
}

function resultOptionLabel(
  option: (typeof resultOptions)[number],
  t: ReturnType<typeof useI18n>['t'],
) {
  if (option.labelKey) {
    return `${t(option.labelKey)} ${option.label}`
  }

  return option.label
}

function formatSwissDateTime(
  value: string | undefined,
  formatter: ReturnType<typeof useI18n>['formatDateTime'],
) {
  if (!value) {
    return '-'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return '-'
  }

  return formatter(date)
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

  if (format === 'marioKart') {
    return 5
  }

  return swissRoundsForPlayerCount(playerCount)
}

function normalizeRoundCountInput(value: string) {
  const parsedValue = Number(value)

  if (!Number.isFinite(parsedValue)) {
    return 1
  }

  return Math.max(1, Math.floor(parsedValue) || 1)
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
  const { t } = useI18n()

  return (
    <div className="type-action flex items-center gap-2 rounded-md border border-emerald-300 bg-emerald-100 px-4 py-3 text-emerald-950">
      <CheckCircle2 className="size-5 shrink-0" />
      <span>{label}</span>
      <Badge className="border-emerald-300 bg-emerald-50 text-emerald-950" variant="outline">
        {completedRounds}/{numberOfRounds} {t('swiss.rounds')}
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
  'mario-kart-bye-extra': {
    label: 'EXTRA',
    className: 'border-cyan-300 bg-cyan-100 text-cyan-950',
  },
  'mario-kart-repeat-opponent': {
    label: 'REPEAT',
    className: 'border-amber-500 bg-amber-200 text-amber-950',
  },
  'mario-kart-score-gap': {
    label: 'SCORE',
    className: 'border-orange-500 bg-orange-200 text-orange-950',
  },
  'mario-kart-three-player-lobby': {
    label: '3ER',
    className: 'border-sky-300 bg-sky-100 text-sky-950',
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

function RoundProgress({
  currentRound,
  numberOfRounds,
}: {
  currentRound: number
  numberOfRounds: number
}) {
  const { t } = useI18n()
  const totalRounds = Math.max(1, numberOfRounds)
  const visibleCurrentRound = Math.min(Math.max(currentRound, 1), totalRounds)

  return (
    <div
      aria-label={t('swiss.roundProgressAria', {
        current: visibleCurrentRound,
        total: totalRounds,
      })}
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
  const { t } = useI18n()
  const label = t(tournamentFormatLabelKey(format))

  return (
    <Card>
      <CardHeader className="grid grid-cols-1 items-center gap-3 p-4">
        <CardDescription className="sr-only">
          {t('swiss.format.label')}
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
  const { t } = useI18n()
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
      <Label>{t('swiss.format.label')}</Label>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <button
          aria-pressed={format === 'swiss'}
          className={optionClass(format === 'swiss')}
          type="button"
          onClick={() => onFormatChange('swiss')}
        >
          <Swords className="size-4 shrink-0" />
          <span className="min-w-0">
            <span className="type-action block whitespace-nowrap">
              {t(tournamentFormatLabelKey('swiss'))}
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
            <span className="type-action block whitespace-nowrap">
              {t(tournamentFormatLabelKey('roundRobin'))}
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
            <span className="type-action block whitespace-nowrap">
              {t(tournamentFormatLabelKey('handAndBrain'))}
            </span>
          </span>
        </button>
        <button
          aria-pressed={format === 'marioKart'}
          className={optionClass(format === 'marioKart')}
          type="button"
          onClick={() => onFormatChange('marioKart')}
        >
          <Gamepad2 className="size-4 shrink-0" />
          <span className="min-w-0">
            <span className="type-action block whitespace-nowrap">
              {t(tournamentFormatLabelKey('marioKart'))}
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
  status: InitialPlayerStatus
}

function defaultDraftPlayers(): DraftPlayer[] {
  return [
    { id: 'draft-1', name: 'Niklas', rating: '1922', status: 'active' },
    { id: 'draft-2', name: 'Bengt', rating: '1818', status: 'active' },
    { id: 'draft-3', name: 'Thomas', rating: '1697', status: 'active' },
    { id: 'draft-4', name: 'Liam', rating: '1674', status: 'active' },
    { id: 'draft-5', name: 'Ralph', rating: '1614', status: 'active' },
    { id: 'draft-6', name: 'Uwe', rating: '1524', status: 'active' },
    { id: 'draft-7', name: 'Quinn', rating: '1494', status: 'active' },
    { id: 'draft-8', name: 'Matthias', rating: '1485', status: 'active' },
    { id: 'draft-9', name: 'Armin', rating: '1434', status: 'active' },
    { id: 'draft-10', name: 'Nikita', rating: '1311', status: 'active' },
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
      status: 'active',
    }))
}

function defaultTournamentName(
  format: TournamentFormat,
  t: ReturnType<typeof useI18n>['t'],
  formatDateTime: ReturnType<typeof useI18n>['formatDateTime'],
) {
  return t('swiss.defaultTournamentName', {
    date: formatDateTime(new Date(), {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }),
    format: t(tournamentFormatLabelKey(format)),
  })
}

function isDefaultTournamentName(
  value: string,
  t: ReturnType<typeof useI18n>['t'],
  formatDateTime: ReturnType<typeof useI18n>['formatDateTime'],
) {
  return (
    value === defaultTournamentName('swiss', t, formatDateTime) ||
    value === defaultTournamentName('roundRobin', t, formatDateTime) ||
    value === defaultTournamentName('handAndBrain', t, formatDateTime) ||
    value === defaultTournamentName('marioKart', t, formatDateTime)
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
  const { language, t, formatDateTime } = useI18n()
  const [name, setName] = useState(() =>
    defaultTournamentName('swiss', t, formatDateTime),
  )
  const [roundsInput, setRoundsInput] = useState(() =>
    String(
      swissRoundsForPlayerCount(
        tournamentPlayersToDraftPlayers(initialTournament).filter(
          (player) => player.name.trim().length > 0 && player.status === 'active',
        ).length,
      ),
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
    (player) => player.name.trim().length > 0 && player.status === 'active',
  ).length
  const automaticRoundCount = defaultRoundsForFormat(
    format,
    cleanPlayerCount,
    roundRobinCycles,
  )
  const normalizedManualRoundCount = normalizeRoundCountInput(roundsInput)
  const effectiveNumberOfRounds =
    format === 'roundRobin' || !roundsManuallyEdited
      ? automaticRoundCount
      : normalizedManualRoundCount
  const roundInputValue =
    format === 'roundRobin' || !roundsManuallyEdited
      ? String(automaticRoundCount)
      : roundsInput
  const handleFormatChange = (nextFormat: TournamentFormat) => {
    setName((currentName) =>
      isDefaultTournamentName(currentName, t, formatDateTime)
        ? defaultTournamentName(nextFormat, t, formatDateTime)
        : currentName,
    )
    setByeScore(nextFormat === 'marioKart' ? 0.5 : 1)
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
        status: 'active',
      },
    ])
    setNewDraftPlayerName('')
    setNewDraftPlayerRating('')
  }

  return (
    <Card>
      <CardContent className="grid gap-2 p-6 md:gap-4">
        <TournamentFormatPicker
          format={format}
          onFormatChange={handleFormatChange}
        />

        <div className="grid gap-2 md:grid-cols-2 md:gap-3">
          <IftaInput
            id="swiss-name"
            label={t('swiss.tournamentName')}
            value={name}
            onChange={(event) => setName(event.currentTarget.value)}
          />
          <IftaInput
            id="swiss-rounds"
            label={t('swiss.rounds')}
            min={1}
            readOnly={format === 'roundRobin'}
            type="number"
            value={roundInputValue}
            onBlur={() => {
              if (roundsManuallyEdited) {
                setRoundsInput(String(normalizedManualRoundCount))
              }
            }}
            onChange={(event) => {
              setRoundsManuallyEdited(true)
              setRoundsInput(event.currentTarget.value)
            }}
          />
        </div>

        <div className="grid gap-2 border-b pb-2 md:grid-cols-2 md:gap-3 md:pb-4">
          <div>
            <Select
              value={initialSeedingMode}
              disabled={format === 'roundRobin'}
              onValueChange={(value) =>
                setInitialSeedingMode(value as SeedingMode)
              }
            >
              <IftaSelectTrigger label={t('swiss.sorting')}>
                <SelectValue />
              </IftaSelectTrigger>
              <SelectContent>
                <SelectItem value="rating">{t('swiss.sorting.rating')}</SelectItem>
                <SelectItem value="random">{t('swiss.sorting.random')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Select
              value={String(byeScore)}
              onValueChange={(value) => setByeScore(Number(value) as ByeScore)}
            >
              <IftaSelectTrigger label={t('swiss.pointsPerBye')}>
                <SelectValue />
              </IftaSelectTrigger>
              <SelectContent>
                {byeScoreOptions.map((option) => (
                  <SelectItem key={option.value} value={String(option.value)}>
                    {language === 'en' ? option.labelEn : option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid gap-2 md:gap-3">
          <div className="flex items-center">
            <Label>{t('swiss.players')}</Label>
          </div>

          <div className="grid gap-2 md:gap-3">
            <form
              className="border-t border-dashed bg-background px-2.5 py-2 sm:px-3"
              onSubmit={(event) => {
                event.preventDefault()
                handleAddDraftPlayer()
              }}
            >
              <div className="grid grid-cols-[minmax(0,1fr)_7rem] gap-2 md:grid-cols-[1fr_10rem_auto] md:gap-3">
                <IftaInput
                  aria-label={t('swiss.newPlayerNameAria')}
                  label={t('common.name')}
                  placeholder={t('swiss.newPlayer')}
                  value={newDraftPlayerName}
                  onChange={(event) =>
                    setNewDraftPlayerName(event.currentTarget.value)
                  }
                />
                <IftaInput
                  aria-label={t('swiss.newPlayerRatingAria')}
                  label={t('common.rating')}
                  placeholder="DWZ"
                  type="number"
                  value={newDraftPlayerRating}
                  onChange={(event) =>
                    setNewDraftPlayerRating(event.currentTarget.value)
                  }
                />
                <Button
                  className="col-span-2 h-9 w-full md:col-span-1 md:h-11 md:w-auto"
                  size="ifta"
                  type="submit"
                  variant="outline"
                  disabled={newDraftPlayerName.trim().length === 0}
                >
                  <CirclePlus className="size-4" />
                  <span className="sm:sr-only md:not-sr-only">{t('swiss.addPlayer')}</span>
                </Button>
              </div>
            </form>

            <div className="grid gap-2 md:hidden">
              <div className="type-field-label grid grid-cols-[minmax(0,1fr)_7rem] gap-2 px-2 text-muted-foreground">
                <span>{t('common.name')}</span>
                <span>{t('common.rating')}</span>
              </div>
              {players.map((player, index) => (
                <div
                  key={player.id}
                  className="grid gap-3 rounded-md border bg-card p-2.5 text-sm"
                >
                  <div className="flex items-center gap-2">
                    <span className="type-caption flex h-6 min-w-7 items-center justify-center rounded-md border bg-secondary px-2 tabular-nums">
                      #{index + 1}
                    </span>
                    <Badge className="h-6" variant={statusVariant(player.status)}>
                      {t(statusLabelKeys[player.status])}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-[minmax(0,1fr)_7rem] gap-2">
                    <Input
                      id={`swiss-create-mobile-name-${player.id}`}
                      aria-label={t('swiss.playerNameByIndexAria', {
                        number: index + 1,
                      })}
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
                      id={`swiss-create-mobile-rating-${player.id}`}
                      aria-label={
                        player.name
                          ? t('swiss.playerRatingAria', { name: player.name })
                          : t('swiss.playerRatingByIndexAria', { number: index + 1 })
                      }
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

                  <div className="grid grid-cols-[minmax(0,1fr)_2.25rem] gap-2">
                    <Select
                      value={player.status}
                      onValueChange={(value) =>
                        setPlayers((currentPlayers) =>
                          currentPlayers.map((entry) =>
                            entry.id === player.id
                              ? {
                                  ...entry,
                                  status: value as InitialPlayerStatus,
                                }
                              : entry,
                          ),
                        )
                      }
                    >
                      <IftaSelectTrigger
                        aria-label={
                          player.name
                            ? t('swiss.playerStatusAria', { name: player.name })
                            : t('swiss.playerStatusByIndexAria', { number: index + 1 })
                        }
                        label={t('common.status')}
                      >
                        <SelectValue />
                      </IftaSelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">{t('swiss.status.active')}</SelectItem>
                        <SelectItem value="inactive">{t('swiss.status.inactive')}</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      aria-label={t('swiss.playerRemoveAria', {
                        name: player.name || t('common.player'),
                      })}
                      className="h-11 w-9 px-0"
                      size="ifta"
                      type="button"
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
                </div>
              ))}
            </div>

            <Table className="min-w-[46rem]" containerClassName="hidden md:block">
              <TableHeader>
                <TableHead>#</TableHead>
                <TableHead>{t('common.name')}</TableHead>
                <TableHead>{t('common.rating')}</TableHead>
                <TableHead>{t('common.status')}</TableHead>
                <TableHead>{t('common.action')}</TableHead>
              </TableHeader>
              <TableBody>
                {players.map((player, index) => (
                  <TableRow key={player.id}>
                    <TableCell className="tabular-nums">{index + 1}</TableCell>
                    <TableCell>
                      <Input
                        id={`swiss-create-name-${player.id}`}
                        aria-label={t('swiss.playerNameByIndexAria', {
                          number: index + 1,
                        })}
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
                    </TableCell>
                    <TableCell>
                      <Input
                        id={`swiss-create-rating-${player.id}`}
                        aria-label={
                          player.name
                            ? t('swiss.playerRatingAria', { name: player.name })
                            : t('swiss.playerRatingByIndexAria', { number: index + 1 })
                        }
                        className="w-28"
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
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(player.status)}>
                        {t(statusLabelKeys[player.status])}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Select
                          value={player.status}
                          onValueChange={(value) =>
                            setPlayers((currentPlayers) =>
                              currentPlayers.map((entry) =>
                                entry.id === player.id
                                  ? {
                                      ...entry,
                                      status: value as InitialPlayerStatus,
                                    }
                                  : entry,
                              ),
                            )
                          }
                        >
                          <SelectTrigger
                            aria-label={
                              player.name
                                ? t('swiss.playerStatusAria', { name: player.name })
                                : t('swiss.playerStatusByIndexAria', {
                                    number: index + 1,
                                  })
                            }
                            className="w-40"
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">{t('swiss.status.active')}</SelectItem>
                            <SelectItem value="inactive">{t('swiss.status.inactive')}</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          aria-label={t('swiss.playerRemoveAria', {
                            name: player.name || t('common.player'),
                          })}
                          className="h-9"
                          size="sm"
                          variant="delete"
                          onClick={() =>
                            setPlayers((currentPlayers) =>
                              currentPlayers.filter(
                                (entry) => entry.id !== player.id,
                              ),
                            )
                          }
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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
                  status: player.status,
                })),
                initialSeedingMode,
                byeScore,
                roundRobinCycles,
              })
              toast.success(t('swiss.createSuccess'))
              onCreated?.()
            } catch (error) {
              const message =
                error instanceof Error
                  ? error.message
                  : t('swiss.createFallbackError')

              setCreateError(message)
              toast.error(t('swiss.createToastError'))
            } finally {
              setIsCreating(false)
            }
          }}
        >
          <ArrowRight className="size-4" />
          {isCreating ? t('swiss.startingTournament') : t('swiss.startTournament')}
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
  const { t } = useI18n()
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button>
            <Plus className="size-4" />
            {t('swiss.newTournament')}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[92vh] w-[calc(100vw-1rem)] overflow-y-auto p-4 sm:max-w-5xl sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <CirclePlus className="size-5 text-primary" />
            {t('swiss.createDialogTitle')}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {t('swiss.settingsDialogDescription')}
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
  onPrint,
}: {
  entries: ArchivedTournamentSummary[]
  onDelete: (tournament: Tournament) => void | Promise<void>
  onExportCsv: (tournament: Tournament) => void
  onPrint: (tournament: Tournament) => void
}) {
  const { t, formatDateTime } = useI18n()
  const topPlayers = (entry: ArchivedTournamentSummary) =>
    entry.standings
      .slice(0, 3)
      .map((row) => `${row.rank}. ${row.playerName} (${formatPoints(row.points)})`)
      .join(', ') || '-'
  const actions = (tournament: Tournament) => (
    <div className="flex flex-nowrap items-center gap-1.5">
      <Button
        aria-label={t('swiss.printPdfAria', { name: tournament.name })}
        size="sm"
        variant="outline"
        onClick={() => onPrint(tournament)}
      >
        <Printer className="size-4" />
        PDF
      </Button>
      <Button
        aria-label={t('swiss.exportCsvAria', { name: tournament.name })}
        size="sm"
        variant="outline"
        onClick={() => onExportCsv(tournament)}
      >
        <Download className="size-4" />
        CSV
      </Button>
      <ConfirmButton
        title={t('swiss.archived.deleteTitle')}
        description={t('swiss.archived.deleteDescription', { name: tournament.name })}
        confirmLabel={t('common.delete')}
        onConfirm={() => onDelete(tournament)}
        trigger={
          <Button
            aria-label={t('swiss.playerRemoveAria', { name: tournament.name })}
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
      <EmptyState className="p-4 text-left">
        {t('swiss.archived.empty')}
      </EmptyState>
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
              <div className="type-action truncate">{entry.tournament.name}</div>
              <div className="mt-1 flex flex-wrap gap-1.5">
                <Badge variant="secondary">
                  {entry.category}
                </Badge>
                <Badge variant="outline">
                  {entry.completedRounds}/{entry.tournament.numberOfRounds} {t('swiss.rounds')}
                </Badge>
                <Badge variant="outline">
                  {t('swiss.playerCount', { count: entry.tournament.players.length })}
                </Badge>
              </div>
            </div>
            <div className="type-caption grid gap-1 text-muted-foreground">
              <span>{formatSwissDateTime(entry.tournament.archivedAtClientIso, formatDateTime)}</span>
              <span className="line-clamp-2">{t('swiss.topThree')}: {topPlayers(entry)}</span>
            </div>
            {actions(entry.tournament)}
          </div>
        ))}
      </div>

      <Table className="min-w-[58rem]" containerClassName="hidden md:block">
          <TableHeader>
              <TableHead>{t('swiss.tournamentName')}</TableHead>
              <TableHead>{t('swiss.archived')}</TableHead>
              <TableHead>{t('swiss.category')}</TableHead>
              <TableHead>{t('swiss.scope')}</TableHead>
              <TableHead>{t('swiss.topThree')}</TableHead>
              <TableHead>{t('common.actions')}</TableHead>
          </TableHeader>
          <TableBody>
            {entries.map((entry) => (
              <TableRow key={entry.tournament.id}>
                <TableCell className="type-label max-w-56">
                  <span className="block truncate">{entry.tournament.name}</span>
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  {formatSwissDateTime(entry.tournament.archivedAtClientIso, formatDateTime)}
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">
                    {entry.category}
                  </Badge>
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  {t('swiss.playerCount', { count: entry.tournament.players.length })}, {entry.completedRounds}/
                  {entry.tournament.numberOfRounds} {t('swiss.rounds')}
                </TableCell>
                <TableCell className="max-w-72 text-muted-foreground">
                  <span className="line-clamp-2">{topPlayers(entry)}</span>
                </TableCell>
                <TableCell>{actions(entry.tournament)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
      </Table>
    </>
  )
}

function SwissStandingsPresenter({
  round,
  standings,
  tournament,
}: {
  round: Round | null
  standings: ReturnType<typeof useSwissTournaments>['standings']
  tournament: Tournament
}) {
  const { t } = useI18n()
  const isMarioKart = tournament.format === 'marioKart'
  const primaryPointsLabel = isMarioKart
    ? t('swiss.marioKartTournamentPoints')
    : t('swiss.standings.points')
  const winsLabel = isMarioKart ? t('swiss.marioKartWins') : t('swiss.table.wins')

  return (
    <div className="grid gap-6">
      <section className="rounded-lg border bg-card p-5 shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="type-label text-muted-foreground">
              {t(tournamentFormatLabelKey(tournament.format))}
            </p>
            <h2 className="type-section-title truncate">
              {tournament.name}
            </h2>
          </div>
          <Badge variant="outline">
            {round
              ? getRoundDisplayLabel(tournament, round.roundNumber)
              : t('swiss.emptyRound')}
          </Badge>
        </div>
      </section>

      <section className="rounded-lg border bg-card p-5 shadow-sm">
        <div className="mb-5 flex items-center gap-2">
          <Trophy className="size-5 text-primary" />
          <h3 className="type-section-title">{t('swiss.ranking')}</h3>
        </div>
        {standings.length === 0 ? (
          <EmptyState>{t('swiss.emptyStandings')}</EmptyState>
        ) : (
          <Table className={cn('min-w-[44rem]', isMarioKart && 'min-w-[52rem]')}>
            <TableHeader>
              <TableHead>{t('swiss.rank')}</TableHead>
              <TableHead>{t('common.name')}</TableHead>
              <TableHead>{primaryPointsLabel}</TableHead>
              {isMarioKart ? (
                <>
                  <TableHead>{winsLabel}</TableHead>
                  <TableHead>{t('swiss.marioKartIngamePoints')}</TableHead>
                  <TableHead>{t('swiss.marioKartAveragePlacement')}</TableHead>
                </>
              ) : (
                <>
                  <TableHead>{t('swiss.table.buchholz')}</TableHead>
                  <TableHead>{t('swiss.table.sb')}</TableHead>
                  <TableHead>{winsLabel}</TableHead>
                </>
              )}
              <TableHead>{t('common.status')}</TableHead>
            </TableHeader>
            <TableBody>
              {standings.map((row) => (
                <TableRow
                  key={row.playerId}
                  className={cn(
                    row.rank === 1 && 'bg-[#f6e3a5]/65',
                    row.rank === 2 && 'bg-[#e6e8eb]/70',
                    row.rank === 3 && 'bg-[#e8c0a0]/55',
                  )}
                >
                  <TableCell className="tabular-nums">{row.rank}</TableCell>
                  <TableCell className="type-label">{row.playerName}</TableCell>
                  <TableCell className="tabular-nums">
                    <span className="type-action inline-flex min-w-12 items-center justify-center rounded-md border border-primary/25 bg-primary/10 px-2.5 py-1 text-primary">
                      {formatPoints(row.points)}
                    </span>
                  </TableCell>
                  {isMarioKart ? (
                    <>
                      <TableCell className="tabular-nums">{row.marioKartWins}</TableCell>
                      <TableCell className="tabular-nums">
                        {row.marioKartIngamePoints}
                      </TableCell>
                      <TableCell className="tabular-nums">
                        {row.marioKartAveragePlacement === null
                          ? '-'
                          : formatPoints(row.marioKartAveragePlacement)}
                      </TableCell>
                    </>
                  ) : (
                    <>
                      <TableCell className="tabular-nums">
                        {formatPoints(row.buchholz)}
                      </TableCell>
                      <TableCell className="tabular-nums">
                        {formatPoints(row.sonnebornBerger)}
                      </TableCell>
                      <TableCell className="tabular-nums">{row.wins}</TableCell>
                    </>
                  )}
                  <TableCell>
                    <Badge variant={statusVariant(row.status)}>
                      {t(statusLabelKeys[row.status])}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>
    </div>
  )
}

export function SwissTournamentsPage() {
  const { language, t } = useI18n()
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
  const [manualMarioKartPlayers, setManualMarioKartPlayers] = useState<string[]>([
    '',
    '',
    '',
    '',
  ])
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
        category: t(tournamentFormatLabelKey(entry.format)),
        completedRounds: completedRoundCount(entry),
        standings: recalculateStandings(entry),
        tournament: entry,
      })),
    [app.archivedTournaments, t],
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
      <AppPage>
        <AppTitleHeader />
        <Card>
          <CardHeader>
            <CardTitle>{t('swiss.loadingTitle')}</CardTitle>
            <CardDescription>{t('swiss.loadingDescription')}</CardDescription>
          </CardHeader>
        </Card>
      </AppPage>
    )
  }

  if (!tournament) {
    return (
      <AppPage className="swiss-tournaments-page">
        <AppTitleHeader />
        {app.error && (
          <Card className="border-destructive">
            <CardHeader>
              <CardTitle>{t('common.syncError')}</CardTitle>
              <CardDescription>{app.error.message}</CardDescription>
            </CardHeader>
          </Card>
        )}
        <Card>
          <CardHeader className="gap-4">
            <div className="grid gap-1">
              <CardTitle>{t('swiss.noActiveTitle')}</CardTitle>
              <CardDescription>
                {t('swiss.noActiveDescription')}
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
      </AppPage>
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
    toast.success(t('swiss.addedPlayer'))
  }

  const canRemovePlayer = (playerId: string) =>
    canRemovePlayerFromTournament(tournament, playerId)
  const manuallyUsedPlayerIds = new Set(
    (draftRound?.pairings ?? [])
      .filter((pairing) => pairing.isManual)
      .flatMap(pairingScoringPlayerIds),
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
  const manualMarioKartScoringIds = manualMarioKartPlayers.filter(Boolean)
  const canAddManualMarioKartPairing =
    tournament.format === 'marioKart' &&
    manualMarioKartScoringIds.length >= 2 &&
    manualMarioKartScoringIds.length <= 4 &&
    new Set(manualMarioKartScoringIds).size === manualMarioKartScoringIds.length &&
    manualMarioKartScoringIds.every((playerId) => !manuallyUsedPlayerIds.has(playerId))
  const marioKartOptionFor = (currentPlayerId: string) =>
    tournament.players.filter(
      (player) =>
        !manuallyUsedPlayerIds.has(player.id) &&
        (player.id === currentPlayerId ||
          !manualMarioKartPlayers.some((playerId) => playerId === player.id)),
    )

  return (
    <AppPage className="swiss-tournaments-page" width="wide">
      <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <AppTitleHeader />
        <PresenterLauncher
          appTitle={appTitle}
          views={[
            {
              id: 'standings',
              label: t('swiss.ranking'),
              Icon: Trophy,
              render: () => (
                <SwissStandingsPresenter
                  round={currentRound}
                  standings={app.standings}
                  tournament={tournament}
                />
              ),
            },
          ]}
        />
      </section>

      {app.error && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle>{t('common.syncError')}</CardTitle>
            <CardDescription>{app.error.message}</CardDescription>
          </CardHeader>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="gap-4">
        <TabsList className="swiss-print-hidden grid h-auto w-full grid-cols-2 sm:grid-cols-4">
          <TabsTrigger value="overview" className="min-w-0">
            <LayoutDashboard className="size-5 text-primary" />
            {t('swiss.overview')}
          </TabsTrigger>
          <TabsTrigger value="players" className="min-w-0">
            <UsersRound className="size-5 text-primary" />
            {t('swiss.players')}
          </TabsTrigger>
          <TabsTrigger value="pairings" className="min-w-0">
            <Swords className="size-5 text-primary" />
            {t('swiss.pairings')}
          </TabsTrigger>
          <TabsTrigger value="standings" className="min-w-0">
            <Trophy className="size-5 text-primary" />
            {t('swiss.ranking')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="grid gap-4">
          <section className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="gap-3 p-4 md:gap-2">
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-3">
                  <CardDescription>{t('swiss.currentRound')}</CardDescription>
                  <CardTitle className="type-section-title">
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
                    {t('swiss.newTournament')}
                  </span>
                </Button>
              }
            />
          </section>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ListChecks className="size-5 text-primary" />
                {t('swiss.currentRound')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {currentRound ? (
                <div className="grid gap-3">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">
                      {t('common.round', { number: currentRound.roundNumber })}
                    </Badge>
                    <Badge>{currentRound.status}</Badge>
                    <Badge variant="secondary">
                      {t(pairingCountLabelKey(tournament.format), {
                        count: currentRound.pairings.length,
                      })}
                    </Badge>
                  </div>
                  <PairingsTable tournament={tournament} pairings={currentRound.pairings} />
                </div>
              ) : (
                <EmptyState className="text-left">
                  {t('swiss.noRoundCreated')}
                </EmptyState>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="size-5 text-primary" />
                {t('swiss.settingsExport')}
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="grid gap-3">
                  <IftaInput
                    label={t('swiss.tournamentName')}
                    value={tournament.name}
                    onChange={(event) =>
                      void app.updateTournamentMeta({
                        name: event.currentTarget.value,
                      })
                    }
                  />
                  {(tournament.format ?? 'swiss') !== 'roundRobin' && (
                    <IftaInput
                      label={t('swiss.rounds')}
                      min={Math.max(1, highestCompletedRoundNumber(tournament))}
                      type="number"
                      value={tournament.numberOfRounds}
                      onChange={(event) =>
                        void app.updateTournamentMeta({
                          numberOfRounds: Number(event.currentTarget.value),
                        })
                      }
                    />
                  )}
                </div>
                <div className="grid gap-3">
                  <Select
                    value={String(tournament.settings.byeScore)}
                    onValueChange={(value) =>
                      void app.updateSettings({
                        byeScore: Number(value) as ByeScore,
                      })
                    }
                  >
                    <IftaSelectTrigger
                      className={singleLineSelectTriggerClass}
                      label={t('swiss.pointsPerBye')}
                    >
                      <SelectValue />
                    </IftaSelectTrigger>
                    <SelectContent>
                      {byeScoreOptions.map((option) => (
                        <SelectItem key={option.value} value={String(option.value)}>
                          {language === 'en' ? option.labelEn : option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={tournament.settings.byePolicy}
                    onValueChange={(value) =>
                      void app.updateSettings({
                        byePolicy: value as ByePolicy,
                      })
                    }
                  >
                    <IftaSelectTrigger
                      className={singleLineSelectTriggerClass}
                      label={t('swiss.byePolicy')}
                    >
                      <SelectValue />
                    </IftaSelectTrigger>
                    <SelectContent>
                      {byePolicyOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {t(option.labelKey)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <Button className="w-full" variant="outline" onClick={() => printPage()}>
                  <Printer className="size-4" />
                  PDF
                </Button>
                <Button
                  className="w-full"
                  variant="outline"
                  onClick={() => app.exportStandingsCsv()}
                >
                  <Download className="size-4" />
                  CSV
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
                    <span className="type-action truncate">
                      {t('common.oldDatasets')}
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
                      toast.success(t('swiss.tournamentDeleted'))
                    }}
                    onExportCsv={app.exportStandingsCsv}
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
                {t('swiss.managePlayers')}
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
                  <IftaInput
                    label={t('common.name')}
                    placeholder={t('swiss.newPlayer')}
                    value={newPlayerName}
                    onChange={(event) => setNewPlayerName(event.currentTarget.value)}
                  />
                  <IftaInput
                    label={t('common.rating')}
                    placeholder="DWZ"
                    type="number"
                    value={newPlayerRating}
                    onChange={(event) => setNewPlayerRating(event.currentTarget.value)}
                  />
                  <Button
                    className="col-span-2 h-9 w-full md:col-span-1 md:h-11 md:w-auto"
                    size="ifta"
                    type="submit"
                    variant="outline"
                    disabled={newPlayerName.trim().length === 0}
                  >
                    <CirclePlus className="size-4" />
                    {t('swiss.addPlayer')}
                  </Button>
                </div>
              </form>

              <div className="grid gap-2 md:hidden">
                <div className="type-field-label grid grid-cols-[minmax(0,1fr)_6.5rem] gap-2 px-2 text-muted-foreground">
                  <span>{t('common.name')}</span>
                  <span>{t('common.rating')}</span>
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
                          <span className="type-caption flex h-6 min-w-7 items-center justify-center rounded-md border bg-secondary px-2 tabular-nums">
                            #{index + 1}
                          </span>
                          <Badge className="h-6" variant={statusVariant(player.status)}>
                            {t(statusLabelKeys[player.status])}
                          </Badge>
                        </div>
                        <span className="type-caption text-muted-foreground tabular-nums">
                          {t('swiss.playerFromRound', { number: player.addedInRound })}
                        </span>
                      </div>

                      <div className="grid grid-cols-[minmax(0,1fr)_6.5rem] gap-2">
                        <Input
                          aria-label={t('swiss.playerNameAria', { name: player.name })}
                          value={player.name}
                          onChange={(event) =>
                            void app.updatePlayer(player.id, {
                              name: event.currentTarget.value,
                              rating: player.rating,
                            })
                          }
                        />
                        <Input
                          aria-label={t('swiss.playerRatingAria', { name: player.name })}
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
                          <IftaSelectTrigger label={t('common.status')}>
                            <SelectValue />
                          </IftaSelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">{t('swiss.status.active')}</SelectItem>
                            <SelectItem value="inactive">{t('swiss.status.inactive')}</SelectItem>
                            <SelectItem value="withdrawn">{t('swiss.status.withdrawn')}</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          aria-label={t('swiss.playerRemoveAria', { name: player.name })}
                          className="h-11 w-9 px-0"
                          size="ifta"
                          disabled={!canRemove}
                          title={
                            canRemove
                              ? t('swiss.playerRemoveAria', { name: player.name })
                              : t('swiss.playerAlreadyUsed')
                          }
                          variant="delete"
                          onClick={async () => {
                            if (!canRemove) {
                              return
                            }

                            await app.removePlayer(player.id)
                            toast.success(t('swiss.playerRemoved', { name: player.name }))
                          }}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>

              <Table className="min-w-[52rem]" containerClassName="hidden md:block">
                  <TableHeader>
                      <TableHead>#</TableHead>
                      <TableHead>{t('common.name')}</TableHead>
                      <TableHead>{t('common.rating')}</TableHead>
                      <TableHead>{t('swiss.status.fromRound', { number: '' }).trim()}</TableHead>
                      <TableHead>{t('common.status')}</TableHead>
                      <TableHead>{t('common.action')}</TableHead>
                  </TableHeader>
                  <TableBody>
                    {tournament.players.map((player, index) => {
                      const canRemove = canRemovePlayer(player.id)

                      return (
                      <TableRow key={player.id}>
                        <TableCell className="tabular-nums">{index + 1}</TableCell>
                        <TableCell>
                          <Input
                            aria-label={t('swiss.playerNameAria', { name: player.name })}
                            value={player.name}
                            onChange={(event) =>
                              void app.updatePlayer(player.id, {
                                name: event.currentTarget.value,
                                rating: player.rating,
                              })
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            aria-label={t('swiss.playerRatingAria', { name: player.name })}
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
                        </TableCell>
                        <TableCell className="tabular-nums">{player.addedInRound}</TableCell>
                        <TableCell>
                          <Badge variant={statusVariant(player.status)}>
                            {t(statusLabelKeys[player.status])}
                          </Badge>
                        </TableCell>
                        <TableCell>
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
                              <SelectTrigger
                                aria-label={t('swiss.playerStatusAria', { name: player.name })}
                                className="w-40"
                              >
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="active">{t('swiss.status.active')}</SelectItem>
                                <SelectItem value="inactive">{t('swiss.status.inactive')}</SelectItem>
                                <SelectItem value="withdrawn">{t('swiss.status.withdrawn')}</SelectItem>
                              </SelectContent>
                            </Select>
                            <Button
                              aria-label={t('swiss.playerRemoveAria', { name: player.name })}
                              className="h-9"
                              disabled={!canRemove}
                              size="sm"
                              title={
                                canRemove
                                  ? t('swiss.playerRemoveAria', { name: player.name })
                                  : t('swiss.playerAlreadyUsed')
                              }
                              variant="delete"
                              onClick={async () => {
                                if (!canRemove) {
                                  return
                                }

                                await app.removePlayer(player.id)
                                toast.success(t('swiss.playerRemoved', { name: player.name }))
                              }}
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                      )
                    })}
                  </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pairings" className="grid gap-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Swords className="size-5 text-primary" />
                  {t('swiss.pairings')}
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
                          label={t('swiss.tournamentComplete')}
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
                              {isCurrentRound
                                ? t('swiss.currentTournament')
                                : t('swiss.archivedTournament')}
                            </Badge>
                            <Badge variant="secondary">{round.status}</Badge>
                            <Badge variant="outline">
                              {t(pairingCountLabelKey(tournament.format), {
                                count: round.pairings.length,
                              })}
                            </Badge>
                          </div>
                          <div className="flex w-full min-w-0 flex-col justify-end gap-2 md:w-auto md:flex-row">
                            {canGoBackToRound && currentRound && (
                              <ConfirmButton
                                title={t('swiss.backToRoundTitle', {
                                  number: round.roundNumber,
                                })}
                                description={t('swiss.backToRoundDescription', {
                                  current: currentRound.roundNumber,
                                  target: round.roundNumber,
                                })}
                                confirmLabel={t('swiss.backToRound')}
                                onConfirm={async () => {
                                  await app.goBackToPreviousRound()
                                  toast.success(
                                    t('swiss.backToRoundSuccess', {
                                      number: round.roundNumber,
                                    }),
                                  )
                                }}
                                trigger={
                                  <Button
                                    aria-label={t('swiss.backToRoundAria')}
                                    className="h-8 w-full shrink-0 p-0 md:w-10"
                                    title={t('swiss.backToRoundAria')}
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
                                  {t('swiss.newRound')}
                                </Button>
                                {isEditable && (
                                  <Button
                                    className="h-8 w-full md:w-auto"
                                    variant="outline"
                                    disabled={!canRegenerateRound}
                                    onClick={() => void app.regenerateRound()}
                                  >
                                    <RefreshCw className="size-4" />
                                    {t('swiss.regenerate')}
                                  </Button>
                                )}
                                <ConfirmButton
                                title={t('swiss.deleteRoundTitle', { round: roundLabel })}
                                description={
                                  index + 1 < displayedRounds.length
                                    ? t('swiss.deleteRoundDescriptionWithPrevious')
                                    : t('swiss.deleteRoundDescription')
                                }
                                confirmLabel={t('common.delete')}
                                onConfirm={async () => {
                                  await app.deleteLatestRound()
                                  toast.success(
                                    index + 1 < displayedRounds.length
                                      ? t('swiss.deleteRoundSuccessWithPrevious', {
                                          round: roundLabel,
                                        })
                                      : t('swiss.deleteRoundSuccess', {
                                          round: roundLabel,
                                        }),
                                  )
                                }}
                                trigger={
                                  <Button
                                    aria-label={t('swiss.deleteRound')}
                                    className="h-8 w-full p-0 md:w-10"
                                    size="sm"
                                    title={t('swiss.deleteRound')}
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
                          shouldConfirmResultCorrection={(pairingId, result) =>
                            willResultCorrectionRegenerateCurrentDraftRound(
                              tournament,
                              round.roundNumber,
                              pairingId,
                              result,
                            )
                          }
                          onResultChange={(pairingId, result) =>
                            void app.setResult(round.roundNumber, pairingId, result)
                          }
                          onMarioKartResultChange={(pairingId, playerId, partial) =>
                            void app.setMarioKartResult(
                              round.roundNumber,
                              pairingId,
                              playerId,
                              partial,
                            )
                          }
                        />
                        {isEditable && draftRound && (
                          <div className="grid gap-3 rounded-md border border-dashed bg-background p-3">
                            {tournament.format === 'marioKart' && (
                              <div className="grid gap-2">
                                <div className="type-action flex items-center gap-2">
                                  <Gamepad2 className="size-4 text-primary" />
                                  {t('swiss.marioKartFixLobby')}
                                </div>
                                <div className="grid gap-2 lg:grid-cols-[repeat(4,minmax(0,1fr))_8.5rem]">
                                  {manualMarioKartPlayers.map((playerId, index) => (
                                    <Select
                                      key={index}
                                      value={playerId || openResultValue}
                                      onValueChange={(value) =>
                                        setManualMarioKartPlayers((currentPlayers) =>
                                          currentPlayers.map((entry, playerIndex) =>
                                            playerIndex === index
                                              ? value === openResultValue
                                                ? ''
                                                : value
                                              : entry,
                                          ),
                                        )
                                      }
                                    >
                                      <IftaSelectTrigger
                                        aria-label={t('swiss.marioKartDriverNumber', {
                                          number: index + 1,
                                        })}
                                        className={singleLineSelectTriggerClass}
                                        label={roleLabel(
                                          <Gamepad2 className="size-3 shrink-0 text-primary" />,
                                          t('swiss.marioKartDriverNumber', {
                                            number: index + 1,
                                          }),
                                        )}
                                      >
                                        <SelectValue placeholder={t('swiss.result.open')} />
                                      </IftaSelectTrigger>
                                      <SelectContent>
                                        <SelectItem value={openResultValue}>
                                          {t('swiss.result.open')}
                                        </SelectItem>
                                        {marioKartOptionFor(playerId).map((player) => (
                                          <SelectItem key={player.id} value={player.id}>
                                            {player.name}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  ))}
                                  <Button
                                    className="h-9 w-full lg:h-11"
                                    size="ifta"
                                    disabled={!canAddManualMarioKartPairing}
                                    onClick={async () => {
                                      if (!canAddManualMarioKartPairing) {
                                        return
                                      }

                                      await app.addManualMarioKartPairing(
                                        draftRound.roundNumber,
                                        manualMarioKartScoringIds,
                                      )
                                      setManualMarioKartPlayers(['', '', '', ''])
                                      toast.success(t('swiss.marioKartFixed'))
                                    }}
                                  >
                                    {t('swiss.marioKartFix')}
                                  </Button>
                                </div>
                              </div>
                            )}
                            {tournament.format === 'handAndBrain' && (
                              <div className="grid gap-2">
                                <div className="type-action flex items-center gap-2">
                                  <Brain className="size-4 text-primary" />
                                  {t('swiss.handAndBrainFixBoard')}
                                </div>
                                <div className="grid gap-2 lg:grid-cols-[repeat(4,minmax(0,1fr))_8.5rem]">
                                  <div className="grid gap-2 sm:grid-cols-2 lg:contents">
                                    <Select value={manualWhiteBrain} onValueChange={setManualWhiteBrain}>
                                      <IftaSelectTrigger
                                        aria-label={t('swiss.whiteBrain')}
                                        className={singleLineSelectTriggerClass}
                                        label={roleLabel(
                                          <Brain className="size-3 shrink-0 text-primary" />,
                                          t('swiss.whiteBrain'),
                                        )}
                                      >
                                        <SelectValue placeholder={t('swiss.result.open')} />
                                      </IftaSelectTrigger>
                                      <SelectContent>
                                        {handBrainOptionFor(manualWhiteBrain).map((player) => (
                                          <SelectItem key={player.id} value={player.id}>
                                            {player.name}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                    <Select value={manualWhiteHand} onValueChange={setManualWhiteHand}>
                                      <IftaSelectTrigger
                                        aria-label={t('swiss.whiteHand')}
                                        className={singleLineSelectTriggerClass}
                                        label={roleLabel(
                                          <Hand className="size-3 shrink-0 text-primary" />,
                                          t('swiss.whiteHand'),
                                        )}
                                      >
                                        <SelectValue placeholder={t('swiss.result.open')} />
                                      </IftaSelectTrigger>
                                      <SelectContent>
                                        {handBrainOptionFor(manualWhiteHand).map((player) => (
                                          <SelectItem key={player.id} value={player.id}>
                                            {player.name}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div className="grid gap-2 sm:grid-cols-2 lg:contents">
                                    <Select value={manualBlackBrain} onValueChange={setManualBlackBrain}>
                                      <IftaSelectTrigger
                                        aria-label={t('swiss.blackBrain')}
                                        className={singleLineSelectTriggerClass}
                                        label={roleLabel(
                                          <Brain className="size-3 shrink-0 text-primary" />,
                                          t('swiss.blackBrain'),
                                        )}
                                      >
                                        <SelectValue placeholder={t('swiss.result.open')} />
                                      </IftaSelectTrigger>
                                      <SelectContent>
                                        {handBrainOptionFor(manualBlackBrain).map((player) => (
                                          <SelectItem key={player.id} value={player.id}>
                                            {player.name}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                    <Select value={manualBlackHand} onValueChange={setManualBlackHand}>
                                      <IftaSelectTrigger
                                        aria-label={t('swiss.blackHand')}
                                        className={singleLineSelectTriggerClass}
                                        label={roleLabel(
                                          <Hand className="size-3 shrink-0 text-primary" />,
                                          t('swiss.blackHand'),
                                        )}
                                      >
                                        <SelectValue placeholder={t('swiss.result.open')} />
                                      </IftaSelectTrigger>
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
                                    className="h-9 w-full lg:h-11"
                                    size="ifta"
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
                                      toast.success(t('swiss.handAndBrainFixed'))
                                    }}
                                  >
                                    {t('swiss.handAndBrainFix')}
                                  </Button>
                                </div>
                              </div>
                            )}
                            {tournament.format !== 'marioKart' && (
                            <div className="grid gap-2 lg:grid-cols-[repeat(4,minmax(0,1fr))_8.5rem]">
                              <Select value={manualWhite} onValueChange={setManualWhite}>
                                <IftaSelectTrigger
                                  aria-label={t('swiss.white')}
                                  className={singleLineSelectTriggerClass}
                                  containerClassName="lg:col-span-2"
                                  label={roleLabel(
                                    <ChessKing className="size-3 shrink-0 text-primary" />,
                                    t('swiss.white'),
                                  )}
                                >
                                  <SelectValue placeholder={t('swiss.result.open')} />
                                </IftaSelectTrigger>
                                <SelectContent>
                                  {manualWhiteOptions.map((player) => (
                                    <SelectItem key={player.id} value={player.id}>
                                      {player.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Select value={manualBlack} onValueChange={setManualBlack}>
                                <IftaSelectTrigger
                                  aria-label={t('swiss.black')}
                                  className={singleLineSelectTriggerClass}
                                  containerClassName="lg:col-span-2"
                                  label={roleLabel(
                                    <ChessKing className="size-3 shrink-0 text-primary" />,
                                    t('swiss.black'),
                                  )}
                                >
                                  <SelectValue placeholder={t('swiss.result.open')} />
                                </IftaSelectTrigger>
                                <SelectContent>
                                  {manualBlackOptions.map((player) => (
                                    <SelectItem key={player.id} value={player.id}>
                                      {player.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Button
                                className="h-9 w-full lg:h-11"
                                size="ifta"
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
                                  toast.success(t('swiss.manualPairingFixed'))
                                }}
                              >
                                {tournament.format === 'handAndBrain'
                                  ? t('swiss.singleGameFix')
                                  : t('swiss.fix')}
                              </Button>
                            </div>
                            )}
                          </div>
                        )}
                      </CardContent>
                      </Card>
                    </Fragment>
                  )
                })
              ) : (
                <div className="type-ui flex flex-col gap-3 rounded-md border border-dashed p-6 text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                  <span>{t('swiss.firstRoundHint')}</span>
                  <Button
                    className="w-full sm:w-auto"
                    disabled={!canGenerateRound}
                    onClick={() => void app.generateRound()}
                  >
                    <Plus className="size-4" />
                    {t('swiss.newRound')}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="standings">
          <StandingsTable
            standings={visibleStandings}
            tournamentFormat={visibleStandingsTournament.format}
            tournamentName={visibleStandingsTournament.name}
          />
        </TabsContent>

      </Tabs>
    </AppPage>
  )
}

function ResultCorrectionBadge({
  onCorrect,
  pairing,
  shouldConfirmRegeneration,
}: {
  onCorrect: (pairingId: string, result?: GameResult) => unknown
  pairing: Pairing
  shouldConfirmRegeneration?: (pairingId: string, result?: GameResult) => boolean
}) {
  const { t } = useI18n()
  const confirmButtonRef = useRef<HTMLButtonElement>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [pendingValue, setPendingValue] = useState<ResultSelectValue | null>(null)

  const resultFromValue = (value: ResultSelectValue) =>
    value === openResultValue ? undefined : (value as GameResult)

  const saveCorrection = async (result?: GameResult) => {
    if (isSaving) {
      return
    }

    setIsSaving(true)

    try {
      await onCorrect(pairing.id, result)
      toast.success(t('swiss.result.correctSuccess'))
    } finally {
      setIsSaving(false)
    }
  }

  const handleCorrection = async (value: ResultSelectValue) => {
    const result = resultFromValue(value)

    if (shouldConfirmRegeneration?.(pairing.id, result)) {
      setPendingValue(value)
      setConfirmOpen(true)
      return
    }

    await saveCorrection(result)
  }

  const handleConfirmCorrection = async () => {
    if (pendingValue === null) {
      setConfirmOpen(false)
      return
    }

    await saveCorrection(resultFromValue(pendingValue))
    setPendingValue(null)
    setConfirmOpen(false)
  }

  const handleConfirmOpenChange = (open: boolean) => {
    if (isSaving) {
      return
    }

    setConfirmOpen(open)

    if (!open) {
      setPendingValue(null)
    }
  }

  return (
    <>
      <Select
        disabled={isSaving || confirmOpen}
        value={pairing.result ?? openResultValue}
        onValueChange={(value) => void handleCorrection(value as ResultSelectValue)}
      >
        <SelectTrigger
          aria-label={t('swiss.result.correctAria', {
            result: resultLabel(pairing.result, t),
          })}
          className={cn(
            'type-caption inline-flex h-auto w-auto min-w-0 justify-center rounded-md px-2.5 py-0.5 shadow-none',
            'border-border bg-background text-foreground hover:bg-accent focus:ring-ring/40',
            '[&>span]:truncate [&>svg]:hidden',
            !pairing.result && 'bg-muted text-muted-foreground',
          )}
          title={t('swiss.result.correctTitle')}
        >
          <SelectValue placeholder={t('swiss.result.open')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={openResultValue}>{t('swiss.result.open')}</SelectItem>
          {resultOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {resultOptionLabel(option, t)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Dialog open={confirmOpen} onOpenChange={handleConfirmOpenChange}>
        <DialogContent
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.defaultPrevented) {
              event.preventDefault()
              void handleConfirmCorrection()
            }
          }}
          onOpenAutoFocus={(event) => {
            event.preventDefault()
            confirmButtonRef.current?.focus()
          }}
        >
          <DialogHeader>
            <DialogTitle>{t('swiss.result.regeneratePairingsTitle')}</DialogTitle>
            <DialogDescription>{t('swiss.result.correctDescription')}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button disabled={isSaving} variant="outline">
                {t('common.cancel')}
              </Button>
            </DialogClose>
            <Button
              ref={confirmButtonRef}
              disabled={isSaving}
              variant="destructive"
              onClick={() => void handleConfirmCorrection()}
            >
              {t('swiss.regenerate')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

function PairingsTable({
  editable = false,
  onManualPairingRemove,
  onMarioKartResultChange,
  onResultCorrection,
  onResultChange,
  shouldConfirmResultCorrection,
  tournament,
  pairings,
  resultCorrectionEnabled = false,
  showWarnings = true,
}: {
  editable?: boolean
  onManualPairingRemove?: (pairingId: string) => void
  onMarioKartResultChange?: (
    pairingId: string,
    playerId: string,
    partial: { placement?: number; ingamePoints?: number },
  ) => void
  onResultCorrection?: (pairingId: string, result?: GameResult) => unknown
  onResultChange?: (pairingId: string, result?: GameResult) => void
  shouldConfirmResultCorrection?: (
    pairingId: string,
    result?: GameResult,
  ) => boolean
  tournament: Tournament
  pairings: Pairing[]
  resultCorrectionEnabled?: boolean
  showWarnings?: boolean
}) {
  const { t } = useI18n()
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
          <span className="type-label min-w-0 truncate">
            {playerName(tournament, side.brainPlayerId)}
          </span>
        </div>
        <div className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-1.5">
          <Hand className="size-3.5 shrink-0 text-primary" />
          <span className="sr-only">Hand</span>
          <span className="type-label min-w-0 truncate">
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
    t('swiss.fixedPairingRemoveAria', {
      black: blackLabel(pairing),
      white: whiteLabel(pairing),
    })

  const canCorrectResult = (pairing: Pairing) =>
    resultCorrectionEnabled && !pairing.isBye && Boolean(onResultCorrection)

  const renderMobileResult = (pairing: Pairing) => {
    if (pairing.isBye) {
      return <Badge variant="secondary">{resultLabel(pairing.result, t)}</Badge>
    }

    if (editable && onResultChange) {
      return (
        <Select
          value={pairing.result ?? openResultValue}
          onValueChange={(value) =>
            handleResultSelect(pairing.id, value as ResultSelectValue)
          }
        >
          <SelectTrigger className="w-full" label={t('swiss.result')}>
            <SelectValue placeholder={t('swiss.result.open')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={openResultValue}>{t('swiss.result.open')}</SelectItem>
            {resultOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {resultOptionLabel(option, t)}
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
          shouldConfirmRegeneration={shouldConfirmResultCorrection}
        />
      )
    }

    return (
      <Badge variant={pairing.result ? 'outline' : 'secondary'}>
        {resultLabel(pairing.result, t)}
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
            className="type-caption inline-flex items-center overflow-hidden rounded-md border border-yellow-300 bg-yellow-100 text-yellow-950"
            title={removeLabel}
          >
            <span className="px-2 py-0.5">{t('swiss.fixed')}</span>
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
                className={cn('type-action', badgeMeta.className)}
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

  if (tournament.format === 'marioKart') {
    const scoringRacers = (pairing: Pairing) =>
      pairing.marioKartRacers?.filter((racer) => racer.role === 'scoring') ?? []
    const extraRacers = (pairing: Pairing) =>
      pairing.marioKartRacers?.filter((racer) => racer.role === 'extra') ?? []
    const placementOptions = (pairing: Pairing) =>
      Array.from({ length: scoringRacers(pairing).length }, (_, index) => index + 1)
    const roleBadge = (racer: MarioKartRacer) => (
      <Badge variant={racer.role === 'scoring' ? 'default' : 'secondary'}>
        {racer.role === 'scoring' ? t('swiss.marioKartScoring') : t('swiss.marioKartExtra')}
      </Badge>
    )
    const renderPlacement = (pairing: Pairing, racer: MarioKartRacer) => {
      if (pairing.isBye || racer.role === 'extra') {
        return <Badge variant="secondary">-</Badge>
      }

      if (editable && onMarioKartResultChange) {
        return (
          <Select
            value={racer.placement ? String(racer.placement) : openResultValue}
            onValueChange={(value) =>
              onMarioKartResultChange(
                pairing.id,
                racer.playerId,
                {
                  placement:
                    value === openResultValue
                      ? undefined
                      : Number(value),
                },
              )
            }
          >
            <SelectTrigger
              aria-label={t('swiss.marioKartPlacement')}
              className="h-9 w-24"
            >
              <SelectValue placeholder={t('swiss.result.open')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={openResultValue}>{t('swiss.result.open')}</SelectItem>
              {placementOptions(pairing).map((placement) => (
                <SelectItem
                  key={placement}
                  value={String(placement)}
                  disabled={scoringRacers(pairing).some(
                    (entry) =>
                      entry.playerId !== racer.playerId &&
                      entry.placement === placement,
                  )}
                >
                  {placement}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )
      }

      return (
        <Badge variant={racer.placement ? 'outline' : 'secondary'}>
          {racer.placement ?? t('swiss.result.open')}
        </Badge>
      )
    }
    const renderIngamePoints = (pairing: Pairing, racer: MarioKartRacer) => {
      if (pairing.isBye || racer.role === 'extra') {
        return <span className="text-muted-foreground">-</span>
      }

      if (editable && onMarioKartResultChange) {
        return (
          <Input
            aria-label={t('swiss.marioKartIngamePointsFor', {
              name: playerName(tournament, racer.playerId),
            })}
            className="h-9 w-24"
            inputMode="numeric"
            type="number"
            value={racer.ingamePoints ?? ''}
            onChange={(event) =>
              onMarioKartResultChange(
                pairing.id,
                racer.playerId,
                {
                  ingamePoints:
                    event.currentTarget.value.trim() === ''
                      ? undefined
                      : Number(event.currentTarget.value),
                },
              )
            }
          />
        )
      }

      return (
        <span className="tabular-nums">
          {typeof racer.ingamePoints === 'number' ? racer.ingamePoints : '-'}
        </span>
      )
    }
    const renderRacers = (pairing: Pairing) => [
      ...scoringRacers(pairing),
      ...extraRacers(pairing),
    ]
    const lobbyLabel = (pairing: Pairing) =>
      pairing.isBye
        ? `${t('swiss.marioKartBye')} ${playerName(tournament, pairing.byePlayerId)}`
        : `${t('swiss.marioKartLobby')} ${pairing.boardNumber}`

    return (
      <>
        <div className="grid gap-2 md:hidden">
          {pairings.map((pairing) => (
            <div
              key={pairing.id}
              className={cn(
                'rounded-md border bg-card p-2.5 text-sm',
                pairing.isManual && 'bg-primary/5',
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="type-action tabular-nums">{lobbyLabel(pairing)}</div>
                {showWarnings && renderMobileWarnings(pairing)}
              </div>
              {pairing.isBye && (
                <div className="mt-2">
                  <Badge variant="secondary">{resultLabel(pairing.result, t)}</Badge>
                </div>
              )}
              <div className="mt-2 grid gap-2">
                {renderRacers(pairing).map((racer) => (
                  <div
                    key={`${pairing.id}-${racer.playerId}-${racer.role}`}
                    className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-md border bg-background px-2 py-1.5"
                  >
                    <div className="min-w-0">
                      <div className="type-label truncate">
                        {playerName(tournament, racer.playerId)}
                      </div>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {roleBadge(racer)}
                      </div>
                    </div>
                    <div className="grid justify-items-end gap-1">
                      {renderPlacement(pairing, racer)}
                      {renderIngamePoints(pairing, racer)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <Table className="min-w-[56rem] table-fixed" containerClassName="hidden md:block">
          <colgroup>
            <col className="w-36" />
            <col />
            <col className="w-32" />
            <col className="w-28" />
            <col className="w-28" />
            {showWarnings && <col className="w-56" />}
          </colgroup>
          <TableHeader>
            <TableHead>{t('swiss.marioKartLobby')}</TableHead>
            <TableHead>{t('common.name')}</TableHead>
            <TableHead>{t('swiss.marioKartRole')}</TableHead>
            <TableHead>{t('swiss.marioKartPlacement')}</TableHead>
            <TableHead>{t('swiss.marioKartIngamePoints')}</TableHead>
            {showWarnings && <TableHead>{t('swiss.hints')}</TableHead>}
          </TableHeader>
          <TableBody>
            {pairings.map((pairing) => {
              const visibleWarnings = visibleWarningsForPairing(pairing)
              const racers = renderRacers(pairing)
              const rowSpan = Math.max(1, racers.length)

              return (
                <Fragment key={pairing.id}>
                  {(racers.length > 0 ? racers : [{ playerId: pairing.byePlayerId ?? '', role: 'extra' as const }]).map((racer, index) => (
                    <TableRow
                      key={`${pairing.id}-${racer.playerId || 'bye'}-${index}`}
                      className={cn('align-top', pairing.isManual && 'bg-primary/5')}
                    >
                      {index === 0 && (
                        <TableCell className="tabular-nums" rowSpan={rowSpan}>
                          <div className="grid gap-1">
                            <span>{lobbyLabel(pairing)}</span>
                            {pairing.isBye && (
                              <Badge variant="secondary">{resultLabel(pairing.result, t)}</Badge>
                            )}
                          </div>
                        </TableCell>
                      )}
                      <TableCell>{playerName(tournament, racer.playerId)}</TableCell>
                      <TableCell>{roleBadge(racer)}</TableCell>
                      <TableCell>{renderPlacement(pairing, racer)}</TableCell>
                      <TableCell>{renderIngamePoints(pairing, racer)}</TableCell>
                      {showWarnings && index === 0 && (
                        <TableCell rowSpan={rowSpan}>
                          <div className="flex flex-wrap gap-1">
                            {pairing.isManual && (
                              <span className="type-caption inline-flex items-center overflow-hidden rounded-md border border-yellow-300 bg-yellow-100 text-yellow-950">
                                <span className="px-2 py-0.5">{t('swiss.fixed')}</span>
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
                                    className={cn('type-action', badgeMeta.className)}
                                    title={entry.message}
                                    variant="outline"
                                  >
                                    {badgeMeta.label}
                                  </Badge>
                                )
                              })
                            )}
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </Fragment>
              )
            })}
          </TableBody>
        </Table>
      </>
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
                <div className="type-action tabular-nums whitespace-nowrap">
                  {t('swiss.board')} {pairing.boardNumber}
                  {pairing.kind === 'single' && (
                    <Badge className="ml-2 align-middle" variant="secondary">
                      {t('swiss.singleGame')}
                    </Badge>
                  )}
                </div>
                {showWarnings && renderMobileWarnings(pairing)}
              </div>
              <div className="mt-2.5 grid grid-cols-2 gap-2">
                <div className="min-w-0">
                  <div className="type-caption text-muted-foreground">
                    {t('swiss.table.white')}
                  </div>
                  <div className="whitespace-normal">{whiteName}</div>
                </div>
                <div className="min-w-0">
                  <div className="type-caption text-muted-foreground">
                    {t('swiss.table.black')}
                  </div>
                  <div className="whitespace-normal">{blackName}</div>
                </div>
              </div>
              <div className="mt-2.5">
                {(!editable || !onResultChange) && (
                  <div className="type-caption mb-1.5 text-muted-foreground">
                    {t('swiss.result')}
                  </div>
                )}
                {renderMobileResult(pairing)}
              </div>
            </div>
          )
        })}
      </div>

      <Table
        className="min-w-[48rem] table-fixed"
        containerClassName="hidden md:block"
      >
          <colgroup>
            <col className="w-40" />
            <col />
            <col />
            <col className="w-36" />
            {showWarnings && <col className="w-56" />}
          </colgroup>
          <TableHeader>
            <TableHead>{t('swiss.board')}</TableHead>
            <TableHead>{t('swiss.table.white')}</TableHead>
            <TableHead>{t('swiss.table.black')}</TableHead>
            <TableHead>{t('swiss.result')}</TableHead>
            {showWarnings && <TableHead>{t('swiss.hints')}</TableHead>}
          </TableHeader>
          <TableBody>
          {pairings.map((pairing) => {
            const visibleWarnings = visibleWarningsForPairing(pairing)

            return (
              <TableRow
                key={pairing.id}
                className={cn(
                  'align-top',
                  pairing.isManual && 'bg-primary/5',
                )}
              >
              <TableCell className="tabular-nums">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span>{pairing.boardNumber}</span>
                  {pairing.kind === 'single' && (
                    <Badge variant="secondary">{t('swiss.singleGame')}</Badge>
                  )}
                </div>
              </TableCell>
              <TableCell>
                {renderWhite(pairing)}
              </TableCell>
              <TableCell>
                {renderBlack(pairing)}
              </TableCell>
              <TableCell>
                {pairing.isBye ? (
                  <Badge variant="secondary">{resultLabel(pairing.result, t)}</Badge>
                ) : editable && onResultChange ? (
                  <Select
                    value={pairing.result ?? openResultValue}
                    onValueChange={(value) =>
                      handleResultSelect(pairing.id, value as ResultSelectValue)
                    }
                  >
                    <SelectTrigger className="w-28">
                      <SelectValue placeholder={t('swiss.result.open')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={openResultValue}>{t('swiss.result.open')}</SelectItem>
                      {resultOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {resultOptionLabel(option, t)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : canCorrectResult(pairing) && onResultCorrection ? (
                  <ResultCorrectionBadge
                    pairing={pairing}
                    onCorrect={onResultCorrection}
                    shouldConfirmRegeneration={shouldConfirmResultCorrection}
                  />
                ) : (
                  <Badge variant={pairing.result ? 'outline' : 'secondary'}>
                    {resultLabel(pairing.result, t)}
                  </Badge>
                )}
              </TableCell>
              {showWarnings && (
                <TableCell>
                  <div className="flex max-h-14 flex-wrap gap-1 overflow-hidden">
                    {pairing.isManual && (
                      <span className="type-caption inline-flex items-center overflow-hidden rounded-md border border-yellow-300 bg-yellow-100 text-yellow-950">
                        <span className="px-2 py-0.5">{t('swiss.fixed')}</span>
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
                            className={cn('type-action', badgeMeta.className)}
                            title={entry.message}
                            variant="outline"
                          >
                            {badgeMeta.label}
                          </Badge>
                        )
                      })
                    )}
                  </div>
                </TableCell>
              )}
            </TableRow>
            )
          })}
          </TableBody>
      </Table>
    </>
  )
}

function StandingsTable({
  standings,
  tournamentFormat,
  tournamentName,
}: {
  standings: ReturnType<typeof useSwissTournaments>['standings']
  tournamentFormat: Tournament['format']
  tournamentName: string
}) {
  const { t } = useI18n()
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
      'type-caption swiss-round-cell inline-flex h-7 min-w-11 items-center justify-start rounded px-2 tabular-nums',
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
  const visibleRoundGridColumns = Math.min(Math.max(roundColumnCount, 1), 3)
  const roundCellLabelWidth = Math.max(
    4,
    ...standings.flatMap((row) => row.roundHistory.map((cell) => cell.label.length)),
  )
  const roundCellWidthStyle = {
    '--swiss-round-cell-width': `${roundCellLabelWidth * 0.45 + 1.85}rem`,
    '--swiss-round-grid-columns': visibleRoundGridColumns,
  } as CSSProperties
  const hardshipLabel =
    tournamentFormat === 'marioKart'
      ? t('swiss.hardship.marioKart')
      : tournamentFormat === 'handAndBrain'
      ? t('swiss.hardship.handAndBrain')
      : t('swiss.hardship.byes')
  const hardshipCount = (row: (typeof standings)[number]) =>
    tournamentFormat === 'marioKart'
      ? row.receivedByes + row.marioKartExtraRides
      : tournamentFormat === 'handAndBrain'
      ? row.receivedByes + row.receivedSingleGames
      : row.receivedByes
  const isMarioKart = tournamentFormat === 'marioKart'
  const primaryPointsLabel = isMarioKart
    ? t('swiss.marioKartTournamentPoints')
    : t('swiss.standings.points')
  const winsLabel = isMarioKart ? t('swiss.marioKartWins') : t('swiss.table.wins')
  const winsCount = (row: (typeof standings)[number]) =>
    isMarioKart ? row.marioKartWins : row.wins

  return (
    <Card className="swiss-standings-card">
      <CardHeader>
        <div className="swiss-export-title hidden">
          <h1>{tournamentName}</h1>
        </div>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="size-5 text-primary" />
          {t('swiss.ranking')}
        </CardTitle>
      </CardHeader>
      <CardContent style={roundCellWidthStyle}>
        <Table
          className="table-fixed"
          containerClassName="swiss-standings-mobile md:hidden"
        >
            <colgroup>
              <col className="w-11" />
              <col />
              <col className="w-14" />
              <col className="w-16" />
              <col className="w-9" />
            </colgroup>
            <TableHeader>
                <TableHead className="px-1.5 py-2">{t('swiss.rank')}</TableHead>
                <TableHead className="py-2 pl-4 pr-1.5">{t('common.name')}</TableHead>
                <TableHead className="px-1 py-2 text-center">{primaryPointsLabel}</TableHead>
                {isMarioKart ? (
                  <>
                    <TableHead className="px-1 py-2 text-center">{t('swiss.marioKartIngamePoints')}</TableHead>
                    <TableHead className="px-1 py-2 text-center">{t('swiss.marioKartAveragePlacement')}</TableHead>
                  </>
                ) : (
                  <>
                    <TableHead className="px-1 py-2 text-center">{t('swiss.table.buchholz')}</TableHead>
                    <TableHead className="px-1 py-2 text-center">{t('swiss.table.sb')}</TableHead>
                  </>
                )}
            </TableHeader>
            <TableBody>
              {standings.map((row) => {
                const isExpanded = expandedPlayerId === row.playerId
                const detailsId = `swiss-standing-details-${row.playerId}`

                return (
                  <Fragment key={row.playerId}>
                    <TableRow
                      aria-controls={detailsId}
                      aria-expanded={isExpanded}
                      className={cn(
                        'cursor-pointer outline-none transition-colors hover:bg-primary/5 focus-visible:bg-primary/10',
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
                      <TableCell className="px-1.5 py-2 tabular-nums">{row.rank}</TableCell>
                      <TableCell className="type-label min-w-0 py-2 pl-4 pr-1.5">
                        <span className="block min-w-0 truncate">{row.playerName}</span>
                      </TableCell>
                      <TableCell className="px-1 py-2 text-center tabular-nums">
                        <span className="type-action inline-flex min-w-9 items-center justify-center rounded-md border border-primary/25 bg-primary/10 px-1.5 py-0.5 text-primary">
                          {formatPoints(row.points)}
                        </span>
                      </TableCell>
                      {isMarioKart ? (
                        <>
                          <TableCell className="px-1 py-2 text-center tabular-nums">
                            {row.marioKartIngamePoints}
                          </TableCell>
                          <TableCell className="px-1 py-2 text-center tabular-nums">
                            {row.marioKartAveragePlacement === null
                              ? '-'
                              : formatPoints(row.marioKartAveragePlacement)}
                          </TableCell>
                        </>
                      ) : (
                        <>
                          <TableCell className="px-1 py-2 text-center tabular-nums">
                            {formatPoints(row.buchholz)}
                          </TableCell>
                          <TableCell className="px-1 py-2 text-center tabular-nums">
                            {formatPoints(row.sonnebornBerger)}
                          </TableCell>
                        </>
                      )}
                    </TableRow>
                    {isExpanded && (
                      <TableRow
                        id={detailsId}
                        className={cn('bg-background/70', podiumClass(row.rank))}
                      >
                        <TableCell className="px-2 pb-2 pt-0" colSpan={5}>
                          <div className="grid gap-2 py-2">
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
                            <div className="type-field-label flex flex-wrap items-center gap-2 text-muted-foreground">
                              <span>{winsLabel}: {winsCount(row)}</span>
                              {isMarioKart && (
                                <>
                                  <span>{t('swiss.marioKartIngamePoints')}: {row.marioKartIngamePoints}</span>
                                  <span>
                                    {t('swiss.marioKartAveragePlacement')}:{' '}
                                    {row.marioKartAveragePlacement === null
                                      ? '-'
                                      : formatPoints(row.marioKartAveragePlacement)}
                                  </span>
                                </>
                              )}
                              <span>{hardshipLabel}: {hardshipCount(row)}</span>
                              <Badge
                                className="h-5 px-1.5"
                                variant={statusVariant(row.status)}
                              >
                                  {t(statusLabelKeys[row.status])}
                              </Badge>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                )
              })}
            </TableBody>
        </Table>

        <Table
          className={cn('swiss-standings-table', isMarioKart ? 'min-w-[66rem]' : 'min-w-[68rem]')}
          containerClassName="swiss-standings-table-wrap swiss-standings-desktop hidden md:block"
        >
            <TableHeader>
                <TableHead>{t('swiss.rank')}</TableHead>
                <TableHead>{t('common.name')}</TableHead>
                <TableHead>{primaryPointsLabel}</TableHead>
                {isMarioKart ? (
                  <>
                    <TableHead>{winsLabel}</TableHead>
                    <TableHead>{t('swiss.marioKartIngamePoints')}</TableHead>
                    <TableHead>{t('swiss.marioKartAveragePlacement')}</TableHead>
                  </>
                ) : (
                  <>
                    <TableHead>{t('swiss.table.buchholz')}</TableHead>
                    <TableHead>{t('swiss.table.sb')}</TableHead>
                    <TableHead>{winsLabel}</TableHead>
                  </>
                )}
                <TableHead className="swiss-rounds-heading">{t('swiss.rounds')}</TableHead>
                <TableHead className="swiss-export-hidden-column">{hardshipLabel}</TableHead>
                <TableHead className="swiss-export-hidden-column">{t('common.status')}</TableHead>
            </TableHeader>
            <TableBody>
              {standings.map((row) => (
                <TableRow
                  key={row.playerId}
                  className={podiumClass(row.rank)}
                >
                  <TableCell className="tabular-nums">{row.rank}</TableCell>
                  <TableCell className="type-label">{row.playerName}</TableCell>
                  <TableCell className="tabular-nums">
                    <span className="type-action inline-flex min-w-12 items-center justify-center rounded-md border border-primary/25 bg-primary/10 px-2.5 py-1 text-primary">
                      {formatPoints(row.points)}
                    </span>
                  </TableCell>
                  {isMarioKart ? (
                    <>
                      <TableCell className="tabular-nums">{row.marioKartWins}</TableCell>
                      <TableCell className="tabular-nums">{row.marioKartIngamePoints}</TableCell>
                      <TableCell className="tabular-nums">
                        {row.marioKartAveragePlacement === null
                          ? '-'
                          : formatPoints(row.marioKartAveragePlacement)}
                      </TableCell>
                    </>
                  ) : (
                    <>
                      <TableCell className="tabular-nums">{formatPoints(row.buchholz)}</TableCell>
                      <TableCell className="tabular-nums">
                        {formatPoints(row.sonnebornBerger)}
                      </TableCell>
                      <TableCell className="tabular-nums">{row.wins}</TableCell>
                    </>
                  )}
                  <TableCell className="swiss-round-table-cell">
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
                  </TableCell>
                  <TableCell className="swiss-export-hidden-column tabular-nums">
                    {hardshipCount(row)}
                  </TableCell>
                  <TableCell className="swiss-export-hidden-column">
                    <Badge variant={statusVariant(row.status)}>
                      {t(statusLabelKeys[row.status])}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
        </Table>
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
