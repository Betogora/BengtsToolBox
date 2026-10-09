import { Clock3, Copy, Plus, Trash2 } from 'lucide-react'
import type { FormEvent } from 'react'
import { useMemo, useState } from 'react'
import { DatePicker } from '@/components/ui/DatePicker'
import { TimePicker } from '@/components/ui/TimePicker'
import { DisclosureIndicator } from '@/components/ui/disclosure'
import { trainingContexts } from './types'

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
import { formatTrainingDuration as formatDuration } from '@/apps/triathlon-tracker/presentation'
import { ConfirmButton } from '@/apps/shared/components/ConfirmButton'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
import {
  updateTrainingMetrics,
  parseTrainingDuration,
  formatTrainingDurationInput,
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
      <IftaSelectTrigger
        className="min-w-0 gap-1 [&_[data-slot=select-value]]:truncate"
        label={t('triathlon.form.discipline')}
      >
        <SelectValue />
      </IftaSelectTrigger>
      <SelectContent className="triathlon-tracker">
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
    formatTrainingDurationInput(
      (training ?? template)?.durationSeconds ?? null,
    ),
  )
  const [distanceKilometers, setDistanceKilometers] = useState(
    metersToKilometers((training ?? template)?.distanceMeters ?? null),
  )
  const [label, setLabel] = useState((training ?? template)?.label ?? '')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    const parsedDuration = parseTrainingDuration(durationMinutes)
    const parsedDistance = optionalNumber(distanceKilometers)

    if (
      !isValidLocalDate(localDate) ||
      (durationMinutes.trim() !== '' && parsedDuration === null) ||
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
        durationSeconds: parsedDuration,
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
    <DialogContent
      aria-describedby={undefined}
      className="triathlon-tracker max-h-[calc(100dvh-2rem)] overflow-y-auto p-4 sm:max-w-xl sm:p-5"
    >
      <form
        className="grid gap-4"
        onSubmit={(event) => void handleSubmit(event)}
      >
        <DialogHeader>
          <DialogTitle>
            {training ? t('triathlon.plan.edit') : t('triathlon.plan.add')}
          </DialogTitle>
        </DialogHeader>
        <fieldset className="grid grid-cols-2 gap-2">
          <legend className="sr-only">{t('triathlon.form.schedule')}</legend>
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
        </fieldset>
        <fieldset className="grid grid-cols-2 gap-2">
          <legend className="sr-only">{t('triathlon.form.targets')}</legend>
          <DisciplineSelect value={discipline} onValueChange={setDiscipline} />
          <IftaInput
            label={t('triathlon.journal.duration')}
            aria-label={t('triathlon.form.durationClock')}
            title={t('triathlon.form.durationClock')}
            placeholder="45:00"
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
          <div className="flex gap-2 [&>*]:flex-1 sm:[&>*]:flex-none">
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
    durationMinutes: formatTrainingDurationInput(interval.durationSeconds),
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
    <section className="grid gap-3 rounded-md border bg-card p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="type-action">{t('triathlon.intervals.title')}</h3>
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
        <p className="type-ui rounded-md bg-muted p-4 text-center text-muted-foreground">
          {t('triathlon.intervals.empty')}
        </p>
      ) : (
        <div className="grid gap-3">
          {intervals.map((interval, index) => (
            <div
              className="grid gap-2 rounded-md bg-muted p-3"
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
                  <SelectContent className="triathlon-tracker">
                    <SelectItem value="work">
                      {t('triathlon.intervals.work')}
                    </SelectItem>
                    <SelectItem value="rest">
                      {t('triathlon.intervals.rest')}
                    </SelectItem>
                  </SelectContent>
                </Select>
                <IftaInput
                  label={t('triathlon.journal.duration')}
                  aria-label={t('triathlon.form.durationClock')}
                  title={t('triathlon.form.durationClock')}
                  placeholder="2:30"
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
  initialDate,
  training,
  template,
  onDelete,
  onOpenChange,
  onSave,
}: Omit<ActualTrainingDialogProps, 'open'>) {
  const { t } = useI18n()
  const initial = training ?? template
  const initialDiscipline = initial?.discipline ?? 'run'
  const [localDate, setLocalDate] = useState(initial?.localDate ?? initialDate)
  const [startTime, setStartTime] = useState(
    minutesToTime(initial?.startMinutes ?? null),
  )
  const [discipline, setDiscipline] = useState<Discipline>(initialDiscipline)
  const [context, setContext] = useState<TrainingContext>(
    initial?.context ?? defaultContext(initialDiscipline, defaultContexts),
  )
  const [metrics, setMetrics] = useState<TrainingMetricDraft>(() => ({
    duration: formatTrainingDurationInput(initial?.durationSeconds ?? null),
    distance: metersToKilometers(initial?.distanceMeters ?? null),
    pace: formatPace(
      initial?.durationSeconds && initial.distanceMeters
        ? averagePaceSeconds(
            initial.durationSeconds,
            initial.distanceMeters,
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
  const [isBenchmark, setIsBenchmark] = useState(initial?.isBenchmark ?? false)
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

  const handleDisciplineChange = (nextDiscipline: Discipline) => {
    setDiscipline(nextDiscipline)
    setContext(defaultContext(nextDiscipline, defaultContexts))
    setMetrics((current) => ({
      ...current,
      inputs: ['duration', 'distance'],
      pace: formatPace(
        averagePaceSeconds(
          parseTrainingDuration(current.duration) ?? 0,
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
  // The field outside the last two inputs is derived from the other two.
  const isComputed = (field: TrainingMetricField) =>
    !metrics.inputs.includes(field)
  const computedClass = (field: TrainingMetricField) =>
    isComputed(field)
      ? 'bg-muted text-muted-foreground shadow-none'
      : undefined

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    const parsedDuration = parseTrainingDuration(durationMinutes)
    const parsedDistance = optionalNumber(distanceKilometers)
    const parsedAveragePace = averagePace ? parsePace(averagePace) : null
    const parsedHr = optionalNumber(averageHeartRateBpm)
    const parsedPower = optionalNumber(averagePowerWatts)
    const parsedRpe = optionalNumber(rpe)

    if (
      !localDate ||
      (durationMinutes.trim() !== '' && parsedDuration === null) ||
      ((parsedDuration === null || parsedDuration <= 0) &&
        (parsedDistance === null || parsedDistance <= 0)) ||
      (parsedDuration !== null && parsedDuration < 0) ||
      (parsedDistance !== null && parsedDistance < 0) ||
      (averagePace !== '' && parsedAveragePace === null) ||
      (parsedAveragePace !== null &&
        (parsedDistance === null || parsedDistance <= 0)) ||
      (parsedHr !== null && (parsedHr < 30 || parsedHr > 250)) ||
      (parsedPower !== null && parsedPower < 0) ||
      (parsedRpe !== null && (parsedRpe < 1 || parsedRpe > 10)) ||
      intervals.some(
        (interval) =>
          interval.durationMinutes.trim() !== '' &&
          parseTrainingDuration(interval.durationMinutes) === null,
      )
    ) {
      setError(t('triathlon.form.actualInvalid'))
      return
    }

    const parsedIntervals: IntervalSegment[] = intervals.map(
      (interval, index) => ({
        id: interval.id,
        position: index + 1,
        kind: interval.kind,
        durationSeconds: parseTrainingDuration(interval.durationMinutes),
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
          <Select
            key={discipline}
            value={context}
            onValueChange={(value) => setContext(value as TrainingContext)}
          >
            <IftaSelectTrigger label={t('triathlon.form.context')}>
              <SelectValue />
            </IftaSelectTrigger>
            <SelectContent className="triathlon-tracker">
              {trainingContexts[discipline].map((option) => (
                <SelectItem key={option} value={option}>
                  {t(`triathlon.context.${option}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </fieldset>
        <fieldset className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <legend className="sr-only">{t('triathlon.form.metrics')}</legend>
          <IftaInput
            className={computedClass('duration')}
            data-computed={isComputed('duration') || undefined}
            label={t('triathlon.journal.duration')}
            aria-label={t('triathlon.form.durationClock')}
            title={t('triathlon.form.durationClock')}
            placeholder="20:35"
            value={durationMinutes}
            onChange={(event) =>
              updateMetric('duration', event.currentTarget.value)
            }
          />
          <IftaInput
            className={computedClass('distance')}
            data-computed={isComputed('distance') || undefined}
            label={t('triathlon.form.distanceKilometers')}
            min="0"
            step="0.01"
            type="number"
            value={distanceKilometers}
            onChange={(event) =>
              updateMetric('distance', event.currentTarget.value)
            }
          />
          <div className="col-span-2 sm:col-span-1">
            <IftaInput
              className={computedClass('pace')}
              data-computed={isComputed('pace') || undefined}
              inputMode="text"
              label={averagePaceLabel(discipline, t)}
              placeholder="5:30"
              value={averagePace}
              onChange={(event) =>
                updateMetric('pace', event.currentTarget.value)
              }
            />
          </div>
          <p className="type-caption col-span-2 text-muted-foreground sm:col-span-3">
            {t('triathlon.form.metricsDerived')}
          </p>
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
          <IftaInput
            label={t('triathlon.form.averagePower')}
            min="0"
            max="3000"
            type="number"
            value={averagePowerWatts}
            onChange={(event) =>
              setAveragePowerWatts(event.currentTarget.value)
            }
          />
          <div className="col-span-2 sm:col-span-1">
            <IftaInput
              label={t('triathlon.form.rpe')}
              min="1"
              max="10"
              type="number"
              value={rpe}
              onChange={(event) => setRpe(event.currentTarget.value)}
            />
          </div>
          <label className="type-ui col-span-2 flex items-center gap-3 rounded-md bg-muted p-3 sm:col-span-3">
            <input
              type="checkbox"
              className="size-4 accent-primary"
              checked={isBenchmark}
              onChange={(event) => setIsBenchmark(event.target.checked)}
            />
            {t('triathlon.form.benchmark')}
          </label>
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
                  {intervals.length}
                </span>
              )}
            </span>
            <DisclosureIndicator isOpen={showDetails} />
          </Button>
          {showDetails && (
            <div className="grid gap-4 pt-2" id="actual-training-details">
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
    <DialogContent className="triathlon-tracker">
      <DialogHeader>
        <DialogTitle>{t('triathlon.copyWeek.title')}</DialogTitle>
        <DialogDescription>
          {t('triathlon.copyWeek.description')}
        </DialogDescription>
      </DialogHeader>
      <div className="grid gap-3 sm:grid-cols-2">
        <DatePicker
          required
          label={t('triathlon.copyWeek.source')}
          value={source}
          onValueChange={setSource}
        />
        <DatePicker
          required
          label={t('triathlon.copyWeek.target')}
          value={target}
          onValueChange={setTarget}
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
    <section
      className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3"
      aria-labelledby="current-week-title"
    >
      <div
        className="tri-week-total min-w-0 rounded-lg border bg-card px-4 py-3.5"
        data-week-summary-item
      >
        <h2
          id="current-week-title"
          className="tri-stat-label text-muted-foreground"
        >
          {t('triathlon.summary.thisWeek')}
        </h2>
        <p className="tri-stat-value mt-1">
          {formatDuration(totalDurationSeconds)}
        </p>
        <p className="type-caption mt-0.5 text-muted-foreground tabular-nums">
          {trainingCountLabel(actualCount)}
        </p>
      </div>

      {disciplines.map(({ discipline, duration, distance, count }) => (
        <div
          className="min-w-0 rounded-lg border bg-card px-4 py-3.5"
          data-discipline={discipline}
          data-discipline-summary={discipline}
          data-week-summary-item
          key={discipline}
        >
          <p className="tri-stat-label flex items-center gap-2 text-muted-foreground">
            <span aria-hidden="true" className="tri-sport-dot" />
            {getDisciplineLabel(discipline, t)}
          </p>
          <p className="tri-stat-value mt-1">{formatDuration(duration)}</p>
          <p className="type-caption mt-0.5 flex flex-wrap gap-x-1 text-muted-foreground tabular-nums">
            {distance > 0 && (
              <span>{formatDistance(distance, locale)} ·</span>
            )}
            <span>{trainingCountLabel(count)}</span>
          </p>
        </div>
      ))}
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
