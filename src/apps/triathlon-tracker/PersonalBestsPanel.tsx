import { Plus, Trophy } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'

import { analyzeBike, analyzeRun, analyzeSwim } from './domain/performance'
import {
  getPersonalRecords,
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
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DisclosureSummary } from '@/components/ui/disclosure'
import { Card } from '@/components/ui/card'
import { IftaInput, IftaSelectTrigger } from '@/components/ui/ifta-field'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useI18n } from '@/lib/i18n'

function WeightInput({
  weightKg,
  onSave,
}: {
  weightKg: number | null
  onSave: (weightKg: number | null) => Promise<unknown>
}) {
  const { t } = useI18n()
  const [value, setValue] = useState(weightKg?.toString() ?? '')
  const [saving, setSaving] = useState(false)
  const save = async () => {
    const next = value.trim() === '' ? null : Number(value.replace(',', '.'))
    if (next !== null && (!Number.isFinite(next) || next < 20 || next > 300)) {
      toast.error(t('triathlon.settings.invalidWeight'))
      return
    }
    if (next === weightKg) return
    setSaving(true)
    try {
      await onSave(next)
      toast.success(t('triathlon.settings.weightSaved'))
    } catch {
      toast.error(t('triathlon.form.saveFailed'))
    } finally {
      setSaving(false)
    }
  }
  return (
    <IftaInput
      label={t('triathlon.settings.weight')}
      className="max-w-56"
      inputMode="decimal"
      value={value}
      disabled={saving}
      onChange={(event) => setValue(event.target.value)}
      onBlur={() => void save()}
      onKeyDown={(event) => {
        if (event.key === 'Enter') event.currentTarget.blur()
      }}
    />
  )
}

export function ModelBadge() {
  const { t } = useI18n()
  return (
    <Badge variant="secondary" className="h-[18px] px-1.5 text-[11px]">
      {t('triathlon.charts.model')}
    </Badge>
  )
}

