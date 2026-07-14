import { Brain, Check, Hand, Trophy, X } from 'lucide-react';
import { Fragment, useId, useRef, useState, type CSSProperties } from 'react';
import { toast } from 'sonner';
import { formatPoints } from '@/apps/swiss-tournaments/components/tournamentUiPresentation'
import { useSwissTournaments } from '@/apps/swiss-tournaments/hooks/useSwissTournaments';
import type { GameResult, MarioKartRacer, Pairing, PairingWarning, PlayerStatus, Tournament } from '@/apps/swiss-tournaments/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useI18n, type TranslationKey } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { TournamentInspection } from '@/apps/swiss-tournaments/domain/tournamentDomain'

const resultOptions: Array<{ value: GameResult; labelKey?: TranslationKey; label: string }> = [
  { value: '1-0', label: '1 - 0' },
  { value: '0-1', label: '0 - 1' },
  { value: '0.5-0.5', label: '1/2 - 1/2' },
  { value: 'forfeit-1-0', labelKey: 'swiss.result.forfeit', label: '1 - 0' },
  { value: 'forfeit-0-1', labelKey: 'swiss.result.forfeit', label: '0 - 1' },
]

const openResultValue = 'open'

type ResultSelectValue = GameResult | typeof openResultValue

const tournamentWebsiteUrl = 'https://bengtstoolbox.web.app/apps/swiss-tournaments'

const tournamentWebsiteQrUrl = '/qrcode.svg'

const marioKartRankGradients: Record<number | 'default', readonly string[]> = {
  1: ['#fff7a8', '#ffd83f', '#b58c18', '#ffe877'],
  2: ['#ffffff', '#dff6f7', '#9fb3bb', '#f4ffff'],
  3: ['#ffe6ca', '#d99c62', '#a56936', '#f7cfaa'],
  default: ['#f4f7f8', '#9aa8ae', '#4d6870', '#c8d2d6'],
}

function ordinalSuffix(rank: number) {
  const remainder = rank % 100

  if (remainder >= 11 && remainder <= 13) {
    return 'th'
  }

  switch (rank % 10) {
    case 1:
      return 'st'
    case 2:
      return 'nd'
    case 3:
      return 'rd'
    default:
      return 'th'
  }
}

