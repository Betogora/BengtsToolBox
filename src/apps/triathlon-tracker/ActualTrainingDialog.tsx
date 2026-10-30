import { Trash2 } from 'lucide-react'
import type { FormEvent } from 'react'
import { useState } from 'react'
import { ConfirmButton } from '@/apps/shared/components/ConfirmButton'
import { Button } from '@/components/ui/button'
import { DatePicker } from '@/components/ui/DatePicker'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { DisclosureIndicator } from '@/components/ui/disclosure'
import { IftaInput, IftaSelectTrigger } from '@/components/ui/ifta-field'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectValue,
} from '@/components/ui/select'
import { TimePicker } from '@/components/ui/TimePicker'
import { useI18n } from '@/lib/i18n'
import { estimateCyclingPowerWatts } from './domain/cyclingPower'
import { estimateRunningPowerWatts } from './domain/incline'
import {
  countWorkPhases,
  intervalToDraft,
  intervalTotals,
  parsePhaseSpeed,
  runIntervalSegments,
  type IntervalDraft,
} from './domain/intervals'
import {
  averagePaceSeconds,
  formatPace,
  formatSpeed,
  formatTrainingDurationInput,
  inclineToInput,
  minutesToTime,
  optionalNumber,
  parsePace,
  parseTrainingDuration,
  timeToMinutes,
  trainingMetricDraft,
  updateTrainingMetrics,
  type TrainingMetricDraft,
  type TrainingMetricField,
  type TrainingMetricInput,
} from './domain/units'
import { validateActualTraining } from './domain/validation'
import type { ActualTrainingInput } from './hooks/useTriathlonTracker'
import { IntervalEditor, RunIntervalTable } from './intervalEditor'
import {
  DisciplineSelect,
  InclineInput,
  RunIntensityControl,
  RunVariantControl,
} from './trainingFormFields'
import type {
  ActualTraining,
  CyclingContext,
  Discipline,
  IntervalSegment,
  RunIntensity,
  RunningContext,
  SwimmingContext,
  TrainingContext,
  TrainingDiscipline,
} from './types'
import {
  defaultTrainingContexts,
  defaultWalkContext,
  trainingContexts,
} from './types'

const rpeLevels = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const