export function PersonalBestsPanel({
  actualTrainings,
  settings,
  today,
  onAdd,
  onEdit,
  onUpdateWeight,
}: {
  actualTrainings: ActualTraining[]
  settings: TrackerSettings
  today: string
  onAdd: (template: Partial<ActualTrainingInput>) => void
  onEdit: (training: ActualTraining) => void
  onUpdateWeight: (weightKg: number | null) => Promise<unknown>
}) {
  const { locale, t } = useI18n()
  const [selectedContexts, setSelectedContexts] = useState<
    Record<Discipline, TrainingContext>
  >(defaultTrainingContexts)
  const [basis, setBasis] = useState<'benchmark' | 'all'>('benchmark')
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
  const distanceLabel = (distance: number, discipline: Discipline) => {
    if (distance === 21097.5) return t('triathlon.records.halfMarathon')
    if (distance === 42195) return t('triathlon.records.marathon')
    return discipline === 'swim'
      ? `${distance.toLocaleString(locale)} m`
      : `${(distance / 1000).toLocaleString(locale)} km`
  }
  const formattedDate = (date: string) =>
    new Intl.DateTimeFormat(locale, {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
    }).format(new Date(`${date}T12:00:00Z`))

  return (
    <section className="grid gap-4" aria-label={t('triathlon.tabs.records')}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="type-section-title">{t('triathlon.records.title')}</h2>
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
          const method =
            analysis.status === 'ready'
              ? analysis.model === 'power-law' &&
                analysis.anchorIds.length === 1
                ? t('triathlon.performance.method.riegel')
                : t(`triathlon.performance.method.${analysis.model}`)
              : null
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
                          ) : (
                            <span className="tri-record-time text-subtle-foreground">
                              —
                              <span className="sr-only">
                                {' '}
                                {t('triathlon.records.unrecorded')}
                              </span>
                            </span>
                          )}
                          {estimate && (
                            <span className="type-caption flex flex-wrap items-center justify-end gap-x-1.5 text-muted-foreground tabular-nums">
                              <ModelBadge />
                              <span>
                                {formatTrainingDurationInput(
                                  estimate.predictedDurationSeconds,
                                )}
                                {estimate.extrapolated && (
                                  <span
                                    aria-label={t(
                                      'triathlon.records.extrapolation',
                                    )}
                                  >
                                    *
                                  </span>
                                )}
                              </span>
                              <span>
                                ·{' '}
                                {formatPace(
                                  (estimate.predictedDurationSeconds /
                                    targetDistanceMeters) *
                                    (discipline === 'swim' ? 100 : 1000),
                                )}{' '}
                                /{discipline === 'swim' ? '100 m' : 'km'}
                              </span>
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
              {analysis.status === 'ready' &&
                analysis.model === 'critical-power' &&
                analysis.distanceAnalysis && (
                  <p className="type-caption border-t px-4 py-2 text-muted-foreground">
                    {t('triathlon.records.timeModel')} ·{' '}
                    {t('triathlon.performance.method.power-law')} ·{' '}
                    {t(
                      `triathlon.performance.basis.${analysis.distanceAnalysis.basis}`,
                    )}{' '}
                    ·{' '}
                    {t('triathlon.performance.anchors', {
                      count: analysis.distanceAnalysis.anchorIds.length,
                    })}
                  </p>
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
                              ) : (
                                <span className="tri-record-time text-subtle-foreground">
                                  —
                                </span>
                              )}
                              {predictedPower !== null && (
                                <span className="type-caption flex items-center justify-end gap-x-1.5 text-muted-foreground tabular-nums">
                                  <ModelBadge />
                                  {Math.round(predictedPower)} W
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
                            </span>
                            <span className="type-caption flex items-center justify-end gap-x-1.5 text-muted-foreground tabular-nums">
                              <ModelBadge />
                              {analysis.criticalPowerWattsPerKg !== null &&
                                `${analysis.criticalPowerWattsPerKg.toLocaleString(
                                  locale,
                                  { maximumFractionDigits: 2 },
                                )} W/kg`}
                            </span>
                          </div>
                        </li>
                      )}
                  </ul>
                </div>
              )}
              <div className="type-caption mt-auto grid gap-0.5 border-t bg-muted/50 px-4 py-3 text-muted-foreground">
                {analysis.status === 'ready' ? (
                  <>
                    <p className="font-semibold text-foreground">
                      {method} ·{' '}
                      {t(`triathlon.performance.basis.${analysis.basis}`)}
                    </p>
                    <p>
                      {t('triathlon.performance.anchors', {
                        count: analysis.anchorIds.length,
                      })}{' '}
                      · {t('triathlon.records.modelWindow')}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="font-semibold text-foreground">
                      {t('triathlon.performance.anchors', {
                        count: analysis.availableAnchors,
                      })}
                    </p>
                    <p>{t(`triathlon.records.next.${discipline}`)}</p>
                  </>
                )}
              </div>
            </Card>
          )
        })}
      </div>
      <div className="flex flex-wrap items-start justify-between gap-3 rounded-lg border bg-card p-3">
        <p className="max-w-2xl text-xs leading-relaxed text-muted-foreground">
          <Trophy className="mr-1 inline size-3.5" aria-hidden="true" />
          {t('triathlon.records.rules')}{' '}
          {t('triathlon.records.extrapolationNote')}
        </p>
        <WeightInput
          key={settings.weightKg ?? 'none'}
          weightKg={settings.weightKg}
          onSave={onUpdateWeight}
        />
      </div>
      <details className="group rounded-lg border bg-card p-3">
        <DisclosureSummary>
          {t('triathlon.performance.methodology')}
        </DisclosureSummary>
        <div className="mt-3 grid gap-4 text-xs leading-relaxed text-muted-foreground md:grid-cols-3">
          {(
            [
              [
                'run',
                'Vickers & Vertosick, 2016',
                'https://pubmed.ncbi.nlm.nih.gov/27570626/',
              ],
              [
                'swim',
                'Scott et al., 2024',
                'https://pmc.ncbi.nlm.nih.gov/articles/PMC10875687/',
              ],
              [
                'bike',
                'Karsten et al., 2021',
                'https://www.frontiersin.org/journals/physiology/articles/10.3389/fphys.2020.613151/full',
              ],
            ] as const
          ).map(([discipline, source, href]) => (
            <section key={discipline}>
              <h3 className="mb-1 font-semibold text-foreground">
                {t(`triathlon.discipline.${discipline}`)}
              </h3>
              <a
                className="font-medium text-primary underline"
                href={href}
                target="_blank"
                rel="noreferrer"
              >
                {source}
              </a>
              <ul className="mt-2 list-disc space-y-1 pl-4">
                <li>{t(`triathlon.records.method.${discipline}`)}</li>
                <li>{t(`triathlon.records.limits.${discipline}`)}</li>
              </ul>
            </section>
          ))}
        </div>
      </details>
    </section>
  )
}