function RankPlacement({
  className,
  isMarioKart,
  rank,
}: {
  className?: string
  isMarioKart: boolean
  rank: number
}) {
  const gradientId = `mario-kart-rank-gradient-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`
  const shadowId = `mario-kart-rank-shadow-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`

  if (!isMarioKart || !Number.isInteger(rank) || rank < 1) {
    return <>{rank}</>
  }

  const rankText = String(rank)
  const rankDigitCount = rankText.length
  const gradientStops = marioKartRankGradients[rank] ?? marioKartRankGradients.default
  const isCompactRank = rankDigitCount <= 2
  const viewBoxWidth = rankDigitCount === 1 ? 86 : rankDigitCount === 2 ? 96 : 116
  const numberFontSize = isCompactRank ? (rankDigitCount === 1 ? 45 : 40) : 34
  const suffixFontSize = isCompactRank ? (rankDigitCount === 1 ? 17 : 14) : 12
  const letterSpacing = rankDigitCount === 1 ? -3 : -4

  return (
    <span
      aria-label={String(rank)}
      className={cn('inline-flex h-[30px] w-16 max-w-full items-center align-middle', className)}
    >
      <span className="sr-only">{rank}</span>
      <svg
        aria-hidden="true"
        className="block h-full w-full"
        focusable="false"
        preserveAspectRatio="xMidYMid meet"
        viewBox={`0 0 ${viewBoxWidth} 46`}
      >
        <defs>
          <linearGradient
            id={gradientId}
            x1="8"
            x2={viewBoxWidth - 8}
            y1="2"
            y2="45"
            gradientUnits="userSpaceOnUse"
          >
            {gradientStops.map((color, index) => (
              <stop
                key={color}
                offset={index === 0 ? '0' : index === 1 ? '0.48' : index === 2 ? '0.72' : '1'}
                stopColor={color}
              />
            ))}
          </linearGradient>
          <filter id={shadowId} x="-20%" y="-30%" width="140%" height="160%">
            <feDropShadow
              dx="2"
              dy="2"
              floodColor="#1b2228"
              floodOpacity="0.58"
              stdDeviation="1.1"
            />
          </filter>
        </defs>
        <g filter={`url(#${shadowId})`} transform="translate(3 0) skewX(-8)">
          <text
            dominantBaseline="alphabetic"
            fill={`url(#${gradientId})`}
            fontFamily="Arial Black, Impact, sans-serif"
            fontWeight="900"
            paintOrder="stroke"
            stroke="#26313a"
            strokeLinejoin="round"
            strokeWidth={rankDigitCount === 1 ? 5 : 4.5}
            x={rankDigitCount === 1 ? 6 : 4}
            y={rankDigitCount === 1 ? 40 : 39}
          >
            <tspan
              fontSize={numberFontSize}
              letterSpacing={letterSpacing}
            >
              {rankText}
            </tspan>
            <tspan
              dx="3"
              dy="-1"
              fontSize={suffixFontSize}
              letterSpacing="-1"
              strokeWidth={rankDigitCount === 1 ? 3.5 : 3}
            >
              {ordinalSuffix(rank)}
            </tspan>
          </text>
        </g>
      </svg>
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

function statusVariant(status: PlayerStatus) {
  if (status === 'active') {
    return 'default' as const
  }

  return status === 'inactive' ? ('secondary' as const) : ('outline' as const)
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

function BeerToggle({
  checked,
  disabled,
  label,
  onChange,
}: {
  checked: boolean
  disabled: boolean
  label: string
  onChange?: (checked: boolean) => void
}) {
  return (
    <label
      className={cn(
        'inline-flex h-9 w-16 items-center justify-center rounded-md border',
        disabled ? 'cursor-default opacity-70' : 'cursor-pointer',
        checked && 'border-primary/40 bg-primary/10',
      )}
    >
      <input
        aria-label={label}
        checked={checked}
        className="peer sr-only"
        disabled={disabled}
        type="checkbox"
        onChange={(event) => onChange?.(event.currentTarget.checked)}
      />
      <span
        aria-hidden="true"
        className="grid size-5 place-items-center rounded border border-input bg-background shadow-xs peer-checked:border-primary peer-checked:bg-primary peer-focus-visible:ring-[3px] peer-focus-visible:ring-ring/50"
      >
        {checked && <Check className="size-3.5 stroke-[3] text-primary-foreground" />}
      </span>
    </label>
  )
}

type PairingWarningBadgeDefinition = {
  labelKey: TranslationKey
  titleKey: TranslationKey
  className: string
}

type PairingWarningBadgeMeta = {
  className: string
  label: string
  title: string
}

const marioKartHiddenWarningIds = new Set([
  'bye-cycle-restarted',
  'mario-kart-bye-extra',
  'multiple-byes',
])

const warningBadgeMeta: Record<string, PairingWarningBadgeDefinition> = {
  'bye-cycle-restarted': {
    labelKey: 'swiss.warning.byeCycleRestarted.label',
    titleKey: 'swiss.warning.byeCycleRestarted.title',
    className: 'border-amber-300 bg-amber-100 text-amber-950',
  },
  'color-imbalance': {
    labelKey: 'swiss.warning.colorImbalance.label',
    titleKey: 'swiss.warning.colorImbalance.title',
    className: 'border-sky-300 bg-sky-100 text-sky-950',
  },
  'duplicate-round-player': {
    labelKey: 'swiss.warning.duplicateRoundPlayer.label',
    titleKey: 'swiss.warning.duplicateRoundPlayer.title',
    className: 'border-red-300 bg-red-100 text-red-950',
  },
  'forced-floater': {
    labelKey: 'swiss.warning.forcedFloater.label',
    titleKey: 'swiss.warning.forcedFloater.title',
    className: 'border-violet-300 bg-violet-100 text-violet-950',
  },
  'inactive-player': {
    labelKey: 'swiss.warning.inactivePlayer.label',
    titleKey: 'swiss.warning.inactivePlayer.title',
    className: 'border-slate-300 bg-slate-100 text-slate-950',
  },
  'large-point-gap': {
    labelKey: 'swiss.warning.largePointGap.label',
    titleKey: 'swiss.warning.largePointGap.title',
    className: 'border-orange-300 bg-orange-100 text-orange-950',
  },
  'missing-player': {
    labelKey: 'swiss.warning.missingPlayer.label',
    titleKey: 'swiss.warning.missingPlayer.title',
    className: 'border-rose-300 bg-rose-100 text-rose-950',
  },
  'mario-kart-bye-extra': {
    labelKey: 'swiss.warning.marioKartByeExtra.label',
    titleKey: 'swiss.warning.marioKartByeExtra.title',
    className: 'border-cyan-300 bg-cyan-100 text-cyan-950',
  },
  'mario-kart-score-gap': {
    labelKey: 'swiss.warning.marioKartScoreGap.label',
    titleKey: 'swiss.warning.marioKartScoreGap.title',
    className: 'border-orange-500 bg-orange-200 text-orange-950',
  },
  'mario-kart-three-player-lobby': {
    labelKey: 'swiss.warning.marioKartThreePlayerLobby.label',
    titleKey: 'swiss.warning.marioKartThreePlayerLobby.title',
    className: 'border-sky-300 bg-sky-100 text-sky-950',
  },
  'multiple-byes': {
    labelKey: 'swiss.warning.multipleByes.label',
    titleKey: 'swiss.warning.multipleByes.title',
    className: 'border-amber-300 bg-amber-100 text-amber-950',
  },
  'non-fide-fallback': {
    labelKey: 'swiss.warning.nonFideFallback.label',
    titleKey: 'swiss.warning.nonFideFallback.title',
    className: 'border-fuchsia-300 bg-fuchsia-100 text-fuchsia-950',
  },
  'repeat-pairing': {
    labelKey: 'swiss.warning.repeatPairing.label',
    titleKey: 'swiss.warning.repeatPairing.title',
    className: 'border-red-300 bg-red-100 text-red-950',
  },
  'repeat-hand-brain-partner': {
    labelKey: 'swiss.warning.repeatHandBrainPartner.label',
    titleKey: 'swiss.warning.repeatHandBrainPartner.title',
    className: 'border-amber-300 bg-amber-100 text-amber-950',
  },
  'repeat-hand-brain-roles': {
    labelKey: 'swiss.warning.repeatHandBrainRoles.label',
    titleKey: 'swiss.warning.repeatHandBrainRoles.title',
    className: 'border-sky-300 bg-sky-100 text-sky-950',
  },
  'repeat-hand-brain-team': {
    labelKey: 'swiss.warning.repeatHandBrainTeam.label',
    titleKey: 'swiss.warning.repeatHandBrainTeam.title',
    className: 'border-red-300 bg-red-100 text-red-950',
  },
  'same-player': {
    labelKey: 'swiss.warning.samePlayer.label',
    titleKey: 'swiss.warning.samePlayer.title',
    className: 'border-red-300 bg-red-100 text-red-950',
  },
  'third-color': {
    labelKey: 'swiss.warning.thirdColor.label',
    titleKey: 'swiss.warning.thirdColor.title',
    className: 'border-sky-300 bg-sky-100 text-sky-950',
  },
}

const pairingHintBadgeClassName = 'type-action uppercase'

const fixedPairingHintClassName = cn(
  pairingHintBadgeClassName,
  'inline-flex items-center overflow-hidden rounded-md border border-yellow-300 bg-yellow-100 text-yellow-950',
)

function pairingWarningBadgeMeta(
  warning: PairingWarning,
  t: ReturnType<typeof useI18n>['t'],
): PairingWarningBadgeMeta {
  const badgeMeta = warningBadgeMeta[warning.id]

  if (badgeMeta) {
    return {
      className: badgeMeta.className,
      label: t(badgeMeta.labelKey),
      title: t(badgeMeta.titleKey),
    }
  }

  const isHardWarning = warning.severity === 'hard'

  return {
    label: t(
      isHardWarning
        ? 'swiss.warning.fallbackHard.label'
        : 'swiss.warning.fallbackSoft.label',
    ),
    title:
      warning.message ||
      t(
        isHardWarning
          ? 'swiss.warning.fallbackHard.title'
          : 'swiss.warning.fallbackSoft.title',
      ),
    className: isHardWarning
      ? 'border-red-300 bg-red-100 text-red-950'
      : 'border-lime-300 bg-lime-100 text-lime-950',
  }
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

export function PairingsTable({
  editable = false,
  inspection,
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
  inspection: TournamentInspection | null
  onManualPairingRemove?: (pairingId: string) => void
  onMarioKartResultChange?: (
    pairingId: string,
    playerId: string,
    partial: { placement?: number; event?: boolean },
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
        (tournament.format !== 'roundRobin' || warning.id !== 'large-point-gap') &&
        (tournament.format !== 'marioKart' ||
          !marioKartHiddenWarningIds.has(warning.id)),
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
            className={fixedPairingHintClassName}
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
          <Badge className={pairingHintBadgeClassName} variant="outline">
            OK
          </Badge>
        ) : (
          visibleWarnings.map((entry) => {
            const badgeMeta = pairingWarningBadgeMeta(entry, t)

            return (
              <Badge
                key={entry.id}
                className={cn(pairingHintBadgeClassName, badgeMeta.className)}
                title={badgeMeta.title}
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
    const placementErrors = new Map(
      pairings.map((pairing) => [
        pairing.id,
        inspection?.pairings.get(pairing.id)?.marioKartPlacementErrors ??
          new Map(),
      ]),
    )
    const raceNumber = (pairing: Pairing, playerId: string) =>
      inspection?.pairings
        .get(pairing.id)
        ?.physicalRaceNumberByPlayerId.get(playerId) ?? 0
    const racersFor = (pairing: Pairing) =>
      inspection?.pairings.get(pairing.id)?.marioKartRacers ?? []
    const isFillIn = (pairing: Pairing, racer: MarioKartRacer) =>
      racer.scoringCycleNumber !== null &&
      racer.scoringCycleNumber > (pairing.marioKartCycleNumber ?? pairing.roundNumber)
    const renderPlacement = (pairing: Pairing, racer: MarioKartRacer) => {
      const error = placementErrors.get(pairing.id)?.get(racer.playerId)
      const errorId = `mario-kart-placement-${pairing.id}-${racer.playerId}`.replace(
        /[^a-zA-Z0-9_-]/g,
        '',
      )

      if (editable && onMarioKartResultChange) {
        return (
          <div className="grid justify-items-center gap-1">
            <Input
              aria-describedby={error && error !== 'required' ? errorId : undefined}
              aria-invalid={Boolean(error && error !== 'required')}
              aria-label={t('swiss.marioKartPlacementFor', {
                name: playerName(tournament, racer.playerId),
              })}
              className="h-9 w-16 px-2 text-center tabular-nums"
              inputMode="numeric"
              max={inspection?.constraints.marioKartPlacement.max ?? 24}
              min={1}
              step={1}
              type="number"
              value={racer.placement ?? ''}
              onChange={(event) =>
                onMarioKartResultChange(pairing.id, racer.playerId, {
                  placement:
                    event.currentTarget.value === ''
                      ? undefined
                      : Number(event.currentTarget.value),
                })
              }
            />
            {error && error !== 'required' && (
              <span className="type-caption whitespace-nowrap text-destructive" id={errorId}>
                {t(
                  error === 'duplicate'
                    ? 'swiss.marioKartPlacementDuplicate'
                    : 'swiss.marioKartPlacementRange',
                )}
              </span>
            )}
          </div>
        )
      }

      return (
        <Badge variant={racer.placement ? 'outline' : 'secondary'}>
          {racer.placement ?? t('swiss.result.open')}
        </Badge>
      )
    }
    const renderEvent = (pairing: Pairing, racer: MarioKartRacer) => {
      return (
        <BeerToggle
          checked={Boolean(racer.event)}
          disabled={!onMarioKartResultChange}
          label={t('swiss.marioKartEventFor', {
            name: playerName(tournament, racer.playerId),
          })}
          onChange={(event) =>
            onMarioKartResultChange?.(pairing.id, racer.playerId, { event })
          }
        />
      )
    }
    const renderHints = (
      pairing: Pairing,
      racer: MarioKartRacer,
      index: number,
    ) => {
      const warnings = index === 0 ? visibleWarningsForPairing(pairing) : []
      const hasRacerHint =
        racer.isFixed ||
        isFillIn(pairing, racer) ||
        racer.scoringCycleNumber === null

      return (
        <div className="flex flex-wrap gap-1">
          {racer.isFixed && (
            <Badge
              className={cn(
                pairingHintBadgeClassName,
                'border-yellow-300 bg-yellow-100 text-yellow-950',
              )}
              variant="outline"
            >
              {t('swiss.fixed')}
            </Badge>
          )}
          {isFillIn(pairing, racer) && (
            <Badge
              className={cn(
                pairingHintBadgeClassName,
                'border-teal-300 bg-teal-100 text-teal-950',
              )}
              title={t('swiss.warning.marioKartFillIn.title')}
              variant="outline"
            >
              {t('swiss.warning.marioKartFillIn.label')}
            </Badge>
          )}
          {racer.scoringCycleNumber === null && (
            <Badge
              className={cn(
                pairingHintBadgeClassName,
                'border-sky-300 bg-sky-100 text-sky-950',
              )}
              title={t('swiss.warning.marioKartExtra.title')}
              variant="outline"
            >
              {t('swiss.marioKartExtra')}
            </Badge>
          )}
          {warnings.map((entry) => {
              const badgeMeta = pairingWarningBadgeMeta(entry, t)

              return (
                <Badge
                  key={entry.id}
                  className={cn(pairingHintBadgeClassName, badgeMeta.className)}
                  title={badgeMeta.title}
                  variant="outline"
                >
                  {badgeMeta.label}
                </Badge>
              )
            })}
          {!hasRacerHint && warnings.length === 0 && (
            <Badge className={pairingHintBadgeClassName} variant="outline">
              OK
            </Badge>
          )}
        </div>
      )
    }
    const eventCellClass = (racer: MarioKartRacer) =>
      cn('transition-colors', racer.event && 'bg-secondary/60')

    return (
      <>
        <div className="grid gap-2 md:hidden">
          {pairings.flatMap((pairing) =>
            racersFor(pairing).map((racer, index) => (
                  <div
                    key={`${pairing.id}-${racer.playerId}-${racer.scoringCycleNumber ?? 'extra'}`}
                    className={cn(
                      'grid gap-2 rounded-md border bg-background p-3 text-sm transition-colors',
                      racer.event && 'border-primary/25 bg-secondary/60',
                    )}
                  >
                    <div className="flex min-w-0 items-start justify-between gap-2">
                      <span className="type-label min-w-0 truncate">
                        {playerName(tournament, racer.playerId)}
                      </span>
                      {showWarnings && renderHints(pairing, racer, index)}
                    </div>
                    <div className="grid grid-cols-3 items-start gap-2">
                      <div className="grid gap-1">
                        <span className="type-field-label text-muted-foreground">
                          {t('swiss.marioKartGames')}
                        </span>
                        <span className="tabular-nums">
                          {raceNumber(pairing, racer.playerId)}
                        </span>
                      </div>
                      <div className="grid justify-items-center gap-1">
                        <span className="type-field-label text-muted-foreground">
                          {t('swiss.marioKartPlacement')}
                        </span>
                        {renderPlacement(pairing, racer)}
                      </div>
                      <div className="grid justify-items-end gap-1">
                        <span className="type-field-label text-muted-foreground">
                          {t('swiss.marioKartEvent')}
                        </span>
                        {renderEvent(pairing, racer)}
                      </div>
                    </div>
                  </div>
                )),
          )}
        </div>

        <Table className="min-w-[48rem] table-fixed" containerClassName="hidden md:block">
          <colgroup>
            <col />
            <col className="w-24" />
            <col className="w-24" />
            <col className="w-24" />
            {showWarnings && <col className="w-56" />}
          </colgroup>
          <TableHeader>
            <TableHead>{t('common.name')}</TableHead>
            <TableHead>{t('swiss.marioKartGames')}</TableHead>
            <TableHead>{t('swiss.marioKartPlacement')}</TableHead>
            <TableHead>{t('swiss.marioKartEvent')}</TableHead>
            {showWarnings && <TableHead>{t('swiss.hints')}</TableHead>}
          </TableHeader>
          <TableBody>
            {pairings.flatMap((pairing) =>
              racersFor(pairing).map((racer, index) => (
                    <TableRow
                      key={`${pairing.id}-${racer.playerId || 'bye'}-${index}`}
                      className="align-top transition-colors"
                    >
                      <TableCell className={eventCellClass(racer)}>
                        <span className="min-w-0 truncate">
                          {playerName(tournament, racer.playerId)}
                        </span>
                      </TableCell>
                      <TableCell className={cn('tabular-nums', eventCellClass(racer))}>
                        {raceNumber(pairing, racer.playerId)}
                      </TableCell>
                      <TableCell className={eventCellClass(racer)}>
                        {renderPlacement(pairing, racer)}
                      </TableCell>
                      <TableCell className={cn('align-middle', eventCellClass(racer))}>
                        {renderEvent(pairing, racer)}
                      </TableCell>
                      {showWarnings && (
                        <TableCell className={eventCellClass(racer)}>
                          {renderHints(pairing, racer, index)}
                        </TableCell>
                      )}
                    </TableRow>
                  )),
            )}
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
                      <span className={fixedPairingHintClassName}>
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
                      <Badge className={pairingHintBadgeClassName} variant="outline">
                        OK
                      </Badge>
                    ) : (
                      visibleWarnings.map((entry) => {
                        const badgeMeta = pairingWarningBadgeMeta(entry, t)

                        return (
                          <Badge
                            key={entry.id}
                            className={cn(pairingHintBadgeClassName, badgeMeta.className)}
                            title={badgeMeta.title}
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

export function StandingsTable({
  inspection,
  standings,
  tournament,
}: {
  inspection: TournamentInspection | null
  standings: ReturnType<typeof useSwissTournaments>['standings']
  tournament: Tournament
}) {
  const { language, t } = useI18n()
  const [expandedPlayerId, setExpandedPlayerId] = useState<string | null>(null)
  type StandingHistoryCell = (typeof standings)[number]['roundHistory'][number]
  type StandingTableRow = (typeof standings)[number]
  const podiumClass = (rank: number) =>
    rank === 1
      ? 'swiss-podium-first bg-[#f6e3a5]/65'
      : rank === 2
        ? 'swiss-podium-second bg-[#e6e8eb]/70'
        : rank === 3
          ? 'swiss-podium-third bg-[#e8c0a0]/55'
          : ''
  const roundCellClass = (cell: StandingHistoryCell) =>
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
  const tournamentFormat = tournament.format
  const tournamentName = tournament.name
  const isMarioKart = tournamentFormat === 'marioKart'
  const visibleRoundHistory = (row: StandingTableRow) =>
    isMarioKart
      ? row.roundHistory.filter((cell) => cell.outcome !== 'open')
      : row.roundHistory
  const visibleEventHistory = (row: StandingTableRow) =>
    row.roundHistory.filter(
      (cell) => cell.event || (cell.outcome !== 'open' && cell.outcome !== 'bye'),
    )
  const roundColumnCount = Math.max(
    0,
    ...standings.map((row) => visibleRoundHistory(row).length),
  )
  const visibleRoundGridColumns = Math.min(Math.max(roundColumnCount, 1), 3)
  const roundCellLabelWidth = Math.max(
    4,
    ...standings.flatMap((row) =>
      visibleRoundHistory(row).map((cell) => cell.label.length),
    ),
  )
  const roundCellWidthRem = roundCellLabelWidth * 0.45 + 1.85
  const roundGridWidthRem =
    visibleRoundGridColumns * roundCellWidthRem +
    Math.max(0, visibleRoundGridColumns - 1) * 0.5
  const roundHistoryColumnWidthRem = roundGridWidthRem + 1.5
  const marioKartStandingsMinWidthRem = 47.5 + roundHistoryColumnWidthRem
  const marioKartEventTableMinWidthRem = 23 + roundHistoryColumnWidthRem
  const roundCellWidthStyle = {
    '--swiss-round-cell-width': `${roundCellWidthRem}rem`,
    '--swiss-round-grid-columns': visibleRoundGridColumns,
  } as CSSProperties
  const hardshipLabel =
    tournamentFormat === 'marioKart'
      ? t('swiss.marioKartGames')
      : tournamentFormat === 'handAndBrain'
      ? t('swiss.hardship.handAndBrain')
      : t('swiss.hardship.byes')
  const hardshipCount = (row: StandingTableRow) =>
    tournamentFormat === 'marioKart'
      ? row.marioKartPhysicalRaces
      : tournamentFormat === 'handAndBrain'
      ? row.receivedByes + row.receivedSingleGames
      : row.receivedByes
  const primaryPointsLabel = isMarioKart
    ? t('swiss.marioKartTournamentPoints')
    : t('swiss.standings.points')
  const mobilePrimaryPointsLabel = isMarioKart ? 'TP' : primaryPointsLabel
  const winsLabel = isMarioKart ? t('swiss.marioKartWins') : t('swiss.table.wins')
  const winsCount = (row: StandingTableRow) =>
    isMarioKart ? row.marioKartWins : row.wins
  const eventStandings = isMarioKart
    ? (inspection?.beerStandings ?? []).map((beerRow) => ({
        ...standings.find((row) => row.playerId === beerRow.playerId)!,
        eventRank: beerRow.rank,
      }))
    : []
  const eventCellClass = (cell: StandingHistoryCell) =>
    cn(
      'type-caption swiss-round-cell inline-flex h-7 min-w-11 items-center justify-center rounded px-2 tabular-nums',
      cell.event
        ? 'border border-emerald-300 bg-emerald-100 text-emerald-950'
        : cell.outcome === 'open'
          ? 'border border-border bg-background text-muted-foreground'
          : 'border border-red-300 bg-red-100 text-red-950',
    )
  const eventCellLabel = (cell: StandingHistoryCell) =>
    cell.outcome === 'open' && !cell.event ? '-' : cell.label.split(' ')[0] || cell.label
  const eventCellStatusLabel = (cell: StandingHistoryCell) =>
    cell.event ? t('swiss.eventYes') : t('swiss.eventNo')
  const printPrimaryPointsLines = isMarioKart
    ? language === 'de'
      ? ['Turnier', 'punkte']
      : ['Tournament', 'points']
    : [primaryPointsLabel]
  const printAveragePlacementLines =
    language === 'de' ? ['Ø-', 'Platz'] : ['Avg.', 'place']
  const printRoundHistoryLines = isMarioKart
    ? language === 'de'
      ? ['Gespielte', 'Lobbys']
      : ['Played', 'lobbies']
    : [t('swiss.rounds')]
  const printEventHistoryLines =
    language === 'de' ? ['Lobby-', 'Biere'] : ['Lobby', 'beers']

  const printHeaderLabel = (label: string, lines: string[] = [label]) => (
    <>
      <span className="swiss-header-screen-label">{label}</span>
      <span aria-hidden="true" className="swiss-header-print-label">
        {lines.map((line) => (
          <span key={line}>{line}</span>
        ))}
      </span>
    </>
  )

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
              <col className="w-16" />
              <col />
              <col className="w-20" />
              {!isMarioKart && (
                <>
                  <col className="w-20" />
                  <col className="w-20" />
                </>
              )}
            </colgroup>
            <TableHeader>
                <TableHead className="px-1.5 py-2">{t('swiss.rank')}</TableHead>
                <TableHead className="py-2 pl-4 pr-1.5">{t('common.name')}</TableHead>
                <TableHead className="px-1 py-2 text-center" title={primaryPointsLabel}>
                  {mobilePrimaryPointsLabel}
                </TableHead>
                {!isMarioKart && (
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
                      <TableCell className="px-0.5 py-1.5 text-center tabular-nums">
                        <RankPlacement
                          className="justify-center"
                          isMarioKart={isMarioKart}
                          rank={row.rank}
                        />
                      </TableCell>
                      <TableCell className="type-label min-w-0 py-2 pl-4 pr-1.5">
                        <span className="block min-w-0 truncate">{row.playerName}</span>
                      </TableCell>
                      <TableCell className="px-1 py-2 text-center tabular-nums">
                        <span className="type-action inline-flex min-w-9 items-center justify-center rounded-md border border-primary/25 bg-primary/10 px-1.5 py-0.5 text-primary">
                          {formatPoints(row.points)}
                        </span>
                      </TableCell>
                      {!isMarioKart && (
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
                        <TableCell className="px-2 pb-2 pt-0" colSpan={isMarioKart ? 3 : 5}>
                          <div className="grid gap-2 py-2">
                            <div className="swiss-round-grid">
                              {visibleRoundHistory(row).map((cell) => (
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
                                  <span>{t('swiss.marioKartPhysicalRaces')}: {row.marioKartPhysicalRaces}</span>
                                  <span>{t('swiss.marioKartScoringRaces')}: {row.marioKartScoringRaces}</span>
                                  <span>{t('swiss.marioKartEvents')}: {row.marioKartEvents}</span>
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
          className={cn(
            'swiss-standings-table swiss-standings-main',
            isMarioKart && 'swiss-standings-mario-kart',
            isMarioKart ? 'table-fixed' : 'min-w-[68rem]',
          )}
          containerClassName="swiss-standings-table-wrap swiss-standings-desktop hidden md:block"
          style={
            isMarioKart
              ? { minWidth: `${marioKartStandingsMinWidthRem}rem` }
              : undefined
          }
        >
            {isMarioKart && (
              <colgroup>
                <col className="swiss-col-rank w-[6rem]" />
                <col className="swiss-col-name w-[10rem]" />
                <col className="swiss-col-metric w-[7rem]" />
                <col className="swiss-col-wins w-[5.5rem]" />
                <col className="swiss-col-average w-[6.5rem]" />
                <col className="swiss-col-history" />
                <col className="swiss-col-races w-[5.5rem]" />
                <col className="swiss-col-status w-[7rem]" />
              </colgroup>
            )}
            <TableHeader>
                <TableHead>{printHeaderLabel(t('swiss.rank'))}</TableHead>
                <TableHead>{printHeaderLabel(t('common.name'))}</TableHead>
                <TableHead>
                  {printHeaderLabel(primaryPointsLabel, printPrimaryPointsLines)}
                </TableHead>
                {isMarioKart ? (
                  <>
                    <TableHead>{printHeaderLabel(winsLabel)}</TableHead>
                    <TableHead>
                      {printHeaderLabel(
                        t('swiss.marioKartAveragePlacement'),
                        printAveragePlacementLines,
                      )}
                    </TableHead>
                  </>
                ) : (
                  <>
                    <TableHead>{t('swiss.table.buchholz')}</TableHead>
                    <TableHead>{t('swiss.table.sb')}</TableHead>
                    <TableHead>{winsLabel}</TableHead>
                  </>
                )}
                <TableHead className="swiss-rounds-heading">
                  {printHeaderLabel(
                    isMarioKart ? t('swiss.playedLobbies') : t('swiss.rounds'),
                    printRoundHistoryLines,
                  )}
                </TableHead>
                <TableHead
                  className={cn(!isMarioKart && 'swiss-export-hidden-column')}
                >
                  {printHeaderLabel(hardshipLabel)}
                </TableHead>
                <TableHead className="swiss-export-hidden-column">{t('common.status')}</TableHead>
            </TableHeader>
            <TableBody>
              {standings.map((row) => (
                <TableRow
                  key={row.playerId}
                  className={podiumClass(row.rank)}
                >
                  <TableCell className="tabular-nums">
                    <RankPlacement isMarioKart={isMarioKart} rank={row.rank} />
                  </TableCell>
                  <TableCell className="type-label min-w-0">
                    <span className="block truncate" title={row.playerName}>
                      {row.playerName}
                    </span>
                  </TableCell>
                  <TableCell className="tabular-nums">
                    <span className="type-action inline-flex min-w-12 items-center justify-center rounded-md border border-primary/25 bg-primary/10 px-2.5 py-1 text-primary">
                      {formatPoints(row.points)}
                    </span>
                  </TableCell>
                  {isMarioKart ? (
                    <>
                      <TableCell className="tabular-nums">{row.marioKartWins}</TableCell>
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
                      {visibleRoundHistory(row).map((cell) => (
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
                  <TableCell
                    className={cn(
                      'tabular-nums',
                      !isMarioKart && 'swiss-export-hidden-column',
                    )}
                  >
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
        {isMarioKart && (
          <div className="mt-6 grid gap-3">
            <h3 className="type-card-title flex items-center gap-2">
              <Trophy className="size-5 text-primary" />
              {t('swiss.marioKartEventRanking')}
            </h3>
            <Table
              className="swiss-standings-beer-mobile table-fixed"
              containerClassName="swiss-standings-mobile md:hidden"
            >
              <colgroup>
                <col className="w-16" />
                <col />
                <col className="w-20" />
              </colgroup>
              <TableHeader>
                <TableHead className="px-1.5 py-2">{t('swiss.rank')}</TableHead>
                <TableHead className="py-2 pl-4 pr-1.5">{t('common.name')}</TableHead>
                <TableHead className="px-1 py-2 text-center">
                  {t('swiss.marioKartEvents')}
                </TableHead>
              </TableHeader>
              <TableBody>
                {eventStandings.map((row) => (
                  <Fragment key={`event-mobile-${row.playerId}`}>
                    <TableRow className={podiumClass(row.eventRank)}>
                      <TableCell className="px-1.5 py-2 tabular-nums">
                        <RankPlacement
                          className="justify-center"
                          isMarioKart
                          rank={row.eventRank}
                        />
                      </TableCell>
                      <TableCell className="type-label min-w-0 py-2 pl-4 pr-1.5">
                        <span className="block min-w-0 truncate">{row.playerName}</span>
                      </TableCell>
                      <TableCell className="px-1 py-2 text-center tabular-nums">
                        <span className="type-action inline-flex min-w-9 items-center justify-center rounded-md border border-primary/25 bg-primary/10 px-1.5 py-0.5 text-primary">
                          {row.marioKartEvents}
                        </span>
                      </TableCell>
                    </TableRow>
                    <TableRow className={podiumClass(row.eventRank)}>
                      <TableCell className="px-2 pb-2 pt-0" colSpan={3}>
                        <div className="swiss-event-history-grid swiss-round-grid py-2">
                          {visibleEventHistory(row).map((cell) => (
                            <span
                              key={`${row.playerId}-event-${cell.roundNumber}`}
                              className={eventCellClass(cell)}
                              title={cell.title}
                              aria-label={`${eventCellLabel(cell)}: ${eventCellStatusLabel(cell)}`}
                            >
                              {eventCellLabel(cell)}
                            </span>
                          ))}
                        </div>
                      </TableCell>
                    </TableRow>
                  </Fragment>
                ))}
              </TableBody>
            </Table>
            <Table
              className="swiss-standings-beer swiss-standings-table table-fixed"
              containerClassName="swiss-standings-table-wrap swiss-standings-desktop hidden md:block"
              style={{ minWidth: `${marioKartEventTableMinWidthRem}rem` }}
            >
              <colgroup>
                <col className="swiss-col-rank w-[6rem]" />
                <col className="swiss-col-name w-[10rem]" />
                <col className="swiss-col-metric w-[7rem]" />
                <col className="swiss-col-history" />
              </colgroup>
              <TableHeader>
                <TableHead>{printHeaderLabel(t('swiss.rank'))}</TableHead>
                <TableHead>{printHeaderLabel(t('common.name'))}</TableHead>
                <TableHead>{printHeaderLabel(t('swiss.marioKartEvents'))}</TableHead>
                <TableHead className="swiss-rounds-heading">
                  {printHeaderLabel(
                    t('swiss.marioKartEventHistory'),
                    printEventHistoryLines,
                  )}
                </TableHead>
              </TableHeader>
              <TableBody>
                {eventStandings.map((row) => (
                  <TableRow key={`event-${row.playerId}`} className={podiumClass(row.eventRank)}>
                    <TableCell className="tabular-nums">
                      <RankPlacement isMarioKart rank={row.eventRank} />
                    </TableCell>
                    <TableCell className="type-label min-w-0">
                      <span className="block truncate" title={row.playerName}>
                        {row.playerName}
                      </span>
                    </TableCell>
                    <TableCell className="tabular-nums">
                      <span className="type-action inline-flex min-w-12 items-center justify-center rounded-md border border-primary/25 bg-primary/10 px-2.5 py-1 text-primary">
                        {row.marioKartEvents}
                      </span>
                    </TableCell>
                    <TableCell className="swiss-round-table-cell">
                      <div className="swiss-round-grid">
                        {visibleEventHistory(row).map((cell) => (
                          <span
                            key={`${row.playerId}-event-${cell.roundNumber}`}
                            className={eventCellClass(cell)}
                            title={cell.title}
                            aria-label={`${eventCellLabel(cell)}: ${eventCellStatusLabel(cell)}`}
                          >
                            {eventCellLabel(cell)}
                          </span>
                        ))}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
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
