import { Plus, Trash2 } from 'lucide-react'
import type { KeyboardEvent } from 'react'
import { useState } from 'react'
import { ConfirmButton } from '@/apps/shared/components/ConfirmButton'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { IftaInput, IftaSelectTrigger } from '@/components/ui/ifta-field'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectValue,
} from '@/components/ui/select'
import { useI18n } from '@/lib/i18n'
import {
  buildIntervalScheme,
  elapsedAtPhaseEnds,
  inheritedPhaseSpeeds,
  insertIntervalPair,
  intervalKindAt,
  intervalPhaseAt,
  intervalSchemeDefaults,
  intervalTotals,
  maximumIntervalRepetitions,
  removeIntervalPhase,
  type IntervalDraft,
  type IntervalScheme,
} from './domain/intervals'
import {
  formatTrainingDurationInput,
  parseTrainingDuration,
} from './domain/units'
import type { IntervalSegment, RunIntensity } from './types'

function createIntervalDraft(
  kind: IntervalSegment['kind'] = 'work',
  durationMinutes = '',
): IntervalDraft {
  return {
    id: `interval-${crypto.randomUUID()}`,
    kind,
    durationMinutes,
    distanceMeters: '',
    speed: '',
    averageHeartRateBpm: '',
    averagePowerWatts: '',
    endHeartRateBpm: '',
  }
}

