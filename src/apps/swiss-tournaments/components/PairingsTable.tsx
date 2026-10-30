import { Brain, Check, Hand, Pencil, X } from 'lucide-react';
import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { playerName } from '@/apps/swiss-tournaments/components/tournamentUiPresentation'
import type { GameResult, MarioKartRacer, Pairing, PairingWarning, Tournament } from '@/apps/swiss-tournaments/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { IftaSelectTrigger } from '@/components/ui/ifta-field';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useI18n, type TranslationKey } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { TournamentDecision, TournamentInspection } from '@/apps/swiss-tournaments/domain/tournamentDomain'


const resultOptions: Array<{ value: GameResult; labelKey?: TranslationKey; label: string }> = [
  { value: '1-0', label: '1 - 0' },
  { value: '0-1', label: '0 - 1' },
  { value: '0.5-0.5', label: '1/2 - 1/2' },
  { value: 'forfeit-1-0', labelKey: 'swiss.result.forfeit', label: '1 - 0' },
  { value: 'forfeit-0-1', labelKey: 'swiss.result.forfeit', label: '0 - 1' },
]

const openResultValue = 'open'

type ResultSelectValue = GameResult | typeof openResultValue

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

const pairingHintBadgeClassName = 'type-action align-middle uppercase'

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
  onCorrect: (pairingId: string, result?: GameResult) => Promise<TournamentDecision | null>
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
      const correction = await onCorrect(pairing.id, result)
      if (correction?.status !== 'changed' && correction?.status !== 'unchanged') return
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
            'inline-flex h-[26px] w-auto min-w-0 max-w-full justify-center gap-2 overflow-hidden rounded-md py-0 pl-2.5 pr-0 align-middle shadow-none',
            'border-border bg-background text-foreground hover:bg-accent focus:ring-ring/40',
            '[&>svg]:hidden',
            !pairing.result && 'bg-muted text-muted-foreground',
          )}
          title={t('swiss.result.correctTitle')}
        >
          <SelectValue className="min-w-0 truncate" placeholder={t('swiss.result.open')} />
          <span aria-hidden="true" className="inline-flex h-full w-7 shrink-0 items-center justify-center border-l border-border text-primary">
            <Pencil className="size-3.5" />
          </span>
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
  onResultCorrection?: (pairingId: string, result?: GameResult) => Promise<TournamentDecision | null>
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
      return <Badge className="type-ui align-middle" variant="secondary">{resultLabel(pairing.result, t)}</Badge>
    }

    if (editable && onResultChange) {
      return (
        <Select
          value={pairing.result ?? openResultValue}
          onValueChange={(value) =>
            handleResultSelect(pairing.id, value as ResultSelectValue)
          }
        >
          <IftaSelectTrigger label={t('swiss.result')}>
            <SelectValue placeholder={t('swiss.result.open')} />
          </IftaSelectTrigger>
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
      <Badge className="type-ui align-middle" variant={pairing.result ? 'outline' : 'secondary'}>
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
        <Badge className="type-ui align-middle" variant={racer.placement ? 'outline' : 'secondary'}>
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
                      className="transition-colors"
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
                    <Badge className="type-ui ml-2 align-middle" variant="secondary">
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
                className={pairing.isManual ? 'bg-primary/5' : undefined}
              >
              <TableCell className="tabular-nums">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span>{pairing.boardNumber}</span>
                  {pairing.kind === 'single' && (
                    <Badge className="type-ui align-middle" variant="secondary">{t('swiss.singleGame')}</Badge>
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
                  <Badge className="type-ui align-middle" variant="secondary">{resultLabel(pairing.result, t)}</Badge>
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
                  <Badge className="type-ui align-middle" variant={pairing.result ? 'outline' : 'secondary'}>
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
