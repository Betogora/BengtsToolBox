import { Plus } from 'lucide-react'
import { useMemo, useState } from 'react'

import { analyzeBike, analyzeRun, analyzeSwim } from './domain/performance'
import {
  getPersonalRecords,
  getWalkingClimbRecords,
  personalRecordDistances,
} from './domain/personalRecords'
import { formatPace, formatTrainingDurationInput } from './domain/units'
import type { ActualTrainingInput } from './hooks/useTriathlonTracker'
import { disciplineIcons, disciplines } from './presentation'
import { defaultTrainingContexts, trainingContexts } from './types'
import type {
  ActualTraining,
  Discipline,
  TrackerSettings,
  TrainingContext,
} from './types'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { IftaSelectTrigger } from '@/components/ui/ifta-field'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useI18n } from '@/lib/i18n'
import { dateTimeFormat } from '@/lib/i18n/formatters'

/** Marks modelled values: * = estimate, ** = beyond measured distances. */
export function EstimateMark({ extrapolated = false }: { extrapolated?: boolean }) {
  const { t } = useI18n()
  const meaning = t(
    extrapolated ? 'triathlon.records.extrapolation' : 'triathlon.charts.estimated',
  )
  return (
    <>
      {/* The tooltip replaces the former legend below the records. */}
      <span aria-hidden="true" className="tri-estimate-mark" title={meaning}>
        {extrapolated ? '**' : '*'}
      </span>
      <span className="sr-only"> ({meaning})</span>
    </>
  )
}

