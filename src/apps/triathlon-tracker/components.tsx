import { ChevronDown, Clock3, Copy, Plus, Trash2 } from 'lucide-react'
import type { FormEvent, ReactNode } from 'react'
import { useMemo, useState } from 'react'

import type {
  ActualTraining,
  CyclingContext,
  Discipline,
  IntervalSegment,
  PlannedTraining,
  RunningContext,
  SwimmingContext,
  TrainingContext,
} from '@/apps/triathlon-tracker/types'
import {
  addDaysToLocalDate,
  averagePaceSeconds,
  formatPace,
  getWeekStartLocalDate,
  isValidLocalDate,
  parsePace,
  validateActualTraining,
} from '@/apps/triathlon-tracker/domain'
import type {
  ActualTrainingInput,
  PlannedTrainingInput,
  PlannedWeekCopyPreview,
} from '@/apps/triathlon-tracker/hooks/useTriathlonTracker'
import {
  disciplineColors,
  disciplineIcons,
  formatTrainingDuration as formatDuration,
} from '@/apps/triathlon-tracker/presentation'
import { ConfirmButton } from '@/apps/shared/components/ConfirmButton'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { IftaInput, IftaSelectTrigger } from '@/components/ui/ifta-field'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectValue,
} from '@/components/ui/select'
import { useI18n } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import {
  updateTrainingMetrics,
  type TrainingMetricDraft,
  type TrainingMetricField,
} from './domain/units'

export type {
  ActualTrainingInput,
  PlannedTrainingInput,
  PlannedWeekCopyPreview,
} from '@/apps/triathlon-tracker/hooks/useTriathlonTracker'

function isoDateAtNoon(localDate: string) {
  return new Date(`${localDate}T12:00:00`)
}

function secondsToMinutes(seconds: number | null) {
  return seconds === null ? '' : `${seconds / 60}`
}

function metersToKilometers(meters: number | null) {
  return meters === null ? '' : `${meters / 1000}`
}

function minutesToTime(minutes: number | null) {
  if (minutes === null) return ''
  return (
    `${Math.floor(minutes / 60)}`.padStart(2, '0') +
    ':' +
    `${minutes % 60}`.padStart(2, '0')
  )
}

function timeToMinutes(value: string) {
  if (!value) return null
  const [hours, minutes] = value.split(':').map(Number)
  return hours * 60 + minutes
}

function optionalNumber(value: string) {
  if (value.trim() === '') return null
  const parsed = Number(value.replace(',', '.'))
  return Number.isFinite(parsed) ? parsed : null
}

