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
              <div className="tri-record-header flex flex-wrap items-center justify-between gap-2 p-4 pb-3">
                <h3 className="type-card-title flex items-center gap-2">
                  <Icon className="size-5" aria-hidden="true" />
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
              <table className="w-full table-fixed text-sm">
                <colgroup>
                  <col className="w-[25%]" />
                  <col className="w-[32%]" />
                  <col className="w-[30%]" />
                  <col className="w-[13%]" />
                </colgroup>
                <thead className="text-left text-xs text-muted-foreground">
                  <tr>
                    <th scope="col" className="px-3 py-2 font-medium">
                      {t('triathlon.journal.distance')}
                    </th>
                    <th scope="col" className="px-1 py-2 font-medium">
                      {t('triathlon.records.measured')}
                    </th>
                    <th scope="col" className="px-1 py-2 font-medium">
                      {t('triathlon.charts.estimated')}
                    </th>
                    <th scope="col">
                      <span className="sr-only">
                        {t('triathlon.actual.add')}
                      </span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {records.distanceRecords.map(
                    ({ targetDistanceMeters, record }) => {
                      const label = distanceLabel(
                        targetDistanceMeters,
                        discipline,
                      )
                      const estimate = estimates.find(
                        (item) =>
                          item.targetDistanceMeters === targetDistanceMeters,
                      )
                      return (
                        <tr
                          key={targetDistanceMeters}
                          data-record-distance={targetDistanceMeters}
                        >
                          <th
                            scope="row"
                            className="px-3 py-3 text-left text-xs font-semibold"
                          >
                            {label}
                          </th>
                          <td className="px-1 py-2 tabular-nums">
                            {record ? (
                              <button
                                className="rounded text-left hover:text-primary focus-visible:outline-2 focus-visible:outline-ring"
                                aria-label={t('triathlon.records.edit', {
                                  sport: t(
                                    `triathlon.discipline.${discipline}`,
                                  ),
                                  distance: label,
                                })}
                                onClick={() => edit(record.trainingId)}
                              >
                                <span className="tri-record-value block text-base font-bold">
                                  {formatTrainingDurationInput(
                                    record.durationSeconds,
                                  )}
                                </span>
                                <span className="type-caption block text-muted-foreground">
                                  {formattedDate(record.localDate)}
                                </span>
                              </button>
                            ) : (
                              <span className="text-muted-foreground">
                                —
                                <span className="sr-only">
                                  {' '}
                                  {t('triathlon.records.unrecorded')}
                                </span>
                              </span>
                            )}
                          </td>
                          <td className="px-1 py-2 tabular-nums">
                            {estimate ? (
                              <>
                                <span className="block font-medium">
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
                                <span className="type-caption block text-muted-foreground">
                                  {formatPace(
                                    (estimate.predictedDurationSeconds /
                                      targetDistanceMeters) *
                                      (discipline === 'swim' ? 100 : 1000),
                                  )}{' '}
                                  /{discipline === 'swim' ? '100 m' : 'km'}
                                </span>
                              </>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="pr-2 text-right">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="size-8"
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
                          </td>
                        </tr>
                      )
                    },
                  )}
                </tbody>
              </table>
              {analysis.status === 'ready' &&
                analysis.model === 'critical-power' &&
                analysis.distanceAnalysis && (
                  <p className="border-t bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
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
                <div className="border-t bg-muted/20 p-3">
                  <h4 className="mb-2 text-xs font-semibold">
                    {t('triathlon.records.power')}
                  </h4>
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
                      return (
                        <div
                          className="flex items-center justify-between gap-2 py-1 text-sm"
                          key={targetDurationSeconds}
                        >
                          <span className="w-12 text-xs font-medium">
                            {targetDurationSeconds / 60} min
                          </span>
                          <span className="flex-1 tabular-nums">
                            {record ? (
                              <button
                                className="font-bold hover:text-primary"
                                onClick={() => edit(record.trainingId)}
                                aria-label={t('triathlon.records.edit', {
                                  sport: t('triathlon.discipline.bike'),
                                  distance: `${targetDurationSeconds / 60} min`,
                                })}
                              >
                                {Math.round(record.averagePowerWatts)} W{' '}
                                <span className="type-caption font-normal text-muted-foreground">
                                  {formattedDate(record.localDate)}
                                </span>
                              </button>
                            ) : (
                              '—'
                            )}
                          </span>
                          <span className="text-muted-foreground tabular-nums">
                            {predictedPower
                              ? `≈ ${Math.round(predictedPower)} W`
                              : '—'}
                          </span>
                          <Button
                            className="size-8"
                            size="icon"
                            variant="ghost"
                            aria-label={t('triathlon.records.add', {
                              sport: t('triathlon.discipline.bike'),
                              distance: `${targetDurationSeconds / 60} min`,
                            })}
                            onClick={() =>
                              add({ durationSeconds: targetDurationSeconds })
                            }
                          >
                            <Plus className="size-4" aria-hidden="true" />
                          </Button>
                        </div>
                      )
                    },
                  )}
                  {analysis.status === 'ready' &&
                    analysis.model === 'critical-power' && (
                      <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1 border-t pt-2">
                        <span className="text-xs font-semibold">
                          {t('triathlon.performance.bikeCp')}
                        </span>
                        <span className="font-bold tabular-nums">
                          {Math.round(analysis.criticalPowerWatts)} W
                        </span>
                        {analysis.criticalPowerWattsPerKg !== null && (
                          <span className="text-xs text-muted-foreground">
                            {analysis.criticalPowerWattsPerKg.toLocaleString(
                              locale,
                              { maximumFractionDigits: 2 },
                            )}{' '}
                            W/kg
                          </span>
                        )}
                      </div>
                    )}
                </div>
              )}
              <div className="tri-record-model grid gap-1 p-3 text-xs text-muted-foreground">
                {analysis.status === 'ready' ? (
                  <>
                    <p className="font-medium text-foreground">
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
                    <p className="font-medium text-foreground">
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
