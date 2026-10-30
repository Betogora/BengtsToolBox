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
import { IftaInput } from '@/components/ui/ifta-field'
import { TimePicker } from '@/components/ui/TimePicker'
import { useI18n } from '@/lib/i18n'
import { isValidLocalDate } from './domain/dates'
import { maximumInclinePercent } from './domain/incline'
import {
  formatTrainingDurationInput,
  inclineToInput,
  minutesToTime,
  optionalNumber,
  parseTrainingDuration,
  timeToMinutes,
  updatePlanMetrics,
  type PlanMetricDraft,
  type PlanMetricField,
} from './domain/units'
import type { PlannedTrainingInput } from './hooks/useTriathlonTracker'
import {
  DisciplineSelect,
  InclineInput,
  RunIntensityControl,
  RunVariantControl,
} from './trainingFormFields'
import type {
  PlannedTraining,
  PlanPaces,
  RunIntensity,
  TrainingDiscipline,
} from './types'

function kilometersInputValue(meters: number | null) {
  return meters === null ? '' : `${meters / 1000}`
}

type PlannedTrainingDialogProps = {
  initialDate: string
  open: boolean
  planPaces: PlanPaces
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
  planPaces,
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
  const [discipline, setDiscipline] = useState<TrainingDiscipline>(
    (training ?? template)?.discipline ?? 'run',
  )
  const [planMetrics, setPlanMetrics] = useState<PlanMetricDraft>({
    duration: formatTrainingDurationInput(
      (training ?? template)?.durationSeconds ?? null,
    ),
    distance: kilometersInputValue((training ?? template)?.distanceMeters ?? null),
    derived: null,
  })
  const { duration: durationMinutes, distance: distanceKilometers } =
    planMetrics
  const [label, setLabel] = useState((training ?? template)?.label ?? '')
  const [isWalk, setIsWalk] = useState((training ?? template)?.isWalk ?? false)
  const [intensity, setIntensity] = useState<RunIntensity>(
    (training ?? template)?.intensity ?? 'easy',
  )
  const [incline, setIncline] = useState(
    inclineToInput((training ?? template)?.inclinePercent),
  )
  // Only walks and runs have a default pace to complete the plan with.
  const planPace = (nextDiscipline: TrainingDiscipline, nextIsWalk: boolean) =>
    nextDiscipline === 'run' ? planPaces[nextIsWalk ? 'walk' : 'run'] : null
  const updatePlanMetric = (field: PlanMetricField, value: string) =>
    setPlanMetrics((current) =>
      updatePlanMetrics(current, field, value, planPace(discipline, isWalk)),
    )
  const changePlanKind = (
    nextDiscipline: TrainingDiscipline,
    nextIsWalk: boolean,
  ) => {
    setDiscipline(nextDiscipline)
    setIsWalk(nextIsWalk)
    setPlanMetrics((current) =>
      updatePlanMetrics(current, null, '', planPace(nextDiscipline, nextIsWalk)),
    )
  }
  const planComputedClass = (field: PlanMetricField) =>
    planMetrics.derived === field
      ? 'bg-muted text-muted-foreground shadow-none'
      : undefined
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    const parsedDuration = parseTrainingDuration(durationMinutes)
    const parsedDistance = optionalNumber(distanceKilometers)
    const parsedIncline =
      discipline === 'run' ? optionalNumber(incline) : null

    if (
      !isValidLocalDate(localDate) ||
      (durationMinutes.trim() !== '' && parsedDuration === null) ||
      (parsedDuration !== null && parsedDuration < 0) ||
      (parsedDistance !== null && parsedDistance < 0) ||
      (discipline === 'run' && incline.trim() !== '' && parsedIncline === null) ||
      (parsedIncline !== null &&
        (parsedIncline < 0 || parsedIncline > maximumInclinePercent))
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
        isWalk: discipline === 'run' && isWalk,
        inclinePercent: parsedIncline,
        intensity: discipline === 'run' && !isWalk ? intensity : null,
        durationSeconds: parsedDuration,
        distanceMeters:
          parsedDistance === null || discipline === 'strength'
            ? null
            : Math.round(parsedDistance * 1000),
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
          <DisciplineSelect
            value={discipline}
            onValueChange={(next) => changePlanKind(next, false)}
          />
          <IftaInput
            className={planComputedClass('duration')}
            data-computed={planMetrics.derived === 'duration' || undefined}
            label={t('triathlon.journal.duration')}
            aria-label={t('triathlon.form.durationClock')}
            title={t('triathlon.form.durationClock')}
            placeholder="45:00"
            value={durationMinutes}
            onChange={(event) =>
              updatePlanMetric('duration', event.currentTarget.value)
            }
          />
          {discipline === 'run' && (
            <RunVariantControl
              isWalk={isWalk}
              onIsWalkChange={(next) => changePlanKind('run', next)}
            />
          )}
          {discipline === 'run' && !isWalk && (
            <RunIntensityControl
              intensity={intensity}
              onIntensityChange={setIntensity}
            />
          )}
          {discipline !== 'strength' && (
            <IftaInput
              className={planComputedClass('distance')}
              data-computed={planMetrics.derived === 'distance' || undefined}
              inputMode="decimal"
              label={t('triathlon.form.distanceKilometers')}
              min="0"
              step="0.01"
              type="number"
              value={distanceKilometers}
              onChange={(event) =>
                updatePlanMetric('distance', event.currentTarget.value)
              }
            />
          )}
          {discipline === 'run' && (
            <InclineInput value={incline} onChange={setIncline} />
          )}
          <div
            className={
              discipline === 'run' || discipline === 'strength'
                ? 'col-span-2'
                : undefined
            }
          >
            <IftaInput
              label={t('triathlon.form.shortLabel')}
              maxLength={40}
              value={label}
              onChange={(event) => setLabel(event.currentTarget.value)}
            />
          </div>
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