export function IntervalEditor({
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

// Narrow columns leave the phase name readable at 320 px.
const phaseGridClass =
  'grid grid-cols-[minmax(0,1fr)_3.5rem_2.75rem_2.75rem_1.75rem] items-center gap-1 sm:grid-cols-[minmax(0,1fr)_3.5rem_4.5rem_4.5rem_4.5rem_2.25rem] sm:gap-2'
// The elapsed time stands below the phase name on phones and gets its own
// column left of the duration from `sm` on.
const elapsedCellClass = 'flex min-w-0 flex-col sm:contents'
const phaseInputClass = 'h-9 px-1 text-center tabular-nums'

type SchemeDraft = Record<keyof IntervalScheme, string>

function SchemeForm({
  defaults,
  onCreate,
}: {
  defaults: IntervalScheme
  onCreate: (phases: IntervalDraft[]) => void
}) {
  const { t } = useI18n()
  const [scheme, setScheme] = useState<SchemeDraft>(() => ({
    warmUpSeconds: formatTrainingDurationInput(defaults.warmUpSeconds),
    repetitions: `${defaults.repetitions}`,
    workSeconds: formatTrainingDurationInput(defaults.workSeconds),
    recoverySeconds: formatTrainingDurationInput(defaults.recoverySeconds),
    coolDownSeconds: formatTrainingDurationInput(defaults.coolDownSeconds),
  }))
  const durations = {
    warmUpSeconds: parseTrainingDuration(scheme.warmUpSeconds),
    workSeconds: parseTrainingDuration(scheme.workSeconds),
    recoverySeconds: parseTrainingDuration(scheme.recoverySeconds),
    coolDownSeconds: parseTrainingDuration(scheme.coolDownSeconds) ?? 0,
  }
  const repetitions = Number(scheme.repetitions)
  const isValid =
    Number.isInteger(repetitions) &&
    repetitions >= 1 &&
    repetitions <= maximumIntervalRepetitions &&
    Boolean(durations.warmUpSeconds) &&
    Boolean(durations.workSeconds) &&
    (repetitions === 1 || Boolean(durations.recoverySeconds))
  const field = (key: keyof IntervalScheme, label: string, numeric = false) => (
    <IftaInput
      label={label}
      inputMode={numeric ? 'numeric' : 'decimal'}
      value={scheme[key]}
      onChange={(event) => {
        const value = event.currentTarget.value
        setScheme((current) => ({ ...current, [key]: value }))
      }}
    />
  )

  return (
    <div className="grid gap-2">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {field('warmUpSeconds', t('triathlon.intervals.phase.warm-up'))}
        {field('repetitions', t('triathlon.intervals.repetitions'), true)}
        {field('workSeconds', t('triathlon.intervals.phase.work'))}
        {field('recoverySeconds', t('triathlon.intervals.phase.recovery'))}
        <div className="col-span-2 sm:col-span-1">
          {field('coolDownSeconds', t('triathlon.intervals.phase.cool-down'))}
        </div>
      </div>
      <Button
        disabled={!isValid}
        type="button"
        variant="outline"
        onClick={() =>
          onCreate(
            buildIntervalScheme({
              warmUpSeconds: durations.warmUpSeconds ?? 0,
              repetitions,
              workSeconds: durations.workSeconds ?? 0,
              recoverySeconds: durations.recoverySeconds ?? 0,
              coolDownSeconds: durations.coolDownSeconds,
            }).map((seconds, index) =>
              createIntervalDraft(
                intervalKindAt(index),
                formatTrainingDurationInput(seconds),
              ),
            ),
          )
        }
      >
        <Plus aria-hidden="true" />
        {t('triathlon.intervals.createTable')}
      </Button>
    </div>
  )
}

/**
 * Running phases as one compact table that can be filled in on the go:
 * kinds alternate by position, speeds repeat until changed and the heart
 * rate is the value read at the end of each phase.
 */
export function RunIntervalTable({
  phases,
  totals,
  intensity,
  onChange,
}: {
  phases: IntervalDraft[]
  /** Sums the dialog already derived from the same phases. */
  totals: ReturnType<typeof intervalTotals> | null
  /** Picks the scheme the empty table starts from. */
  intensity: RunIntensity
  onChange: (phases: IntervalDraft[]) => void
}) {
  const { formatNumber, t } = useI18n()
  const speeds = inheritedPhaseSpeeds(phases)
  const elapsed = elapsedAtPhaseEnds(
    phases.map((phase) => parseTrainingDuration(phase.durationMinutes)),
  )

  if (phases.length === 0 || !totals) {
    return (
      <SchemeForm
        key={intensity}
        defaults={intervalSchemeDefaults[intensity]}
        onCreate={onChange}
      />
    )
  }

  const update = (id: string, partial: Partial<IntervalDraft>) =>
    onChange(
      phases.map((phase) => (phase.id === id ? { ...phase, ...partial } : phase)),
    )
  const phaseLabel = (index: number) => {
    const phase = intervalPhaseAt(index, phases.length)
    return phase === 'work'
      ? t('triathlon.intervals.workNumber', { number: (index + 1) / 2 })
      : t(`triathlon.intervals.phase.${phase}`)
  }
  // Enter moves down the column instead of submitting the whole dialog.
  const focusNextRow = (
    event: KeyboardEvent<HTMLInputElement>,
    field: string,
    index: number,
  ) => {
    if (event.key !== 'Enter') return
    event.preventDefault()
    const next = event.currentTarget.form?.querySelector<HTMLInputElement>(
      `[data-phase-field="${field}"][data-phase-row="${index + 1}"]`,
    )
    if (next) next.focus()
    else event.currentTarget.blur()
  }
  const phaseInput = (
    phase: IntervalDraft,
    index: number,
    field: 'durationMinutes' | 'speed' | 'endHeartRateBpm',
    label: string,
    placeholder?: string,
  ) => (
    <Input
      aria-label={`${phaseLabel(index)} · ${label}`}
      className={phaseInputClass}
      data-phase-field={field}
      data-phase-row={index}
      enterKeyHint="next"
      inputMode={field === 'endHeartRateBpm' ? 'numeric' : 'decimal'}
      placeholder={placeholder}
      value={phase[field]}
      onChange={(event) => update(phase.id, { [field]: event.currentTarget.value })}
      onKeyDown={(event) => focusNextRow(event, field, index)}
    />
  )

  return (
    <div className="grid gap-1.5">
      <div
        aria-hidden="true"
        className={`${phaseGridClass} type-caption px-1 text-center text-muted-foreground`}
      >
        <div className={elapsedCellClass}>
          <span />
          <span className="hidden sm:block" title={t('triathlon.intervals.elapsed')}>
            {t('triathlon.intervals.elapsedShort')}
          </span>
        </div>
        <span>{t('triathlon.journal.duration')}</span>
        <span>km/h</span>
        <span title={t('triathlon.intervals.endHeartRate')}>
          {t('triathlon.intervals.heartRateShort')}
        </span>
        <span />
      </div>
      {phases.map((phase, index) => {
        const kind = intervalKindAt(index)
        const removable =
          kind === 'work' || (index > 0 && index === phases.length - 1)
        const inherited =
          phase.speed.trim() === '' && speeds[index] !== null
            ? formatNumber(speeds[index] ?? 0, { maximumFractionDigits: 1 })
            : undefined
        return (
          <div
            className={`${phaseGridClass} rounded-md px-1 py-1 ${kind === 'work' ? 'bg-muted' : ''}`}
            data-phase-kind={kind}
            key={phase.id}
          >
            <div className={elapsedCellClass}>
              <span
                className={`type-caption leading-tight break-words ${kind === 'work' ? 'font-semibold' : 'text-muted-foreground'}`}
              >
                {phaseLabel(index)}
              </span>
              <span
                className="type-caption tabular-nums text-muted-foreground sm:text-center"
                data-phase-elapsed
                title={t('triathlon.intervals.elapsed')}
              >
                {formatTrainingDurationInput(elapsed[index])}
              </span>
            </div>
            {phaseInput(phase, index, 'durationMinutes', t('triathlon.journal.duration'))}
            {phaseInput(phase, index, 'speed', t('triathlon.form.averageSpeed'), inherited)}
            {phaseInput(phase, index, 'endHeartRateBpm', t('triathlon.intervals.endHeartRate'))}
            {removable ? (
              <Button
                aria-label={t('triathlon.intervals.removePhase', {
                  phase: phaseLabel(index),
                })}
                className="size-7 sm:size-9"
                size="icon"
                type="button"
                variant="ghost"
                onClick={() => onChange(removeIntervalPhase(phases, index))}
              >
                <Trash2 aria-hidden="true" />
              </Button>
            ) : (
              <span />
            )}
          </div>
        )
      })}
      <div className={`${phaseGridClass} type-caption border-t px-1 pt-2 font-semibold tabular-nums`}>
        {/* The total sits under the running time it ends, not the inputs. */}
        <div className={elapsedCellClass}>
          <span>{t('triathlon.intervals.total')}</span>
          <span className="sm:text-center">
            {formatTrainingDurationInput(totals.durationSeconds)}
          </span>
        </div>
        <span />
        <span className="col-span-2 text-center">
          {totals.distanceMeters === null
            ? ''
            : `${formatNumber(totals.distanceMeters / 1000, { maximumFractionDigits: 2 })} km`}
        </span>
        <span />
      </div>
      <div className="flex flex-wrap justify-between gap-2 pt-1">
        <Button
          disabled={phases.length >= 99}
          size="sm"
          type="button"
          variant="outline"
          onClick={() =>
            onChange(
              insertIntervalPair(phases, (kind, template) =>
                createIntervalDraft(kind, template?.durationMinutes),
              ),
            )
          }
        >
          <Plus aria-hidden="true" />
          {t('triathlon.intervals.addInterval')}
        </Button>
        <ConfirmButton
          description={t('triathlon.intervals.resetDescription')}
          title={t('triathlon.intervals.reset')}
          trigger={
            <Button size="sm" type="button" variant="ghost">
              {t('triathlon.intervals.reset')}
            </Button>
          }
          onConfirm={() => onChange([])}
        />
      </div>
    </div>
  )
}