export function PersonalBestsPanel({
  actualTrainings,
  settings,
  today,
  onAdd,
  onEdit,
}: {
  actualTrainings: ActualTraining[]
  settings: TrackerSettings
  today: string
  onAdd: (template: Partial<ActualTrainingInput>) => void
  onEdit: (training: ActualTraining) => void
}) {
  const { locale, t } = useI18n()
  const [selectedContexts, setSelectedContexts] = useState<
    Record<Discipline, TrainingContext>
  >(defaultTrainingContexts)
  const [basis, setBasis] = useState<'benchmark' | 'all'>('all')
  const recordTrainings = useMemo(
    () =>
      basis === 'benchmark'
        ? actualTrainings.filter((training) => training.isBenchmark)
        : actualTrainings,
    [actualTrainings, basis],
  )
  const models = useMemo(
    () => ({
      swim: analyzeSwim(actualTrainings, {
        context: selectedContexts.swim as 'pool-25' | 'pool-50' | 'open-water',
        asOfLocalDate: today,
        targetDistancesMeters: personalRecordDistances.swim,
      }),
      bike: analyzeBike(actualTrainings, {
        context: selectedContexts.bike as 'indoor' | 'outdoor',
        asOfLocalDate: today,
        weightKg: settings.weightKg,
        targetDistancesMeters: personalRecordDistances.bike,
      }),
      run: analyzeRun(actualTrainings, {
        context: selectedContexts.run as 'road' | 'treadmill',
        asOfLocalDate: today,
        targetDistancesMeters: personalRecordDistances.run,
      }),
    }),
    [actualTrainings, selectedContexts, settings.weightKg, today],
  )
  // Walks are never benchmarks, so the record basis does not apply to them.
  const walkingRecords = useMemo(
    () => getWalkingClimbRecords(actualTrainings, today),
    [actualTrainings, today],
  )
  const distanceLabel = (distance: number, discipline: Discipline) => {
    if (distance === 21097.5) return t('triathlon.records.halfMarathon')
    if (distance === 42195) return t('triathlon.records.marathon')
    return discipline === 'swim'
      ? `${distance.toLocaleString(locale)} m`
      : `${(distance / 1000).toLocaleString(locale)} km`
  }
  const formattedDate = (date: string) =>
    dateTimeFormat(locale, {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
    }).format(new Date(`${date}T12:00:00Z`))

  return (
    <section className="grid gap-4" aria-label={t('triathlon.tabs.records')}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="type-section-title flex min-h-12 items-center">{t('triathlon.records.title')}</h2>
        <Select
          value={basis}
          onValueChange={(value) => setBasis(value as 'benchmark' | 'all')}
        >
          <IftaSelectTrigger
            className="min-w-48"
            label={t('triathlon.records.basis')}
          >
            <SelectValue />
          </IftaSelectTrigger>
          <SelectContent className="triathlon-tracker">
            <SelectItem value="benchmark">
              {t('triathlon.records.testsOnly')}
            </SelectItem>
            <SelectItem value="all">
              {t('triathlon.records.allTrainings')}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="grid auto-rows-fr gap-4 xl:grid-cols-3">
        {disciplines.map((discipline) => {
          const Icon = disciplineIcons[discipline]
          const analysis = models[discipline]
          const records = getPersonalRecords(recordTrainings, {
            discipline,
            context: selectedContexts[discipline],
            asOfLocalDate: today,
          })
          const estimates =
            analysis.status === 'ready'
              ? 'estimates' in analysis
                ? analysis.estimates
                : (analysis.distanceAnalysis?.estimates ?? [])
              : []
          const add = (input: Partial<ActualTrainingInput>) =>
            onAdd({
              discipline,
              context: selectedContexts[discipline],
              isBenchmark: true,
              ...input,
            })
          const edit = (trainingId: string) => {
            const training = actualTrainings.find(
              (item) => item.id === trainingId,
            )
            if (training) onEdit(training)
          }
          return (
            <Card
              key={discipline}
              data-record-card={discipline}
              className="tri-record-card min-w-0 overflow-hidden"
              data-discipline={discipline}
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3">
                <h3 className="type-card-title flex items-center gap-3">
                  <span className="tri-sport-icon" aria-hidden="true">
                    <Icon className="size-[18px]" />
                  </span>
                  {t(`triathlon.discipline.${discipline}`)}
                </h3>
                <Select
                  value={selectedContexts[discipline]}
                  onValueChange={(value) =>
                    setSelectedContexts((current) => ({
                      ...current,
                      [discipline]: value as TrainingContext,
                    }))
                  }
                >
                  <SelectTrigger
                    className="w-auto min-w-32"
                    aria-label={`${t('triathlon.form.context')}: ${t(`triathlon.discipline.${discipline}`)}`}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="triathlon-tracker">
                    {trainingContexts[discipline].map((context) => (
                      <SelectItem key={context} value={context}>
                        {t(`triathlon.context.${context}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <ul className="divide-y">
                {records.distanceRecords.map(
                  ({ targetDistanceMeters, record }) => {
                    const label = distanceLabel(targetDistanceMeters, discipline)
                    const estimate = estimates.find(
                      (item) =>
                        item.targetDistanceMeters === targetDistanceMeters,
                    )
                    const shownSeconds =
                      record?.durationSeconds ??
                      estimate?.predictedDurationSeconds ??
                      null
                    return (
                      <li
                        key={targetDistanceMeters}
                        className="flex min-h-16 items-center gap-2 py-2.5 pl-4 pr-2"
                        data-record-distance={targetDistanceMeters}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="type-ui font-semibold">{label}</p>
                          {record && (
                            <p className="type-caption text-muted-foreground tabular-nums">
                              {formattedDate(record.localDate)}
                            </p>
                          )}
                        </div>
                        <div className="grid min-w-0 justify-items-end text-right">
                          {record ? (
                            <button
                              className="tri-record-time rounded-sm hover:text-primary focus-visible:outline-2 focus-visible:outline-ring"
                              aria-label={t('triathlon.records.edit', {
                                sport: t(`triathlon.discipline.${discipline}`),
                                distance: label,
                              })}
                              onClick={() => edit(record.trainingId)}
                            >
                              {formatTrainingDurationInput(
                                record.durationSeconds,
                              )}
                            </button>
                          ) : estimate ? (
                            <span
                              className="tri-record-time"
                              data-record-estimate
                            >
                              {formatTrainingDurationInput(
                                estimate.predictedDurationSeconds,
                              )}
                              <EstimateMark extrapolated={estimate.extrapolated} />
                            </span>
                          ) : (
                            <span className="tri-record-time text-subtle-foreground">
                              —
                              <span className="sr-only">
                                {' '}
                                {t('triathlon.records.unrecorded')}
                              </span>
                            </span>
                          )}
                          {shownSeconds !== null && (
                            <span className="type-caption flex flex-wrap items-center justify-end gap-x-1.5 text-muted-foreground tabular-nums">
                              <span>
                                {formatPace(
                                  (shownSeconds / targetDistanceMeters) *
                                    (discipline === 'swim' ? 100 : 1000),
                                )}{' '}
                                /{discipline === 'swim' ? '100 m' : 'km'}
                              </span>
                              {record && estimate && (
                                <span>
                                  ·{' '}
                                  {formatTrainingDurationInput(
                                    estimate.predictedDurationSeconds,
                                  )}
                                  <EstimateMark
                                    extrapolated={estimate.extrapolated}
                                  />
                                </span>
                              )}
                            </span>
                          )}
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-8 text-muted-foreground"
                          aria-label={t('triathlon.records.add', {
                            sport: t(`triathlon.discipline.${discipline}`),
                            distance: label,
                          })}
                          title={t('triathlon.records.add', {
                            sport: t(`triathlon.discipline.${discipline}`),
                            distance: label,
                          })}
                          onClick={() =>
                            add({ distanceMeters: targetDistanceMeters })
                          }
                        >
                          <Plus className="size-4" aria-hidden="true" />
                        </Button>
                      </li>
                    )
                  },
                )}
              </ul>
              {discipline === 'run' && (
                <div className="border-t" data-walking-records>
                  <h4 className="type-caption px-4 pt-3 font-semibold text-muted-foreground">
                    {t('triathlon.records.walkingClimb')}
                  </h4>
                  <ul className="divide-y">
                    {([['climbRate', 'Hm/h']] as const).map(([kind, unit]) => {
                      const record = walkingRecords[kind]
                      const rowLabel = t(`triathlon.records.${kind}`)
                      return (
                        <li
                          className="flex min-h-16 items-center gap-2 py-2.5 pl-4 pr-2"
                          key={kind}
                          data-walking-record={kind}
                        >
                          <div className="min-w-0 flex-1">
                            <p className="type-ui font-semibold">{rowLabel}</p>
                            {record && (
                              <p className="type-caption text-muted-foreground tabular-nums">
                                {formattedDate(record.localDate)}
                              </p>
                            )}
                          </div>
                          {record ? (
                            <button
                              className="tri-record-time rounded-sm hover:text-primary focus-visible:outline-2 focus-visible:outline-ring"
                              onClick={() => edit(record.trainingId)}
                              aria-label={t('triathlon.records.edit', {
                                sport: t('triathlon.variant.walk'),
                                distance: rowLabel,
                              })}
                            >
                              {Math.round(record.value).toLocaleString(locale)}{' '}
                              {unit}
                            </button>
                          ) : (
                            <span className="tri-record-time text-subtle-foreground">
                              —
                            </span>
                          )}
                          <Button
                            className="size-8 text-muted-foreground"
                            size="icon"
                            variant="ghost"
                            aria-label={t('triathlon.records.add', {
                              sport: t('triathlon.variant.walk'),
                              distance: rowLabel,
                            })}
                            onClick={() =>
                              add({
                                isWalk: true,
                                context: 'treadmill',
                                isBenchmark: false,
                              })
                            }
                          >
                            <Plus className="size-4" aria-hidden="true" />
                          </Button>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )}
              {discipline === 'bike' && (
                <div className="border-t">
                  <h4 className="type-caption px-4 pt-3 font-semibold text-muted-foreground">
                    {t('triathlon.records.power')}
                  </h4>
                  <ul className="divide-y">
                    {records.powerRecords.map(
                      ({ targetDurationSeconds, record }) => {
                        const cp =
                          analysis.status === 'ready' &&
                          analysis.model === 'critical-power'
                            ? analysis
                            : null
                        const predictedPower = cp
                          ? cp.criticalPowerWatts +
                            cp.workCapacityJoules / targetDurationSeconds
                          : null
                        const durationLabel = `${targetDurationSeconds / 60} min`
                        return (
                          <li
                            className="flex min-h-16 items-center gap-2 py-2.5 pl-4 pr-2"
                            key={targetDurationSeconds}
                          >
                            <div className="min-w-0 flex-1">
                              <p className="type-ui font-semibold">
                                {durationLabel}
                              </p>
                              {record && (
                                <p className="type-caption text-muted-foreground tabular-nums">
                                  {formattedDate(record.localDate)}
                                </p>
                              )}
                            </div>
                            <div className="grid min-w-0 justify-items-end text-right">
                              {record ? (
                                <button
                                  className="tri-record-time rounded-sm hover:text-primary focus-visible:outline-2 focus-visible:outline-ring"
                                  onClick={() => edit(record.trainingId)}
                                  aria-label={t('triathlon.records.edit', {
                                    sport: t('triathlon.discipline.bike'),
                                    distance: durationLabel,
                                  })}
                                >
                                  {Math.round(record.averagePowerWatts)} W
                                </button>
                              ) : predictedPower !== null ? (
                                <span
                                  className="tri-record-time"
                                  data-record-estimate
                                >
                                  {Math.round(predictedPower)} W
                                  <EstimateMark />
                                </span>
                              ) : (
                                <span className="tri-record-time text-subtle-foreground">
                                  —
                                </span>
                              )}
                              {record && predictedPower !== null && (
                                <span className="type-caption flex items-center justify-end text-muted-foreground tabular-nums">
                                  {Math.round(predictedPower)} W
                                  <EstimateMark />
                                </span>
                              )}
                            </div>
                            <Button
                              className="size-8 text-muted-foreground"
                              size="icon"
                              variant="ghost"
                              aria-label={t('triathlon.records.add', {
                                sport: t('triathlon.discipline.bike'),
                                distance: durationLabel,
                              })}
                              onClick={() =>
                                add({ durationSeconds: targetDurationSeconds })
                              }
                            >
                              <Plus className="size-4" aria-hidden="true" />
                            </Button>
                          </li>
                        )
                      },
                    )}
                    {analysis.status === 'ready' &&
                      analysis.model === 'critical-power' && (
                        <li className="flex min-h-16 items-center gap-2 py-2.5 pl-4 pr-12">
                          <p className="type-ui min-w-0 flex-1 font-semibold">
                            {t('triathlon.performance.bikeCp')}
                          </p>
                          <div className="grid justify-items-end text-right">
                            <span className="tri-record-time">
                              {Math.round(analysis.criticalPowerWatts)} W
                              <EstimateMark />
                            </span>
                            {analysis.criticalPowerWattsPerKg !== null && (
                              <span className="type-caption flex items-center justify-end text-muted-foreground tabular-nums">
                                {analysis.criticalPowerWattsPerKg.toLocaleString(
                                  locale,
                                  { maximumFractionDigits: 2 },
                                )}{' '}
                                W/kg
                                <EstimateMark />
                              </span>
                            )}
                          </div>
                        </li>
                      )}
                  </ul>
                </div>
              )}
            </Card>
          )
        })}
      </div>
    </section>
  )
}