function formatDistance(meters: number | null, locale: string) {
  if (meters === null) return null
  return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(meters / 1000)} km`
}

function getDisciplineLabel(
  discipline: Discipline,
  t: ReturnType<typeof useI18n>['t'],
) {
  return t(`triathlon.discipline.${discipline}`)
}

function getContextLabel(
  context: TrainingContext | null,
  t: ReturnType<typeof useI18n>['t'],
) {
  return context === null
    ? t('triathlon.context.none')
    : t(`triathlon.context.${context}`)
}

function contextsForDiscipline(discipline: Discipline): TrainingContext[] {
  if (discipline === 'swim') return ['pool-25', 'pool-50', 'open-water']
  if (discipline === 'bike') return ['indoor', 'outdoor']
  return ['road', 'track', 'treadmill']
}

type DefaultTrainingContexts = {
  swim: SwimmingContext
  bike: CyclingContext
  run: RunningContext
}

function defaultContext(
  discipline: Discipline,
  defaultContexts: DefaultTrainingContexts,
): TrainingContext {
  return defaultContexts[discipline]
}

function averagePaceLabel(
  discipline: Discipline,
  t: ReturnType<typeof useI18n>['t'],
) {
  return discipline === 'swim'
    ? t('triathlon.form.averagePace100Meters')
    : t('triathlon.form.averagePaceKilometer')
}

function DisciplineSelect({
  value,
  onValueChange,
}: {
  value: Discipline
  onValueChange: (value: Discipline) => void
}) {
  const { t } = useI18n()
  return (
    <Select
      value={value}
      onValueChange={(next) => onValueChange(next as Discipline)}
    >
      <IftaSelectTrigger label={t('triathlon.form.discipline')}>
        <SelectValue />
      </IftaSelectTrigger>
      <SelectContent>
        {(['swim', 'bike', 'run'] as const).map((discipline) => (
          <SelectItem key={discipline} value={discipline}>
            {getDisciplineLabel(discipline, t)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

type PlannedTrainingDialogProps = {
  initialDate: string
  open: boolean
  training: PlannedTraining | null
  template?: PlannedTrainingInput
  onDelete?: (id: string) => Promise<unknown> | unknown
  onOpenChange: (open: boolean) => void
  onSave: (value: PlannedTrainingInput) => Promise<unknown> | unknown
}

export function PlannedTrainingDialog(props: PlannedTrainingDialogProps) {
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      {props.open && (
        <PlannedTrainingDialogContent
          key={props.training?.id ?? `new-${props.initialDate}`}
          {...props}
        />
      )}
    </Dialog>
  )
}

function PlannedTrainingDialogContent({
  initialDate,
  training,
  template,
  onDelete,
  onOpenChange,
  onSave,
}: Omit<PlannedTrainingDialogProps, 'open'>) {
  const { t } = useI18n()
  const [localDate, setLocalDate] = useState(
    (training ?? template)?.localDate ?? initialDate,
  )
  const [startTime, setStartTime] = useState(
    minutesToTime((training ?? template)?.startMinutes ?? null),
  )
  const [discipline, setDiscipline] = useState<Discipline>(
    (training ?? template)?.discipline ?? 'run',
  )
  const [durationMinutes, setDurationMinutes] = useState(
    secondsToMinutes((training ?? template)?.durationSeconds ?? null),
  )
  const [distanceKilometers, setDistanceKilometers] = useState(
    metersToKilometers((training ?? template)?.distanceMeters ?? null),
  )
  const [label, setLabel] = useState((training ?? template)?.label ?? '')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    const parsedDuration = optionalNumber(durationMinutes)
    const parsedDistance = optionalNumber(distanceKilometers)

    if (
      !isValidLocalDate(localDate) ||
      (parsedDuration !== null && parsedDuration < 0) ||
      (parsedDistance !== null && parsedDistance < 0)
    ) {
      setError(t('triathlon.form.invalidValues'))
      return
    }

    setIsSaving(true)
    setError(null)
    try {
      await onSave({
        localDate,
        startMinutes: timeToMinutes(startTime),
        discipline,
        durationSeconds:
          parsedDuration === null ? null : Math.round(parsedDuration * 60),
        distanceMeters:
          parsedDistance === null ? null : Math.round(parsedDistance * 1000),
        label: label.trim().slice(0, 40),
      })
      onOpenChange(false)
    } catch {
      setError(t('triathlon.form.saveFailed'))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-xl">
      <form
        className="grid gap-4"
        onSubmit={(event) => void handleSubmit(event)}
      >
        <DialogHeader>
          <DialogTitle>
            {training ? t('triathlon.plan.edit') : t('triathlon.plan.add')}
          </DialogTitle>
          <DialogDescription>
            {t('triathlon.plan.description')}
          </DialogDescription>
        </DialogHeader>
        <fieldset className="grid gap-3 rounded-lg border bg-muted/20 p-4 sm:grid-cols-2">
          <legend className="type-action px-2">
            {t('triathlon.form.schedule')}
          </legend>
          <IftaInput
            required
            label={t('triathlon.form.date')}
            type="date"
            value={localDate}
            onChange={(event) => setLocalDate(event.currentTarget.value)}
          />
          <IftaInput
            label={t('triathlon.form.timeOptional')}
            type="time"
            value={startTime}
            onChange={(event) => setStartTime(event.currentTarget.value)}
          />
        </fieldset>
        <fieldset className="grid gap-3 rounded-lg border p-4 sm:grid-cols-2">
          <legend className="type-action px-2">
            {t('triathlon.form.targets')}
          </legend>
          <DisciplineSelect value={discipline} onValueChange={setDiscipline} />
          <IftaInput
            inputMode="decimal"
            label={t('triathlon.form.durationMinutes')}
            min="0"
            step="1"
            type="number"
            value={durationMinutes}
            onChange={(event) => setDurationMinutes(event.currentTarget.value)}
          />
          <IftaInput
            inputMode="decimal"
            label={t('triathlon.form.distanceKilometers')}
            min="0"
            step="0.01"
            type="number"
            value={distanceKilometers}
            onChange={(event) =>
              setDistanceKilometers(event.currentTarget.value)
            }
          />
          <IftaInput
            className="sm:col-span-1"
            label={t('triathlon.form.shortLabel')}
            maxLength={40}
            value={label}
            onChange={(event) => setLabel(event.currentTarget.value)}
          />
        </fieldset>
        {error && (
          <p className="type-ui text-destructive" role="alert">
            {error}
          </p>
        )}
        <DialogFooter className="sm:justify-between">
          <div>
            {training && onDelete && (
              <ConfirmButton
                description={t('triathlon.plan.deleteDescription')}
                title={t('triathlon.plan.deleteTitle')}
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
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <DialogClose asChild>
              <Button type="button" variant="outline">
                {t('common.cancel')}
              </Button>
            </DialogClose>
            <Button disabled={isSaving} type="submit">
              {isSaving ? t('common.saving') : t('common.save')}
            </Button>
          </div>
        </DialogFooter>
      </form>
    </DialogContent>
  )
}

type IntervalDraft = {
  id: string
  kind: IntervalSegment['kind']
  durationMinutes: string
  distanceMeters: string
  averageHeartRateBpm: string
  averagePowerWatts: string
}

function intervalToDraft(interval: IntervalSegment): IntervalDraft {
  return {
    id: interval.id,
    kind: interval.kind,
    durationMinutes: secondsToMinutes(interval.durationSeconds),
    distanceMeters:
      interval.distanceMeters === null ? '' : `${interval.distanceMeters}`,
    averageHeartRateBpm:
      interval.averageHeartRateBpm === null
        ? ''
        : `${interval.averageHeartRateBpm}`,
    averagePowerWatts:
      interval.averagePowerWatts === null
        ? ''
        : `${interval.averagePowerWatts}`,
  }
}

function createIntervalDraft(): IntervalDraft {
  return {
    id: `interval-${crypto.randomUUID()}`,
    kind: 'work',
    durationMinutes: '',
    distanceMeters: '',
    averageHeartRateBpm: '',
    averagePowerWatts: '',
  }
}

function IntervalEditor({
  intervals,
  onChange,
}: {
  intervals: IntervalDraft[]
  onChange: (intervals: IntervalDraft[]) => void
}) {
  const { t } = useI18n()

  const update = (id: string, partial: Partial<IntervalDraft>) =>
    onChange(
      intervals.map((interval) =>
        interval.id === id ? { ...interval, ...partial } : interval,
      ),
    )

  return (
    <section className="grid gap-3 rounded-md border bg-secondary/35 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="type-action">{t('triathlon.intervals.title')}</h3>
          <p className="type-caption text-muted-foreground">
            {t('triathlon.intervals.description')}
          </p>
        </div>
        <Button
          disabled={intervals.length >= 100}
          size="sm"
          type="button"
          variant="outline"
          onClick={() => onChange([...intervals, createIntervalDraft()])}
        >
          <Plus aria-hidden="true" />
          {t('triathlon.intervals.add')}
        </Button>
      </div>
      {intervals.length === 0 ? (
        <p className="type-ui rounded-md border border-dashed bg-background p-4 text-center text-muted-foreground">
          {t('triathlon.intervals.empty')}
        </p>
      ) : (
        <div className="grid gap-3">
          {intervals.map((interval, index) => (
            <div
              className="grid gap-2 rounded-md border bg-background p-3"
              key={interval.id}
            >
              <div className="flex items-center justify-between gap-2">
                <Badge variant="outline">
                  {t('triathlon.intervals.number', { number: index + 1 })}
                </Badge>
                <Button
                  aria-label={t('triathlon.intervals.remove', {
                    number: index + 1,
                  })}
                  size="icon"
                  type="button"
                  variant="ghost"
                  onClick={() =>
                    onChange(
                      intervals.filter((entry) => entry.id !== interval.id),
                    )
                  }
                >
                  <Trash2 aria-hidden="true" />
                </Button>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
                <Select
                  value={interval.kind}
                  onValueChange={(value) =>
                    update(interval.id, {
                      kind: value as IntervalSegment['kind'],
                    })
                  }
                >
                  <IftaSelectTrigger label={t('triathlon.intervals.kind')}>
                    <SelectValue />
                  </IftaSelectTrigger>
                  <SelectContent>
                    <SelectItem value="work">
                      {t('triathlon.intervals.work')}
                    </SelectItem>
                    <SelectItem value="rest">
                      {t('triathlon.intervals.rest')}
                    </SelectItem>
                  </SelectContent>
                </Select>
                <IftaInput
                  label={t('triathlon.form.durationMinutes')}
                  min="0"
                  step="0.1"
                  type="number"
                  value={interval.durationMinutes}
                  onChange={(event) =>
                    update(interval.id, {
                      durationMinutes: event.currentTarget.value,
                    })
                  }
                />
                <IftaInput
                  label={t('triathlon.form.distanceMeters')}
                  min="0"
                  step="1"
                  type="number"
                  value={interval.distanceMeters}
                  onChange={(event) =>
                    update(interval.id, {
                      distanceMeters: event.currentTarget.value,
                    })
                  }
                />
                <IftaInput
                  label={t('triathlon.form.averageHeartRate')}
                  min="30"
                  max="250"
                  type="number"
                  value={interval.averageHeartRateBpm}
                  onChange={(event) =>
                    update(interval.id, {
                      averageHeartRateBpm: event.currentTarget.value,
                    })
                  }
                />
                <IftaInput
                  label={t('triathlon.form.averagePower')}
                  min="0"
                  type="number"
                  value={interval.averagePowerWatts}
                  onChange={(event) =>
                    update(interval.id, {
                      averagePowerWatts: event.currentTarget.value,
                    })
                  }
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

type ActualTrainingDialogProps = {
  defaultContexts: DefaultTrainingContexts
  initialDate: string
  open: boolean
  training: ActualTraining | null
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
  initialDate,
  training,
  onDelete,
  onOpenChange,
  onSave,
}: Omit<ActualTrainingDialogProps, 'open'>) {
  const { t } = useI18n()
  const initialDiscipline = training?.discipline ?? 'run'
  const [localDate, setLocalDate] = useState(training?.localDate ?? initialDate)
  const [startTime, setStartTime] = useState(
    minutesToTime(training?.startMinutes ?? null),
  )
  const [discipline, setDiscipline] = useState<Discipline>(initialDiscipline)
  const [context, setContext] = useState<TrainingContext | null>(
    training?.context ?? defaultContext(initialDiscipline, defaultContexts),
  )
  const [metrics, setMetrics] = useState<TrainingMetricDraft>(() => ({
    duration: secondsToMinutes(training?.durationSeconds ?? null),
    distance: metersToKilometers(training?.distanceMeters ?? null),
    pace: formatPace(
      training?.durationSeconds && training.distanceMeters
        ? averagePaceSeconds(
            training.durationSeconds,
            training.distanceMeters,
            initialDiscipline,
          )
        : null,
    ),
    inputs: ['duration', 'distance'],
  }))
  const {
    duration: durationMinutes,
    distance: distanceKilometers,
    pace: averagePace,
  } = metrics
  const [isBenchmark, setIsBenchmark] = useState(training?.isBenchmark ?? false)
  const [averageHeartRateBpm, setAverageHeartRateBpm] = useState(
    training?.averageHeartRateBpm === null || !training
      ? ''
      : `${training.averageHeartRateBpm}`,
  )
  const [averagePowerWatts, setAveragePowerWatts] = useState(
    training?.averagePowerWatts === null || !training
      ? ''
      : `${training.averagePowerWatts}`,
  )
  const [rpe, setRpe] = useState(
    training?.rpe === null || !training ? '' : `${training.rpe}`,
  )
  const [intervals, setIntervals] = useState<IntervalDraft[]>(
    (training?.intervals ?? []).map(intervalToDraft),
  )
  const [showDetails, setShowDetails] = useState(
    Boolean(
      training &&
        (training.averagePowerWatts !== null ||
          training.rpe !== null ||
          training.intervals.length > 0),
    ),
  )
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [durationWarningConfirmed, setDurationWarningConfirmed] =
    useState(false)

  const handleDisciplineChange = (nextDiscipline: Discipline) => {
    setDiscipline(nextDiscipline)
    setContext(defaultContext(nextDiscipline, defaultContexts))
    setMetrics((current) => ({
      ...current,
      inputs: ['duration', 'distance'],
      pace: formatPace(
        averagePaceSeconds(
          Number(current.duration) * 60,
          Number(current.distance) * 1000,
          nextDiscipline,
        ),
      ),
    }))
  }
  const updateMetric = (field: TrainingMetricField, value: string) => {
    setMetrics((current) =>
      updateTrainingMetrics(current, field, value, discipline),
    )
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    const parsedDuration = optionalNumber(durationMinutes)
    const parsedDistance = optionalNumber(distanceKilometers)
    const parsedAveragePace = averagePace ? parsePace(averagePace) : null
    const parsedHr = optionalNumber(averageHeartRateBpm)
    const parsedPower = optionalNumber(averagePowerWatts)
    const parsedRpe = optionalNumber(rpe)

    if (
      !localDate ||
      ((parsedDuration === null || parsedDuration <= 0) &&
        (parsedDistance === null || parsedDistance <= 0)) ||
      (parsedDuration !== null && parsedDuration < 0) ||
      (parsedDistance !== null && parsedDistance < 0) ||
      (averagePace !== '' && parsedAveragePace === null) ||
      (parsedAveragePace !== null &&
        (parsedDistance === null || parsedDistance <= 0)) ||
      (parsedHr !== null && (parsedHr < 30 || parsedHr > 250)) ||
      (parsedPower !== null && parsedPower < 0) ||
      (parsedRpe !== null && (parsedRpe < 1 || parsedRpe > 10))
    ) {
      setError(t('triathlon.form.actualInvalid'))
      return
    }

    const parsedIntervals: IntervalSegment[] = intervals.map(
      (interval, index) => ({
        id: interval.id,
        position: index + 1,
        kind: interval.kind,
        durationSeconds:
          optionalNumber(interval.durationMinutes) === null
            ? null
            : Math.round(
                Number(interval.durationMinutes.replace(',', '.')) * 60,
              ),
        distanceMeters: optionalNumber(interval.distanceMeters),
        averageHeartRateBpm: optionalNumber(interval.averageHeartRateBpm),
        averagePowerWatts: optionalNumber(interval.averagePowerWatts),
      }),
    )
    const nextTraining: ActualTrainingInput = {
      isBenchmark,
      localDate,
      startMinutes: timeToMinutes(startTime),
      discipline,
      context,
      durationSeconds:
        parsedDuration === null ? null : Math.round(parsedDuration * 60),
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
    <DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-2xl">
      <form
        className="grid gap-5"
        onSubmit={(event) => void handleSubmit(event)}
      >
        <DialogHeader>
          <DialogTitle>
            {training ? t('triathlon.actual.edit') : t('triathlon.actual.add')}
          </DialogTitle>
          <DialogDescription>
            {t('triathlon.actual.description')}
          </DialogDescription>
        </DialogHeader>
        <fieldset className="grid gap-3 rounded-lg border bg-muted/20 p-4 sm:grid-cols-2">
          <legend className="type-action px-2">
            {t('triathlon.form.session')}
          </legend>
          <IftaInput
            required
            label={t('triathlon.form.date')}
            type="date"
            value={localDate}
            onChange={(event) => setLocalDate(event.currentTarget.value)}
          />
          <IftaInput
            label={t('triathlon.form.timeOptional')}
            type="time"
            value={startTime}
            onChange={(event) => setStartTime(event.currentTarget.value)}
          />
          <DisciplineSelect
            value={discipline}
            onValueChange={handleDisciplineChange}
          />
          <Select
            key={discipline}
            value={context ?? 'none'}
            onValueChange={(value) =>
              setContext(value === 'none' ? null : (value as TrainingContext))
            }
          >
            <IftaSelectTrigger label={t('triathlon.form.context')}>
              <SelectValue />
            </IftaSelectTrigger>
            <SelectContent>
              <SelectItem value="none">
                {t('triathlon.context.none')}
              </SelectItem>
              {contextsForDiscipline(discipline).map((option) => (
                <SelectItem key={option} value={option}>
                  {getContextLabel(option, t)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </fieldset>
        <fieldset className="grid gap-3 rounded-lg border p-4 sm:grid-cols-2">
          <legend className="type-action px-2">
            {t('triathlon.form.metrics')}
          </legend>
          <IftaInput
            label={t('triathlon.form.durationMinutes')}
            min="0"
            step="0.01"
            type="number"
            value={durationMinutes}
            onChange={(event) =>
              updateMetric('duration', event.currentTarget.value)
            }
          />
          <IftaInput
            label={t('triathlon.form.distanceKilometers')}
            min="0"
            step="0.01"
            type="number"
            value={distanceKilometers}
            onChange={(event) =>
              updateMetric('distance', event.currentTarget.value)
            }
          />
          <IftaInput
            inputMode="numeric"
            label={averagePaceLabel(discipline, t)}
            placeholder="5:30"
            value={averagePace}
            onChange={(event) =>
              updateMetric('pace', event.currentTarget.value)
            }
          />
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
          <label className="type-ui flex items-center gap-3 rounded-md bg-muted/40 p-3 sm:col-span-2">
            <input
              type="checkbox"
              className="size-4 accent-primary"
              checked={isBenchmark}
              onChange={(event) => setIsBenchmark(event.target.checked)}
            />
            {t('triathlon.form.benchmark')}
          </label>
        </fieldset>

        <section className="overflow-hidden rounded-md border">
          <Button
            aria-controls="actual-training-details"
            aria-expanded={showDetails}
            className="h-11 w-full justify-between rounded-none px-3"
            type="button"
            variant="ghost"
            onClick={() => setShowDetails((current) => !current)}
          >
            {t('triathlon.form.moreDetails')}
            <ChevronDown
              aria-hidden="true"
              className={cn(
                'transition-transform',
                showDetails && 'rotate-180',
              )}
            />
          </Button>
          {showDetails && (
            <div
              className="grid gap-4 border-t p-3"
              id="actual-training-details"
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <IftaInput
                  label={t('triathlon.form.averagePower')}
                  min="0"
                  type="number"
                  value={averagePowerWatts}
                  onChange={(event) =>
                    setAveragePowerWatts(event.currentTarget.value)
                  }
                />
                <IftaInput
                  label={t('triathlon.form.rpe')}
                  min="1"
                  max="10"
                  type="number"
                  value={rpe}
                  onChange={(event) => setRpe(event.currentTarget.value)}
                />
              </div>
              <IntervalEditor intervals={intervals} onChange={setIntervals} />
            </div>
          )}
        </section>

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
        <DialogFooter className="sticky bottom-0 z-10 -mx-1 border-t bg-background/95 px-1 pt-3 backdrop-blur sm:justify-between">
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
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
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

type WeekCopyDialogProps = {
  currentWeekStart: string
  open: boolean
  onCopy: (preview: PlannedWeekCopyPreview) => Promise<unknown> | unknown
  onOpenChange: (open: boolean) => void
  onPreview: (source: string, target: string) => PlannedWeekCopyPreview
}

export function WeekCopyDialog(props: WeekCopyDialogProps) {
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      {props.open && (
        <WeekCopyDialogContent key={props.currentWeekStart} {...props} />
      )}
    </Dialog>
  )
}

function WeekCopyDialogContent({
  currentWeekStart,
  onCopy,
  onOpenChange,
  onPreview,
}: Omit<WeekCopyDialogProps, 'open'>) {
  const { formatDateTime, t } = useI18n()
  const [source, setSource] = useState(currentWeekStart)
  const [target, setTarget] = useState(addDaysToLocalDate(currentWeekStart, 7))
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const preview = useMemo(
    () =>
      isValidLocalDate(source) && isValidLocalDate(target)
        ? onPreview(
            getWeekStartLocalDate(source),
            getWeekStartLocalDate(target),
          )
        : null,
    [onPreview, source, target],
  )

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{t('triathlon.copyWeek.title')}</DialogTitle>
        <DialogDescription>
          {t('triathlon.copyWeek.description')}
        </DialogDescription>
      </DialogHeader>
      <div className="grid gap-3 sm:grid-cols-2">
        <IftaInput
          required
          label={t('triathlon.copyWeek.source')}
          type="date"
          value={source}
          onChange={(event) => setSource(event.currentTarget.value)}
        />
        <IftaInput
          required
          label={t('triathlon.copyWeek.target')}
          type="date"
          value={target}
          onChange={(event) => setTarget(event.currentTarget.value)}
        />
      </div>
      {preview ? (
        <div className="grid gap-2 rounded-md border bg-secondary/35 p-3">
          <p className="type-action">
            {t('triathlon.copyWeek.previewCount', {
              count: preview.copies.length,
            })}
          </p>
          <p className="type-ui text-muted-foreground">
            {formatDateTime(isoDateAtNoon(preview.sourceWeekStartLocalDate), {
              dateStyle: 'medium',
            })}
            {' → '}
            {formatDateTime(isoDateAtNoon(preview.targetWeekStartLocalDate), {
              dateStyle: 'medium',
            })}
          </p>
          {preview.existingTargetTrainings.length > 0 && (
            <p className="type-ui text-amber-700 dark:text-amber-300">
              {t('triathlon.copyWeek.existingWarning', {
                count: preview.existingTargetTrainings.length,
              })}
            </p>
          )}
        </div>
      ) : (
        <p className="type-ui text-destructive" role="alert">
          {t('triathlon.copyWeek.invalidDate')}
        </p>
      )}
      {error && (
        <p className="type-ui text-destructive" role="alert">
          {error}
        </p>
      )}
      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="outline">
            {t('common.cancel')}
          </Button>
        </DialogClose>
        <Button
          disabled={isSaving || !preview || preview.copies.length === 0}
          type="button"
          onClick={async () => {
            if (!preview) return
            setIsSaving(true)
            setError(null)
            try {
              await onCopy(preview)
              onOpenChange(false)
            } catch {
              setError(t('triathlon.form.saveFailed'))
            } finally {
              setIsSaving(false)
            }
          }}
        >
          <Copy aria-hidden="true" />
          {isSaving
            ? t('common.saving')
            : t('triathlon.copyWeek.confirm', {
                count: preview?.copies.length ?? 0,
              })}
        </Button>
      </DialogFooter>
    </DialogContent>
  )
}

export function CurrentWeekSummary({
  actualCount,
  bikeDistanceMeters,
  bikeDurationSeconds,
  bikeTrainingCount,
  runDistanceMeters,
  runDurationSeconds,
  runTrainingCount,
  swimDistanceMeters,
  swimDurationSeconds,
  swimTrainingCount,
  totalDurationSeconds,
}: {
  actualCount: number
  bikeDistanceMeters: number
  bikeDurationSeconds: number
  bikeTrainingCount: number
  runDistanceMeters: number
  runDurationSeconds: number
  runTrainingCount: number
  swimDistanceMeters: number
  swimDurationSeconds: number
  swimTrainingCount: number
  totalDurationSeconds: number
}) {
  const { locale, t } = useI18n()
  const disciplines = [
    {
      discipline: 'swim' as const,
      duration: swimDurationSeconds,
      distance: swimDistanceMeters,
      count: swimTrainingCount,
    },
    {
      discipline: 'bike' as const,
      duration: bikeDurationSeconds,
      distance: bikeDistanceMeters,
      count: bikeTrainingCount,
    },
    {
      discipline: 'run' as const,
      duration: runDurationSeconds,
      distance: runDistanceMeters,
      count: runTrainingCount,
    },
  ]
  const trainingCountLabel = (count: number) =>
    count === 1
      ? t('triathlon.summary.oneTraining')
      : t('triathlon.summary.trainingCount', { count })

  return (
    <section aria-labelledby="current-week-title">
      <Card>
        <CardContent className="grid grid-cols-2 gap-px bg-border p-0 sm:grid-cols-4">
          <div className="min-w-0 bg-card p-3 sm:p-4" data-week-summary-item>
            <h2
              id="current-week-title"
              className="type-label text-muted-foreground"
            >
              {t('triathlon.summary.thisWeek')}
            </h2>
            <p className="type-card-title mt-1 tabular-nums sm:text-2xl">
              {formatDuration(totalDurationSeconds)}
            </p>
            <p className="type-caption mt-1 text-muted-foreground">
              {trainingCountLabel(actualCount)}
            </p>
          </div>

          {disciplines.map(({ discipline, duration, distance, count }) => {
            const Icon = disciplineIcons[discipline]
            const disciplineColor = disciplineColors[discipline]
            return (
              <div
                className="min-w-0 bg-card p-3 sm:p-4"
                data-discipline-summary={discipline}
                data-week-summary-item
                key={discipline}
                style={{ boxShadow: `inset 0 3px 0 ${disciplineColor}` }}
              >
                <p className="type-label flex items-center gap-2 text-muted-foreground">
                  <Icon
                    aria-hidden="true"
                    className="size-4 shrink-0"
                    style={{ color: disciplineColor }}
                  />
                  {getDisciplineLabel(discipline, t)}
                </p>
                <p className="type-card-title mt-1 tabular-nums sm:text-2xl">
                  {formatDuration(duration)}
                </p>
                <p className="type-caption mt-1 truncate text-muted-foreground">
                  {formatDistance(distance, locale)} ·{' '}
                  {trainingCountLabel(count)}
                </p>
              </div>
            )
          })}
        </CardContent>
      </Card>
    </section>
  )
}

export function PerformanceCards({
  cards,
}: {
  cards: Array<{
    discipline: Discipline
    label: string
    value: string | null
    detail?: string | null
    method?: string | null
  }>
}) {
  const { t } = useI18n()
  return (
    <section className="grid gap-3 md:grid-cols-3">
      {cards.map((card) => {
        const Icon = disciplineIcons[card.discipline]
        const disciplineColor = disciplineColors[card.discipline]
        return (
          <Card
            data-performance-card={card.discipline}
            key={`${card.discipline}-${card.label}`}
            style={{ boxShadow: `inset 0 3px 0 ${disciplineColor}` }}
          >
            <CardHeader className="p-3 pb-1 sm:p-4 sm:pb-2">
              <CardTitle className="type-label flex items-center gap-2 text-muted-foreground">
                <Icon
                  aria-hidden="true"
                  className="size-4"
                  style={{ color: disciplineColor }}
                />
                {card.label}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0 sm:p-4 sm:pt-0">
              {card.method && (
                <p className="type-caption mb-2 text-muted-foreground">
                  {card.method}
                </p>
              )}
              {card.value ? (
                <>
                  <p className="type-metric-lg tabular-nums">{card.value}</p>
                  {card.detail && (
                    <p className="type-caption mt-1 text-muted-foreground">
                      {card.detail}
                    </p>
                  )}
                </>
              ) : (
                <>
                  <p className="type-ui text-muted-foreground">
                    {t('triathlon.performance.notEnough')}
                  </p>
                  {card.detail && (
                    <p className="type-caption mt-1 text-muted-foreground">
                      {card.detail}
                    </p>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        )
      })}
    </section>
  )
}

export function LoadingState() {
  const { t } = useI18n()
  return (
    <div className="grid gap-3" role="status">
      <div className="h-24 animate-pulse rounded-lg bg-muted" />
      <div className="h-72 animate-pulse rounded-lg bg-muted" />
      <span className="sr-only">{t('common.loading')}</span>
    </div>
  )
}

export function SyncStatus() {
  const { t } = useI18n()
  return (
    <Badge variant="secondary">
      <Clock3 aria-hidden="true" />
      {t('common.syncing')}
    </Badge>
  )
}

export function SectionHeading({
  children,
  icon,
}: {
  children: ReactNode
  icon?: ReactNode
}) {
  return (
    <h2 className="type-section-title flex items-center gap-2">
      {icon}
      {children}
    </h2>
  )
}