function RpeSelect({
  value,
  onValueChange,
}: {
  value: string
  onValueChange: (value: string) => void
}) {
  const { t } = useI18n()
  return (
    <Select
      value={value === '' ? 'none' : value}
      onValueChange={(next) => onValueChange(next === 'none' ? '' : next)}
    >
      <IftaSelectTrigger label={t('triathlon.form.rpe')}>
        <SelectValue>{value === '' ? '—' : value}</SelectValue>
      </IftaSelectTrigger>
      <SelectContent className="triathlon-tracker">
        <SelectItem value="none">—</SelectItem>
        {rpeLevels.map((level) => (
          <SelectItem key={level} value={String(level)}>
            {level} · {t(`triathlon.form.rpeLevel.${level}`)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

type DefaultTrainingContexts = {
  swim: SwimmingContext
  bike: CyclingContext
  run: RunningContext
}

function defaultContext(
  discipline: Discipline,
  defaultContexts: DefaultTrainingContexts,
  isWalk = false,
): TrainingContext {
  return discipline === 'run' && isWalk
    ? defaultWalkContext
    : defaultContexts[discipline]
}

function averagePaceLabel(
  discipline: Discipline,
  t: ReturnType<typeof useI18n>['t'],
) {
  return discipline === 'swim'
    ? t('triathlon.form.averagePace100Meters')
    : t('triathlon.form.averagePaceKilometer')
}

function formatKilometersInput(meters: number) {
  return String(Number((meters / 1000).toFixed(2)))
}

type ActualTrainingDialogProps = {
  defaultContexts: DefaultTrainingContexts
  /** Enables the running power estimate. */
  weightKg: number | null
  initialDate: string
  open: boolean
  training: ActualTraining | null
  template?: Partial<ActualTrainingInput>
  onDelete?: (id: string) => Promise<unknown> | unknown
  onOpenChange: (open: boolean) => void
  onSave: (value: ActualTrainingInput) => Promise<unknown> | unknown
}

export function ActualTrainingDialog(props: ActualTrainingDialogProps) {
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      {props.open && (
        <ActualTrainingDialogContent
          key={props.training?.id ?? `new-${props.initialDate}`}
          {...props}
        />
      )}
    </Dialog>
  )
}

function ActualTrainingDialogContent({
  defaultContexts,
  weightKg,
  initialDate,
  training,
  template,
  onDelete,
  onOpenChange,
  onSave,
}: Omit<ActualTrainingDialogProps, 'open'>) {
  const { t } = useI18n()
  const initial = training ?? template
  const initialKind = initial?.discipline ?? 'run'
  // Strength has no endurance metrics; their hidden drafts behave like running.
  const initialDiscipline: Discipline =
    initialKind === 'strength' ? 'run' : initialKind
  const [localDate, setLocalDate] = useState(initial?.localDate ?? initialDate)
  const [startTime, setStartTime] = useState(
    minutesToTime(initial?.startMinutes ?? null),
  )
  const [discipline, setDiscipline] = useState<TrainingDiscipline>(initialKind)
  const isStrength = discipline === 'strength'
  const enduranceDiscipline: Discipline = isStrength ? 'run' : discipline
  const [context, setContext] = useState<TrainingContext>(
    initial?.context ??
      // Saved trainings without one keep the context the analysis assumes.
      (training
        ? defaultContext(initialDiscipline, defaultTrainingContexts, training.isWalk)
        : // A planned incline only exists on the treadmill.
          initial?.inclinePercent
          ? 'treadmill'
          : defaultContext(initialDiscipline, defaultContexts, initial?.isWalk)),
  )
  const [incline, setIncline] = useState(inclineToInput(initial?.inclinePercent))
  // A manually chosen context survives switching between running and walking.
  const [contextChosen, setContextChosen] = useState(Boolean(initial?.context))
  const [metrics, setMetrics] = useState<TrainingMetricDraft>(() =>
    trainingMetricDraft(
      initial?.durationSeconds ?? null,
      initial?.distanceMeters ?? null,
      initialDiscipline,
    ),
  )
  const {
    duration: durationMinutes,
    distance: distanceKilometers,
    pace: averagePace,
    speed: averageSpeed,
  } = metrics
  const [isBenchmark, setIsBenchmark] = useState(initial?.isBenchmark ?? false)
  const [isWalk, setIsWalk] = useState(initial?.isWalk ?? false)
  const [intensity, setIntensity] = useState<RunIntensity>(
    initial?.intensity ?? 'easy',
  )
  const [averageHeartRateBpm, setAverageHeartRateBpm] = useState(
    initial?.averageHeartRateBpm == null
      ? ''
      : `${initial.averageHeartRateBpm}`,
  )
  const [averagePowerWatts, setAveragePowerWatts] = useState(
    initial?.averagePowerWatts == null ? '' : `${initial.averagePowerWatts}`,
  )
  const [rpe, setRpe] = useState(initial?.rpe == null ? '' : `${initial.rpe}`)
  const [intervals, setIntervals] = useState<IntervalDraft[]>(
    (initial?.intervals ?? []).map(intervalToDraft),
  )
  const [showDetails, setShowDetails] = useState(
    Boolean(initial?.intervals?.length),
  )
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [durationWarningConfirmed, setDurationWarningConfirmed] =
    useState(false)

  const handleDisciplineChange = (nextKind: TrainingDiscipline) => {
    const nextDiscipline: Discipline = nextKind === 'strength' ? 'run' : nextKind
    setDiscipline(nextKind)
    setIsWalk(false)
    setContext(defaultContext(nextDiscipline, defaultContexts))
    setContextChosen(false)
    setMetrics((current) => {
      const pace = averagePaceSeconds(
        parseTrainingDuration(current.duration) ?? 0,
        Number(current.distance.replace(',', '.')) * 1000,
        nextDiscipline,
      )
      return {
        ...current,
        inputs: ['duration', 'distance'],
        paceSource: undefined,
        pace: formatPace(pace),
        speed: nextDiscipline === 'swim' ? '' : formatSpeed(pace),
      }
    })
  }
  const handleIsWalkChange = (nextIsWalk: boolean) => {
    setIsWalk(nextIsWalk)
    if (!contextChosen) {
      setContext(defaultContext(enduranceDiscipline, defaultContexts, nextIsWalk))
    }
  }
  const updateMetric = (field: TrainingMetricInput, value: string) => {
    setMetrics((current) =>
      updateTrainingMetrics(current, field, value, enduranceDiscipline),
    )
  }
  // The field outside the last two inputs is derived from the other two.
  // Speed in km/h only exists alongside a pace per kilometre.
  const hasSpeed = discipline !== 'swim'
  const metricSpan = hasSpeed ? 'sm:col-span-3' : 'sm:col-span-4'
  // Records and estimates skip interval sessions, so they are never tests.
  const hasIntervals = intervals.length > 0
  // Interval runs are always flat; only continuous treadmill sessions incline.
  const showIncline =
    discipline === 'run' && context === 'treadmill' && !hasIntervals
  const detailSpan = showIncline ? 'sm:col-span-3' : 'sm:col-span-4'
  // Running phases are the source of the totals. Only the distance stays
  // editable while a phase has no speed yet.
  const runPhases =
    discipline === 'run' && intervals.length > 0
      ? runIntervalSegments(intervals)
      : null
  const phaseTotals = runPhases ? intervalTotals(runPhases) : null
  const phaseDistance = phaseTotals?.distanceMeters ?? null
  const shownDuration = phaseTotals
    ? formatTrainingDurationInput(phaseTotals.durationSeconds)
    : durationMinutes
  const shownDistance =
    phaseDistance === null ? distanceKilometers : formatKilometersInput(phaseDistance)
  const phasePace = phaseTotals
    ? averagePaceSeconds(
        phaseTotals.durationSeconds ?? 0,
        (optionalNumber(shownDistance) ?? 0) * 1000,
        'run',
      )
    : null
  const shownPace = phaseTotals ? formatPace(phasePace) : averagePace
  const shownSpeed = phaseTotals ? formatSpeed(phasePace) : averageSpeed
  // Without a measured value the field shows the running or cycling estimate,
  // which is derived on display and never stored.
  const powerDraft = {
    discipline,
    isWalk: discipline === 'run' && isWalk,
    inclinePercent: showIncline ? optionalNumber(incline) : null,
    durationSeconds: parseTrainingDuration(shownDuration),
    distanceMeters: (optionalNumber(shownDistance) ?? 0) * 1000 || null,
  }
  const estimatedPower =
    estimateRunningPowerWatts(powerDraft, weightKg) ??
    estimateCyclingPowerWatts(powerDraft, weightKg)
  const powerIsEstimated =
    averagePowerWatts.trim() === '' && estimatedPower !== null
  const isComputed = (field: TrainingMetricField) =>
    phaseTotals
      ? field !== 'distance' || phaseDistance !== null
      : !metrics.inputs.includes(field)
  const computedClass = (field: TrainingMetricField) =>
    isComputed(field)
      ? 'bg-muted text-muted-foreground shadow-none'
      : undefined
  const isReadOnly = (field: TrainingMetricField) =>
    phaseTotals !== null && isComputed(field)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    const parsedDuration = parseTrainingDuration(shownDuration)
    // Strength keeps only the duration; hidden endurance drafts are ignored.
    const parsedDistance = isStrength ? null : optionalNumber(shownDistance)
    const parsedAveragePace =
      !isStrength && shownPace ? parsePace(shownPace) : null
    const parsedHr = isStrength ? null : optionalNumber(averageHeartRateBpm)
    const parsedPower = isStrength ? null : optionalNumber(averagePowerWatts)
    const parsedRpe = isStrength ? null : optionalNumber(rpe)

    if (
      !localDate ||
      (shownDuration.trim() !== '' && parsedDuration === null) ||
      ((parsedDuration === null || parsedDuration <= 0) &&
        (parsedDistance === null || parsedDistance <= 0)) ||
      (parsedDuration !== null && parsedDuration < 0) ||
      (parsedDistance !== null && parsedDistance < 0) ||
      (!isStrength && shownPace !== '' && parsedAveragePace === null) ||
      (parsedAveragePace !== null &&
        (parsedDistance === null || parsedDistance <= 0)) ||
      (parsedHr !== null && (parsedHr < 30 || parsedHr > 250)) ||
      (parsedPower !== null && parsedPower < 0) ||
      (parsedRpe !== null && (parsedRpe < 1 || parsedRpe > 10)) ||
      (!isStrength && intervals.some(
        (interval) =>
          (interval.durationMinutes.trim() !== '' &&
            parseTrainingDuration(interval.durationMinutes) === null) ||
          (runPhases !== null &&
            interval.speed.trim() !== '' &&
            parsePhaseSpeed(interval.speed) === null),
      ))
    ) {
      setError(t('triathlon.form.actualInvalid'))
      return
    }

    const parsedIntervals: IntervalSegment[] = isStrength
      ? []
      : (runPhases ??
        intervals.map((interval, index) => ({
          id: interval.id,
          position: index + 1,
          kind: interval.kind,
          durationSeconds: parseTrainingDuration(interval.durationMinutes),
          distanceMeters: optionalNumber(interval.distanceMeters),
          averageHeartRateBpm: optionalNumber(interval.averageHeartRateBpm),
          averagePowerWatts: optionalNumber(interval.averagePowerWatts),
          endHeartRateBpm: optionalNumber(interval.endHeartRateBpm),
        })))
    const parsedIncline = showIncline ? optionalNumber(incline) : null
    if (showIncline && incline.trim() !== '' && parsedIncline === null) {
      setError(t('triathlon.form.invalidValues'))
      return
    }
    const nextTraining: ActualTrainingInput = {
      isBenchmark: !isStrength && !hasIntervals && isBenchmark,
      isWalk: discipline === 'run' && isWalk,
      inclinePercent: parsedIncline,
      intensity: discipline === 'run' && !isWalk ? intensity : null,
      localDate,
      startMinutes: timeToMinutes(startTime),
      discipline,
      context: isStrength ? null : context,
      durationSeconds: parsedDuration,
      distanceMeters:
        parsedDistance === null ? null : Math.round(parsedDistance * 1000),
      averageHeartRateBpm: parsedHr,
      averagePowerWatts: parsedPower,
      rpe: parsedRpe,
      intervals: parsedIntervals,
    }
    const validationIssues = validateActualTraining({
      ...nextTraining,
      id: training?.id ?? 'draft',
      position: training?.position ?? 0,
    })
    if (validationIssues.some((issue) => issue.severity === 'error')) {
      setError(t('triathlon.form.invalidValues'))
      return
    }
    const hasDurationWarning = validationIssues.some(
      (issue) => issue.code === 'interval-sum-mismatch',
    )

    if (hasDurationWarning && !durationWarningConfirmed) {
      setDurationWarningConfirmed(true)
      return
    }

    setIsSaving(true)
    setError(null)
    try {
      await onSave(nextTraining)
      onOpenChange(false)
    } catch {
      setError(t('triathlon.form.saveFailed'))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <DialogContent
      aria-describedby={undefined}
      className="triathlon-tracker max-h-[calc(100dvh-2rem)] overflow-y-auto p-4 sm:max-w-2xl sm:p-5"
    >
      <form
        className="grid gap-4"
        onSubmit={(event) => void handleSubmit(event)}
      >
        <DialogHeader>
          <DialogTitle>
            {training ? t('triathlon.actual.edit') : t('triathlon.actual.add')}
          </DialogTitle>
        </DialogHeader>
        <fieldset className="grid grid-cols-2 gap-2">
          <legend className="sr-only">{t('triathlon.form.session')}</legend>
          <DatePicker
            required
            label={t('triathlon.form.date')}
            value={localDate}
            onValueChange={setLocalDate}
          />
          <TimePicker
            label={t('triathlon.form.timeOptional')}
            value={startTime}
            onValueChange={setStartTime}
          />
          <DisciplineSelect
            value={discipline}
            onValueChange={handleDisciplineChange}
          />
          {isStrength ? (
            <IftaInput
              label={t('triathlon.journal.duration')}
              aria-label={t('triathlon.form.durationClock')}
              title={t('triathlon.form.durationClock')}
              placeholder="45:00"
              value={durationMinutes}
              onChange={(event) =>
                updateMetric('duration', event.currentTarget.value)
              }
            />
          ) : (
            <Select
              key={discipline}
              value={context}
              onValueChange={(value) => {
                setContext(value as TrainingContext)
                setContextChosen(true)
              }}
            >
              <IftaSelectTrigger label={t('triathlon.form.context')}>
                <SelectValue />
              </IftaSelectTrigger>
              <SelectContent className="triathlon-tracker">
                {trainingContexts[enduranceDiscipline].map((option) => (
                  <SelectItem key={option} value={option}>
                    {t(`triathlon.context.${option}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {discipline === 'run' && (
            <RunVariantControl
              isWalk={isWalk}
              onIsWalkChange={handleIsWalkChange}
            />
          )}
          {discipline === 'run' && !isWalk && (
            <RunIntensityControl
              intensity={intensity}
              onIntensityChange={setIntensity}
            />
          )}
        </fieldset>
        {!isStrength && (
          <>
            <fieldset className="grid grid-cols-2 gap-2 sm:grid-cols-12">
              <legend className="sr-only">{t('triathlon.form.metrics')}</legend>
              <div className={metricSpan}>
                <IftaInput
                  className={computedClass('duration')}
                  data-computed={isComputed('duration') || undefined}
                  label={t('triathlon.journal.duration')}
                  aria-label={t('triathlon.form.durationClock')}
                  title={t('triathlon.form.durationClock')}
                  placeholder="20:35"
                  readOnly={isReadOnly('duration')}
                  value={shownDuration}
                  onChange={(event) =>
                    updateMetric('duration', event.currentTarget.value)
                  }
                />
              </div>
              <div className={metricSpan}>
                <IftaInput
                  className={computedClass('distance')}
                  data-computed={isComputed('distance') || undefined}
                  label={t('triathlon.form.distanceKilometers')}
                  min="0"
                  step="0.01"
                  type="number"
                  readOnly={isReadOnly('distance')}
                  value={shownDistance}
                  onChange={(event) =>
                    updateMetric('distance', event.currentTarget.value)
                  }
                />
              </div>
              <div className={hasSpeed ? metricSpan : 'col-span-2 sm:col-span-4'}>
                <IftaInput
                  className={computedClass('pace')}
                  data-computed={isComputed('pace') || undefined}
                  inputMode="text"
                  label={averagePaceLabel(enduranceDiscipline, t)}
                  placeholder="5:30"
                  readOnly={isReadOnly('pace')}
                  value={shownPace}
                  onChange={(event) =>
                    updateMetric('pace', event.currentTarget.value)
                  }
                />
              </div>
              {hasSpeed && (
                <div className={metricSpan}>
                  <IftaInput
                    className={computedClass('pace')}
                    data-computed={isComputed('pace') || undefined}
                    inputMode="decimal"
                    label={t('triathlon.form.averageSpeed')}
                    min="0"
                    step="0.01"
                    type="number"
                    readOnly={isReadOnly('pace')}
                    value={shownSpeed}
                    onChange={(event) =>
                      updateMetric('speed', event.currentTarget.value)
                    }
                  />
                </div>
              )}
              <p className="type-caption col-span-2 text-muted-foreground sm:col-span-12">
                {phaseTotals
                  ? t('triathlon.form.metricsFromIntervals')
                  : t('triathlon.form.metricsDerived')}
              </p>
              <div className={detailSpan}>
                <IftaInput
                  label={t('triathlon.form.averageHeartRate')}
                  min="30"
                  max="250"
                  type="number"
                  value={averageHeartRateBpm}
                  onChange={(event) =>
                    setAverageHeartRateBpm(event.currentTarget.value)
                  }
                />
              </div>
              <div className={detailSpan}>
                <RpeSelect value={rpe} onValueChange={setRpe} />
              </div>
              {showIncline && (
                <div className={detailSpan}>
                  <InclineInput value={incline} onChange={setIncline} />
                </div>
              )}
              <div className={showIncline ? detailSpan : `col-span-2 ${detailSpan}`}>
                <IftaInput
                  className={
                    powerIsEstimated
                      ? 'bg-muted text-muted-foreground shadow-none'
                      : undefined
                  }
                  data-computed={powerIsEstimated || undefined}
                  label={t('triathlon.form.averagePower')}
                  min="0"
                  max="3000"
                  type="number"
                  value={
                    powerIsEstimated
                      ? String(Math.round(estimatedPower))
                      : averagePowerWatts
                  }
                  onChange={(event) =>
                    setAveragePowerWatts(event.currentTarget.value)
                  }
                />
              </div>
              {!hasIntervals && (
                <label className="type-ui col-span-2 flex items-center gap-3 rounded-md bg-muted p-3 sm:col-span-12">
                  <input
                    type="checkbox"
                    className="size-4 accent-primary"
                    checked={isBenchmark}
                    onChange={(event) => setIsBenchmark(event.target.checked)}
                  />
                  {t('triathlon.form.benchmark')}
                </label>
              )}
            </fieldset>

            <section>
              <Button
                aria-controls="actual-training-details"
                aria-expanded={showDetails}
                className="h-11 w-full justify-between rounded-md bg-muted px-3 hover:bg-muted/70 hover:text-foreground"
                type="button"
                variant="ghost"
                onClick={() => setShowDetails((current) => !current)}
              >
                <span className="flex items-center gap-2">
                  {t('triathlon.intervals.title')}
                  {intervals.length > 0 && (
                    <span className="type-caption text-muted-foreground tabular-nums">
                      {discipline === 'run'
                        ? countWorkPhases(intervals)
                        : intervals.length}
                    </span>
                  )}
                </span>
                <DisclosureIndicator isOpen={showDetails} />
              </Button>
              {showDetails && (
                <div className="grid gap-4 pt-2" id="actual-training-details">
                  {discipline === 'run' ? (
                    <RunIntervalTable
                      phases={intervals}
                      totals={phaseTotals}
                      intensity={isWalk ? 'easy' : intensity}
                      onChange={setIntervals}
                    />
                  ) : (
                    <IntervalEditor intervals={intervals} onChange={setIntervals} />
                  )}
                </div>
              )}
            </section>
          </>
        )}

        {durationWarningConfirmed && (
          <p
            className="type-ui rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-amber-800 dark:text-amber-200"
            role="status"
          >
            {t('triathlon.intervals.durationWarning')}
          </p>
        )}
        {error && (
          <p className="type-ui text-destructive" role="alert">
            {error}
          </p>
        )}
        <DialogFooter className="sticky -bottom-4 z-10 -mx-4 -mb-4 bg-card px-4 pt-1 pb-4 sm:-bottom-5 sm:-mx-5 sm:-mb-5 sm:justify-between sm:px-5 sm:pb-5">
          <div>
            {training && onDelete && (
              <ConfirmButton
                description={t('triathlon.actual.deleteDescription')}
                title={t('triathlon.actual.deleteTitle')}
                trigger={
                  <Button type="button" variant="destructive">
                    <Trash2 aria-hidden="true" />
                    {t('common.delete')}
                  </Button>
                }
                onConfirm={async () => {
                  try {
                    await onDelete(training.id)
                    onOpenChange(false)
                  } catch {
                    setError(t('triathlon.form.saveFailed'))
                  }
                }}
              />
            )}
          </div>
          <div className="flex gap-2 [&>*]:flex-1 sm:[&>*]:flex-none">
            <DialogClose asChild>
              <Button type="button" variant="outline">
                {t('common.cancel')}
              </Button>
            </DialogClose>
            <Button disabled={isSaving} type="submit">
              {isSaving
                ? t('common.saving')
                : durationWarningConfirmed
                  ? t('common.confirm')
                  : t('common.save')}
            </Button>
          </div>
        </DialogFooter>
      </form>
    </DialogContent>
  )
}
